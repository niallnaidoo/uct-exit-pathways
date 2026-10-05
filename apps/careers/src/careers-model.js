/**
 * Careers Service logic — built on the read model projected from EdOS events.
 *
 * The headline is the unemployment-risk score: which graduating students (and
 * recent graduates) are most likely to leave UCT without work or a plan, and
 * why — so the office can reach them while there's still time.
 */
import { READINESS, pathwayMeta } from '../../../packages/bridge/vocab.js';

export const GRADUATING_STAGES = ['Final year', 'Honours', 'Masters (career change)'];

/** Readiness as a 0–1 fraction against the checklist for their pathway. */
export function readinessOf(decl) {
  if (!decl) return null;
  const seen = new Set();
  const items = (decl.pathways ?? [decl.primary]).flatMap((p) => READINESS[p] ?? []).filter((i) => !seen.has(i.key) && seen.add(i.key));
  if (!items.length) return null;
  const done = items.filter((i) => decl.readiness?.[i.key]).length;
  return { done, total: items.length, pct: Math.round((done / items.length) * 100) };
}

export function studentApplications(model, sn) {
  return Object.values(model.applications).filter((a) => a.studentNumber === sn);
}

export function activeMatch(model, sn) {
  return Object.values(model.matches).find((m) => m.studentNumber === sn && m.status === 'active') ?? null;
}

/**
 * Unemployment risk — 0–100 with plain-language reasons.
 * Registered students are scored on plan, readiness and action; graduates on
 * where they actually landed.
 */
export function unemploymentRisk(model, s) {
  const reasons = [];
  let score = 0;

  if (s.status === 'graduated') {
    const d = model.destinations[s.studentNumber];
    if (!d) {
      score = 45;
      reasons.push('No destination reported since graduating');
    } else if (d.destination === 'seeking') {
      score = 85;
      reasons.push('Graduated and still seeking work');
    }
    return band(score, reasons);
  }

  const apps = studentApplications(model, s.studentNumber);
  if (apps.some((a) => a.status === 'offer' || a.status === 'accepted')) {
    return band(0, ['Has an offer in hand']);
  }

  const decl = model.pathways[s.studentNumber];
  if (!decl) {
    score += 35;
    reasons.push('No exit pathway declared');
  } else if (decl.primary === 'unsure') {
    score += 25;
    reasons.push('Not sure what’s next');
  }
  const r = readinessOf(decl);
  if (r && r.pct < 50) {
    score += 15;
    reasons.push(`Low readiness (${r.done}/${r.total})`);
  }
  if ((!decl || decl.pathways?.includes('employment')) && apps.length === 0) {
    score += 15;
    reasons.push('No applications yet');
  }
  if (s.average < 55) {
    score += 10;
    reasons.push(`Average ${s.average}% narrows options`);
  }
  if ((!decl || decl.primary === 'unsure') && !activeMatch(model, s.studentNumber)) {
    score += 5;
    reasons.push('No mentor');
  }
  const ignored = Object.values(model.interventions).filter(
    (i) => i.studentNumber === s.studentNumber && i.status === 'open' && Date.now() - new Date(i.assignedAt) > 3 * 86400000,
  );
  if (ignored.length) {
    score += 5;
    reasons.push('Hasn’t responded to support');
  }
  // Penultimate-year students have time — weight their risk down.
  if (!GRADUATING_STAGES.includes(s.stage)) score = Math.round(score * 0.6);
  return band(Math.min(100, score), reasons);
}

function band(score, reasons) {
  const level = score >= 60 ? 'high' : score >= 30 ? 'medium' : score > 0 ? 'low' : 'none';
  return { score, level, reasons };
}

export const RISK_LABEL = {
  high: { label: 'High risk', tone: 'coral' },
  medium: { label: 'Medium', tone: 'gold' },
  low: { label: 'Low', tone: 'navy' },
  none: { label: 'On track', tone: 'teal' },
};

/** One row per student: everything the office needs at a glance. */
export function studentRows(model) {
  return Object.values(model.students).map((s) => {
    const decl = model.pathways[s.studentNumber];
    const apps = studentApplications(model, s.studentNumber);
    const match = activeMatch(model, s.studentNumber);
    const interventions = Object.values(model.interventions).filter((i) => i.studentNumber === s.studentNumber);
    return {
      ...s,
      decl,
      pathway: decl ? pathwayMeta(decl.primary) : null,
      readiness: readinessOf(decl),
      applications: apps,
      saves: Object.keys(model.saves[s.studentNumber] ?? {}).length,
      match,
      mentorRequested: !!model.mentees[s.studentNumber],
      interventions,
      destination: model.destinations[s.studentNumber] ?? null,
      risk: unemploymentRisk(model, s),
    };
  });
}

/** Opportunity with live engagement numbers coming back from EdOS. */
export function opportunityStats(model, opp, eligibleFn) {
  const apps = Object.values(model.applications).filter((a) => a.opportunityId === opp.id);
  const saves = Object.values(model.saves).filter((s) => s[opp.id]).length;
  const registered = Object.values(model.students).filter((s) => s.status === 'registered');
  const eligible = registered.filter((s) => eligibleFn(opp, s).ok).length;
  return { applications: apps.length, saves, eligible };
}

/* ── EdOS engagement dashboard ───────────────────────────────────── */

const daysSince = (iso) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null);
const daysUntilDate = (d) => (d ? Math.ceil((new Date(`${d}T12:00:00`).getTime() - Date.now()) / 86400000) : null);

/** Last time the student and their mentor were in touch (message or past meeting). */
export function lastMentorContact(model, match) {
  if (!match) return null;
  const today = new Date().toISOString().slice(0, 10);
  const times = [
    ...model.messages.filter((x) => x.matchId === match.id).map((x) => x.at),
    ...Object.values(model.meetings)
      .filter((x) => x.matchId === match.id && x.date <= today)
      .map((x) => `${x.date}T${x.time || '12:00'}:00`),
  ];
  if (match.startedAt) times.push(match.startedAt);
  return times.sort().at(-1) ?? null;
}

/**
 * One row per registered student: what EdOS tells us about their engagement —
 * last opportunities check, mentor contact, next test, gradebook, support.
 */
export function engagementRows(model) {
  return Object.values(model.students)
    .filter((s) => s.status === 'registered')
    .map((s) => {
      const match = activeMatch(model, s.studentNumber);
      const lastViewed = model.lastViewed[s.studentNumber] ?? null;
      const contact = lastMentorContact(model, match);
      const ints = Object.values(model.interventions).filter((i) => i.studentNumber === s.studentNumber);
      const count = (st) => ints.filter((i) => i.status === st).length;
      return {
        ...s,
        lastViewed,
        daysSinceViewed: daysSince(lastViewed),
        mentor: match ? match.mentor : null,
        mentorRequested: !!model.mentees[s.studentNumber],
        lastMentorContact: contact,
        daysSinceMentor: daysSince(contact),
        daysToTest: daysUntilDate(s.nextTest?.date),
        interventions: { total: ints.length, open: count('open'), booked: count('booked'), done: count('done'), declined: count('declined'), latest: ints.sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))[0] ?? null },
        risk: unemploymentRisk(model, s),
      };
    });
}
