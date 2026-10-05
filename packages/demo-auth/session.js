/**
 * Demo sign-in — a stand-in for UCT single sign-on.
 *
 * One login page routes each person to their own product:
 *   student / graduate → EdOS        (/edos/)
 *   careers staff      → Careers     (/careers/)
 *   employer           → employer portal (/careers/#/employer)
 *   alumni mentor      → their private mentor dashboard (/careers/#/alumni/…)
 *
 * In EdOS this is replaced by EdOS's own AuthProvider (`useAuth().user`), and
 * in Careers by staff SSO. Nothing else in either app depends on this file.
 */
import { demoRoster } from '../bridge/demo/roster.js';
import { demoAlumni } from '../bridge/demo/alumni.js';
import { demoEmployers } from '../bridge/demo/employers.js';

// Not `uct-`-prefixed, so resetting the demo data doesn't sign anyone out.
// One slot per product, so the side-by-side view can have a student in EdOS and
// staff in Careers at the same time (like two browser profiles).
const KEY = 'pathways.sessions';
const slotFor = (role) => (role === 'student' || role === 'graduate' ? 'edos' : 'careers');
export const DEMO_PASSWORD = 'demo';
export const STAFF = { email: 'careers@uct.ac.za', name: 'Thembi Nkosi', title: 'Careers Advisor' };

function all() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}
/** getSession('edos') / getSession('careers'); no argument = most recent sign-in. */
export function getSession(slot) {
  const a = all();
  if (slot) return a[slot] ?? null;
  return [a.edos, a.careers].filter(Boolean).sort((x, y) => y.at - x.at)[0] ?? null;
}
export function setSession(s) {
  localStorage.setItem(KEY, JSON.stringify({ ...all(), [slotFor(s.role)]: { ...s, at: Date.now() } }));
}
/** clearSession('edos') signs out of one product; no argument signs out of both. */
export function clearSession(slot) {
  if (!slot) return localStorage.removeItem(KEY);
  const a = all();
  delete a[slot];
  localStorage.setItem(KEY, JSON.stringify(a));
}

/** Where each role lands after signing in (relative to the site root). */
export function homeFor(s) {
  if (!s) return './';
  if (s.role === 'student' || s.role === 'graduate') return './edos/#/student/home';
  if (s.role === 'careers') return './careers/#/';
  if (s.role === 'employer') return './careers/#/employer';
  if (s.role === 'mentor') {
    const m = demoAlumni().find((a) => a.id === s.id);
    return m ? `./careers/#/alumni/${m.id}?t=${m.token}` : './';
  }
  return './';
}

/** Email + password sign-in against the demo directory. */
export function signIn(email, password) {
  const e = String(email ?? '').trim().toLowerCase();
  if (password !== DEMO_PASSWORD) throw new Error('That password is not correct.');
  if (e === STAFF.email) return { role: 'careers', id: 'staff-1', name: STAFF.name };
  const s = demoRoster().find((x) => x.email === e);
  if (s) return { role: s.status === 'graduated' ? 'graduate' : 'student', id: s.studentNumber, name: `${s.firstName} ${s.lastName}` };
  const emp = demoEmployers().find((x) => x.email === e);
  if (emp) return { role: 'employer', id: emp.id, name: emp.contact, org: emp.name };
  const m = demoAlumni().find((a) => a.email === e);
  if (m) return { role: 'mentor', id: m.id, name: `${m.firstName} ${m.lastName}` };
  throw new Error('No account with that email.');
}

/** URL of the sign-in page, from inside either app. */
export const loginUrl = () => new URL('../', window.location.href.split('#')[0]).href;
