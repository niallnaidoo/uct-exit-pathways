/**
 * UCT Careers Service — Exit Pathways console.
 *
 * Built on the four exit pathways (further study, employment, start-up &
 * self-discovery, and the unemployment outcome we're working to prevent). The
 * student data here is NOT captured by Careers: it arrives from EdOS as events,
 * and everything Careers does for a student (opportunities, support, mentors)
 * goes back to EdOS as events. The Integration tab shows that conversation.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { qk, queryClient } from './query.js';
import * as api from './api.js';
import { Icon, Pill, Btn, Card, EmptyState, Avatar } from './atoms.jsx';
import { MentorshipTab } from './MentorshipAdmin.jsx';
import { ChipSelect } from './mentorship-ui.jsx';
import { GRADUATING_STAGES, RISK_LABEL } from './careers-model.js';
import {
  PATHWAYS,
  DESTINATIONS,
  OPPORTUNITY_KINDS,
  INTERVENTIONS,
  FACULTIES,
  STAGES,
  pathwayMeta,
  kindMeta,
  interventionMeta,
  destinationMeta,
} from '../../../packages/bridge/vocab.js';
import { EVENTS, eventMeta } from '../../../packages/bridge/contract.js';
import { daysUntil } from '../../../packages/bridge/project.js';
import { timeAgo } from '../../../packages/bridge/describe.js';
import './careers.css';

const refresh = () => queryClient.invalidateQueries();
const fullName = (s) => `${s.firstName} ${s.lastName}`;
const edosLink = (sn) => new URL(`../edos/${sn ? `#/?as=${sn}` : ''}`, window.location.href).href;

export function CareersModule({ toast }) {
  const [tab, setTab] = useState('overview');
  const [filter, setFilter] = useState(null);
  const { data } = useQuery({ queryKey: qk.careers(), queryFn: api.getCareers });
  const { data: feed = [] } = useQuery({ queryKey: qk.events(), queryFn: () => api.getEventLog() });
  if (!data) return <div className="muted">Loading…</div>;

  const atRisk = data.students.filter((s) => s.risk.level === 'high' || s.risk.level === 'medium');
  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'students', label: 'Students', badge: data.students.length },
    { key: 'opportunities', label: 'Opportunities', badge: data.opportunities.filter((o) => !o.closed).length },
    { key: 'risk', label: 'Unemployment risk', badge: atRisk.length, warn: true },
    { key: 'mentorship', label: 'Alumni mentorship' },
    { key: 'destinations', label: 'Graduate destinations' },
    { key: 'integration', label: 'EdOS integration' },
  ];
  const go = (t, f = null) => {
    setFilter(f);
    setTab(t);
  };

  return (
    <>
      <div className="tabs">
        {tabs.map((t) => (
          <button key={t.key} className={`tab ${tab === t.key ? 'on' : ''}`} onClick={() => go(t.key)}>
            {t.label}
            {t.badge ? <span className={`tab-badge ${t.warn ? 'cr-warn-badge' : ''}`}>{t.badge}</span> : null}
          </button>
        ))}
      </div>
      {tab === 'overview' && <Overview data={data} feed={feed} go={go} />}
      {tab === 'students' && <Students data={data} toast={toast} initialPathway={filter} />}
      {tab === 'opportunities' && <Opportunities data={data} toast={toast} />}
      {tab === 'risk' && <Risk data={data} toast={toast} />}
      {tab === 'mentorship' && <MentorshipTab toast={toast} />}
      {tab === 'destinations' && <Destinations data={data} toast={toast} />}
      {tab === 'integration' && <Integration feed={feed} />}
    </>
  );
}

/* ─────────────────────────── Shared bits ─────────────────────────── */

export function PathwayPill({ pathway, small }) {
  if (!pathway) return <span className={`cr-path none ${small ? 'sm' : ''}`}>Not declared</span>;
  const p = typeof pathway === 'string' ? pathwayMeta(pathway) : pathway;
  return <span className={`cr-path ${p.tone} ${small ? 'sm' : ''}`}>{p.label}</span>;
}

function RiskPill({ risk }) {
  const r = RISK_LABEL[risk.level];
  return (
    <Pill tone={r.tone}>
      {r.label}
      {risk.score > 0 ? ` · ${risk.score}` : ''}
    </Pill>
  );
}

function Direction({ from }) {
  return from === 'edos' ? (
    <span className="cr-dir edos">EdOS → Careers</span>
  ) : (
    <span className="cr-dir careers">Careers → EdOS</span>
  );
}

/* ─────────────────────────── Overview ─────────────────────────── */

function Overview({ data, feed, go }) {
  const cohort = data.students.filter((s) => s.status === 'registered' && GRADUATING_STAGES.includes(s.stage));
  const grads = data.students.filter((s) => s.status === 'graduated');
  const declared = cohort.filter((s) => s.decl);
  const segments = [
    ...PATHWAYS.map((p) => ({ key: p.key, label: p.label, tone: p.tone, n: cohort.filter((s) => s.decl?.primary === p.key).length })),
    { key: 'none', label: 'Not declared', tone: 'none', n: cohort.length - declared.length },
  ];
  const destSegs = [
    ...DESTINATIONS.map((d) => ({ key: d.key, label: d.label, tone: d.tone, n: grads.filter((s) => s.destination?.destination === d.key).length })),
    { key: 'none', label: 'No report yet', tone: 'none', n: grads.filter((s) => !s.destination).length },
  ];
  const month = Date.now() - 30 * 86400000;
  const recentApps = data.applications.filter((a) => new Date(a.submittedAt) > month).length;
  const high = data.students.filter((s) => s.risk.level === 'high').length;
  const seeking = grads.filter((s) => s.destination?.destination === 'seeking').length;

  return (
    <>
      <div className="ms-admin-kpis">
        <div>
          <strong>{cohort.length}</strong>
          <span>Graduating this year</span>
        </div>
        <div>
          <strong>{cohort.length ? Math.round((declared.length / cohort.length) * 100) : 0}%</strong>
          <span>Have declared a pathway</span>
        </div>
        <div>
          <strong>{data.opportunities.filter((o) => !o.closed).length}</strong>
          <span>Live opportunities in EdOS</span>
        </div>
        <div>
          <strong>{recentApps}</strong>
          <span>Applications (30 days)</span>
        </div>
        <div className={high ? 'warn' : ''}>
          <strong>{high}</strong>
          <span>High unemployment risk</span>
        </div>
        <div className={seeking ? 'warn' : ''}>
          <strong>{seeking}</strong>
          <span>2025 grads seeking work</span>
        </div>
      </div>

      <div className="cr-two">
        <Card title="Exit pathways — graduating cohort" sub="Declared by students in EdOS. Click a pathway to see who.">
          <StackBar segments={segments} onPick={(k) => go('students', k)} />
        </Card>
        <Card title="Where the class of 2025 landed" sub="Graduates report their destination in EdOS.">
          <StackBar segments={destSegs} onPick={() => go('destinations')} />
        </Card>
      </div>

      <div className="cr-two">
        <Card
          title="Live from EdOS"
          sub="Every row is an event between the two systems."
          action={
            <button className="link-btn" onClick={() => go('integration')}>
              Full log
            </button>
          }
        >
          <div className="cr-feed">
            {feed.slice(0, 7).map((e) => (
              <div key={e.id} className="cr-feed-row">
                <Direction from={e.from} />
                <span className="cr-feed-text">{e.text}</span>
                <span className="cr-feed-time">{timeAgo(e.at)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card
          title="Needs attention"
          sub="Highest unemployment risk right now."
          action={
            <button className="link-btn" onClick={() => go('risk')}>
              All at-risk students
            </button>
          }
        >
          {data.students
            .filter((s) => s.risk.level === 'high')
            .sort((a, b) => b.risk.score - a.risk.score)
            .slice(0, 5)
            .map((s) => (
              <div key={s.studentNumber} className="cr-attn">
                <Avatar name={fullName(s)} size={30} />
                <div className="cr-attn-text">
                  <strong>{fullName(s)}</strong>
                  <small>{s.risk.reasons.slice(0, 2).join(' · ')}</small>
                </div>
                <RiskPill risk={s.risk} />
              </div>
            ))}
        </Card>
      </div>
    </>
  );
}

function StackBar({ segments, onPick }) {
  const total = segments.reduce((t, s) => t + s.n, 0) || 1;
  return (
    <div className="cr-stack">
      <div className="cr-stack-bar">
        {segments
          .filter((s) => s.n)
          .map((s) => (
            <button
              key={s.key}
              className={`cr-seg ${s.tone}`}
              style={{ flexGrow: s.n }}
              title={`${s.label}: ${s.n}`}
              onClick={() => onPick?.(s.key)}
            >
              {Math.round((s.n / total) * 100) >= 9 ? s.n : ''}
            </button>
          ))}
      </div>
      <div className="cr-legend">
        {segments.map((s) => (
          <button key={s.key} onClick={() => onPick?.(s.key)}>
            <i className={`cr-dot ${s.tone}`} />
            {s.label}
            <strong>{s.n}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Students ─────────────────────────── */

function Students({ data, toast, initialPathway }) {
  const [pathway, setPathway] = useState(initialPathway ?? 'all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.students
      .filter((s) => s.status === 'registered')
      .filter((s) =>
        pathway === 'all' ? true : pathway === 'none' ? !s.decl : s.decl?.primary === pathway,
      )
      .filter((s) => !needle || `${fullName(s)} ${s.studentNumber} ${s.degree}`.toLowerCase().includes(needle))
      .sort((a, b) => b.risk.score - a.risk.score);
  }, [data, pathway, q]);
  const current = open && data.students.find((s) => s.studentNumber === open);

  return (
    <>
      {current && <StudentDrawer s={current} data={data} toast={toast} onClose={() => setOpen(null)} />}
      <Card
        title="Students"
        sub="Synced from EdOS — Careers never re-captures a student. Click a row for their full journey."
        action={
          <input className="cr-search" placeholder="Search name, number, degree…" value={q} onChange={(e) => setQ(e.target.value)} />
        }
      >
        <div className="cr-chips">
          {[{ key: 'all', label: 'All' }, ...PATHWAYS, { key: 'none', label: 'Not declared' }].map((p) => (
            <button key={p.key} className={pathway === p.key ? 'on' : ''} onClick={() => setPathway(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="tbl-wrap">
          <table className="tbl cr-tbl">
            <thead>
              <tr>
                <th>Student</th>
                <th>Degree</th>
                <th>Avg</th>
                <th>Exit pathway</th>
                <th>Readiness</th>
                <th>Applied</th>
                <th>Mentor</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.studentNumber} className="cr-click" onClick={() => setOpen(s.studentNumber)}>
                  <td>
                    <div className="cell-id">
                      <Avatar name={fullName(s)} size={26} />
                      <div>
                        <strong>{fullName(s)}</strong>
                        <div className="muted" style={{ fontSize: 11.5 }}>
                          {s.studentNumber} · {s.stage}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12.5 }}>{s.degree}</td>
                  <td>{s.average}%</td>
                  <td>
                    <PathwayPill pathway={s.pathway} small />
                    {s.decl?.backup && <div className="muted cr-backup">then {pathwayMeta(s.decl.backup)?.short}</div>}
                  </td>
                  <td>{s.readiness ? <Readiness r={s.readiness} /> : <span className="muted">—</span>}</td>
                  <td>{s.applications.length || <span className="muted">0</span>}</td>
                  <td style={{ fontSize: 12.5 }}>
                    {s.match ? `${s.match.mentor.firstName} ${s.match.mentor.lastName}` : s.mentorRequested ? <span className="muted">Requested</span> : <span className="muted">—</span>}
                  </td>
                  <td>
                    <RiskPill risk={s.risk} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <EmptyState icon={Icon.Users} title="No students here" />}
      </Card>
    </>
  );
}

function Readiness({ r }) {
  return (
    <div className="cr-ready" title={`${r.done} of ${r.total} readiness steps done`}>
      <div className="ms-bar">
        <span style={{ width: `${r.pct}%` }} />
      </div>
      <small>
        {r.done}/{r.total}
      </small>
    </div>
  );
}

function StudentDrawer({ s, data, toast, onClose }) {
  const [assigning, setAssigning] = useState(false);
  const events = [...(data.timeline[s.studentNumber] ?? [])].reverse();
  const opp = (id) => data.opportunities.find((o) => o.id === id);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <aside className="cr-drawer" onClick={(e) => e.stopPropagation()}>
        {assigning && <AssignModal student={s} toast={toast} onClose={() => setAssigning(false)} />}
        <div className="cr-drawer-head">
          <Avatar name={fullName(s)} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>{fullName(s)}</h2>
            <div className="muted">
              {s.degree} · {s.stage} · {s.studentNumber}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon.X />
          </button>
        </div>
        <div className="cr-drawer-body">
          <div className="cr-facts">
            <div>
              <span>Average</span>
              <strong>{s.average}%</strong>
            </div>
            <div>
              <span>Credits</span>
              <strong>
                {s.creditsCompleted}/{s.creditsRequired}
              </strong>
            </div>
            <div>
              <span>Graduates</span>
              <strong>{s.expectedGraduation}</strong>
            </div>
            <div>
              <span>Risk</span>
              <RiskPill risk={s.risk} />
            </div>
          </div>
          <div className="cr-src">
            <Icon.Live /> Academic data from EdOS · last synced {timeAgo(s.syncedAt)}
          </div>

          <h4>Exit pathway</h4>
          {s.decl ? (
            <div className="cr-decl">
              <PathwayPill pathway={s.pathway} />
              {s.decl.backup && (
                <span className="muted" style={{ fontSize: 12.5 }}>
                  backup: {pathwayMeta(s.decl.backup)?.label}
                </span>
              )}
              {s.readiness && <Readiness r={s.readiness} />}
              {s.decl.note && <p className="cr-note">“{s.decl.note}”</p>}
            </div>
          ) : (
            <p className="muted">Not declared yet.</p>
          )}
          {s.risk.reasons.length > 0 && (
            <ul className="cr-reasons">
              {s.risk.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}

          <h4>Applications</h4>
          {s.applications.length === 0 ? (
            <p className="muted">None yet.</p>
          ) : (
            s.applications.map((a) => (
              <div key={a.id} className="cr-app">
                <span>{opp(a.opportunityId)?.title ?? a.opportunityId}</span>
                <Pill tone={a.status === 'offer' || a.status === 'accepted' ? 'teal' : 'navy'}>{a.status}</Pill>
              </div>
            ))
          )}

          <h4>Support from Careers</h4>
          {s.interventions.length === 0 ? (
            <p className="muted">None assigned.</p>
          ) : (
            s.interventions.map((i) => (
              <div key={i.id} className="cr-app">
                <span>{interventionMeta(i.type).label}</span>
                <Pill tone={i.status === 'open' ? 'gold' : i.status === 'declined' ? 'coral' : 'teal'}>{i.status}</Pill>
              </div>
            ))
          )}
          <div className="cr-drawer-actions">
            <Btn tone="primary" onClick={() => setAssigning(true)}>
              Assign support
            </Btn>
            <a className="btn btn-outline" href={edosLink(s.studentNumber)} target="_blank" rel="noreferrer">
              See their EdOS ↗
            </a>
          </div>

          <h4>Journey across both systems</h4>
          <div className="cr-timeline">
            {events.map((e) => (
              <div key={e.id} className={`cr-tl ${e.from}`}>
                <i />
                <div>
                  <strong>{eventMeta(e.type).title}</strong>
                  <small>
                    {e.from === 'edos' ? 'from EdOS' : 'from Careers'} · {timeAgo(e.at)} · <code>{e.type}</code>
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ─────────────────────────── Opportunities ─────────────────────────── */

const GROUPS = [
  { key: 'all', label: 'All' },
  { key: 'employment', label: 'Employment' },
  { key: 'study', label: 'Further study' },
  { key: 'venture', label: 'Start-up & self-discovery' },
];

function Opportunities({ data, toast }) {
  const [group, setGroup] = useState('all');
  const [publishing, setPublishing] = useState(false);
  const list = data.opportunities.filter((o) => group === 'all' || kindMeta(o.kind).pathway === group);
  async function close(o) {
    if (!window.confirm(`Close “${o.title}”? It disappears from students’ EdOS.`)) return;
    await api.closeOpportunity(o.id);
    refresh();
    toast('Closed — removed from EdOS.');
  }
  return (
    <>
      {publishing && <PublishModal toast={toast} onClose={() => setPublishing(false)} />}
      <Card
        title="Opportunities"
        sub="Everything published here appears inside EdOS for eligible students. Saves and applications flow back."
        action={
          <Btn tone="primary" icon={Icon.Plus} onClick={() => setPublishing(true)}>
            Publish to EdOS
          </Btn>
        }
      >
        <div className="cr-chips">
          {GROUPS.map((g) => (
            <button key={g.key} className={group === g.key ? 'on' : ''} onClick={() => setGroup(g.key)}>
              {g.label}
            </button>
          ))}
        </div>
        <div className="tbl-wrap">
          <table className="tbl cr-tbl">
            <thead>
              <tr>
                <th>Opportunity</th>
                <th>Type</th>
                <th>Closes</th>
                <th title="Registered students who meet the criteria, using EdOS marks">Eligible</th>
                <th>Saved</th>
                <th>Applied</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((o) => {
                const d = o.closingDate ? daysUntil(o.closingDate) : null;
                return (
                  <tr key={o.id} className={o.closed ? 'cr-closed' : ''}>
                    <td>
                      <strong>{o.title}</strong>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {o.organisation}
                        {o.minAverage != null ? ` · min ${o.minAverage}%` : ''}
                      </div>
                    </td>
                    <td>
                      <PathwayPill pathway={kindMeta(o.kind).pathway} small /> <div className="cr-kind">{kindMeta(o.kind).label}</div>
                    </td>
                    <td style={{ fontSize: 12.5 }}>
                      {o.closed ? 'Closed' : d == null ? '—' : d < 0 ? 'Closed' : d === 0 ? 'Today' : `${d} days`}
                    </td>
                    <td>{o.stats.eligible}</td>
                    <td>{o.stats.saves}</td>
                    <td>
                      <strong>{o.stats.applications}</strong>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {!o.closed && (
                        <button className="link-btn" onClick={() => close(o)}>
                          Close
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function PublishModal({ toast, onClose }) {
  const [f, setF] = useState({
    kind: 'gradprog',
    title: '',
    organisation: '',
    location: '',
    summary: '',
    faculties: [],
    stages: [],
    minAverage: '',
    closingDate: '',
    value: '',
  });
  const [err, setErr] = useState(null);
  const set = (p) => setF((x) => ({ ...x, ...p }));
  async function submit(e) {
    e.preventDefault();
    try {
      await api.publishOpportunity({ ...f, uct: f.organisation.toLowerCase().includes('uct') });
      refresh();
      toast('Published — it’s now live in EdOS for eligible students.');
      onClose();
    } catch (x) {
      setErr(x.message);
    }
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
        <div className="modal-head">
          <div className="modal-title">Publish an opportunity to EdOS</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon.X />
          </button>
        </div>
        <form className="modal-body" onSubmit={submit}>
          <div className="fld-row">
            <label className="fld">
              <span>Type</span>
              <select value={f.kind} onChange={(e) => set({ kind: e.target.value })}>
                {PATHWAYS.filter((p) => p.key !== 'unsure').map((p) => (
                  <optgroup key={p.key} label={p.label}>
                    {OPPORTUNITY_KINDS.filter((k) => k.pathway === p.key).map((k) => (
                      <option key={k.key} value={k.key}>
                        {k.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="fld">
              <span>Closing date</span>
              <input type="date" value={f.closingDate} onChange={(e) => set({ closingDate: e.target.value })} />
            </label>
          </div>
          <div className="fld-row">
            <label className="fld">
              <span>Title</span>
              <input value={f.title} onChange={(e) => set({ title: e.target.value })} autoFocus />
            </label>
            <label className="fld">
              <span>Organisation</span>
              <input value={f.organisation} onChange={(e) => set({ organisation: e.target.value })} />
            </label>
          </div>
          <label className="fld">
            <span>Summary</span>
            <textarea rows={2} value={f.summary} onChange={(e) => set({ summary: e.target.value })} />
          </label>
          <div className="fld-row">
            <label className="fld">
              <span>Location</span>
              <input value={f.location} onChange={(e) => set({ location: e.target.value })} placeholder="Cape Town" />
            </label>
            <label className="fld">
              <span>Value / salary (optional)</span>
              <input value={f.value} onChange={(e) => set({ value: e.target.value })} />
            </label>
            <label className="fld">
              <span>Minimum average %</span>
              <input type="number" min="0" max="100" value={f.minAverage} onChange={(e) => set({ minAverage: e.target.value })} placeholder="None" />
            </label>
          </div>
          <div className="ms-field-label">Faculties (none = everyone)</div>
          <ChipSelect options={FACULTIES} value={f.faculties} onChange={(faculties) => set({ faculties })} />
          <div className="ms-field-label" style={{ marginTop: 12 }}>
            Stage (none = everyone)
          </div>
          <ChipSelect options={[...STAGES, 'Graduate']} value={f.stages} onChange={(stages) => set({ stages })} />
          <p className="cr-hint">
            EdOS checks eligibility against each student’s live marks, so students only see what they can apply for —
            and see exactly what they’re missing when they can’t.
          </p>
          {err && <div className="form-error">{err}</div>}
          <div className="modal-foot">
            <Btn type="button" onClick={onClose}>
              Cancel
            </Btn>
            <Btn tone="primary" type="submit">
              Publish to EdOS
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────── Unemployment risk ─────────────────────────── */

function Risk({ data, toast }) {
  const [assigning, setAssigning] = useState(null);
  const rows = data.students
    .filter((s) => s.risk.level !== 'none')
    .sort((a, b) => b.risk.score - a.risk.score);
  const last = (s) => s.interventions[0];
  return (
    <>
      {assigning && <AssignModal student={assigning} toast={toast} onClose={() => setAssigning(null)} />}
      <div className="cr-explain">
        <strong>Unemployment risk</strong> is worked out from what EdOS tells us — no pathway declared, low readiness,
        no applications, marks that narrow options, graduates still seeking work — so the office can reach students
        <em> before</em> they leave UCT without a plan. Support you assign lands in the student’s EdOS as a task.
      </div>
      <Card title="Students to reach" sub={`${rows.length} students, highest risk first.`}>
        <div className="tbl-wrap">
          <table className="tbl cr-tbl">
            <thead>
              <tr>
                <th>Student</th>
                <th>Risk</th>
                <th>Why</th>
                <th>Latest support</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.studentNumber}>
                  <td>
                    <strong>{fullName(s)}</strong>
                    <div className="muted" style={{ fontSize: 11.5 }}>
                      {s.status === 'graduated' ? `Graduated ${s.expectedGraduation}` : `${s.degree} · ${s.stage}`}
                    </div>
                  </td>
                  <td>
                    <RiskPill risk={s.risk} />
                  </td>
                  <td style={{ fontSize: 12.5, maxWidth: 320 }}>{s.risk.reasons.join(' · ')}</td>
                  <td style={{ fontSize: 12.5 }}>
                    {last(s) ? (
                      <>
                        {interventionMeta(last(s).type).label}{' '}
                        <Pill tone={last(s).status === 'open' ? 'gold' : last(s).status === 'declined' ? 'coral' : 'teal'}>
                          {last(s).status === 'open' ? 'sent' : last(s).status}
                        </Pill>
                      </>
                    ) : (
                      <span className="muted">None yet</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Btn size="sm" tone="primary" onClick={() => setAssigning(s)}>
                      Reach out
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function suggestedSupport(s) {
  if (s.status === 'graduated') return 'placement';
  if (!s.decl || s.decl.primary === 'unsure') return 'advising';
  if (!s.applications.length) return 'cv-clinic';
  return 'mock-interview';
}

function AssignModal({ student, toast, onClose }) {
  const first = student.firstName;
  const [type, setType] = useState(suggestedSupport(student));
  const meta = interventionMeta(type);
  const [message, setMessage] = useState('');
  const due = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const [dueDate, setDue] = useState(due);
  const text = message || `Hi ${first} — ${meta.blurb} We’ve set this up for you; pick a time that suits you.`;
  async function send(e) {
    e.preventDefault();
    await api.assignIntervention({ studentNumber: student.studentNumber, type, title: meta.label, message: text, dueDate });
    refresh();
    toast(`Sent — ${first} will see it in EdOS.`);
    onClose();
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-head">
          <div className="modal-title">Reach out to {fullName(student)}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon.X />
          </button>
        </div>
        <form className="modal-body" onSubmit={send}>
          <div className="cr-support-grid">
            {INTERVENTIONS.map((i) => (
              <button type="button" key={i.key} className={type === i.key ? 'on' : ''} onClick={() => setType(i.key)}>
                <strong>{i.label}</strong>
                <small>{i.blurb}</small>
              </button>
            ))}
          </div>
          <label className="fld">
            <span>Message to the student (shows in EdOS)</span>
            <textarea rows={3} value={text} onChange={(e) => setMessage(e.target.value)} />
          </label>
          <label className="fld" style={{ maxWidth: 220 }}>
            <span>Respond by</span>
            <input type="date" value={dueDate} onChange={(e) => setDue(e.target.value)} />
          </label>
          <div className="modal-foot">
            <Btn type="button" onClick={onClose}>
              Cancel
            </Btn>
            <Btn tone="primary" type="submit">
              Send to EdOS
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────── Destinations ─────────────────────────── */

function Destinations({ data, toast }) {
  const [assigning, setAssigning] = useState(null);
  const grads = data.students.filter((s) => s.status === 'graduated');
  return (
    <>
      {assigning && <AssignModal student={assigning} toast={toast} onClose={() => setAssigning(null)} />}
      <Card
        title="Graduate destinations — class of 2025"
        sub="Graduates keep EdOS access and report where they landed. ‘Seeking work’ and silence both trigger follow-up."
      >
        <div className="cr-dest-tiles">
          {DESTINATIONS.map((d) => (
            <div key={d.key} className={`cr-dest ${d.tone}`}>
              <strong>{grads.filter((s) => s.destination?.destination === d.key).length}</strong>
              <span>{d.label}</span>
            </div>
          ))}
          <div className="cr-dest none">
            <strong>{grads.filter((s) => !s.destination).length}</strong>
            <span>No report yet</span>
          </div>
        </div>
        <div className="tbl-wrap">
          <table className="tbl cr-tbl">
            <thead>
              <tr>
                <th>Graduate</th>
                <th>Degree</th>
                <th>Destination</th>
                <th>Detail</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {grads.map((s) => {
                const d = s.destination;
                return (
                  <tr key={s.studentNumber}>
                    <td>
                      <strong>{fullName(s)}</strong>
                    </td>
                    <td style={{ fontSize: 12.5 }}>{s.degree}</td>
                    <td>
                      {d ? <span className={`cr-path ${destinationMeta(d.destination).tone} sm`}>{destinationMeta(d.destination).label}</span> : <span className="cr-path none sm">No report</span>}
                    </td>
                    <td style={{ fontSize: 12.5 }}>{d ? [d.detail, d.organisation].filter(Boolean).join(' · ') : '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {(!d || d.destination === 'seeking') && (
                        <Btn size="sm" onClick={() => setAssigning(s)}>
                          Follow up
                        </Btn>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

/* ─────────────────────────── Integration ─────────────────────────── */

function Integration({ feed }) {
  const [open, setOpen] = useState(null);
  const [view, setView] = useState('log');
  return (
    <>
      <div className="cr-explain">
        <strong>How the two systems talk.</strong> EdOS and Careers share no database. EdOS owns the student and their
        academic record; Careers owns opportunities, support and mentors. Every fact that crosses over is one of the
        events below — in production, a signed webhook with exactly this payload.
      </div>
      <div className="cr-chips">
        <button className={view === 'log' ? 'on' : ''} onClick={() => setView('log')}>
          Live event log ({feed.length})
        </button>
        <button className={view === 'contract' ? 'on' : ''} onClick={() => setView('contract')}>
          Event contract ({Object.keys(EVENTS).length} types)
        </button>
      </div>
      {view === 'log' ? (
        <Card>
          <div className="cr-log">
            {feed.map((e) => (
              <div key={e.id} className="cr-log-row">
                <button className="cr-log-main" onClick={() => setOpen(open === e.id ? null : e.id)}>
                  <span className="cr-log-seq">#{e.seq}</span>
                  <Direction from={e.from} />
                  <code>{e.type}</code>
                  <span className="cr-log-text">{e.text}</span>
                  <span className="cr-feed-time">{timeAgo(e.at)}</span>
                </button>
                {open === e.id && <pre className="cr-json">{JSON.stringify(e, null, 2)}</pre>}
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <div className="tbl-wrap">
            <table className="tbl cr-tbl">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Emitted by</th>
                  <th>Why it exists</th>
                  <th>Payload</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(EVENTS).map(([type, m]) => (
                  <tr key={type}>
                    <td>
                      <code>{type}</code>
                    </td>
                    <td>{m.from === 'both' ? 'Either' : m.from === 'edos' ? 'EdOS' : 'Careers'}</td>
                    <td style={{ fontSize: 12.5, maxWidth: 300 }}>{m.why}</td>
                    <td>
                      <code className="cr-payload">{m.payload}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
