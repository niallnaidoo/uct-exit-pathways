/**
 * Opportunity board — shared by the Careers console and the employer portal.
 *
 *  - Post an opportunity (4-step wizard): what it is → who it's for (faculty,
 *    degree e.g. BCom, year of study, minimum average) → what applicants must
 *    submit (CV, cover letter, transcript, LinkedIn) → review & publish.
 *    One employer can post several kinds — a graduate programme AND a bursary.
 *  - Applicants: move each one through the stages; the student sees it in EdOS.
 *  - Send to students (Careers only): hand-pick eligible students; it lands in
 *    their EdOS as "Sent to you".
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from './query.js';
import * as api from './api.js';
import { Icon, Btn, Card, EmptyState, Avatar } from './atoms.jsx';
import { ChipSelect } from './mentorship-ui.jsx';
import {
  PATHWAYS,
  OPPORTUNITY_KINDS,
  FACULTIES,
  DEGREE_FAMILIES,
  ALL_DEGREE_FAMILIES,
  YEAR_TARGETS,
  WORK_MODES,
  APPLICATION_FIELDS,
  DEFAULT_REQUIREMENTS,
  APPLICATION_STAGES,
  kindMeta,
  stageMeta,
  pathwayMeta,
} from '../../../packages/bridge/vocab.js';
import { daysUntil } from '../../../packages/bridge/project.js';
import { timeAgo } from '../../../packages/bridge/describe.js';
import './board.css';

const refresh = () => queryClient.invalidateQueries();
const fullName = (s) => (s ? `${s.firstName} ${s.lastName}` : '—');

const GROUPS = [
  { key: 'employment', label: 'Employment' },
  { key: 'study', label: 'Further study & bursaries' },
  { key: 'venture', label: 'Start-up & self-discovery' },
  { key: 'all', label: 'All' },
];

function targeting(o) {
  const bits = [];
  if (o.degrees?.length) bits.push(o.degrees.join(' / '));
  else if (o.faculties?.length) bits.push(o.faculties.join(' / '));
  else bits.push('All faculties');
  if (o.years?.length) bits.push(o.years.join(', '));
  else if (o.stages?.length) bits.push(o.stages.join(', '));
  if (o.minAverage != null) bits.push(`${o.minAverage}%+`);
  return bits.join(' · ');
}

/**
 * scope 'careers' → every opportunity, can send to students.
 * scope 'employer' → only this employer's, organisation fixed.
 */
export function OpportunityBoard({ scope = 'careers', employer, toast }) {
  const { data } = useQuery({ queryKey: ['careers'], queryFn: api.getCareers });
  const [group, setGroup] = useState(scope === 'employer' ? 'all' : 'employment');
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(null);
  if (!data) return <div className="muted">Loading…</div>;

  let list = data.opportunities;
  if (scope === 'employer') list = list.filter((o) => o.employerId === employer.id);
  if (group !== 'all') list = list.filter((o) => kindMeta(o.kind).pathway === group);
  const appsFor = (id) => data.applications.filter((a) => a.opportunityId === id);

  return (
    <>
      {creating && <OpportunityWizard scope={scope} employer={employer} toast={toast} onClose={() => setCreating(false)} />}
      {open && <OpportunityDrawer id={open} scope={scope} toast={toast} onClose={() => setOpen(null)} />}
      <Card
        title={scope === 'employer' ? 'Your opportunities' : 'Employment & opportunities'}
        sub={
          scope === 'employer'
            ? 'Everything you post goes live in EdOS for the students you target. Applications arrive here.'
            : 'Post opportunities (or review what employers post), track applicants through each stage, and send them straight to students in EdOS.'
        }
        action={
          <Btn tone="primary" icon={Icon.Plus} onClick={() => setCreating(true)}>
            Post an opportunity
          </Btn>
        }
      >
        {scope === 'careers' && (
          <div className="cr-chips">
            {GROUPS.map((g) => (
              <button key={g.key} className={group === g.key ? 'on' : ''} onClick={() => setGroup(g.key)}>
                {g.label}
              </button>
            ))}
          </div>
        )}
        {list.length === 0 ? (
          <EmptyState icon={Icon.Doc} title="Nothing posted yet" sub="Post your first opportunity — a job, graduate programme or bursary." />
        ) : (
          <div className="ob-list">
            {list.map((o) => {
              const apps = appsFor(o.id);
              const d = o.closingDate ? daysUntil(o.closingDate) : null;
              const byStage = APPLICATION_STAGES.slice(0, 5).map((s) => ({ ...s, n: apps.filter((a) => a.status === s.key).length }));
              return (
                <button key={o.id} className={`ob-row ${o.closed ? 'closed' : ''}`} onClick={() => setOpen(o.id)}>
                  <div className="ob-main">
                    <div className="ob-tags">
                      <span className={`cr-path ${pathwayMeta(kindMeta(o.kind).pathway).tone} sm`}>{kindMeta(o.kind).label}</span>
                      {o.postedBy === 'employer' && scope === 'careers' && <span className="ob-posted">Posted by employer</span>}
                    </div>
                    <strong>{o.title}</strong>
                    <span className="muted">
                      {o.organisation} · {targeting(o)}
                    </span>
                  </div>
                  <div className="ob-pipe">
                    {byStage.map((s) => (
                      <span key={s.key} className={s.n ? 'has' : ''} title={s.label}>
                        <b>{s.n}</b>
                        {s.label}
                      </span>
                    ))}
                  </div>
                  <div className="ob-meta">
                    {o.positions ? <span>{o.positions} position{o.positions === 1 ? '' : 's'}</span> : null}
                    <span>{o.stats.eligible} eligible</span>
                    <span>{o.closed ? 'Closed' : d == null ? 'Open' : d < 0 ? 'Closed' : `Closes in ${d}d`}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}

/* ─────────────────────────── Posting wizard ─────────────────────────── */

const STEPS = ['What it is', 'Who it’s for', 'Application', 'Review'];

export function OpportunityWizard({ scope, employer, toast, onClose }) {
  const [step, setStep] = useState(0);
  const [err, setErr] = useState(null);
  const [f, setF] = useState({
    kind: 'gradprog',
    title: '',
    organisation: employer?.name ?? '',
    location: 'Cape Town',
    workMode: 'On-site',
    positions: '',
    value: '',
    closingDate: '',
    summary: '',
    faculties: [],
    degrees: [],
    years: [],
    minAverage: '',
    requirements: { ...DEFAULT_REQUIREMENTS },
  });
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const pathway = kindMeta(f.kind).pathway;
  const degreeOptions = f.faculties.length ? f.faculties.flatMap((fac) => DEGREE_FAMILIES[fac] ?? []) : ALL_DEGREE_FAMILIES;
  const draft = { ...f, minAverage: f.minAverage === '' ? null : Number(f.minAverage) };
  const { data: reach = 0 } = useQuery({ queryKey: ['reach', JSON.stringify(draft)], queryFn: () => api.countEligible(draft) });

  const gaps = [
    step === 0 && (!f.title.trim() || !f.organisation.trim()) && 'a title and organisation',
    step === 0 && !f.closingDate && 'a closing date',
  ].filter(Boolean);

  async function publish() {
    try {
      await api.publishOpportunity({ ...f, employerId: employer?.id ?? null });
      refresh();
      toast?.(`Published — live in EdOS for ${reach} eligible student${reach === 1 ? '' : 's'}.`);
      onClose();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal ob-wizard" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">Post an opportunity</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon.X />
          </button>
        </div>
        <div className="ob-steps">
          {STEPS.map((s, i) => (
            <button key={s} className={`${i === step ? 'on' : ''} ${i < step ? 'done' : ''}`} onClick={() => i < step && setStep(i)}>
              <span>{i < step ? '✓' : i + 1}</span>
              {s}
            </button>
          ))}
        </div>
        <div className="modal-body">
          {step === 0 && (
            <>
              <div className="ms-field-label">Type of opportunity</div>
              <div className="ob-kinds">
                {PATHWAYS.filter((p) => p.key !== 'unsure').map((p) => (
                  <div key={p.key} className="ob-kind-group">
                    <small>{p.key === 'employment' ? 'Work' : p.label}</small>
                    {OPPORTUNITY_KINDS.filter((k) => k.pathway === p.key).map((k) => (
                      <button key={k.key} className={f.kind === k.key ? 'on' : ''} onClick={() => set({ kind: k.key })}>
                        {k.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <div className="fld-row" style={{ marginTop: 14 }}>
                <label className="fld">
                  <span>Title</span>
                  <input value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder={pathway === 'study' ? 'e.g. Honours Bursary 2027' : 'e.g. Graduate Analyst Programme 2027'} />
                </label>
                <label className="fld">
                  <span>Organisation</span>
                  <input value={f.organisation} disabled={scope === 'employer'} onChange={(e) => set({ organisation: e.target.value })} />
                </label>
              </div>
              <div className="fld-row">
                <label className="fld">
                  <span>Location</span>
                  <input value={f.location} onChange={(e) => set({ location: e.target.value })} />
                </label>
                {pathway === 'employment' && (
                  <label className="fld">
                    <span>Work mode</span>
                    <select value={f.workMode} onChange={(e) => set({ workMode: e.target.value })}>
                      {WORK_MODES.map((w) => (
                        <option key={w}>{w}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="fld">
                  <span>Number of positions available</span>
                  <input type="number" min="1" value={f.positions} onChange={(e) => set({ positions: e.target.value })} />
                </label>
              </div>
              <div className="fld-row">
                <label className="fld">
                  <span>{pathway === 'study' ? 'Value' : 'Salary / stipend'} (optional)</span>
                  <input value={f.value} onChange={(e) => set({ value: e.target.value })} placeholder={pathway === 'study' ? 'e.g. Full tuition + R8 000 / month' : 'e.g. R380 000 per year'} />
                </label>
                <label className="fld">
                  <span>Closing date</span>
                  <input type="date" value={f.closingDate} onChange={(e) => set({ closingDate: e.target.value })} />
                </label>
              </div>
              <label className="fld">
                <span>Description</span>
                <textarea rows={3} value={f.summary} onChange={(e) => set({ summary: e.target.value })} />
              </label>
            </>
          )}

          {step === 1 && (
            <>
              <p className="cr-hint" style={{ marginTop: 0 }}>
                Choose the students this is for. EdOS checks every student’s live record, so only those who fit see it as
                open to them.
              </p>
              <div className="ms-field-label">Faculty</div>
              <ChipSelect options={FACULTIES} value={f.faculties} onChange={(faculties) => set({ faculties, degrees: f.degrees.filter((d) => !faculties.length || faculties.some((fac) => (DEGREE_FAMILIES[fac] ?? []).includes(d))) })} />
              <div className="ms-field-label" style={{ marginTop: 14 }}>
                Degree (e.g. BCom)
              </div>
              <ChipSelect options={degreeOptions} value={f.degrees} onChange={(degrees) => set({ degrees })} />
              <div className="ms-field-label" style={{ marginTop: 14 }}>
                Year of study
              </div>
              <ChipSelect options={YEAR_TARGETS} value={f.years} onChange={(years) => set({ years })} />
              <p className="ob-hint">
                Tip: a bursary for <em>next year’s</em> Honours targets 3rd-years now; a graduate programme targets final
                years.
              </p>
              <label className="fld" style={{ maxWidth: 220, marginTop: 10 }}>
                <span>Minimum average %</span>
                <input type="number" min="0" max="100" value={f.minAverage} onChange={(e) => set({ minAverage: e.target.value })} placeholder="None" />
              </label>
              <div className="ob-reach">
                <strong>{reach}</strong> registered student{reach === 1 ? ' matches' : 's match'} right now
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="cr-hint" style={{ marginTop: 0 }}>
                What should students submit? Students apply from inside EdOS.
              </p>
              <div className="ob-reqs">
                {APPLICATION_FIELDS.map((fld) => (
                  <label key={fld.key} className={`ob-req ${f.requirements[fld.key] ? 'on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={!!f.requirements[fld.key]}
                      onChange={(e) => set({ requirements: { ...f.requirements, [fld.key]: e.target.checked } })}
                    />
                    <span>
                      <strong>{fld.label}</strong>
                      <small>{fld.hint}</small>
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <div className="ob-review">
              <div className="ob-review-card">
                <span className={`cr-path ${pathwayMeta(pathway).tone} sm`}>{kindMeta(f.kind).label}</span>
                <h3>{f.title || 'Untitled'}</h3>
                <div className="muted">
                  {f.organisation} · {f.location}
                  {pathway === 'employment' ? ` · ${f.workMode}` : ''}
                  {f.value ? ` · ${f.value}` : ''}
                </div>
                {f.summary && <p>{f.summary}</p>}
              </div>
              <dl className="ms-dl">
                <dt>For</dt>
                <dd>{targeting(draft)}</dd>
                <dt>Positions</dt>
                <dd>{f.positions || 'Not set'}</dd>
                <dt>Reaches</dt>
                <dd>
                  {reach} student{reach === 1 ? '' : 's'} right now
                </dd>
                <dt>Applicants submit</dt>
                <dd>
                  {APPLICATION_FIELDS.filter((x) => f.requirements[x.key])
                    .map((x) => x.label)
                    .join(', ') || 'Nothing extra'}
                </dd>
                <dt>Closes</dt>
                <dd>{f.closingDate}</dd>
              </dl>
            </div>
          )}

          {gaps.length > 0 && <div className="form-error">Still needed: {gaps.join(', ')}.</div>}
          {err && <div className="form-error">{err}</div>}
          <div className="modal-foot">
            {step > 0 ? (
              <Btn type="button" onClick={() => setStep(step - 1)}>
                Back
              </Btn>
            ) : (
              <Btn type="button" onClick={onClose}>
                Cancel
              </Btn>
            )}
            {step < 3 ? (
              <Btn tone="primary" type="button" disabled={gaps.length > 0} onClick={() => setStep(step + 1)}>
                Continue
              </Btn>
            ) : (
              <Btn tone="primary" type="button" onClick={publish}>
                Publish to EdOS
              </Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Detail drawer ─────────────────────────── */

function OpportunityDrawer({ id, scope, toast, onClose }) {
  const { data } = useQuery({ queryKey: ['opp', id], queryFn: () => api.getOpportunityDetail(id) });
  const [sending, setSending] = useState(false);
  if (!data) return null;
  const { opportunity: o, applicants } = data;
  const d = o.closingDate ? daysUntil(o.closingDate) : null;

  async function stage(a, status) {
    await api.updateApplicationStage(a.id, status, scope === 'employer' ? o.organisation : 'Careers Service');
    refresh();
    toast?.(`${a.student?.firstName ?? 'Applicant'} moved to ${stageMeta(status).label} — they’ll see it in EdOS.`);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <aside className="cr-drawer ob-drawer" onClick={(e) => e.stopPropagation()}>
        {sending && <SendModal data={data} toast={toast} onClose={() => setSending(false)} />}
        <div className="cr-drawer-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className={`cr-path ${pathwayMeta(kindMeta(o.kind).pathway).tone} sm`}>{kindMeta(o.kind).label}</span>
            <h2 style={{ marginTop: 6 }}>{o.title}</h2>
            <div className="muted">
              {o.organisation} · {o.location}
              {o.value ? ` · ${o.value}` : ''}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon.X />
          </button>
        </div>
        <div className="cr-drawer-body">
          <div className="cr-facts">
            <div>
              <span>Positions</span>
              <strong>{o.positions ?? '—'}</strong>
            </div>
            <div>
              <span>Eligible</span>
              <strong>{o.stats.eligible}</strong>
            </div>
            <div>
              <span>Applicants</span>
              <strong>{applicants.length}</strong>
            </div>
            <div>
              <span>Closes</span>
              <strong>{o.closed ? '—' : d == null ? '—' : `${d}d`}</strong>
            </div>
          </div>
          <div className="ob-target">
            <Icon.Users /> For {targeting(o)}
          </div>
          {o.summary && <p style={{ fontSize: 13.5, lineHeight: 1.55 }}>{o.summary}</p>}
          <div className="cr-drawer-actions">
            {scope === 'careers' && !o.closed && (
              <Btn tone="primary" icon={Icon.Mail} onClick={() => setSending(true)}>
                Send to students
              </Btn>
            )}
            {!o.closed && (
              <Btn
                onClick={async () => {
                  if (!window.confirm('Close this opportunity? It disappears from EdOS.')) return;
                  await api.closeOpportunity(o.id);
                  refresh();
                  onClose();
                }}
              >
                Close
              </Btn>
            )}
          </div>

          <h4>Applicants</h4>
          {applicants.length === 0 ? (
            <p className="muted">No applications yet.</p>
          ) : (
            applicants.map((a) => (
              <div key={a.id} className="ob-applicant">
                <div className="ob-app-head">
                  <Avatar name={fullName(a.student)} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>{fullName(a.student)}</strong>
                    <small>
                      {a.student?.degree} · {a.student?.stage} · {a.student?.average}% · applied {timeAgo(a.submittedAt)}
                    </small>
                  </div>
                  <select className={`ob-stage ${stageMeta(a.status).tone}`} value={a.status} onChange={(e) => stage(a, e.target.value)}>
                    {APPLICATION_STAGES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ob-docs">
                  {a.attachments?.cv && <span>📄 {a.attachments.cv}</span>}
                  {a.attachments?.coverLetter && <span>📄 {a.attachments.coverLetter}</span>}
                  {a.attachments?.transcript && <span className="auto">✓ Transcript (EdOS)</span>}
                  {a.answers?.linkedin && (
                    <a href={a.answers.linkedin} target="_blank" rel="noreferrer">
                      LinkedIn ↗
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

/** Careers hand-picks students; it lands in their EdOS as "Sent to you". */
function SendModal({ data, toast, onClose }) {
  const { opportunity: o, candidates } = data;
  const [picked, setPicked] = useState(() => candidates.filter((c) => c.fits && !c.sent).slice(0, 5).map((c) => c.studentNumber));
  const [message, setMessage] = useState(`We think this fits your plans and your marks — applications close ${o.closingDate ?? 'soon'}.`);
  const [q, setQ] = useState('');
  const shown = useMemo(
    () => candidates.filter((c) => !q || `${fullName(c)} ${c.degree}`.toLowerCase().includes(q.toLowerCase())),
    [candidates, q],
  );
  const toggle = (sn) => setPicked((p) => (p.includes(sn) ? p.filter((x) => x !== sn) : [...p, sn]));
  async function send() {
    await api.sendOpportunity(o.id, picked, message);
    refresh();
    toast?.(`Sent to ${picked.length} student${picked.length === 1 ? '' : 's'} — it’s in their EdOS now.`);
    onClose();
  }
  return (
    <div className="modal-backdrop" style={{ zIndex: 260 }} onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="modal-head">
          <div className="modal-title">Send “{o.title}” to students</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon.X />
          </button>
        </div>
        <div className="modal-body">
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
            Only students who are eligible are listed. Those whose exit pathways include{' '}
            {pathwayMeta(kindMeta(o.kind).pathway)?.label.toLowerCase()} are pre-selected.
          </p>
          <input className="cr-search" style={{ width: '100%', marginBottom: 10 }} placeholder="Search students…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="ob-send-list">
            {shown.map((c) => (
              <label key={c.studentNumber} className={`ob-send ${picked.includes(c.studentNumber) ? 'on' : ''}`}>
                <input type="checkbox" checked={picked.includes(c.studentNumber)} onChange={() => toggle(c.studentNumber)} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong>{fullName(c)}</strong>
                  <small>
                    {c.degree} · {c.stage} · {c.average}%
                  </small>
                </span>
                {c.fits && <span className="ob-fit">Fits their pathway</span>}
                {c.sent && <span className="ob-sent">Already sent</span>}
              </label>
            ))}
            {shown.length === 0 && <p className="muted">No eligible students left to send to.</p>}
          </div>
          <label className="fld" style={{ marginTop: 12 }}>
            <span>Message (shows in their EdOS)</span>
            <textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
          <div className="modal-foot">
            <Btn type="button" onClick={onClose}>
              Cancel
            </Btn>
            <Btn tone="primary" type="button" disabled={!picked.length} onClick={send}>
              Send to {picked.length} student{picked.length === 1 ? '' : 's'}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
