/**
 * Side-by-side view — EdOS (as a student) and the Careers Service (as staff or
 * an employer) in one window, for demos and tutorial recordings. Each pane is
 * the real app; pick who is signed into each.
 */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { setSession, getSession, signIn, DEMO_PASSWORD, STAFF } from '../../packages/demo-auth/session.js';
import { demoRoster } from '../../packages/bridge/demo/roster.js';
import { demoEmployers } from '../../packages/bridge/demo/employers.js';
import './split.css';

const STUDENTS = demoRoster();
const CAREERS = [{ email: STAFF.email, label: `${STAFF.name} — Careers Service` }, ...demoEmployers().map((e) => ({ email: e.email, label: `${e.name} — employer` }))];

function ensure(slot, email) {
  if (!getSession(slot)) setSession(signIn(email, DEMO_PASSWORD));
}
ensure('edos', 'celnom010@myuct.ac.za');
ensure('careers', STAFF.email);

function Split() {
  const [layout, setLayout] = useState('split');
  const [edosKey, setEdosKey] = useState(0);
  const [careersKey, setCareersKey] = useState(0);
  const [student, setStudent] = useState(getSession('edos')?.id);
  const careersEmail =
    getSession('careers')?.role === 'employer' ? demoEmployers().find((e) => e.id === getSession('careers').id)?.email : STAFF.email;
  const [careers, setCareers] = useState(careersEmail);

  return (
    <div className={`sc ${layout} bus-closed`}>
      <header className="sc-top">
        <div className="sc-brand">
          <a href="../" title="Sign-in page">
            <img src={`${import.meta.env.BASE_URL}brand/uct-shield.png`} alt="University of Cape Town" style={{ height: 32, display: 'block' }} />
          </a>
          <div>
            <div className="sc-title">Exit Pathways</div>
            <div className="sc-sub">EdOS × Careers Service — side by side</div>
          </div>
        </div>
        <div className="sc-actions">
          <label className="sc-pick">
            EdOS
            <select
              value={student}
              onChange={(e) => {
                const s = STUDENTS.find((x) => x.studentNumber === e.target.value);
                setSession(signIn(s.email, DEMO_PASSWORD));
                setStudent(s.studentNumber);
                setEdosKey((k) => k + 1);
              }}
            >
              {STUDENTS.map((s) => (
                <option key={s.studentNumber} value={s.studentNumber}>
                  {s.firstName} {s.lastName}
                  {s.status === 'graduated' ? ' (graduate)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="sc-pick">
            Careers
            <select
              value={careers}
              onChange={(e) => {
                setSession(signIn(e.target.value, DEMO_PASSWORD));
                setCareers(e.target.value);
                setCareersKey((k) => k + 1);
              }}
            >
              {CAREERS.map((c) => (
                <option key={c.email} value={c.email}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <div className="sc-seg">
            {[
              ['split', 'Side by side'],
              ['edos', 'EdOS'],
              ['careers', 'Careers'],
            ].map(([k, l]) => (
              <button key={k} className={layout === k ? 'on' : ''} onClick={() => setLayout(k)}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </header>
      <div className="sc-stage">
        <section className="sc-pane edos">
          <iframe key={edosKey} title="EdOS" src="../edos/#/student/home" />
        </section>
        <section className="sc-pane careers">
          <iframe key={careersKey} title="Careers Service" src={careers === STAFF.email ? '../careers/#/' : '../careers/#/employer'} />
        </section>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Split />
  </StrictMode>,
);
