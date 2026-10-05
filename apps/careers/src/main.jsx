/**
 * UCT Careers Service — app shell.
 *
 * Routes: the office console (behind sign-in), the public alumni mentor sign-up
 * (#/join) and each mentor's private dashboard (#/alumni/:id?t=). Students don't
 * use this app at all — they live in EdOS. The two apps talk over the bus.
 */
import { StrictMode, useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { queryClient, qk } from './query.js';
import * as api from './api.js';
import { subscribe, readLog } from '../../../packages/bridge/bus.js';
import { timeAgo } from '../../../packages/bridge/describe.js';
import { CareersModule } from './CareersApp.jsx';
import { MentorJoinPage } from './MentorJoinPage.jsx';
import { MentorPortalPage } from './MentorPortalPage.jsx';
import './app.css';

// Not prefixed `uct-`, so a demo reset doesn't sign the office out.
const ADMIN_KEY = 'careers-admin-session';
/** Demo access — production uses UCT single sign-on. */
const DEMO_PASSWORD = 'careers';

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

function AdminLogin({ onAuthed }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  function submit(e) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (password !== DEMO_PASSWORD) return setError('That password is not correct.');
    try {
      localStorage.setItem(ADMIN_KEY, JSON.stringify({ email: email.trim(), at: Date.now() }));
    } catch {
      /* private mode — session-only is fine */
    }
    onAuthed();
  }
  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <span className="login-mark">UCT</span>
          <div>
            <div className="login-title">Careers Service</div>
            <div className="login-sub">Exit Pathways · staff sign-in</div>
          </div>
        </div>
        <label className="fld">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@uct.ac.za" autoFocus />
        </label>
        <label className="fld">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <button className="btn btn-primary login-btn" type="submit">
          Sign in
        </button>
        <p className="login-demo">
          Demo access — any email, password <code>{DEMO_PASSWORD}</code>. Production uses UCT single sign-on.
        </p>
      </form>
    </div>
  );
}

function AdminApp() {
  const [authed, setAuthed] = useState(() => {
    try {
      return !!localStorage.getItem(ADMIN_KEY);
    } catch {
      return false;
    }
  });
  if (!authed) return <AdminLogin onAuthed={() => setAuthed(true)} />;
  return (
    <AdminShell
      onSignOut={() => {
        try {
          localStorage.removeItem(ADMIN_KEY);
        } catch {
          /* ignore */
        }
        setAuthed(false);
      }}
    />
  );
}

function AdminShell({ onSignOut }) {
  const [toast, toastNode] = useToasts();
  const last = useBusRefresh();
  const { data: settings } = useQuery({ queryKey: qk.settings(), queryFn: api.getSettings });
  return (
    <div className="app-shell">
      <header className="app-bar">
        <div className="app-brand">
          {settings?.orgShort ?? 'UCT'} Careers Service
          <span className="app-brand-sub">Exit pathways · alumni mentorship</span>
        </div>
        <div className="app-bar-right">
          <span className="cr-live" title="Events from EdOS arrive here instantly">
            <i />
            Connected to EdOS{last ? ` · last event ${timeAgo(last.at)}` : ''}
          </span>
          <div className="demo-flag">
            Demo — no backend
            <button
              className="demo-reset"
              onClick={() => {
                if (window.confirm('Reset BOTH systems (Careers + EdOS) to the seeded demo?')) {
                  api.resetDemo();
                  window.location.reload();
                }
              }}
            >
              Reset
            </button>
          </div>
          <button className="app-signout" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>
      <main className="main app-main">
        <CareersModule toast={toast} />
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
      <Route path="*" element={<AdminApp />} />
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
