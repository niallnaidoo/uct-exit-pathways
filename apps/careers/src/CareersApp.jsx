/**
 * UCT Careers Service — Exit Pathways console.
 *
 * Built on the four exit pathways (further study, employment, start-up &
 * self-discovery, and the unemployment outcome we're working to prevent). The
 * student data here is NOT captured by Careers: it arrives from EdOS as events,
 * and everything Careers does for a student (opportunities, support, mentors)
 * goes back to EdOS as events (see docs/INTEGRATION.md).
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { qk, queryClient } from './query.js';
import * as api from './api.js';
import { Icon, Pill, Btn, Card, EmptyState, Avatar } from './atoms.jsx';
import { MentorshipTab } from './MentorshipAdmin.jsx';
import { OpportunityBoard } from './OpportunityBoard.jsx';
import { GRADUATING_STAGES, RISK_LABEL } from './careers-model.js';
import {
  PATHWAYS,
  DESTINATIONS,
  INTERVENTIONS,
  pathwayMeta,
  interventionMeta,
  destinationMeta,
} from '../../../packages/bridge/vocab.js';
import { eventMeta } from '../../../packages/bridge/contract.js';
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
    { key: 'engagement', label: 'Engagement' },
    { key: 'opportunities', label: 'Opportunities', badge: data.opportunities.filter((o) => !o.closed).length },
    { key: 'risk', label: 'Unemployment risk', badge: atRisk.length, warn: true },
    { key: 'mentorship', label: 'Mentorship' },
    { key: 'destinations', label: 'Destinations' },
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
      {tab === 'engagement' && <Engagement toast={toast} />}
      {tab === 'opportunities' && <OpportunityBoard scope="careers" toast={toast} />}
      {tab === 'risk' && <Risk data={data} toast={toast} />}
      {tab === 'mentorship' && <MentorshipTab toast={toast} />}
      {tab === 'destinations' && <Destinations data={data} toast={toast} />}
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

/* ─────────────────────────── Overview ─────────────────────────── */

function Overview({ data, feed, go }) {
  const cohort = data.students.filter((s) => s.status === 'registered' && GRADUATING_STAGES.includes(s.stage));
  const grads = data.students.filter((s) => s.status === 'graduated');
  const declared = cohort.filter((s) => s.decl);
  const segments = [
    ...PATHWAYS.map((p) => ({ key: p.key, label: p.label, tone: p.tone, n: cohort.filter((s) => s.decl?.primary === p.key).length })),
    // (bar counts each student once, by their main pathway; Students tab filters by any pathway)
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
        <Card title="Exit pathways — graduating cohort" sub="Main pathway declared by each student in EdOS (many choose more than one). Click to see who.">
          <StackBar segments={segments} onPick={(k) => go('students', k)} />
        </Card>
        <Card title="Where the class of 2025 landed" sub="Graduates report their destination in EdOS.">
          <StackBar segments={destSegs} onPick={() => go('destinations')} />
        </Card>
      </div>

      <div className="cr-two">
        <Card title="Recent activity" sub="What students are doing in EdOS, and what your team sent them.">
          <div className="cr-feed">
            {feed.filter((e) => e.type !== 'student.synced').slice(0, 7).map((e) => (
              <div key={e.id} className="cr-feed-row">
                <span className={`cr-src-dot ${e.from}`} title={e.from === 'edos' ? 'From EdOS' : 'From Careers'} />
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
        pathway === 'all' ? true : pathway === 'none' ? !s.decl : s.decl?.pathways?.includes(pathway),
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
                    {s.decl ? (
                      <div className="cr-pws">
                        {s.decl.pathways.map((p) => (
                          <PathwayPill key={p} pathway={p} small />
                        ))}
                      </div>
                    ) : (
                      <PathwayPill pathway={null} small />
                    )}
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
            {s.nextTest && ` · next test ${s.nextTest.code} on ${s.nextTest.date}`}
          </div>

          <h4>Exit pathway</h4>
          {s.decl ? (
            <div className="cr-decl">
              {s.decl.pathways.map((p) => (
                <PathwayPill key={p} pathway={p} />
              ))}
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
                  <td>
                    <div className="cr-why">
                      {s.risk.reasons.map((r) => (
                        <span key={r}>{r}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontSize: 12.5 }}>
                    {last(s) ? (
                      <div className="cr-support-cell">
                        <span>{interventionMeta(last(s).type).label}</span>
                        <Pill tone={last(s).status === 'open' ? 'gold' : last(s).status === 'declined' ? 'coral' : 'teal'}>
                          {last(s).status === 'open' ? 'Sent' : last(s).status}
                        </Pill>
                      </div>
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

/* ─────────────────────────── EdOS engagement ─────────────────────────── */

const COLS = [
  { key: 'student', label: 'Student' },
  { key: 'viewed', label: 'Last checked opportunities' },
  { key: 'mentor', label: 'Since last mentor contact' },
  { key: 'test', label: 'Days till next test' },
  { key: 'gradebook', label: 'Gradebook' },
  { key: 'interventions', label: 'Interventions' },
];
const SORTS = {
  student: (a, b) => a.lastName.localeCompare(b.lastName),
  viewed: (a, b) => (b.daysSinceViewed ?? 999) - (a.daysSinceViewed ?? 999),
  mentor: (a, b) => (b.daysSinceMentor ?? 999) - (a.daysSinceMentor ?? 999),
  test: (a, b) => (a.daysToTest ?? 999) - (b.daysToTest ?? 999),
  gradebook: (a, b) => a.average - b.average,
  interventions: (a, b) => b.interventions.open - a.interventions.open || b.interventions.total - a.interventions.total,
};
const ago = (d) => (d == null ? 'Never' : d === 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago`);

function Engagement({ toast }) {
  const { data: rows = [] } = useQuery({ queryKey: ['engagement'], queryFn: api.getEngagement });
  const [sort, setSort] = useState('viewed');
  const [open, setOpen] = useState(null);
  const { data: careers } = useQuery({ queryKey: qk.careers(), queryFn: api.getCareers });
  const sorted = [...rows].sort(SORTS[sort]);
  const current = open && careers?.students.find((s) => s.studentNumber === open);
  const stale = rows.filter((r) => r.daysSinceViewed == null || r.daysSinceViewed > 14).length;
  const soon = rows.filter((r) => r.daysToTest != null && r.daysToTest <= 7).length;
  return (
    <>
      {current && <StudentDrawer s={current} data={careers} toast={toast} onClose={() => setOpen(null)} />}
      <div className="ms-admin-kpis" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <div className={stale ? 'warn' : ''}>
          <strong>{stale}</strong>
          <span>Haven’t checked opportunities in 2+ weeks</span>
        </div>
        <div>
          <strong>{rows.filter((r) => r.mentor && r.daysSinceMentor > 14).length}</strong>
          <span>Mentees quiet for 2+ weeks</span>
        </div>
        <div>
          <strong>{soon}</strong>
          <span>Writing a test this week</span>
        </div>
        <div>
          <strong>{rows.reduce((t, r) => t + r.interventions.open, 0)}</strong>
          <span>Support sent, no reply yet</span>
        </div>
      </div>
      <Card
        title="EdOS engagement"
        sub="Live from EdOS: when each student last checked opportunities, their mentor contact, next test, gradebook and support. Click a column to sort, a row for the student."
      >
        <div className="eg-legend">
          <span><i style={{ background: 'var(--green)' }} />On track</span>
          <span><i style={{ background: '#a07320' }} />Worth a nudge</span>
          <span><i style={{ background: 'var(--pw-seeking)' }} />Needs attention</span>
          <span><i style={{ background: '#4d6884' }} />Test this week — go easy on outreach</span>
        </div>
        <div className="tbl-wrap">
          <table className="tbl cr-tbl eg-tbl">
            <thead>
              <tr>
                {COLS.map((c) => (
                  <th key={c.key} className={sort === c.key ? 'sorted' : ''} onClick={() => setSort(c.key)}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const v = r.daysSinceViewed;
                const vt = v == null || v > 30 ? 'eg-bad' : v > 14 ? 'eg-warn' : 'eg-ok';
                const m = r.daysSinceMentor;
                const mt = !r.mentor ? '' : m > 21 ? 'eg-bad' : m > 14 ? 'eg-warn' : 'eg-ok';
                const t = r.daysToTest;
                const tt = t != null && t <= 7 ? 'eg-soon' : '';
                const gb = r.gradebook ?? { recorded: 0, due: 0 };
                const gt = r.average < 55 ? 'eg-bad' : gb.due ? 'eg-warn' : 'eg-ok';
                const iv = r.interventions;
                return (
                  <tr key={r.studentNumber} className="cr-click" onClick={() => setOpen(r.studentNumber)}>
                    <td>
                      <div className="cell-id">
                        <Avatar name={fullName(r)} size={26} />
                        <div>
                          <strong>{fullName(r)}</strong>
                          <div className="muted" style={{ fontSize: 11.5 }}>
                            {r.degree} · {r.stage}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`eg-cell ${vt}`}>
                        <b>{ago(v)}</b>
                        {r.lastViewed && <small>{new Date(r.lastViewed).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</small>}
                      </span>
                    </td>
                    <td>
                      {r.mentor ? (
                        <span className={`eg-cell ${mt}`}>
                          <b>{m == null ? '—' : m === 0 ? 'Today' : `${m} days`}</b>
                          <small>{r.mentor.firstName} {r.mentor.lastName}</small>
                        </span>
                      ) : (
                        <span className="eg-cell">
                          <b className="muted" style={{ fontWeight: 500 }}>{r.mentorRequested ? 'Requested' : 'No mentor'}</b>
                        </span>
                      )}
                    </td>
                    <td>
                      {r.nextTest ? (
                        <span className={`eg-cell ${tt}`}>
                          <b>{t === 0 ? 'Today' : `${t} days`}</b>
                          <small>
                            {r.nextTest.label} · {r.nextTest.code}
                          </small>
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`eg-cell ${gt}`}>
                        <b>{r.average}% avg</b>
                        <small>
                          {gb.recorded} marks in{gb.due ? ` · ${gb.due} outstanding` : ''}
                        </small>
                      </span>
                    </td>
                    <td>
                      {iv.total ? (
                        <div className="eg-ints">
                          {iv.open > 0 && <span className="open">{iv.open} awaiting reply</span>}
                          {iv.booked > 0 && <span className="booked">{iv.booked} booked</span>}
                          {iv.done > 0 && <span className="done">{iv.done} done</span>}
                          {iv.declined > 0 && <span className="declined">{iv.declined} declined</span>}
                        </div>
                      ) : (
                        <span className="muted">None</span>
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
