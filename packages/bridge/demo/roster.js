/**
 * DEMO DATA — a synthetic slice of the student information system.
 *
 * EdOS is the system of record for these students (modules, marks, credits).
 * Careers never reads this file: it only learns about a student through the
 * `student.synced` events EdOS emits. All names and numbers are fictional.
 */
import { stageFor } from '../vocab.js';

const mod = (code, name, credits, mark) => ({ code, name, credits, mark });

const RAW = [
  // ── Final-year & penultimate students (class of 2026 / 2027) ──
  { sn: 'MLFKAG001', first: 'Kagiso', last: 'Molefe', faculty: 'Commerce', degree: 'BCom Accounting', year: 3, years: 3, avg: 68,
    modules: [mod('ACC3009W', 'Financial Accounting III', 36, 71), mod('ACC3022W', 'Management Accounting III', 36, 66), mod('ACC3023F', 'Taxation III', 18, 64), mod('BUS3009S', 'Business Ethics', 18, 74)] },
  { sn: 'ZNGAMA002', first: 'Amahle', last: 'Zungu', faculty: 'Commerce', degree: 'BCom Economics', year: 2, years: 3, avg: 72,
    modules: [mod('ECO2003F', 'Microeconomics II', 18, 74), mod('ECO2004S', 'Macroeconomics II', 18, 70), mod('STA2020F', 'Applied Statistics', 18, 71), mod('FTX2020F', 'Finance II', 18, 73)] },
  { sn: 'JCBRUB003', first: 'Ruben', last: 'Jacobs', faculty: 'Engineering & the Built Environment', degree: 'BSc (Eng) Civil', year: 4, years: 4, avg: 64,
    modules: [mod('CIV4044S', 'Engineering Management', 16, 66), mod('CIV4035C', 'Design Project', 40, 63), mod('CIV4041F', 'Water Treatment', 16, 62)] },
  { sn: 'NDBZIN004', first: 'Zinhle', last: 'Ndaba', faculty: 'Law', degree: 'LLB', year: 4, years: 4, avg: 66,
    modules: [mod('PVL4008H', 'Civil Procedure', 24, 68), mod('CML4004S', 'Competition Law', 12, 65), mod('PBL4801F', 'Moot Court', 12, 70)] },
  { sn: 'CLKETH005', first: 'Ethan', last: 'Clarke', faculty: 'Science', degree: 'BSc Computer Science', year: 3, years: 3, avg: 74,
    modules: [mod('CSC3002F', 'Operating Systems', 36, 76), mod('CSC3003S', 'Software Engineering', 36, 72), mod('INF3011F', 'IT Project Management', 18, 75)] },
  { sn: 'STHLIN006', first: 'Lindiwe', last: 'Sithole', faculty: 'Science', degree: 'BSc (Hons) Applied Statistics', level: 'honours', year: 4, years: 4, avg: 70,
    modules: [mod('STA4007W', 'Statistical Learning', 30, 72), mod('STA4010W', 'Research Project', 60, 69)] },
  { sn: 'ISCMOH007', first: 'Mohammed', last: 'Isaacs', faculty: 'Health Sciences', degree: 'MBChB', year: 6, years: 6, avg: 69,
    modules: [mod('MDN6000W', 'Medicine (Final Year)', 120, 69), mod('SUR6000W', 'Surgery (Final Year)', 60, 68)] },
  { sn: 'RDBPAL008', first: 'Palesa', last: 'Radebe', faculty: 'Humanities', degree: 'BA Media & Writing', year: 3, years: 3, avg: 58,
    modules: [mod('FAM3015F', 'Media Production III', 36, 61), mod('FAM3001S', 'Media Theory III', 36, 55), mod('ELL3001F', 'English Studies III', 18, 57)] },
  { sn: 'BTHJOH009', first: 'Johan', last: 'Botha', faculty: 'Engineering & the Built Environment', degree: 'BSc (Eng) Electrical', year: 3, years: 4, avg: 61,
    modules: [mod('EEE3088F', 'Electronics Design', 16, 63), mod('EEE3092F', 'Signals & Systems', 16, 58), mod('EEE3094S', 'Power Engineering', 16, 62)] },
  { sn: 'CELNOM010', first: 'Nomvula', last: 'Cele', faculty: 'Commerce', degree: 'BBusSc Marketing', year: 4, years: 4, avg: 63,
    modules: [mod('BUS4050W', 'Marketing Research', 30, 65), mod('BUS4029H', 'Strategic Brand Management', 30, 62), mod('BUS4051S', 'Consumer Behaviour', 15, 61)] },
  { sn: 'MNSDAN011', first: 'Daniel', last: 'Mensah', faculty: 'Law', degree: 'LLB', year: 4, years: 4, avg: 71,
    modules: [mod('PBL4001W', 'Human Rights Litigation', 24, 74), mod('PVL4003F', 'Evidence', 12, 69)] },
  { sn: 'HNDAAL012', first: 'Aaliyah', last: 'Hendricks', faculty: 'Science', degree: 'MSc Molecular Biology', level: 'masters', year: 5, years: 5, avg: 75,
    modules: [mod('MCB5000W', 'Masters Dissertation', 180, 75)] },
  { sn: 'DBESIP013', first: 'Sipho', last: 'Dube', faculty: 'Humanities', degree: 'BSocSc Psychology', year: 3, years: 3, avg: 54,
    modules: [mod('PSY3007S', 'Research in Psychology III', 36, 52), mod('PSY3010S', 'Social Psychology', 36, 56), mod('SOC3007F', 'Sociology III', 18, 53)] },
  { sn: 'MKNTHA014', first: 'Thandiwe', last: 'Mokoena', faculty: 'Health Sciences', degree: 'BSc Physiotherapy', year: 4, years: 4, avg: 66,
    modules: [mod('AHS4060W', 'Clinical Practice IV', 60, 67), mod('AHS4062S', 'Research Methods', 15, 64)] },
  { sn: 'NKSLER015', first: 'Lerato', last: 'Nkosi', faculty: 'Humanities', degree: 'BA Environmental Studies', year: 3, years: 3, avg: 60,
    modules: [mod('EGS3012S', 'Environmental Management', 36, 62), mod('EGS3021F', 'Climate & Society', 36, 59)] },
  { sn: 'ADMYUS016', first: 'Yusuf', last: 'Adams', faculty: 'Commerce', degree: 'BCom Information Systems', year: 3, years: 3, avg: 52,
    modules: [mod('INF3014F', 'Systems Development', 36, 51), mod('INF3003W', 'IS Project', 36, 54), mod('INF3012S', 'Networks', 18, 50)] },

  // ── Class of 2025 graduates — EdOS keeps alumni access for destination follow-up ──
  { sn: 'NTLBUS101', first: 'Busisiwe', last: 'Ntuli', faculty: 'Commerce', degree: 'BCom Finance', year: 3, years: 3, avg: 67, graduated: '2025-12-12', modules: [] },
  { sn: 'PTRCRA102', first: 'Craig', last: 'Petersen', faculty: 'Science', degree: 'BSc Geology', year: 3, years: 3, avg: 70, graduated: '2025-12-12', modules: [] },
  { sn: 'MTHAYA103', first: 'Ayanda', last: 'Mthembu', faculty: 'Humanities', degree: 'BA Political Studies', year: 3, years: 3, avg: 59, graduated: '2025-12-12', modules: [] },
  { sn: 'JPPFAT104', first: 'Fatima', last: 'Jappie', faculty: 'Engineering & the Built Environment', degree: 'BSc (Eng) Mechanical', year: 4, years: 4, avg: 63, graduated: '2025-12-12', modules: [] },
];

/** The full academic record EdOS holds for each student. */
export function demoRoster() {
  return RAW.map((r) => {
    const s = {
      studentNumber: r.sn,
      firstName: r.first,
      lastName: r.last,
      email: `${r.sn.toLowerCase()}@myuct.ac.za`,
      faculty: r.faculty,
      degree: r.degree,
      level: r.level ?? 'ug',
      yearOfStudy: r.year,
      programmeYears: r.years,
      average: r.avg,
      modules: r.modules,
      creditsRequired: r.years * 120,
      creditsCompleted: r.graduated ? r.years * 120 : (r.year - 1) * 120 + Math.round(r.modules.reduce((t, m) => t + m.credits, 0) * 0.5),
      status: r.graduated ? 'graduated' : 'registered',
      graduatedAt: r.graduated,
      expectedGraduation: r.graduated ? r.graduated.slice(0, 4) : String(2026 + (r.years - r.year)),
    };
    s.stage = r.graduated ? 'Graduate' : stageFor(s);
    return s;
  });
}

/**
 * The subset EdOS shares with Careers in a `student.synced` event — data
 * minimisation: no module-level marks, just what pathway support needs.
 */
export function syncPayload(s) {
  const {
    studentNumber, firstName, lastName, email, faculty, degree, yearOfStudy, stage, expectedGraduation,
    average, creditsCompleted, creditsRequired, status, graduatedAt,
  } = s;
  return {
    studentNumber, firstName, lastName, email, faculty, degree, yearOfStudy, stage, expectedGraduation,
    average, creditsCompleted, creditsRequired, status, graduatedAt,
  };
}
