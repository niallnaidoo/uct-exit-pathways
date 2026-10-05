/**
 * Careers Service — in-browser demo backend (no server).
 *
 * Two kinds of state, kept deliberately apart:
 *  1. PRIVATE to Careers (localStorage `uct-careers-v1`): alumni mentor
 *     applications, pulse check-ins, programme settings.
 *  2. SHARED via the integration bus: anything EdOS must know about (or that
 *     comes from EdOS). Careers never writes EdOS data directly — it publishes
 *     an event, and reads EdOS's events, exactly as it would with webhooks.
 */
import { publish, readLog, newId } from '../../../packages/bridge/bus.js';
import { project, eligibility } from '../../../packages/bridge/project.js';
import { demoAlumni, publicMentor } from '../../../packages/bridge/demo/alumni.js';
import { matchScore, maxMentees, pulseNeedsReview } from './mentorship-model.js';
import { studentRows, opportunityStats } from './careers-model.js';
import { describe } from '../../../packages/bridge/describe.js';

const KEY = 'uct-careers-v1';
const FROM = 'careers';

export const DEFAULT_SETTINGS = {
  orgName: 'University of Cape Town',
  orgShort: 'UCT',
  programmeName: 'Careers Service',
  contactEmail: 'careers@uct.ac.za',
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* fall through to seed */
  }
  const db = { alumni: demoAlumni(), pulses: [], settings: { ...DEFAULT_SETTINGS } };
  save(db);
  return db;
}
function save(db) {
  localStorage.setItem(KEY, JSON.stringify(db));
}
function mutate(fn) {
  const db = load();
  const out = fn(db);
  save(db);
  return out;
}
const now = () => new Date().toISOString();
const clone = (v) => JSON.parse(JSON.stringify(v));
const ok = (v) => Promise.resolve(clone(v));
const tryOk = (fn) => {
  try {
    return ok(fn());
  } catch (e) {
    return Promise.reject(e);
  }
};
const tokenStr = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(18)))
    .map((b) => b.toString(36))
    .join('')
    .slice(0, 24);

/** The read model built from every event on the bus. */
const model = () => project(readLog());

/* ── Settings ── */
export const getSettings = () => ok({ ...DEFAULT_SETTINGS, ...load().settings });

/* ══════════════ Exit pathways ══════════════ */

/** Everything the office dashboard needs, in one call. */
export const getCareers = () => {
  const m = model();
  const opportunities = Object.values(m.opportunities)
    .map((o) => ({ ...o, stats: opportunityStats(m, o, eligibility) }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return ok({
    students: studentRows(m),
    opportunities,
    applications: Object.values(m.applications),
    interventions: Object.values(m.interventions).sort((a, b) => b.assignedAt.localeCompare(a.assignedAt)),
    timeline: m.timeline,
  });
};

/** Events with a readable sentence — newest first. */
function narrated(limit) {
  const log = readLog();
  const m = project(log);
  const out = [...log].reverse().map((e) => ({ ...e, text: describe(e, m) }));
  return limit ? out.slice(0, limit) : out;
}

/** The raw event log — what the Integration tab shows the dev team. */
export const getEventLog = (limit) => ok(narrated(limit));

export const publishOpportunity = (body) => {
  if (!body.title?.trim() || !body.organisation?.trim() || !body.kind)
    return Promise.reject(new Error('title, organisation and type are required'));
  const opp = {
    id: newId('opp'),
    kind: body.kind,
    title: body.title.trim(),
    organisation: body.organisation.trim(),
    location: body.location?.trim() || 'Cape Town',
    summary: body.summary?.trim() || '',
    faculties: body.faculties ?? [],
    stages: body.stages ?? [],
    minAverage: body.minAverage === '' || body.minAverage == null ? null : Number(body.minAverage),
    closingDate: body.closingDate || null,
    value: body.value?.trim() || '',
    uct: !!body.uct,
  };
  return ok(publish('opportunity.published', opp, FROM));
};

export const closeOpportunity = (opportunityId) => ok(publish('opportunity.closed', { opportunityId }, FROM));

export const assignIntervention = ({ studentNumber, type, title, message, dueDate }) =>
  ok(
    publish(
      'intervention.assigned',
      { interventionId: newId('int'), studentNumber, type, title, message, dueDate, by: 'Careers Service' },
      FROM,
    ),
  );

/* ══════════════ Alumni mentorship ══════════════
 * Mentor records are private to Careers. Mentees are students who asked for a
 * mentor in EdOS (`mentorship.requested`). Offers, matches, meetings and
 * messages are events, so the student sees them in EdOS. */

/** A mentee = the EdOS mentor request + the synced academic profile. */
function menteesFrom(m) {
  return Object.values(m.mentees)
    .map((r) => {
      const s = m.students[r.studentNumber];
      if (!s) return null;
      return {
        id: r.studentNumber,
        studentNumber: r.studentNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        faculty: s.faculty,
        degree: s.degree,
        stage: s.stage,
        average: s.average,
        careerInterests: r.careerInterests ?? [],
        skillsWanted: r.skillsWanted ?? [],
        goals: r.goals,
        languages: r.languages ?? [],
        meetingFormat: r.meetingFormat,
        availability: r.availability,
        accessNeeds: r.accessNeeds,
        appliedAt: r.requestedAt,
      };
    })
    .filter(Boolean);
}
const matchesFrom = (m) =>
  Object.values(m.matches).map((x) => ({ ...x, menteeId: x.studentNumber }));

function publicMentee(t) {
  return {
    id: t.id,
    firstName: t.firstName,
    lastInitial: (t.lastName ?? '').slice(0, 1),
    faculty: t.faculty,
    degree: t.degree,
    stage: t.stage,
    careerInterests: t.careerInterests,
    skillsWanted: t.skillsWanted,
    goals: t.goals,
    languages: t.languages,
    meetingFormat: t.meetingFormat,
  };
}

function resolveMentor(id, token, db) {
  const a = db.alumni.find((x) => x.id === id);
  if (!a || a.token !== token || a.revoked) throw new Error('this link is not valid');
  return a;
}

/* Mentor sign-up (public link) */
export const submitMentorApplication = (body) => {
  if (!body.firstName?.trim() || !body.lastName?.trim()) return Promise.reject(new Error('your name is required'));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email ?? '').trim()))
    return Promise.reject(new Error('a valid email address is required'));
  return ok(
    mutate((db) => {
      const email = body.email.trim().toLowerCase();
      const record = { ...body, email, firstName: body.firstName.trim(), lastName: body.lastName.trim(), maxMentees: Number(body.maxMentees) || 1 };
      const existing = db.alumni.find((a) => a.email === email);
      if (existing) {
        Object.assign(existing, record, { id: existing.id, token: existing.token });
        return { id: existing.id, token: existing.token, status: existing.status };
      }
      const a = { ...record, id: newId('alm'), token: tokenStr(), status: 'pending', appliedAt: now() };
      db.alumni.push(a);
      return { id: a.id, token: a.token, status: a.status };
    }),
  );
};

/* Mentor dashboard (private link) */
export const getMentorPortal = (id, token) =>
  tryOk(() => {
    const db = load();
    const mentor = resolveMentor(id, token, db);
    const m = model();
    const mentees = menteesFrom(m);
    const byId = Object.fromEntries(mentees.map((t) => [t.id, t]));
    const all = matchesFrom(m);
    const mine = all.filter((x) => x.mentorId === mentor.id);
    const taken = new Set(all.filter((x) => x.status === 'active').map((x) => x.menteeId));
    const offeredByMe = new Set(mine.filter((x) => x.status === 'offered').map((x) => x.menteeId));
    const mentorships = mine
      .filter((x) => ['offered', 'active', 'closed'].includes(x.status))
      .map((x) => {
        const t = byId[x.menteeId];
        if (!t) return null;
        const agreed = x.status !== 'offered';
        return {
          ...x,
          mentee: agreed ? t : publicMentee(t),
          meetings: Object.values(m.meetings).filter((mt) => mt.matchId === x.id),
          messages: m.messages.filter((msg) => msg.matchId === x.id),
        };
      })
      .filter(Boolean);
    const available = mentees
      .filter((t) => !taken.has(t.id))
      .map((t) => ({ ...publicMentee(t), offered: offeredByMe.has(t.id), match: matchScore(mentor, t) }))
      .sort((a, b) => b.match.score - a.match.score);
    return {
      mentor,
      mentorships,
      available,
      pulses: db.pulses.filter((p) => p.by === 'mentor' && p.personId === mentor.id),
      settings: { ...DEFAULT_SETTINGS, ...db.settings },
    };
  });

export const updateMentorProfile = (id, token, patch) =>
  tryOk(() =>
    mutate((db) => {
      const a = resolveMentor(id, token, db);
      const { status, token: _t, id: _i, ...safe } = patch;
      Object.assign(a, safe, { maxMentees: Number(safe.maxMentees ?? a.maxMentees) || 1 });
      return a;
    }),
  );

const openFor = (m, mentorId) =>
  matchesFrom(m).filter((x) => x.mentorId === mentorId && ['offered', 'active'].includes(x.status));

function makeOffer(mentor, menteeId) {
  const m = model();
  const t = menteesFrom(m).find((x) => x.id === menteeId);
  if (!t) throw new Error('that student is no longer available');
  if (matchesFrom(m).some((x) => x.menteeId === menteeId && x.status === 'active'))
    throw new Error('that student has already been matched');
  const mine = openFor(m, mentor.id);
  if (mine.some((x) => x.menteeId === menteeId)) throw new Error('already offered');
  if (mine.length >= maxMentees(mentor)) throw new Error(`you've reached your limit of ${maxMentees(mentor)} mentees`);
  return publish(
    'mentorship.offer.made',
    { matchId: newId('mat'), mentorId: mentor.id, studentNumber: menteeId, score: matchScore(mentor, t).score, mentor: publicMentor(mentor) },
    FROM,
  );
}

export const offerMentorship = (id, token, menteeId) =>
  tryOk(() => {
    const mentor = resolveMentor(id, token, load());
    if (mentor.status !== 'approved') throw new Error('your profile is still being reviewed');
    return makeOffer(mentor, menteeId);
  });

const mentorsMatch = (mentor, matchId) => {
  const x = model().matches[matchId];
  if (!x || x.mentorId !== mentor.id) throw new Error('that mentorship is not yours');
  return x;
};

export const withdrawOffer = (id, token, matchId) =>
  tryOk(() => {
    const mentor = resolveMentor(id, token, load());
    const x = mentorsMatch(mentor, matchId);
    if (x.status !== 'offered') throw new Error('only a pending offer can be withdrawn');
    return publish('mentorship.match.updated', { matchId, status: 'withdrawn', reason: 'Mentor withdrew the offer' }, FROM);
  });

export const setMilestone = (id, token, matchId, key, done) =>
  tryOk(() => {
    mentorsMatch(resolveMentor(id, token, load()), matchId);
    return publish('mentorship.milestone.updated', { matchId, key, done: !!done }, FROM);
  });

/** Mentor side only — students book and message from EdOS. */
export const scheduleMeeting = (kind, id, token, body) =>
  tryOk(() => {
    const x = mentorsMatch(resolveMentor(id, token, load()), body.matchId);
    if (x.status !== 'active') throw new Error('meetings start once the student has agreed');
    if (!body.date || !body.time) throw new Error('pick a date and time');
    return publish(
      'mentorship.meeting.scheduled',
      { meetingId: newId('mtg'), matchId: x.id, date: body.date, time: body.time, format: body.format || 'Online', agenda: body.agenda?.trim() || '', bookedBy: 'mentor' },
      FROM,
    );
  });

export const sendMessage = (kind, id, token, body) =>
  tryOk(() => {
    const x = mentorsMatch(resolveMentor(id, token, load()), body.matchId);
    if (x.status !== 'active') throw new Error('messaging opens once the student has agreed');
    const text = String(body.text ?? '').trim();
    if (!text) throw new Error('write a message first');
    return publish('mentorship.message.sent', { messageId: newId('msg'), matchId: x.id, from: 'mentor', text }, FROM);
  });

/** Pulse check-ins stay private to Careers (safeguarding / case review). */
export const submitPulse = (kind, id, token, body) =>
  tryOk(() =>
    mutate((db) => {
      const mentor = resolveMentor(id, token, db);
      const pulse = {
        id: newId('pls'),
        by: 'mentor',
        personId: mentor.id,
        matchId: body.matchId,
        answers: body.answers ?? {},
        comment: body.comment?.trim() || '',
        concern: body.concern || '',
        review: pulseNeedsReview(body.answers) || !!body.concern,
        at: now(),
      };
      db.pulses.push(pulse);
      return pulse;
    }),
  );

/* ── Programme office ── */
export const getProgramme = () => {
  const db = load();
  const m = model();
  return ok({
    alumni: db.alumni,
    mentees: menteesFrom(m),
    matches: matchesFrom(m),
    meetings: Object.values(m.meetings),
    pulses: db.pulses,
    messages: m.messages.map(({ id, matchId, from, at }) => ({ id, matchId, from, at })),
  });
};

export const reviewMentor = (id, decision) =>
  tryOk(() =>
    mutate((db) => {
      const a = db.alumni.find((x) => x.id === id);
      if (!a) throw new Error('mentor not found');
      a.status = decision;
      a.reviewedAt = now();
      if (decision === 'approved') a.approvedAt = now();
      return a;
    }),
  );

export const setMatchStatus = (matchId, status, reason) =>
  ok(publish('mentorship.match.updated', { matchId, status, reason: reason || '' }, FROM));

export const adminOfferMatch = (mentorId, menteeId) =>
  tryOk(() => {
    const mentor = load().alumni.find((a) => a.id === mentorId);
    if (!mentor) throw new Error('pick a mentor');
    return makeOffer(mentor, menteeId);
  });
