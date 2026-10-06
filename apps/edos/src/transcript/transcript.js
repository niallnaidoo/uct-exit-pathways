/**
 * UCT transcript — upload, read, store, summarise. (EdOS-owned, prototype.)
 *
 * Two ways in:
 *  - CSV using the template below (parsed for real).
 *  - A PDF / image of the official UCT transcript. Reading those properly needs
 *    UCT's transcript template (to come); until then the prototype simulates the
 *    extraction from the student's record so the review → visualise flow can be
 *    shown end to end.
 *
 * The transcript stays in EdOS (the student's own record). Nothing here is sent
 * to the Careers Service.
 */

const KEY = 'uct-edos-transcripts'; // `uct-` prefix: cleared by "Reset demo data"

/** UCT results symbols (pass classes). */
export const BANDS = [
  { key: '1', label: 'First class', short: '1st', min: 75 },
  { key: '2+', label: 'Upper second', short: '2+', min: 70 },
  { key: '2-', label: 'Lower second', short: '2−', min: 60 },
  { key: '3', label: 'Third class', short: '3', min: 50 },
  { key: 'F', label: 'Fail', short: 'F', min: 0 },
];
export const bandFor = (mark) => BANDS.find((b) => mark >= b.min) ?? BANDS[BANDS.length - 1];

/* ── Storage (per student) ─────────────────────────────────────── */
function all() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}
export const getTranscript = (sn) => all()[sn] ?? null;
export function saveTranscript(sn, t) {
  localStorage.setItem(KEY, JSON.stringify({ ...all(), [sn]: t }));
}
export function removeTranscript(sn) {
  const a = all();
  delete a[sn];
  localStorage.setItem(KEY, JSON.stringify(a));
}

/* ── CSV template ──────────────────────────────────────────────── */
export const TEMPLATE_HEADER = ['Year', 'Term', 'Course code', 'Course name', 'Credits', 'Mark'];
export function templateCsv() {
  return [
    TEMPLATE_HEADER.join(','),
    '2024,First semester,ECO1010F,Microeconomics,18,68',
    '2024,Second semester,ECO1011S,Macroeconomics,18,71',
    '2025,Full year,ACC2012W,Accounting II,36,64',
  ].join('\n');
}

/** Parse a transcript CSV (template columns, any order, header required). */
export function parseTranscriptCsv(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error('That file has no course rows.');
  const split = (l) => l.split(/[,;\t]/).map((x) => x.trim().replace(/^"|"$/g, ''));
  const head = split(lines[0]).map((h) => h.toLowerCase());
  const col = (re) => head.findIndex((h) => re.test(h));
  const idx = { year: col(/year/), term: col(/term|semester|period/), code: col(/code/), name: col(/name|course$|title/), credits: col(/credit/), mark: col(/mark|result|%/) };
  if (idx.code < 0 || idx.mark < 0) throw new Error('Use the template — it needs at least “Course code” and “Mark” columns.');
  const courses = lines.slice(1).map((l) => {
    const c = split(l);
    const mark = Number(c[idx.mark]);
    return {
      year: Number(c[idx.year]) || null,
      term: idx.term >= 0 ? c[idx.term] : '',
      code: (c[idx.code] || '').toUpperCase(),
      name: idx.name >= 0 ? c[idx.name] : '',
      credits: Number(c[idx.credits]) || 0,
      mark: Number.isFinite(mark) ? mark : null,
    };
  });
  const good = courses.filter((c) => c.code && c.mark != null);
  if (!good.length) throw new Error('No readable course rows — check the Course code and Mark columns.');
  return good;
}

/* ── Simulated extraction from an official PDF (until the template arrives) ── */

const POOLS = {
  Commerce: [
    ['ACC1006F', 'Financial Accounting'], ['ECO1010F', 'Microeconomics'], ['MAM1010F', 'Mathematics 1010'], ['INF1002F', 'Information Systems I'],
    ['ECO1011S', 'Macroeconomics'], ['STA1000S', 'Statistics 1000'], ['BUS1036S', 'Evidence-Based Management'], ['CML1001S', 'Business Law I'],
    ['ACC2012W', 'Accounting II'], ['ECO2003F', 'Microeconomics II'], ['FTX2020F', 'Finance II'], ['BUS2010F', 'Marketing I'],
    ['ECO2004S', 'Macroeconomics II'], ['STA2020S', 'Applied Statistics'], ['ACC2022S', 'Management Accounting II'], ['BUS2016S', 'Organisational Behaviour'],
  ],
  'Engineering & the Built Environment': [
    ['MAM1020F', 'Mathematics 1A'], ['PHY1012F', 'Physics A'], ['MEC1003F', 'Engineering Mechanics'], ['EEE1006F', 'Electrical Engineering I'],
    ['MAM1021S', 'Mathematics 1B'], ['PHY1013S', 'Physics B'], ['CIV1006S', 'Engineering Drawing'], ['CHE1005S', 'Chemistry for Engineers'],
    ['MAM2083F', 'Vector Calculus'], ['CIV2006F', 'Strength of Materials'], ['EEE2045F', 'Circuits & Systems'], ['MEC2026F', 'Thermofluids'],
    ['MAM2084S', 'Linear Algebra & DEs'], ['CIV2007S', 'Structural Analysis'], ['EEE2046S', 'Embedded Systems'], ['CIV2010S', 'Fluid Mechanics'],
  ],
  'Health Sciences': [
    ['HUB1006F', 'Human Biology'], ['CHM1010F', 'Chemistry for Health'], ['PSY1004F', 'Psychology I'], ['PPH1001F', 'Becoming a Health Professional'],
    ['HUB1007S', 'Integrated Physiology'], ['AHS1042S', 'Anatomy'], ['PSY1005S', 'Psychology II'], ['PPH1002S', 'Health in Context'],
    ['AHS2045W', 'Clinical Practice II'], ['HUB2017F', 'Human Physiology II'], ['AHS2047F', 'Musculoskeletal Science'], ['PPH2003S', 'Research Methods'],
  ],
  Humanities: [
    ['ELL1013F', 'English Studies'], ['PSY1004F', 'Psychology I'], ['POL1004F', 'Introduction to Politics'], ['SOC1001F', 'Introduction to Sociology'],
    ['FAM1000S', 'Media & Society'], ['HST1005S', 'History of Africa'], ['PHI1024S', 'Introduction to Philosophy'], ['SOC1005S', 'Social Problems'],
    ['ELL2005F', 'Literature & Society'], ['POL2038F', 'Political Theory'], ['PSY2006F', 'Research Methods in Psychology'], ['FAM2003F', 'Media Production II'],
    ['SOC2004S', 'Sociology of Work'], ['POL2039S', 'South African Politics'], ['PSY2009S', 'Developmental Psychology'], ['EGS2013S', 'Environmental Policy'],
  ],
  Law: [
    ['PVL1003W', 'Foundations of SA Law'], ['PVL1004F', 'Law of Persons & Family'], ['PBL1002S', 'Introduction to Legal Theory'], ['CML1001F', 'Business Law I'],
    ['PBL2000W', 'Constitutional Law'], ['PVL2002H', 'Law of Contract'], ['PVL2003H', 'Law of Delict'], ['CML2001F', 'Commercial Law I'],
    ['PVL3003F', 'Property Law'], ['PBL3001F', 'Criminal Law'], ['CML3001S', 'Corporation Law'], ['PBL3801S', 'Administrative Law'],
  ],
  Science: [
    ['CSC1015F', 'Computer Science 1015'], ['MAM1000W', 'Mathematics 1000'], ['STA1006S', 'Mathematical Statistics I'], ['CSC1016S', 'Computer Science 1016'],
    ['BIO1000F', 'Cell Biology'], ['CEM1000W', 'Chemistry 1000'], ['GEO1009F', 'Earth Sciences'], ['MCB1000S', 'Molecular Biology I'],
    ['CSC2001F', 'Data Structures'], ['CSC2002S', 'Advanced Programming'], ['STA2004F', 'Statistical Theory'], ['MAM2000W', 'Mathematics II'],
    ['MCB2020F', 'Biochemistry'], ['STA2005S', 'Regression Analysis'], ['INF2009F', 'Systems Analysis'], ['CSC2004Z', 'Software Practice'],
  ],
};

const hash = (s) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
const termOf = (code) => ({ F: 'First semester', S: 'Second semester', W: 'Full year', H: 'Full year', Z: 'Summer term' })[code.slice(-1)] ?? 'Full year';
const creditsOf = (code) => (/[WH]$/.test(code) ? 36 : 18);

/** Prior years' results, derived from the student's record (stand-in for PDF reading). */
export function simulateFromRecord(s) {
  const pool = POOLS[s.faculty] ?? POOLS.Science;
  const startYear = Number(s.expectedGraduation) - s.programmeYears + 1;
  const completedYears = s.status === 'graduated' ? s.programmeYears : Math.max(0, s.yearOfStudy - 1);
  const perYear = 7;
  const courses = [];
  for (let y = 0; y < completedYears; y++) {
    // Most students improve a little each year.
    const drift = (y - (completedYears - 1) / 2) * 2.5;
    for (let i = 0; i < perYear; i++) {
      const [code, name] = pool[(y * perYear + i) % pool.length];
      const noise = (hash(code + s.studentNumber) % 15) - 7;
      let mark = Math.round(Math.max(38, Math.min(92, s.average + drift + noise)));
      if (s.average < 56 && y === 0 && i === 2) mark = 46; // a supplementary-exam story for low averages
      courses.push({ year: startYear + y, term: termOf(code), code, name, credits: creditsOf(code), mark });
    }
  }
  return courses;
}

/* ── Summaries for the charts ──────────────────────────────────── */

const weighted = (cs) => {
  const credits = cs.reduce((t, c) => t + (c.credits || 18), 0);
  return credits ? Math.round(cs.reduce((t, c) => t + c.mark * (c.credits || 18), 0) / credits) : null;
};

export function summarise(courses) {
  const years = [...new Set(courses.map((c) => c.year))].filter(Boolean).sort();
  const byYear = years.map((y) => {
    const cs = courses.filter((c) => c.year === y);
    return { year: y, average: weighted(cs), credits: cs.reduce((t, c) => t + (c.mark >= 50 ? c.credits : 0), 0), count: cs.length };
  });
  const bands = BANDS.map((b) => ({ ...b, count: courses.filter((c) => bandFor(c.mark).key === b.key).length }));
  return {
    average: weighted(courses),
    creditsPassed: courses.reduce((t, c) => t + (c.mark >= 50 ? c.credits : 0), 0),
    firsts: courses.filter((c) => c.mark >= 75).length,
    fails: courses.filter((c) => c.mark < 50).length,
    count: courses.length,
    byYear,
    bands,
  };
}
