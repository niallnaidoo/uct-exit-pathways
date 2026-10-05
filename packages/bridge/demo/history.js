/**
 * DEMO DATA — the event history both systems replay on first load.
 *
 * Think of it as "the last two months of webhooks": EdOS syncing students,
 * Careers publishing opportunities, students declaring pathways and applying,
 * mentors being matched. Each app builds its own view from these events.
 */
import { demoRoster, syncPayload, academicsFor } from './roster.js';
import { demoOpportunities } from './opportunities.js';
import { demoAlumni, publicMentor } from './alumni.js';

const iso = (daysAgo, hour = 10) => {
  const d = new Date(Date.now() - daysAgo * 86400000);
  d.setHours(hour, (daysAgo * 17) % 60, 0, 0);
  return d.toISOString();
};
const dayFromNow = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

export function seedHistory() {
  const ev = [];
  const push = (daysAgo, type, from, payload, hour) => ev.push({ type, from, at: iso(daysAgo, hour), payload });
  const roster = demoRoster();
  const mentors = Object.fromEntries(demoAlumni().map((m) => [m.id, m]));

  // EdOS: nightly sync from the student information system (last night's run).
  roster.forEach((s, i) => push(1, 'student.synced', 'edos', syncPayload(s), 2 + (i % 3)));

  // EdOS: when each student last opened Opportunities (engagement signal).
  const viewed = { MLFKAG001: 1, ZNGAMA002: 3, JCBRUB003: 2, NDBZIN004: 6, CLKETH005: 4, STHLIN006: 9, ISCMOH007: 12, RDBPAL008: 15, BTHJOH009: 21, CELNOM010: 27, MNSDAN011: 2, HNDAAL012: 5, DBESIP013: 33, MKNTHA014: 3, NKSLER015: 8, MTHAYA103: 18, NTLBUS101: 50, PTRCRA102: 47 };
  for (const [sn, d] of Object.entries(viewed)) push(d, 'opportunities.viewed', 'edos', { studentNumber: sn }, 13);
  // ADMYUS016 (Yusuf) and JPPFAT104 (Fatima) have never opened Opportunities.

  // Careers: opportunities published over the last few weeks.
  demoOpportunities().forEach((o, i) => push(40 - i * 2, 'opportunity.published', 'careers', o, 9));

  // EdOS: pathway declarations (some students haven't declared — that's the risk).
  const decl = (sn, daysAgo, primary, backup, readiness, interests = [], note = '') =>
    push(daysAgo, 'pathway.declared', 'edos', { studentNumber: sn, pathways: [primary, backup].filter(Boolean), primary, backup, readiness, interests, note });
  decl('MLFKAG001', 34, 'employment', 'study', { cv: true, linkedin: true, applications: true, interview: false }, ['Finance & Banking']);
  decl('ZNGAMA002', 30, 'study', 'employment', { shortlist: true, requirements: true, funding: false, referees: false }, ['Finance & Banking', 'Consulting']);
  decl('JCBRUB003', 28, 'employment', null, { cv: true, linkedin: false, applications: true, interview: true }, ['Engineering']);
  decl('NDBZIN004', 26, 'employment', 'study', { cv: true, linkedin: true, applications: true, interview: false }, ['Law']);
  decl('CLKETH005', 24, 'venture', 'employment', { idea: true, budget: false, support: true, timeline: false }, ['Technology', 'Entrepreneurship'], 'Building a study-planner app with two friends.');
  decl('STHLIN006', 22, 'employment', 'study', { cv: true, linkedin: true, applications: false, interview: false }, ['Finance & Banking', 'Technology']);
  decl('ISCMOH007', 20, 'employment', null, { cv: true, linkedin: false, applications: true, interview: true }, ['Healthcare']);
  decl('RDBPAL008', 19, 'unsure', null, { advisor: false, explore: true, cv: false, mentor: false }, ['Media & Marketing']);
  decl('BTHJOH009', 18, 'employment', null, { cv: false, linkedin: false, applications: false, interview: false }, ['Mining & Energy', 'Engineering']);
  decl('MNSDAN011', 16, 'study', 'employment', { shortlist: true, requirements: true, funding: true, referees: true }, ['Law', 'Non-profit']);
  decl('HNDAAL012', 15, 'employment', null, { cv: true, linkedin: true, applications: false, interview: false }, ['Technology', 'Research & Academia']);
  decl('DBESIP013', 14, 'unsure', null, { advisor: false, explore: false, cv: false, mentor: false }, []);
  decl('MKNTHA014', 12, 'employment', null, { cv: true, linkedin: true, applications: true, interview: false }, ['Healthcare']);
  decl('NKSLER015', 10, 'venture', 'study', { idea: true, budget: true, support: false, timeline: false }, ['Non-profit', 'Education'], 'A conservation gap year, then possibly Honours.');
  // CELNOM010 (Nomvula) and ADMYUS016 (Yusuf) have NOT declared — Careers will flag them.

  // EdOS: saves and applications.
  const save = (d, sn, id) => push(d, 'opportunity.saved', 'edos', { studentNumber: sn, opportunityId: `opp-${id}`, saved: true });
  const nameOf = (sn) => {
    const s = roster.find((x) => x.studentNumber === sn);
    return `${s.firstName}_${s.lastName}`;
  };
  const apply = (d, appId, sn, id, linkedin = '') =>
    push(d, 'application.submitted', 'edos', {
      applicationId: appId,
      studentNumber: sn,
      opportunityId: `opp-${id}`,
      attachments: { cv: `${nameOf(sn)}_CV.pdf`, coverLetter: `${nameOf(sn)}_Cover_Letter.pdf`, transcript: 'EdOS academic transcript' },
      answers: linkedin ? { linkedin } : {},
    });
  save(32, 'MLFKAG001', 'ubuntu-grad');
  apply(31, 'app-1', 'MLFKAG001', 'ubuntu-grad', 'https://www.linkedin.com/in/example-kagiso');
  save(29, 'ZNGAMA002', 'ubuntu-bursary');
  save(29, 'ZNGAMA002', 'uct-hons-econ');
  apply(25, 'app-2', 'JCBRUB003', 'atlantic-eng');
  apply(23, 'app-3', 'NDBZIN004', 'hollard-articles');
  apply(21, 'app-4', 'CLKETH005', 'founders');
  apply(15, 'app-5', 'MNSDAN011', 'uct-llm');
  apply(15, 'app-6', 'MNSDAN011', 'cape-futures');
  apply(11, 'app-7', 'MKNTHA014', 'health-community');
  save(9, 'NKSLER015', 'ocean-gap');
  save(8, 'RDBPAL008', 'ubuntu-media-intern');
  push(6, 'application.updated', 'careers', { applicationId: 'app-2', studentNumber: 'JCBRUB003', status: 'shortlisted', by: 'Careers Service' });
  push(2, 'application.updated', 'careers', { applicationId: 'app-2', studentNumber: 'JCBRUB003', status: 'interview', by: 'Careers Service' });
  push(14, 'application.updated', 'careers', { applicationId: 'app-1', studentNumber: 'MLFKAG001', status: 'interview', by: 'Careers Service' });
  push(3, 'application.updated', 'careers', { applicationId: 'app-1', studentNumber: 'MLFKAG001', status: 'offer', by: 'Careers Service' });
  apply(9, 'app-8', 'STHLIN006', 'ubuntu-grad', 'https://www.linkedin.com/in/example-lindiwe');
  apply(4, 'app-9', 'HNDAAL012', 'kasi-dev', 'https://www.linkedin.com/in/example-aaliyah');

  // Careers: hand-picked sends — "we think this is for you".
  push(10, 'opportunity.sent', 'careers', { opportunityId: 'opp-ubuntu-grad', studentNumbers: ['STHLIN006', 'ZNGAMA002', 'CELNOM010'], message: 'Applications close soon — your marks and interests fit this programme well.', sentBy: 'Careers Service' });
  push(5, 'opportunity.sent', 'careers', { opportunityId: 'opp-kasi-dev', studentNumbers: ['HNDAAL012', 'CLKETH005'], message: 'A strong first role for anyone moving into software or data.', sentBy: 'Careers Service' });

  // When each student is usually free (day × slot keys).
  const FREE = {
    MLFKAG001: ['Tue-evening', 'Thu-evening', 'Sat-morning'],
    JCBRUB003: ['Mon-morning', 'Wed-morning', 'Fri-afternoon'],
    STHLIN006: ['Mon-lunch', 'Wed-lunch', 'Thu-evening'],
    NDBZIN004: ['Tue-lunch', 'Thu-lunch', 'Wed-evening'],
    HNDAAL012: ['Tue-afternoon', 'Fri-lunch'],
    CLKETH005: ['Mon-evening', 'Wed-evening', 'Sat-morning'],
    ZNGAMA002: ['Mon-lunch', 'Thu-lunch', 'Tue-evening'],
  };

  // EdOS: mentor requests (profile travels with the request).
  const req = (d, sn, f) =>
    push(d, 'mentorship.requested', 'edos', { studentNumber: sn, languages: ['English'], meetingFormat: 'Either', availability: FREE[sn] ?? [], accessNeeds: '', ...f });
  req(33, 'MLFKAG001', { careerInterests: ['Finance & Banking'], skillsWanted: ['Graduate programmes', 'Mock interviews'], goals: 'Land a place on a bank or audit graduate programme for 2027.', languages: ['English', 'Setswana'] });
  req(27, 'JCBRUB003', { careerInterests: ['Engineering', 'Public Sector'], skillsWanted: ['Career mapping', 'Workplace readiness'], goals: 'Decide between a consulting firm and a municipal placement.', meetingFormat: 'In person', languages: ['English', 'Afrikaans'] });
  req(21, 'STHLIN006', { careerInterests: ['Finance & Banking', 'Technology'], skillsWanted: ['CV & LinkedIn', 'Applications strategy'], goals: 'Move into data science in financial services.', languages: ['English', 'isiZulu'] });
  req(20, 'NDBZIN004', { careerInterests: ['Law'], skillsWanted: ['Applications strategy', 'Public speaking'], goals: 'Secure articles at a commercial firm.', meetingFormat: 'Online', languages: ['English', 'isiZulu'] });
  req(13, 'HNDAAL012', { careerInterests: ['Technology', 'Research & Academia'], skillsWanted: ['Career mapping', 'CV & LinkedIn'], goals: 'Pivot from lab research into a biotech or data role.' });
  req(9, 'CLKETH005', { careerInterests: ['Technology', 'Entrepreneurship'], skillsWanted: ['Starting a business', 'Mock interviews'], goals: 'Test whether our app can become a real company.' });
  req(7, 'ZNGAMA002', { careerInterests: ['Consulting', 'Finance & Banking'], skillsWanted: ['Networking', 'Postgraduate study'], goals: 'Choose between Honours and a consulting vac-work route.', languages: ['English', 'isiZulu'] });

  // Careers: mentor offers → EdOS: students answer.
  const offer = (d, matchId, mentorId, sn, score) =>
    push(d, 'mentorship.offer.made', 'careers', { matchId, mentorId, studentNumber: sn, score, mentor: publicMentor(mentors[mentorId]) });
  const answer = (d, matchId, sn) => push(d, 'mentorship.offer.responded', 'edos', { matchId, studentNumber: sn, accept: true });
  // On accepting, the student shares their marks & tests with that mentor (consent in EdOS).
  const share = (d, matchId, sn) =>
    push(d, 'mentorship.academics.shared', 'edos', { matchId, studentNumber: sn, shared: true, modules: academicsFor(roster.find((x) => x.studentNumber === sn)) });
  offer(30, 'mat-1', 'alm-demo-1', 'MLFKAG001', 88);
  answer(29, 'mat-1', 'MLFKAG001');
  share(29, 'mat-1', 'MLFKAG001');
  offer(24, 'mat-2', 'alm-demo-2', 'JCBRUB003', 92);
  answer(23, 'mat-2', 'JCBRUB003');
  share(23, 'mat-2', 'JCBRUB003');
  offer(18, 'mat-3', 'alm-demo-1', 'STHLIN006', 74);
  answer(17, 'mat-3', 'STHLIN006');
  share(17, 'mat-3', 'STHLIN006');
  offer(2, 'mat-4', 'alm-demo-3', 'NDBZIN004', 85); // waiting for Zinhle
  push(28, 'mentorship.milestone.updated', 'careers', { matchId: 'mat-1', key: 'kickoff', done: true });
  push(12, 'mentorship.milestone.updated', 'careers', { matchId: 'mat-1', key: 'mapping', done: true });
  push(20, 'mentorship.milestone.updated', 'careers', { matchId: 'mat-2', key: 'kickoff', done: true });
  push(15, 'mentorship.milestone.updated', 'careers', { matchId: 'mat-3', key: 'kickoff', done: true });
  push(15, 'mentorship.meeting.scheduled', 'careers', { meetingId: 'mtg-1', matchId: 'mat-1', date: dayFromNow(-11), time: '17:30', format: 'Online', agenda: 'CV review and LinkedIn headline', bookedBy: 'mentor' });
  push(5, 'mentorship.meeting.scheduled', 'careers', { meetingId: 'mtg-2', matchId: 'mat-1', date: dayFromNow(3), time: '17:30', format: 'Online', agenda: 'Mock interview — competency questions', bookedBy: 'mentor' });
  push(3, 'mentorship.meeting.scheduled', 'edos', { meetingId: 'mtg-3', matchId: 'mat-3', date: dayFromNow(6), time: '12:30', format: 'In person', agenda: 'Agree 3–5 SMART goals', bookedBy: 'mentee' });
  push(2, 'mentorship.meeting.scheduled', 'careers', { meetingId: 'mtg-4', matchId: 'mat-2', date: dayFromNow(9), time: '08:00', format: 'In person', agenda: 'Site visit — water treatment project', bookedBy: 'mentor' });
  push(2, 'mentorship.message.sent', 'edos', { messageId: 'msg-1', matchId: 'mat-1', from: 'mentee', text: 'Hi Naledi — I got an offer from Ubuntu Bank! Can we talk through it before I accept?' });
  push(1, 'mentorship.message.sent', 'careers', { messageId: 'msg-2', matchId: 'mat-1', from: 'mentor', text: 'Kagiso, that’s brilliant news! Yes — bring the offer letter on Thursday and we’ll go through it line by line.' });
  push(11, 'mentorship.message.sent', 'edos', { messageId: 'msg-3', matchId: 'mat-3', from: 'mentee', text: 'Thanks for taking me on! Looking forward to our first proper session.' });

  // Careers: reaching students at risk of unemployment → EdOS: they respond.
  push(8, 'intervention.assigned', 'careers', { interventionId: 'int-1', studentNumber: 'DBESIP013', type: 'advising', title: 'Careers advisor session', message: 'Hi Sipho — let’s map out your options together. Pick a slot that suits you.', dueDate: dayFromNow(4), by: 'Careers Service' });
  push(7, 'intervention.updated', 'edos', { interventionId: 'int-1', studentNumber: 'DBESIP013', status: 'booked', note: 'Booked Thursday 14:00' });
  push(5, 'intervention.assigned', 'careers', { interventionId: 'int-2', studentNumber: 'ADMYUS016', type: 'cv-clinic', title: 'CV & LinkedIn clinic', message: 'Hi Yusuf — graduate recruiting closes soon. Come get your CV employer-ready this week.', dueDate: dayFromNow(6), by: 'Careers Service' });
  push(4, 'intervention.assigned', 'careers', { interventionId: 'int-3', studentNumber: 'MTHAYA103', type: 'placement', title: 'Youth employment placement', message: 'Hi Ayanda — we’d like to put you forward for a paid 12-month first-job placement. Interested?', dueDate: dayFromNow(10), by: 'Careers Service' });

  // EdOS: class of 2025 report where they landed.
  push(45, 'destination.reported', 'edos', { studentNumber: 'NTLBUS101', destination: 'employment', detail: 'Graduate analyst', organisation: 'Ubuntu Bank (sample)' });
  push(44, 'destination.reported', 'edos', { studentNumber: 'PTRCRA102', destination: 'study', detail: 'BSc (Hons) Geology', organisation: 'UCT' });
  push(43, 'destination.reported', 'edos', { studentNumber: 'MTHAYA103', destination: 'seeking', detail: 'Applying for policy and research roles', organisation: '' });

  return ev.sort((a, b) => a.at.localeCompare(b.at));
}
