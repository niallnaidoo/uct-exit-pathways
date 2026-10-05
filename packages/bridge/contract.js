/**
 * The integration contract between EdOS and the Careers Service platform.
 *
 * Every fact that crosses from one system to the other is one of these events.
 * Nothing else is shared — no common database. In this prototype the events
 * travel over an in-browser bus (bus.js); in production each one becomes a
 * signed webhook / message on a queue, with exactly the payload documented here.
 *
 * `from` = the system of record that is allowed to emit it.
 *   edos    — the LMS: owns the student, their academic record and their choices
 *   careers — the Careers Service: owns opportunities, interventions, mentors
 */
export const SYSTEMS = {
  edos: { key: 'edos', label: 'EdOS', role: 'Learning platform (system of record for students)' },
  careers: { key: 'careers', label: 'Careers Service', role: 'Pathways, opportunities & mentorship' },
};

export const EVENTS = {
  /* ── EdOS → Careers ───────────────────────────────────────────── */
  'student.synced': {
    from: 'edos',
    title: 'Student profile synced',
    why: 'Careers needs who the student is and how they are doing academically — without re-capturing it.',
    payload:
      '{ studentNumber, firstName, lastName, email, faculty, degree, yearOfStudy, stage, expectedGraduation, average, creditsCompleted, creditsRequired, status: registered|graduated, nextTest: { code, module, label, date }, gradebook: { recorded, due, total } }',
  },
  'opportunities.viewed': {
    from: 'edos',
    title: 'Opportunities checked',
    why: 'Engagement signal — when a student last looked at what Careers has published.',
    payload: '{ studentNumber }',
  },
  'pathway.declared': {
    from: 'edos',
    title: 'Exit pathway declared',
    why: 'The student says where they are heading after UCT, and how ready they feel.',
    payload: '{ studentNumber, primary, backup, readiness: { [item]: boolean }, interests: string[], note }',
  },
  'opportunity.saved': {
    from: 'edos',
    title: 'Opportunity saved',
    why: 'Interest signal — tells Careers what students are looking at.',
    payload: '{ studentNumber, opportunityId, saved }',
  },
  'application.submitted': {
    from: 'edos',
    title: 'Application submitted',
    why: 'A student applied from inside EdOS — CV, cover letter, LinkedIn, and the transcript attached by EdOS.',
    payload: '{ applicationId, studentNumber, opportunityId, attachments: { cv, coverLetter, transcript }, answers: { linkedin } }',
  },
  'mentorship.requested': {
    from: 'edos',
    title: 'Mentor requested',
    why: 'Student asks for an alumni mentor; their academic profile comes with it automatically.',
    payload: '{ studentNumber, careerInterests, skillsWanted, goals, languages, meetingFormat, availability, accessNeeds }',
  },
  'mentorship.offer.responded': {
    from: 'edos',
    title: 'Mentor offer answered',
    why: 'The student agrees (or not) — nothing starts until they do.',
    payload: '{ matchId, studentNumber, accept, reason }',
  },
  'intervention.updated': {
    from: 'edos',
    title: 'Support action answered',
    why: 'The student booked, completed or declined support Careers assigned.',
    payload: '{ interventionId, studentNumber, status: booked|done|declined, note }',
  },
  'destination.reported': {
    from: 'edos',
    title: 'Graduate destination reported',
    why: 'Where a graduate actually landed. "seeking" = unemployed, the outcome we exist to reduce.',
    payload: '{ studentNumber, destination: employment|study|venture|seeking, detail, organisation }',
  },

  /* ── Careers → EdOS ───────────────────────────────────────────── */
  'opportunity.published': {
    from: 'careers',
    title: 'Opportunity published',
    why: 'Jobs, programmes, bursaries, scholarships and volunteering appear inside EdOS for eligible students.',
    payload:
      '{ id, kind, title, organisation, employerId, location, workMode, positions, summary, faculties[], degrees[], years[], minAverage, closingDate, value, requirements: { cv, coverLetter, transcript, linkedin }, postedBy }',
  },
  'opportunity.sent': {
    from: 'careers',
    title: 'Opportunity sent to students',
    why: 'Careers hand-picks students for an opportunity — it lands in their EdOS as “Sent to you”.',
    payload: '{ opportunityId, studentNumbers[], message, sentBy }',
  },
  'opportunity.closed': {
    from: 'careers',
    title: 'Opportunity closed',
    why: 'Removed from student feeds.',
    payload: '{ opportunityId }',
  },
  'intervention.assigned': {
    from: 'careers',
    title: 'Support assigned',
    why: 'Careers reaches a student who is at risk of unemployment — it lands as a task in their EdOS.',
    payload: '{ interventionId, studentNumber, type, title, message, dueDate, by }',
  },
  'mentorship.offer.made': {
    from: 'careers',
    title: 'Mentor offer made',
    why: 'An approved alumnus offers to mentor the student (public profile only, no contact details).',
    payload: '{ matchId, mentorId, studentNumber, score, mentor: { public profile } }',
  },
  'mentorship.match.updated': {
    from: 'careers',
    title: 'Mentorship status changed',
    why: 'Office closes out or re-matches a mentorship.',
    payload: '{ matchId, status: active|closed|rematch, reason }',
  },
  'mentorship.milestone.updated': {
    from: 'careers',
    title: 'Milestone ticked',
    why: 'Mentor marks progress on the readiness track; the student sees it in EdOS.',
    payload: '{ matchId, key, done }',
  },

  /* ── Both directions ──────────────────────────────────────────── */
  'application.updated': {
    from: 'both',
    title: 'Application status changed',
    why: 'Careers moves an applicant through the hiring stages; a student reports outcomes. Feeds destinations.',
    payload: '{ applicationId, studentNumber, status: submitted|shortlisted|interview|offer|accepted|unsuccessful|withdrawn, by }',
  },
  'mentorship.message.sent': {
    from: 'both',
    title: 'Mentorship message',
    why: 'Mentor writes in Careers, student replies in EdOS — one conversation.',
    payload: '{ messageId, matchId, from: mentor|mentee, text }',
  },
  'mentorship.meeting.scheduled': {
    from: 'both',
    title: 'Meeting booked',
    why: 'Either side books; both calendars show it.',
    payload: '{ meetingId, matchId, date, time, format, agenda, bookedBy }',
  },
};

export const eventMeta = (type) => EVENTS[type] ?? { from: '?', title: type, why: '', payload: '' };
