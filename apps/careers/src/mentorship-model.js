/**
 * Alumni mentorship programme — the pure model.
 *
 * University-wide: penultimate/final-year students (all faculties) matched with
 * UCT alumni mentors. Holds the option lists the sign-up forms share, the
 * matching score (algorithmic pre-match; a human still confirms), the milestone
 * track that replaces the sport RAG flags, and the pulse-survey rules.
 */
export {
  FACULTIES,
  INDUSTRIES,
  SKILLS,
  LANGUAGES,
  STAGES,
  MILESTONES,
} from '../../../packages/bridge/vocab.js';
import { MILESTONES } from '../../../packages/bridge/vocab.js';

export const MENTORING_TYPES = ['1:1 mentoring', 'Group mentoring', 'Either'];
export const MEETING_FORMATS = ['Online', 'In person', 'Either'];
export const FREQUENCIES = ['Weekly', 'Fortnightly', 'Monthly', 'Ad hoc'];
export const PERIODS = ['6 months', '12 months'];

/** What every mentor agrees to before submitting (Code of Conduct summary). */
export const EXPECTATIONS = [
  'Keep all contact within the mentoring relationship and the platform — no personal favours, money or gifts.',
  'Respect confidentiality: what a mentee shares stays between you, unless someone is at risk.',
  'Show up: confirm meetings, give 24 hours’ notice to reschedule, and reply within a few days.',
  'Stay in your lane: guide and signpost — refer wellbeing, financial or academic-rule issues to UCT services.',
  'Be inclusive: treat every mentee with dignity, whatever their background, identity or ability.',
  'Raise concerns early with the programme office — you are never on your own.',
];

export const CONSENTS = [
  { key: 'conduct', label: 'I accept the Mentor Code of Conduct.' },
  { key: 'safeguarding', label: 'I accept the Safeguarding policy and will report any concern.' },
  {
    key: 'popia',
    label:
      'I consent to UCT processing my information for this programme (POPIA). Mentees see my profile; my contact details stay private until we are matched.',
  },
];

/** Where mentors signpost students — the UCT referral map. */
export const REFERRAL_MAP = [
  { name: 'Faculty academic advisor', when: 'Course load, credits, exclusion or readmission questions' },
  { name: 'Student Wellness Service', when: 'Stress, anxiety, low mood or any wellbeing concern' },
  { name: 'Disability Service', when: 'Access needs, accommodations, assistive technology' },
  { name: 'Financial Aid office', when: 'Fees, funding, NSFAS or bursary questions' },
  { name: 'Office for Inclusivity & Change', when: 'Harassment, discrimination or sexual misconduct' },
  { name: 'Careers Service', when: 'Graduate recruitment, CV clinics, job-readiness workshops' },
];



/** Resources & mentoring guides on the mentor dashboard. */
export const RESOURCES = [
  { title: 'Mentoring fundamentals', kind: 'Micro-training · 15 min', body: 'What good mentoring looks like, how to listen well, and how to set the tone in a first meeting.' },
  { title: 'Setting SMART goals together', kind: 'Guide · 5 min', body: 'Turn “I want a good job” into 3–5 goals that are specific, measurable and owned by the mentee.' },
  { title: 'The mentoring compact', kind: 'Template', body: 'A one-page agreement on how often you meet, how you communicate and what each of you commits to.' },
  { title: 'Boundaries & safeguarding', kind: 'Micro-training · 10 min', body: 'Where mentoring stops, what to do if a mentee discloses something serious, and who to call.' },
  { title: 'Inclusive communication', kind: 'Micro-training · 10 min', body: 'Working across language, culture, class and ability — and noticing your own assumptions.' },
  { title: 'Running a mock interview', kind: 'Guide · 8 min', body: 'A 30-minute structure with competency questions and how to give feedback that lands.' },
  { title: 'CV & LinkedIn checklist', kind: 'Checklist', body: 'The twelve things graduate recruiters look at first — work through it line by line with your mentee.' },
  { title: 'UCT referral map', kind: 'Reference', body: 'Who to point a student to for wellbeing, funding, disability, academic rules or harassment.' },
];

/** Pulse check-in — 3–5 quick questions; a low score opens a case review. */
export const PULSE_QUESTIONS = [
  { key: 'connection', label: 'How well is the mentoring relationship working?' },
  { key: 'progress', label: 'How much progress is being made on the goals?' },
  { key: 'engagement', label: 'How engaged is the other person (meetings, replies)?' },
  { key: 'support', label: 'How supported do you feel by the programme office?' },
];
export const PULSE_REVIEW_BELOW = 3; // any answer under this flags a case review

export function pulseNeedsReview(answers) {
  return Object.values(answers ?? {}).some((v) => Number(v) > 0 && Number(v) < PULSE_REVIEW_BELOW);
}

const overlap = (a = [], b = []) => a.filter((x) => b.includes(x));

/**
 * Algorithmic pre-match: how well a mentor's "who I can support" fits a mentee.
 * Returns { score 0–100, reasons[], eligible }. Not eligible = outside the stages
 * the mentor said they support (never shown as a match). A person confirms fit.
 */
export function matchScore(mentor, mentee) {
  const reasons = [];
  let score = 0;
  const stages = mentor.supportStages ?? [];
  const eligible = !stages.length || stages.includes(mentee.stage);

  const faculties = mentor.supportFaculties?.length ? mentor.supportFaculties : [mentor.faculty];
  if (faculties.includes(mentee.faculty)) {
    score += 25;
    reasons.push(`${mentee.faculty} student`);
  }
  const industries = overlap(mentee.careerInterests, mentor.supportIndustries);
  if (industries.length) {
    score += Math.min(30, industries.length * 15);
    reasons.push(`Interested in ${industries.slice(0, 2).join(' & ')}`);
  }
  const skills = overlap(mentee.skillsWanted, mentor.skillsToMentor);
  if (skills.length) {
    score += Math.min(25, skills.length * 9);
    reasons.push(`Wants help with ${skills.slice(0, 2).join(', ')}`);
  }
  if (eligible && stages.length) {
    score += 10;
    reasons.push(mentee.stage);
  }
  const langs = overlap(mentee.languages, mentor.languages).filter((l) => l !== 'English');
  if (langs.length) {
    score += 5;
    reasons.push(`Speaks ${langs[0]}`);
  }
  const fmt = mentor.meetingFormat;
  if (!fmt || fmt === 'Either' || !mentee.meetingFormat || mentee.meetingFormat === 'Either' || fmt === mentee.meetingFormat) {
    score += 5;
  }
  return { score: Math.min(100, score), reasons, eligible };
}

/** A mentee counts as a "possible match" for this mentor's profile. */
export const MATCH_THRESHOLD = 40;
export function isPossibleMatch(mentor, mentee) {
  const m = matchScore(mentor, mentee);
  return m.eligible && m.score >= MATCH_THRESHOLD;
}

export function maxMentees(mentor) {
  return Number(mentor.maxMentees) || 1;
}

/** Display name a mentee shows to a mentor before matching (first name + initial). */
export function menteeShortName(m) {
  return `${m.firstName} ${(m.lastName ?? '').slice(0, 1)}.`.trim();
}

/** How far through the milestone track a match is (0–100). */
export function milestoneProgress(match) {
  const done = MILESTONES.filter((ms) => match.milestones?.[ms.key]).length;
  return Math.round((done / MILESTONES.length) * 100);
}

export const MATCH_STATUS = {
  offered: { label: 'Awaiting student', tone: 'gold' },
  active: { label: 'Active', tone: 'teal' },
  declined: { label: 'Declined', tone: 'muted' },
  closed: { label: 'Completed', tone: 'navy' },
  rematch: { label: 'Rematch', tone: 'coral' },
  withdrawn: { label: 'Withdrawn', tone: 'muted' },
};
