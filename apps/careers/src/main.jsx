/**
 * UCT Careers Service — app shell.
 *
 * Routes: the staff console and the employer portal (#/employer) — both reached
 * through the shared sign-in page — plus the public alumni mentor sign-up
 * (#/join) and each mentor's private dashboard (#/alumni/:id?t=). Students
 * don't use this app; they live in EdOS.
 */
import '@fontsource-variable/raleway/wght.css';
import '@fontsource-variable/raleway/wght-italic.css';
import { StrictMode, useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './query.js';
import { subscribe, readLog } from '../../../packages/bridge/bus.js';
import { timeAgo } from '../../../packages/bridge/describe.js';
import { CareersModule } from './CareersApp.jsx';
import { EmployerPortal } from './EmployerPortal.jsx';
import { getSession, clearSession, loginUrl } from '../../../packages/demo-auth/session.js';
import { MentorJoinPage } from './MentorJoinPage.jsx';
import { MentorPortalPage } from './MentorPortalPage.jsx';
import './app.css';

function useToasts() {
  const [items, setItems] = useState([]);
  const toast = useCallback((message, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((xs) => [...xs, { id, message, kind }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3200);
  }, []);
  const node = (
    <div className="toast-stack">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.kind === 'err' ? 'toast-err' : ''}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
  return [toast, node];
}

/** Anything EdOS publishes refreshes every view here, live. */
function useBusRefresh() {
  const [last, setLast] = useState(() => readLog().at(-1));
  useEffect(
    () =>
      subscribe(() => {
        queryClient.invalidateQueries();
        setLast(readLog().at(-1));
      }),
    [],
  );
  return last;
}

function signOut() {
  clearSession('careers');
  window.location.href = loginUrl();
}

/** Staff console or employer portal, depending on who signed in. */
function SignedInApp({ employerArea }) {
  const session = getSession('careers');
  const ok = employerArea ? session?.role === 'employer' : session?.role === 'careers';
  if (!ok) {
    window.location.replace(loginUrl());
    return null;
  }
  return <Shell session={session} employerArea={employerArea} />;
}

function Shell({ session, employerArea }) {
  const [toast, toastNode] = useToasts();
  const last = useBusRefresh();
  return (
    <div className="app-shell">
      <header className="app-bar">
        <div className="app-brand-row">
          <img src={`${import.meta.env.BASE_URL}brand/uct-shield.png`} alt="University of Cape Town" className="app-crest" />
          <div className="app-brand">
            UCT Careers Service
            <span className="app-brand-sub">
              {employerArea ? `Employer portal · ${session.org}` : 'Exit pathways · employment · alumni mentorship'}
            </span>
          </div>
        </div>
        <div className="app-bar-right">
          <span className="cr-live" title="Students' activity in EdOS arrives here instantly">
            <i />
            Connected to EdOS{last ? ` · updated ${timeAgo(last.at)}` : ''}
          </span>
          <span className="app-user">{session.name}</span>
          <button className="app-signout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>
      <main className="main app-main">
        {employerArea ? <EmployerPortal employerId={session.id} toast={toast} /> : <CareersModule toast={toast} />}
      </main>
      {toastNode}
    </div>
  );
}

/** Each new page opens at the top (hash routing otherwise keeps the old scroll). */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PublicRoutes() {
  useBusRefresh();
  return (
    <Routes>
      <Route path="/join" element={<MentorJoinPage />} />
      <Route path="/alumni/:id" element={<MentorPortalPage />} />
      <Route path="/employer" element={<SignedInApp employerArea />} />
      <Route path="*" element={<SignedInApp />} />
    </Routes>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <ScrollToTop />
        <PublicRoutes />
      </HashRouter>
    </QueryClientProvider>
  </StrictMode>,
);
