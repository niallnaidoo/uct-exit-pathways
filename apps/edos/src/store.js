/**
 * EdOS (UCT edition) — in-browser demo store. No backend.
 *
 * EdOS is the system of record for the student: their modules, marks and
 * credits live here (demo roster). What EdOS needs from the Careers Service
 * (opportunities, support, mentor offers, messages) arrives as events on the
 * bus; what Careers needs from EdOS (profile, pathway, applications, mentor
 * requests, destinations) leaves as events. Nothing else crosses over.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { publish, readLog, subscribe, newId, resetDemo as resetBus } from '../../../packages/bridge/bus.js';
import { project, eligibility, isOpen, daysUntil } from '../../../packages/bridge/project.js';
import { demoRoster, syncPayload } from '../../../packages/bridge/demo/roster.js';
import { kindMeta } from '../../../packages/bridge/vocab.js';

const FROM = 'edos';
const PERSONA_KEY = 'uct-edos-persona';
const PREFS_KEY = 'uct-edos-v1';
export const DEFAULT_PERSONA = 'CELNOM010';

const ROSTER = demoRoster();
export const roster = () => ROSTER;

/* ── A tiny external store: re-render on our own publishes and on the bus ── */
let version = 0;
const listeners = new Set();
function bump() {
  version += 1;
  listeners.forEach((l) => l());
}
const subscribeStore = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
let busHooked = false;
function hookBus() {
  if (busHooked) return;
  busHooked = true;
  subscribe(bump);
}

/* ── Persona (demo only — production is UCT single sign-on) ── */
export function getPersona() {
  const fromUrl = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('as');
  if (fromUrl && ROSTER.some((s) => s.studentNumber === fromUrl)) {
    try {
      localStorage.setItem(PERSONA_KEY, fromUrl);
    } catch {
      /* ignore */
    }
    return fromUrl;
  }
  try {
    return localStorage.getItem(PERSONA_KEY) || DEFAULT_PERSONA;
  } catch {
    return DEFAULT_PERSONA;
  }
}
export function setPersona(sn) {
  try {
    localStorage.setItem(PERSONA_KEY, sn);
  } catch {
    /* ignore */
  }
  // Drop any ?as= so the choice sticks.
  window.location.hash = window.location.hash.split('?')[0] || '#/';
  bump();
}

/* ── Notification read-state (private to EdOS) ── */
function prefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) ?? { read: {} };
  } catch {
    return { read: {} };
  }
}
export function markRead(ids) {
  const p = prefs();
  ids.forEach((id) => (p.read[id] = true));
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  bump();
}

/* ── The student's view, rebuilt from their record + the event stream ── */
function buildView(sn) {
  const me = ROSTER.find((s) => s.studentNumber === sn) ?? ROSTER[0];
  const log = readLog();
  const m = project(log);
  const decl = m.pathways[me.studentNumber] ?? null;
  const saved = m.saves[me.studentNumber] ?? {};
  const applications = Object.values(m.applications).filter((a) => a.studentNumber === me.studentNumber);
  const appliedTo = Object.fromEntries(applications.map((a) => [a.opportunityId, a]));

  const opportunities = Object.values(m.opportunities)
    .filter(isOpen)
    .map((o) => {
      const el = eligibility(o, me);
      const pathway = kindMeta(o.kind).pathway;
      // "For you" ranking: eligible first, then your pathway, then closing soonest.
      let rank = el.ok ? 100 : 0;
      if (decl?.primary === pathway) rank += 40;
      else if (decl?.backup === pathway) rank += 20;
      if (decl?.interests?.some((i) => o.summary?.includes(i) || o.title.includes(i))) rank += 5;
      if (o.closingDate) rank += Math.max(0, 30 - daysUntil(o.closingDate)) / 10;
      return { ...o, pathway, eligibility: el, saved: !!saved[o.id], application: appliedTo[o.id] ?? null, rank };
    })
    .sort((a, b) => b.rank - a.rank);

  const allMatches = Object.values(m.matches).filter((x) => x.studentNumber === me.studentNumber);
  const activeMatch = allMatches.find((x) => x.status === 'active') ?? null;
  const offers = allMatches.filter((x) => x.status === 'offered');
  const withThread = (x) =>
    x && {
      ...x,
      meetings: Object.values(m.meetings)
        .filter((mt) => mt.matchId === x.id)
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
      messages: m.messages.filter((msg) => msg.matchId === x.id),
    };
  const interventions = Object.values(m.interventions)
    .filter((i) => i.studentNumber === me.studentNumber)
    .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));

  const view = {
    me,
    decl,
    opportunities,
    applications: applications.map((a) => ({ ...a, opportunity: m.opportunities[a.opportunityId] })),
    interventions,
    mentorRequest: m.mentees[me.studentNumber] ?? null,
    offers: offers.map(withThread),
    match: withThread(activeMatch),
    destination: m.destinations[me.studentNumber] ?? null,
    timeline: m.timeline[me.studentNumber] ?? [],
  };
  view.inbox = inboxFor(view, m);
  return view;
}

/** Notifications — everything Careers sent this student, newest first. */
function inboxFor(v, m) {
  const read = prefs().read;
  const items = [];
  for (const i of v.interventions)
    items.push({ id: `n-${i.id}`, at: i.assignedAt, kind: 'support', title: i.title, body: i.message, to: '/', from: i.by });
  for (const o of v.offers)
    items.push({ id: `n-${o.id}`, at: o.offeredAt, kind: 'mentor', title: `${o.mentor.firstName} ${o.mentor.lastName} offered to mentor you`, body: `${o.mentor.role} at ${o.mentor.organisation}`, to: '/mentor', from: 'Alumni Mentorship' });
  for (const msg of v.match?.messages ?? [])
    if (msg.from === 'mentor')
      items.push({ id: `n-${msg.id}`, at: msg.at, kind: 'message', title: `Message from ${v.match.mentor.firstName}`, body: msg.text, to: '/mentor', from: 'Your mentor' });
  for (const mt of v.match?.meetings ?? [])
    if (mt.bookedBy === 'mentor')
      items.push({ id: `n-${mt.id}`, at: mt.createdAt, kind: 'meeting', title: `${v.match.mentor.firstName} booked a meeting`, body: `${mt.date} at ${mt.time} · ${mt.format}${mt.agenda ? ` — ${mt.agenda}` : ''}`, to: '/mentor', from: 'Your mentor' });
  for (const o of v.opportunities.filter((o) => o.eligibility.ok && (o.pathway === v.decl?.primary || !v.decl)).slice(0, 4))
    items.push({ id: `n-opp-${o.id}`, at: o.publishedAt, kind: 'opportunity', title: `New for you: ${o.title}`, body: `${o.organisation}${o.closingDate ? ` · closes in ${daysUntil(o.closingDate)} days` : ''}`, to: '/opportunities', from: 'Careers Service' });
  return items
    .map((n) => ({ ...n, unread: !read[n.id] }))
    .sort((a, b) => b.at.localeCompare(a.at));
}

let cache = { key: null, view: null };
function snapshot() {
  const sn = getPersona();
  const key = `${sn}:${version}:${readLog().length}`;
  if (cache.key !== key) cache = { key, view: buildView(sn) };
  return cache.view;
}

/** React hook: the signed-in student's live view. */
export function useEdos() {
  useEffect(hookBus, []);
  return useSyncExternalStore(subscribeStore, snapshot);
}

/* ══════════════ Actions — each one is an event to Careers ══════════════ */

const emit = (type, payload) => {
  const e = publish(type, payload, FROM);
  bump();
  return e;
};
const me = () => ROSTER.find((s) => s.studentNumber === getPersona()) ?? ROSTER[0];

export const declarePathway = ({ primary, backup, readiness, interests, note }) =>
  emit('pathway.declared', { studentNumber: me().studentNumber, primary, backup: backup || null, readiness, interests, note: note?.trim() || '' });

export const toggleSave = (opportunityId, saved) =>
  emit('opportunity.saved', { studentNumber: me().studentNumber, opportunityId, saved });

export const applyTo = (opportunityId) =>
  emit('application.submitted', { applicationId: newId('app'), studentNumber: me().studentNumber, opportunityId });

export const updateApplication = (applicationId, status) =>
  emit('application.updated', { applicationId, studentNumber: me().studentNumber, status });

export const requestMentor = (body) =>
  emit('mentorship.requested', { studentNumber: me().studentNumber, ...body });

export const respondToOffer = (matchId, accept, reason) =>
  emit('mentorship.offer.responded', { matchId, studentNumber: me().studentNumber, accept, reason: reason || '' });

export const sendMessage = (matchId, text) =>
  emit('mentorship.message.sent', { messageId: newId('msg'), matchId, from: 'mentee', text });

export const bookMeeting = (matchId, { date, time, format, agenda }) =>
  emit('mentorship.meeting.scheduled', { meetingId: newId('mtg'), matchId, date, time, format, agenda: agenda?.trim() || '', bookedBy: 'mentee' });

export const respondToSupport = (interventionId, status, note) =>
  emit('intervention.updated', { interventionId, studentNumber: me().studentNumber, status, note: note || '' });

export const reportDestination = ({ destination, detail, organisation }) =>
  emit('destination.reported', { studentNumber: me().studentNumber, destination, detail, organisation });

/** Re-send the signed-in student's profile (what the nightly SIS sync does). */
export const resyncProfile = () => emit('student.synced', syncPayload(me()));

export function resetDemo() {
  resetBus();
  bump();
}
