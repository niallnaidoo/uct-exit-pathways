/**
 * Projection — folds the event stream into a read model.
 *
 * In this prototype both systems run the same reducer over the shared log. In
 * production each system keeps its own read model, updated by the webhooks it
 * subscribes to; the reducer below is the reference for how each event should
 * change that state.
 */

export function emptyModel() {
  return {
    students: {}, // studentNumber → synced profile
    pathways: {}, // studentNumber → latest declaration
    opportunities: {}, // id → opportunity (+ closed flag)
    saves: {}, // studentNumber → { opportunityId: true }
    applications: {}, // applicationId → application
    mentees: {}, // studentNumber → mentor request
    matches: {}, // matchId → mentorship
    meetings: {}, // meetingId → meeting
    messages: [], // chronological
    interventions: {}, // interventionId → intervention
    destinations: {}, // studentNumber → destination report
    timeline: {}, // studentNumber → events touching them (newest last)
  };
}

const addTimeline = (m, sn, e) => {
  if (!sn) return;
  (m.timeline[sn] ??= []).push(e);
};

export function apply(m, e) {
  const p = e.payload ?? {};
  switch (e.type) {
    case 'student.synced':
      m.students[p.studentNumber] = { ...m.students[p.studentNumber], ...p, syncedAt: e.at };
      break;
    case 'pathway.declared':
      m.pathways[p.studentNumber] = { ...p, declaredAt: e.at, revisions: (m.pathways[p.studentNumber]?.revisions ?? 0) + 1 };
      break;
    case 'opportunity.published':
      m.opportunities[p.id] = { ...p, publishedAt: e.at, closed: false };
      break;
    case 'opportunity.closed':
      if (m.opportunities[p.opportunityId]) m.opportunities[p.opportunityId].closed = true;
      break;
    case 'opportunity.saved':
      m.saves[p.studentNumber] ??= {};
      if (p.saved) m.saves[p.studentNumber][p.opportunityId] = e.at;
      else delete m.saves[p.studentNumber][p.opportunityId];
      break;
    case 'application.submitted':
      m.applications[p.applicationId] = {
        id: p.applicationId,
        studentNumber: p.studentNumber,
        opportunityId: p.opportunityId,
        status: 'submitted',
        submittedAt: e.at,
        updatedAt: e.at,
      };
      break;
    case 'application.updated': {
      const a = m.applications[p.applicationId];
      if (a) Object.assign(a, { status: p.status, updatedAt: e.at });
      break;
    }
    case 'mentorship.requested':
      m.mentees[p.studentNumber] = { ...p, requestedAt: e.at };
      break;
    case 'mentorship.offer.made':
      m.matches[p.matchId] = {
        id: p.matchId,
        mentorId: p.mentorId,
        studentNumber: p.studentNumber,
        mentor: p.mentor,
        score: p.score,
        status: 'offered',
        offeredAt: e.at,
        milestones: {},
      };
      break;
    case 'mentorship.offer.responded': {
      const x = m.matches[p.matchId];
      if (!x || x.status !== 'offered') break;
      x.respondedAt = e.at;
      if (!p.accept) {
        x.status = 'declined';
        x.declineReason = p.reason ?? '';
        break;
      }
      x.status = 'active';
      x.startedAt = e.at;
      // Accepting one mentor closes any other open offers for that student.
      for (const o of Object.values(m.matches))
        if (o.studentNumber === x.studentNumber && o.id !== x.id && o.status === 'offered')
          Object.assign(o, { status: 'declined', declineReason: 'Student chose another mentor', respondedAt: e.at });
      break;
    }
    case 'mentorship.match.updated': {
      const x = m.matches[p.matchId];
      if (x) Object.assign(x, { status: p.status, closeReason: p.reason, closedAt: e.at });
      break;
    }
    case 'mentorship.milestone.updated': {
      const x = m.matches[p.matchId];
      if (x) x.milestones = { ...x.milestones, [p.key]: !!p.done };
      break;
    }
    case 'mentorship.meeting.scheduled':
      m.meetings[p.meetingId] = { id: p.meetingId, ...p, createdAt: e.at };
      break;
    case 'mentorship.message.sent':
      m.messages.push({ id: p.messageId, matchId: p.matchId, from: p.from, text: p.text, at: e.at });
      break;
    case 'intervention.assigned':
      m.interventions[p.interventionId] = { id: p.interventionId, ...p, status: 'open', assignedAt: e.at };
      break;
    case 'intervention.updated': {
      const i = m.interventions[p.interventionId];
      if (i) Object.assign(i, { status: p.status, note: p.note, updatedAt: e.at });
      break;
    }
    case 'destination.reported':
      m.destinations[p.studentNumber] = { ...p, reportedAt: e.at };
      break;
    default:
      break;
  }
  // Index the event against the student it concerns (directly or via a match).
  const sn = p.studentNumber ?? m.matches[p.matchId]?.studentNumber ?? m.applications[p.applicationId]?.studentNumber;
  if (e.type !== 'opportunity.published') addTimeline(m, sn, e);
  return m;
}

export function project(log) {
  const m = emptyModel();
  for (const e of log) apply(m, e);
  return m;
}

/* ── Shared helpers ─────────────────────────────────────────────── */

/** Is this student eligible for this opportunity? EdOS knows the marks; Careers sets the bar. */
export function eligibility(opp, student) {
  const reasons = [];
  let ok = true;
  if (opp.faculties?.length && !opp.faculties.includes(student.faculty)) {
    ok = false;
    reasons.push(`For ${opp.faculties.join(', ')} students`);
  }
  if (opp.stages?.length && !opp.stages.includes(student.stage)) {
    ok = false;
    reasons.push(`For ${opp.stages.join(' / ').toLowerCase()} students`);
  }
  if (opp.minAverage != null) {
    if (student.average >= opp.minAverage) reasons.push(`You meet the ${opp.minAverage}% average`);
    else {
      ok = false;
      reasons.push(`Needs a ${opp.minAverage}% average — you’re on ${student.average}%`);
    }
  }
  return { ok, reasons };
}

export const isOpen = (opp) => !opp.closed && (!opp.closingDate || opp.closingDate >= new Date().toISOString().slice(0, 10));

export const daysUntil = (date) =>
  Math.ceil((new Date(`${date}T23:59:59`).getTime() - Date.now()) / 86400000);
