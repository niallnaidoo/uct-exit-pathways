/**
 * Integration showcase — EdOS and the Careers Service running side by side,
 * with the integration bus between them. Every event either system emits
 * appears in the strip below as it happens: this is the "full circle".
 */
import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { readLog, subscribe, resetDemo } from '../../packages/bridge/bus.js';
import { project } from '../../packages/bridge/project.js';
import { describe, timeAgo } from '../../packages/bridge/describe.js';
import { eventMeta } from '../../packages/bridge/contract.js';
import './showcase.css';

// The showcase signs you into the Careers demo so both panes open ready to use.
try {
  if (!localStorage.getItem('careers-admin-session'))
    localStorage.setItem('careers-admin-session', JSON.stringify({ email: 'showcase@uct.ac.za', at: Date.now() }));
} catch {
  /* ignore */
}

const STEPS = [
  {
    title: 'A student plans their exit',
    edos: 'Signed in as Nomvula (no plan yet) → Exit pathways → pick Employment → Save.',
    careers: 'Overview: the cohort chart updates; Unemployment risk: her score drops.',
    events: ['pathway.declared'],
  },
  {
    title: 'Careers publishes an opportunity',
    edos: 'Opportunities → For you: it appears — checked against her marks.',
    careers: 'Opportunities → Publish to EdOS (e.g. a bursary with a 60% minimum).',
    events: ['opportunity.published'],
  },
  {
    title: 'The student applies from EdOS',
    edos: 'Apply through EdOS — no forms; her profile goes with it.',
    careers: 'The opportunity’s “Applied” count ticks up; her journey shows it.',
    events: ['application.submitted'],
  },
  {
    title: 'Careers reaches a student at risk of unemployment',
    edos: 'Switch to Yusuf → the support appears on Home → Book it.',
    careers: 'Unemployment risk → Reach out to Yusuf Adams → Send to EdOS.',
    events: ['intervention.assigned', 'intervention.updated'],
  },
  {
    title: 'An alumnus mentors a student',
    edos: 'Switch to Zinhle → Alumni mentor → accept Ayesha’s offer, send a message.',
    careers: 'Alumni mentorship → Matches: active. Open Ayesha’s dashboard to reply.',
    events: ['mentorship.offer.responded', 'mentorship.message.sent'],
  },
  {
    title: 'A graduate reports where they landed',
    edos: 'Switch to Fatima (class of 2025) → Where are you now? → Employed.',
    careers: 'Graduate destinations updates; her follow-up flag clears.',
    events: ['destination.reported'],
  },
];

function useBus() {
  const [log, setLog] = useState(() => readLog());
  useEffect(() => subscribe(() => setLog(readLog())), []);
  return log;
}

function Showcase() {
  const log = useBus();
  const startSeq = useRef(log.at(-1)?.seq ?? 0);
  const model = useMemo(() => project(log), [log]);
  const recent = [...log].reverse().slice(0, 40);
  const [layout, setLayout] = useState('split');
  const [guide, setGuide] = useState(true);
  const [edosKey, setEdosKey] = useState(0);
  const fresh = log.filter((e) => e.seq > startSeq.current);
  const seen = new Set(fresh.map((e) => e.type));

  return (
    <div className={`sc ${layout}`}>
      <header className="sc-top">
        <div className="sc-brand">
          <span className="sc-mark">UCT</span>
          <div>
            <div className="sc-title">Exit Pathways</div>
            <div className="sc-sub">EdOS × Careers Service — one student journey, two systems, one event contract</div>
          </div>
        </div>
        <div className="sc-actions">
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
          <button className="sc-btn ghost" onClick={() => setGuide(!guide)}>
            {guide ? 'Hide guide' : 'Show guide'}
          </button>
          <button
            className="sc-btn"
            onClick={() => {
              if (window.confirm('Reset both systems to the seeded demo?')) {
                resetDemo();
                window.location.reload();
              }
            }}
          >
            Reset demo
          </button>
        </div>
      </header>

      <div className="sc-stage">
        {guide && (
          <aside className="sc-guide">
            <div className="sc-guide-head">Try the full circle</div>
            <ol>
              {STEPS.map((s, i) => {
                const done = s.events.every((t) => seen.has(t));
                return (
                  <li key={s.title} className={done ? 'done' : ''}>
                    <span className="sc-n">{done ? '✓' : i + 1}</span>
                    <div>
                      <strong>{s.title}</strong>
                      <p>
                        <em className="e">EdOS</em> {s.edos}
                      </p>
                      <p>
                        <em className="c">Careers</em> {s.careers}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </aside>
        )}
        <section className="sc-pane edos">
          <div className="sc-pane-label">
            <span>
              <i className="sc-dot e" /> EdOS
            </span>
            <small>Student learning platform · system of record for the student</small>
            <a href="./edos/" target="_blank" rel="noreferrer">
              Open ↗
            </a>
          </div>
          <iframe key={edosKey} title="EdOS" src="./edos/" />
        </section>
        <section className="sc-pane careers">
          <div className="sc-pane-label">
            <span>
              <i className="sc-dot c" /> Careers Service
            </span>
            <small>Pathways, opportunities, unemployment risk, alumni mentors</small>
            <a href="./careers/" target="_blank" rel="noreferrer">
              Open ↗
            </a>
          </div>
          <iframe title="Careers Service" src="./careers/" />
        </section>
      </div>

      <footer className="sc-bus">
        <div className="sc-bus-head">
          <strong>Integration bus</strong>
          <span>
            {log.length} events · {fresh.length} this session · no shared database — every fact crosses as an event
          </span>
          <button className="sc-link" onClick={() => setEdosKey((k) => k + 1)} title="Reload the EdOS pane">
            Reload EdOS pane
          </button>
        </div>
        <div className="sc-bus-list">
          {recent.map((e) => {
            const isNew = e.seq > startSeq.current;
            return (
              <div key={e.id} className={`sc-ev ${e.from} ${isNew ? 'new' : ''}`} title={JSON.stringify(e.payload, null, 2)}>
                <span className="sc-ev-dir">{e.from === 'edos' ? 'EdOS → Careers' : 'Careers → EdOS'}</span>
                <code>{e.type}</code>
                <span className="sc-ev-text">{describe(e, model)}</span>
                <span className="sc-ev-why">{eventMeta(e.type).title}</span>
                <span className="sc-ev-time">{timeAgo(e.at)}</span>
              </div>
            );
          })}
        </div>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Showcase />
  </StrictMode>,
);
