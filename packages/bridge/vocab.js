/**
 * Shared vocabulary — the words both systems agree on.
 *
 * EdOS (the LMS) and the Careers Service platform are separate products. They
 * only exchange events (see contract.js). This file is the common language
 * those events are written in: exit pathways, opportunity kinds, interventions,
 * destinations, and the option lists used for matching.
 */

/** The four exit pathways a graduating student can take. */
export const PATHWAYS = [
  {
    key: 'study',
    label: 'Further study',
    short: 'Study',
    student: 'Keep studying — Honours, Masters, a PGDip or a programme elsewhere.',
    tone: 'study',
  },
  {
    key: 'employment',
    label: 'Employment',
    short: 'Work',
    student: 'Start working — a graduate programme, a job or an internship.',
    tone: 'employment',
  },
  {
    key: 'venture',
    label: 'Start-up & self-discovery',
    short: 'Venture',
    student: 'Build something or take a planned gap — a start-up, volunteering, travel or a passion project.',
    tone: 'venture',
  },
  {
    key: 'unsure',
    label: 'Not sure yet',
    short: 'Unsure',
    student: 'Still figuring it out. That’s normal — we’ll help you explore.',
    tone: 'unsure',
  },
];
export const pathwayMeta = (key) => PATHWAYS.find((p) => p.key === key) ?? null;

/**
 * Where a graduate actually ended up. "seeking" is the unemployment outcome the
 * whole programme exists to reduce.
 */
export const DESTINATIONS = [
  { key: 'employment', label: 'Employed', tone: 'employment' },
  { key: 'study', label: 'Further study', tone: 'study' },
  { key: 'venture', label: 'Start-up / self-employed', tone: 'venture' },
  { key: 'seeking', label: 'Seeking work', tone: 'seeking' },
];
export const destinationMeta = (key) => DESTINATIONS.find((d) => d.key === key) ?? null;

/** Every kind of opportunity the Careers Service publishes into EdOS. */
export const OPPORTUNITY_KINDS = [
  { key: 'gradprog', label: 'Graduate programme', pathway: 'employment' },
  { key: 'job', label: 'Graduate job', pathway: 'employment' },
  { key: 'internship', label: 'Internship / vac work', pathway: 'employment' },
  { key: 'workready', label: 'Work-readiness & placement', pathway: 'employment' },
  { key: 'uct-programme', label: 'UCT postgraduate programme', pathway: 'study' },
  { key: 'external-programme', label: 'External programme', pathway: 'study' },
  { key: 'bursary', label: 'Bursary', pathway: 'study' },
  { key: 'scholarship', label: 'Scholarship', pathway: 'study' },
  { key: 'volunteer', label: 'Volunteering', pathway: 'venture' },
  { key: 'venture-support', label: 'Start-up support', pathway: 'venture' },
  { key: 'gap', label: 'Gap & exploration', pathway: 'venture' },
];
export const kindMeta = (key) => OPPORTUNITY_KINDS.find((k) => k.key === key) ?? { key, label: key };

/** Support the Careers Service can assign to a student (lands in their EdOS). */
export const INTERVENTIONS = [
  { key: 'advising', label: 'Careers advisor session', blurb: 'A 30-minute one-on-one to map your options.' },
  { key: 'cv-clinic', label: 'CV & LinkedIn clinic', blurb: 'Get your CV and LinkedIn employer-ready.' },
  { key: 'mock-interview', label: 'Mock interview', blurb: 'Practise with a recruiter and get feedback.' },
  { key: 'workready', label: 'Work-readiness bootcamp', blurb: 'A week of workplace skills, ending in employer meet-ups.' },
  { key: 'mentor', label: 'Alumni mentor', blurb: 'Be matched with a UCT alumnus in your field.' },
  { key: 'placement', label: 'Youth employment placement', blurb: 'A paid 12-month first-job placement with a partner employer.' },
];
export const interventionMeta = (key) => INTERVENTIONS.find((i) => i.key === key) ?? { key, label: key };

export const FACULTIES = [
  'Commerce',
  'Engineering & the Built Environment',
  'Health Sciences',
  'Humanities',
  'Law',
  'Science',
];

export const STAGES = ['Penultimate year', 'Final year', 'Honours', 'Masters (career change)'];

export const INDUSTRIES = [
  'Finance & Banking',
  'Consulting',
  'Technology',
  'Engineering',
  'Law',
  'Healthcare',
  'Public Sector',
  'Education',
  'Media & Marketing',
  'Mining & Energy',
  'Entrepreneurship',
  'Sport & Recreation',
  'Non-profit',
  'Research & Academia',
];

export const SKILLS = [
  'CV & LinkedIn',
  'Mock interviews',
  'Networking',
  'Applications strategy',
  'Career mapping',
  'Study skills',
  'Time management',
  'Leadership',
  'Public speaking',
  'Workplace readiness',
  'Graduate programmes',
  'Postgraduate study',
  'Starting a business',
  'Financial literacy',
];

export const LANGUAGES = ['English', 'isiXhosa', 'isiZulu', 'Afrikaans', 'Sesotho', 'Setswana', 'French', 'Portuguese'];

/** Pathway readiness checklist — what "ready" means for each pathway. */
export const READINESS = {
  study: [
    { key: 'shortlist', label: 'Shortlisted 2–3 programmes' },
    { key: 'requirements', label: 'Checked entry requirements' },
    { key: 'funding', label: 'Applied for funding (bursary / scholarship)' },
    { key: 'referees', label: 'Asked two academic referees' },
  ],
  employment: [
    { key: 'cv', label: 'CV is up to date' },
    { key: 'linkedin', label: 'LinkedIn profile complete' },
    { key: 'applications', label: 'Applied to at least 3 roles' },
    { key: 'interview', label: 'Practised interviewing' },
  ],
  venture: [
    { key: 'idea', label: 'Written down the idea or plan' },
    { key: 'budget', label: 'Planned how to support myself' },
    { key: 'support', label: 'Found a programme, incubator or volunteer role' },
    { key: 'timeline', label: 'Set a timeline and a fallback' },
  ],
  unsure: [
    { key: 'advisor', label: 'Booked a careers advisor session' },
    { key: 'explore', label: 'Explored at least two pathways' },
    { key: 'cv', label: 'CV is up to date' },
    { key: 'mentor', label: 'Asked for an alumni mentor' },
  ],
};

/** Stage label from a year of study + qualification level. */
export function stageFor(student) {
  if (student.level === 'masters') return 'Masters (career change)';
  if (student.level === 'honours') return 'Honours';
  return student.yearOfStudy >= student.programmeYears ? 'Final year' : 'Penultimate year';
}

/** The mentorship milestone track (Careers sets it; the student sees it in EdOS). */
export const MILESTONES = [
  { key: 'kickoff', label: 'Kick-off', when: 'Weeks 1–2', detail: 'Rapport, 3–5 SMART goals, mentoring compact signed' },
  { key: 'mapping', label: 'Career mapping', when: 'Months 1–3', detail: 'Career map, skills-gap analysis, CV & LinkedIn refined' },
  { key: 'networking', label: 'Interviews & networking', when: 'Months 4–6', detail: 'Mock interviews, networking strategy, informational interviews' },
  { key: 'applications', label: 'Applications', when: 'Months 7–9', detail: 'Applications strategy, reflection, transition plan' },
  { key: 'closeout', label: 'Close-out', when: 'Final month', detail: 'Goals reviewed, outcomes documented, testimonial captured' },
];
