/**
 * EdOS host shell (UCT student edition) — a stand-in for the existing EdOS
 * app: sign-in guard, sidebar, Home / Marks / Inbox. The Exit Pathways module
 * plugs in exactly the way it would in the real EdOS repo: its routes go in the
 * router and its nav items go in the sidebar (see ../pathways/index.js).
 */
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useEdos, isSignedIn } from '../pathways/store.js';
import { Icon, Initials } from '../pathways/ui.jsx';
import { pathwayRoutes, pathwayNav } from '../pathways/index.jsx';
import { clearSession, loginUrl } from '../../../../packages/demo-auth/session.js';
import { Home } from './Home.jsx';
import { Marks } from './Marks.jsx';
import { Inbox } from './Inbox.jsx';
import './brand.css';
import './host.css';

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

function signOut() {
  clearSession('edos');
  window.location.href = loginUrl();
}

function Sidebar() {
  const v = useEdos();
  const unread = v.inbox.filter((n) => n.unread).length;
  const grad = v.me.status === 'graduated';
  // EdOS's own items, then the Exit Pathways module's.
  const nav = [
    { to: '/student/home', label: 'Home', icon: 'home' },
    ...(grad ? [] : [{ to: '/student/marks', label: 'Marks & tests', icon: 'book' }]),
    ...pathwayNav
      .filter((n) => !grad || n.to === '/student/opportunities')
      .map((n) => ({
        ...n,
        dot: (n.to === '/student/pathways' && !v.decl) || (n.to === '/student/mentor' && v.offers.length > 0),
        badge: n.to === '/student/opportunities' ? v.opportunities.filter((o) => o.sent && !o.application).length : 0,
      })),
    { to: '/student/inbox', label: 'Inbox', icon: 'inbox', badge: unread },
  ];
  return (
    <aside className="ed-side">
      <Mark />
      <div>
        <div className="ed-side-label">{grad ? 'Alumni' : 'Student'}</div>
        <nav className="ed-nav">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-row ${isActive ? 'is-active' : ''}`}>
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
        <button className="ed-side-out" onClick={signOut} title="Sign out" aria-label="Sign out">
          <Icon name="arrow" size={15} />
        </button>
      </div>
    </aside>
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
  // Not signed in as a student → back to the shared sign-in page.
  if (!isSignedIn()) {
    window.location.replace(loginUrl());
    return null;
  }
  return (
    <div className="ed-shell">
      <Sidebar />
      <div className="ed-body">
        <main className="ed-main">
          <Routes>
            <Route path="/student/home" element={<Home />} />
            <Route path="/student/marks" element={<Marks />} />
            <Route path="/student/inbox" element={<Inbox />} />
            {pathwayRoutes}
            <Route path="*" element={<Navigate to="/student/home" replace />} />
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
