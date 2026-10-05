/**
 * The one sign-in page. Each role lands in its own product:
 *   Student / graduate → EdOS · Careers staff → Careers console
 *   Employer → employer portal · Alumni mentor → mentor dashboard
 * Styled after the EdOS login (pages/Login.tsx). Production = UCT SSO.
 */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { signIn, setSession, getSession, clearSession, homeFor, DEMO_PASSWORD, STAFF } from '../../packages/demo-auth/session.js';
import { resetDemo } from '../../packages/bridge/bus.js';
import '../edos/src/host/brand.css';
import './login.css';

const GROUPS = [
  {
    label: 'Students — EdOS',
    people: [
      { email: 'celnom010@myuct.ac.za', name: 'Nomvula Cele', sub: 'BBusSc Marketing · final year · no plan yet' },
      { email: 'admyus016@myuct.ac.za', name: 'Yusuf Adams', sub: 'BCom Info Systems · at risk' },
      { email: 'ndbzin004@myuct.ac.za', name: 'Zinhle Ndaba', sub: 'LLB · mentor offer waiting' },
      { email: 'jppfat104@myuct.ac.za', name: 'Fatima Jappie', sub: 'Graduate · class of 2025' },
    ],
  },
  {
    label: 'Careers Service & partners',
    people: [
      { email: STAFF.email, name: STAFF.name, sub: `${STAFF.title} · UCT Careers Service` },
      { email: 'recruit@ubuntubank.example', name: 'Ubuntu Bank (sample)', sub: 'Employer · jobs and bursaries' },
      { email: 'naledi.khumalo@example.com', name: 'Naledi Khumalo', sub: 'Alumni mentor · Class of 2014' },
    ],
  },
];

function go(session) {
  setSession(session);
  window.location.href = new URL(homeFor(session), window.location.href).href;
}

function Login() {
  const current = getSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  function submit(e) {
    e.preventDefault();
    try {
      go(signIn(email, password));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="lg-page">
      <div className="lg-card">
        <div className="lg-brand">
          <div className="lg-mark">
            <svg width="34" height="34" viewBox="0 0 40 40" aria-hidden="true">
              <circle cx="20" cy="20" r="19" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M20 6 L23 16 L33 16 L25 22 L28 32 L20 26 L12 32 L15 22 L7 16 L17 16 Z" fill="var(--accent-electric)" />
            </svg>
            <div>
              <div className="lg-mark-name">UNIVERSITY OF CAPE TOWN</div>
              <div className="lg-mark-sub">EdOS · CAREERS SERVICE</div>
            </div>
          </div>
          <div className="lg-pitch">
            <h1>
              Sign in to <em>Exit Pathways.</em>
            </h1>
            <p>
              Further study, employment, start-ups and self-discovery — and no graduate left without a plan. Students
              work in EdOS; the Careers Service, employers and alumni mentors work alongside them.
            </p>
          </div>
          <div className="lg-proto">Prototype · demo data only</div>
        </div>

        <div className="lg-form-side">
          {current && (
            <div className="lg-current">
              Signed in as <strong>{current.name}</strong>
              <button className="btn btn--sm" onClick={() => go(current)}>
                Continue
              </button>
              <button
                className="lg-link"
                onClick={() => {
                  clearSession();
                  window.location.reload();
                }}
              >
                Sign out
              </button>
            </div>
          )}
          <form onSubmit={submit} className="lg-form">
            <label>
              <span className="t-eyebrow">Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@myuct.ac.za" autoComplete="email" />
            </label>
            <label>
              <span className="t-eyebrow">Password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </label>
            {error && <div className="lg-error">{error}</div>}
            <button type="submit" className="btn btn--accent">
              Sign in
            </button>
          </form>

          <div className="lg-or">
            <span />
            <div className="t-eyebrow">Or sign in as</div>
            <span />
          </div>

          {GROUPS.map((g) => (
            <div key={g.label} className="lg-group">
              <div className="lg-group-label">{g.label}</div>
              <div className="lg-people">
                {g.people.map((p) => (
                  <button key={p.email} type="button" onClick={() => go(signIn(p.email, DEMO_PASSWORD))}>
                    <strong>{p.name}</strong>
                    <small>{p.sub}</small>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="lg-foot">
            <span>
              All demo passwords: <code>{DEMO_PASSWORD}</code>
            </span>
            <a href="./split/">Side-by-side view</a>
            <button
              className="lg-link"
              onClick={() => {
                if (window.confirm('Reset all demo data (EdOS + Careers) to the starting point?')) {
                  resetDemo();
                  window.alert('Demo data reset.');
                }
              }}
            >
              Reset demo data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Login />
  </StrictMode>,
);
