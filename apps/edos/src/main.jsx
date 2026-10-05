/**
 * EdOS — UCT student edition (prototype, no backend).
 *
 * The student's learning platform, extended with exit pathways: plan what comes
 * after UCT, see opportunities checked against your marks, get support from the
 * Careers Service and an alumni mentor — without leaving EdOS.
 */
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useEdos, roster, setPersona, resetDemo } from './store.js';
import { Icon, Initials } from './ui.jsx';
import { Home } from './Home.jsx';
import { Pathways } from './Pathways.jsx';
import { Opportunities } from './Opportunities.jsx';
import { Mentor } from './Mentor.jsx';
import { Modules } from './Modules.jsx';
import { Inbox } from './Inbox.jsx';
import './brand.css';
import './edos.css';

function Mark() {
  return (
    <div className="ed-mark">
      <svg width="30" height="30" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="19" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M20 6 L23 16 L33 16 L25 22 L28 32 L20 26 L12 32 L15 22 L7 16 L17 16 Z" fill="var(--accent)" />
      </svg>
      <div>
        <div className="ed-mark-name">EdOS</div>
        <div className="ed-mark-sub">UNIVERSITY OF CAPE TOWN</div>
      </div>
    </div>
  );
}

function Sidebar() {
  const v = useEdos();
  const unread = v.inbox.filter((n) => n.unread).length;
  const grad = v.me.status === 'graduated';
  const nav = [
    { to: '/', label: 'Home', icon: 'home', end: true },
    ...(grad ? [] : [{ to: '/modules', label: 'My modules', icon: 'book' }]),
    ...(grad ? [] : [{ to: '/pathways', label: 'Exit pathways', icon: 'compass', dot: !v.decl }]),
    { to: '/opportunities', label: 'Opportunities', icon: 'briefcase' },
    ...(grad ? [] : [{ to: '/mentor', label: 'Alumni mentor', icon: 'users', dot: v.offers.length > 0 }]),
    { to: '/inbox', label: 'Inbox', icon: 'inbox', badge: unread },
  ];
  return (
    <aside className="ed-side">
      <Mark />
      <div>
        <div className="ed-side-label">{grad ? 'Alumni' : 'Student'}</div>
        <nav className="ed-nav">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-row ${isActive ? 'is-active' : ''}`}>
              <Icon name={n.icon} size={16} />
              <span>{n.label}</span>
              {n.badge ? <em className="ed-badge">{n.badge}</em> : n.dot ? <i className="ed-dot" /> : null}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="ed-side-careers">
        <Icon name="link" size={13} />
        <span>
          Exit pathways are run with the <strong>UCT Careers Service</strong>
        </span>
      </div>
      <div className="ed-side-user">
        <Initials name={`${v.me.firstName} ${v.me.lastName}`} size={32} dark />
        <div>
          <strong>
            {v.me.firstName} {v.me.lastName}
          </strong>
          <small>{v.me.studentNumber}</small>
        </div>
      </div>
    </aside>
  );
}

/** Demo-only: switch which student is signed in. Production = UCT SSO. */
function DemoBar() {
  const v = useEdos();
  const list = roster();
  return (
    <div className="ed-demobar">
      <span className="ed-demobar-tag">Demo</span>
      <label>
        Signed in as
        <select value={v.me.studentNumber} onChange={(e) => setPersona(e.target.value)}>
          <optgroup label="Students">
            {list
              .filter((s) => s.status === 'registered')
              .map((s) => (
                <option key={s.studentNumber} value={s.studentNumber}>
                  {s.firstName} {s.lastName} — {s.degree}
                </option>
              ))}
          </optgroup>
          <optgroup label="Class of 2025 graduates">
            {list
              .filter((s) => s.status === 'graduated')
              .map((s) => (
                <option key={s.studentNumber} value={s.studentNumber}>
                  {s.firstName} {s.lastName} — {s.degree}
                </option>
              ))}
          </optgroup>
        </select>
      </label>
      <button
        className="ed-demobar-reset"
        onClick={() => {
          if (window.confirm('Reset BOTH systems (EdOS + Careers) to the seeded demo?')) {
            resetDemo();
            window.location.reload();
          }
        }}
      >
        Reset demo
      </button>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <div className="ed-shell">
      <Sidebar />
      <div className="ed-body">
        <DemoBar />
        <main className="ed-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/modules" element={<Modules />} />
            <Route path="/pathways" element={<Pathways />} />
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/mentor" element={<Mentor />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <ScrollToTop />
      <App />
    </HashRouter>
  </StrictMode>,
);
