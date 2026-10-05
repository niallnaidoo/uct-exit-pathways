/**
 * EdOS — opportunities published by the UCT Careers Service and employers.
 *
 * Criteria (degree, year, average) are set by whoever posted it; EdOS checks
 * them against the student's live record so each card says plainly whether
 * you can apply. Applying sends CV, cover letter, LinkedIn — and EdOS attaches
 * the transcript itself. Employers move the application through stages; the
 * student sees each change here.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEdos, toggleSave, applyTo, updateApplication, markOpportunitiesViewed, savedDocuments } from './store.js';
import { Icon, PathwayTag, Closing, kindLabel, Synced } from './ui.jsx';
import { APPLICATION_FIELDS, APPLICATION_STAGES, stageMeta } from '../../../../packages/bridge/vocab.js';
import { timeAgo } from '../../../../packages/bridge/describe.js';

const TABS = [
  { key: 'foryou', label: 'For you' },
  { key: 'sent', label: 'Sent to you' },
  { key: 'employment', label: 'Jobs & graduate programmes' },
  { key: 'study', label: 'Further study' },
  { key: 'venture', label: 'Volunteering & start-ups' },
  { key: 'mine', label: 'My applications' },
];
const STUDY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'uct-programme', label: 'UCT programmes' },
  { key: 'external-programme', label: 'External programmes' },
  { key: 'bursary', label: 'Bursaries' },
  { key: 'scholarship', label: 'Scholarships' },
];

export function Opportunities() {
  const v = useEdos();
  const [params] = useSearchParams();
  const openId = params.get('open');
  const [tab, setTab] = useState(() => (v.opportunities.some((o) => o.sent && !o.application) ? 'sent' : 'foryou'));
  const [studyKind, setStudyKind] = useState('all');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [applying, setApplying] = useState(null);

  // Tell Careers the student checked opportunities (engagement dashboard).
  useEffect(() => {
    markOpportunitiesViewed();
  }, []);
  useEffect(() => {
    if (!openId) return;
    document.getElementById(`opp-${openId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [openId]);

  const sentCount = v.opportunities.filter((o) => o.sent).length;
  let list = v.opportunities;
  if (tab === 'foryou') list = list.filter((o) => o.eligibility.ok).slice(0, 8);
  else if (tab === 'sent') list = list.filter((o) => o.sent);
  else if (tab === 'mine') list = list.filter((o) => o.saved || o.application);
  else list = list.filter((o) => o.pathway === tab);
  if (tab === 'study' && studyKind !== 'all') list = list.filter((o) => o.kind === studyKind);
  if (eligibleOnly && !['foryou', 'mine'].includes(tab)) list = list.filter((o) => o.eligibility.ok);

  return (
    <div className="ed-page">
      {applying && <ApplyModal o={applying} me={v.me} onClose={() => setApplying(null)} />}
      <header className="ed-page-head">
        <div className="t-eyebrow">From the UCT Careers Service and employers</div>
        <h1 className="t-display">Opportunities</h1>
        <p className="t-body">
          Jobs, UCT and external programmes, bursaries, scholarships, volunteering and start-up support — checked
          against your record, so you know what you can apply for.
        </p>
      </header>

      <div className="tabs ed-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${tab === t.key ? 'is-active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
            {t.key === 'sent' && sentCount > 0 && <span className="ed-count hot">{sentCount}</span>}
            {t.key === 'mine' && v.applications.length > 0 && <span className="ed-count">{v.applications.length}</span>}
          </button>
        ))}
      </div>

      {(tab === 'study' || !['foryou', 'mine', 'sent'].includes(tab)) && (
        <div className="ed-filter-row">
          {tab === 'study' &&
            STUDY_FILTERS.map((f) => (
              <button key={f.key} className={`ed-chip ${studyKind === f.key ? 'on' : ''}`} onClick={() => setStudyKind(f.key)}>
                {f.label}
              </button>
            ))}
          <label className="ed-toggle">
            <input type="checkbox" checked={eligibleOnly} onChange={(e) => setEligibleOnly(e.target.checked)} />
            Only ones I’m eligible for
          </label>
        </div>
      )}

      {tab === 'foryou' && !v.decl && (
        <div className="card ed-nudge">
          <Icon name="compass" size={18} />
          <span>
            These are everything you qualify for. <a href="#/student/pathways">Choose your pathways</a> and we’ll put the
            most relevant first.
          </span>
        </div>
      )}

      {tab === 'mine' ? (
        <MyApplications v={v} />
      ) : (
        <div className="ed-opp-list">
          {list.map((o) => (
            <OppCard key={o.id} o={o} highlight={o.id === openId} onApply={() => setApplying(o)} />
          ))}
          {list.length === 0 && (
            <div className="card ed-empty">{tab === 'sent' ? 'Nothing sent to you yet.' : 'Nothing here yet.'}</div>
          )}
        </div>
      )}
    </div>
  );
}

function OppCard({ o, highlight, onApply }) {
  const el = o.eligibility;
  return (
    <article id={`opp-${o.id}`} className={`card ed-opp ${highlight ? 'hl' : ''} ${el.ok ? '' : 'inelig'} ${o.sent ? 'sent' : ''}`}>
      {o.sent && (
        <div className="ed-sent-note">
          <Icon name="send" size={13} />
          <span>
            <strong>Sent to you by {o.sent.sentBy}</strong> · {timeAgo(o.sent.at)}
            {o.sent.message && <em> — “{o.sent.message}”</em>}
          </span>
        </div>
      )}
      <div className="ed-opp-top">
        <PathwayTag pathway={o.pathway} small />
        <span className="ed-kind">{kindLabel(o.kind)}</span>
        {o.uct && <span className="pill pill--soft">UCT</span>}
        <span style={{ marginLeft: 'auto' }}>
          <Closing date={o.closingDate} />
        </span>
      </div>
      <h3>{o.title}</h3>
      <div className="t-meta">
        {o.organisation} · {o.location}
        {o.workMode && o.workMode !== 'On-site' ? ` · ${o.workMode}` : ''}
        {o.value ? ` · ${o.value}` : ''}
      </div>
      {o.positions ? (
        <div className="ed-positions">
          {o.positions} position{o.positions === 1 ? '' : 's'} available
        </div>
      ) : null}
      {o.summary && <p className="t-body">{o.summary}</p>}
      <div className={`ed-elig ${el.ok ? 'ok' : 'no'}`}>
        <Icon name={el.ok ? 'check' : 'x'} size={13} />
        {el.ok
          ? el.reasons.length
            ? el.reasons.join(' · ')
            : 'Open to you'
          : el.reasons.filter((r) => !r.startsWith('You meet')).join(' · ')}
      </div>
      <div className="ed-opp-actions">
        <button className={`btn btn--ghost btn--sm ${o.saved ? 'is-saved' : ''}`} onClick={() => toggleSave(o.id, !o.saved)}>
          <Icon name="bookmark" size={13} /> {o.saved ? 'Saved' : 'Save'}
        </button>
        {o.application ? (
          <span className={`ed-stage ${stageMeta(o.application.status).tone}`}>{stageMeta(o.application.status).label}</span>
        ) : (
          <button className="btn btn--accent btn--sm" disabled={!el.ok} onClick={onApply}>
            Apply through EdOS
          </button>
        )}
      </div>
    </article>
  );
}

/** Applications with the stage the employer has moved them to. */
function MyApplications({ v }) {
  const saved = v.opportunities.filter((o) => o.saved && !o.application);
  return (
    <>
      <div className="card ed-apps">
        {v.applications.length === 0 && <p className="t-meta" style={{ padding: 18 }}>You haven’t applied to anything yet.</p>}
        {v.applications.map((a) => {
          const stage = stageMeta(a.status);
          const idx = APPLICATION_STAGES.findIndex((s) => s.key === a.status);
          return (
            <div key={a.id} className="ed-app">
              <div className="ed-app-main">
                <strong>{a.opportunity?.title}</strong>
                <span className="t-meta">
                  {a.opportunity?.organisation} · applied {timeAgo(a.submittedAt)}
                </span>
                <div className="ed-app-track">
                  {APPLICATION_STAGES.slice(0, 5).map((s, i) => (
                    <span key={s.key} className={i <= idx && idx < 5 ? 'on' : ''}>
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="ed-app-side">
                <span className={`ed-stage ${stage.tone}`}>{stage.label}</span>
                {a.status === 'offer' && (
                  <button className="btn btn--accent btn--sm" onClick={() => updateApplication(a.id, 'accepted')}>
                    Accept offer
                  </button>
                )}
                {['submitted', 'shortlisted', 'interview'].includes(a.status) && (
                  <button className="ed-link-btn" onClick={() => window.confirm('Withdraw this application?') && updateApplication(a.id, 'withdrawn')}>
                    Withdraw
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {saved.length > 0 && (
        <>
          <div className="ed-step-label" style={{ marginTop: 8 }}>
            Saved for later
          </div>
          <div className="ed-opp-list">
            {saved.map((o) => (
              <OppCard key={o.id} o={o} onApply={() => {}} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function ApplyModal({ o, me, onClose }) {
  const req = o.requirements ?? { cv: true, transcript: true };
  const docs = savedDocuments(me);
  const [files, setFiles] = useState({ cv: docs.cv, coverLetter: '' });
  const [linkedin, setLinkedin] = useState('');
  const [done, setDone] = useState(false);
  const fields = APPLICATION_FIELDS.filter((f) => req[f.key]);
  const missing = fields.filter(
    (f) => (f.type === 'file' && !files[f.key]) || (f.type === 'url' && !/^https?:\/\/\S+\.\S+/.test(linkedin)),
  );

  function submit() {
    const attachments = {};
    if (req.cv) attachments.cv = files.cv;
    if (req.coverLetter) attachments.coverLetter = files.coverLetter;
    applyTo(o.id, { attachments, linkedin: req.linkedin ? linkedin : '' });
    setDone(true);
  }

  return (
    <div className="ed-modal-back" onClick={onClose}>
      <div className="card ed-modal appear-pop" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <>
            <div className="ed-done-icon">
              <Icon name="check" size={22} />
            </div>
            <h2>Application sent</h2>
            <p className="t-body">
              {o.organisation} has your application for <strong>{o.title}</strong>. You’ll see every update — shortlisted,
              interview, offer — under <em>My applications</em>.
            </p>
            <button className="btn" onClick={onClose}>
              Done
            </button>
          </>
        ) : (
          <>
            <div className="t-eyebrow">Apply</div>
            <h2>{o.title}</h2>
            <p className="t-meta" style={{ margin: 0 }}>
              {o.organisation}
            </p>
            <div className="ed-apply-fields">
              {fields.map((f) => (
                <div key={f.key} className="ed-apply-field">
                  <div className="ed-apply-label">
                    <strong>{f.label}</strong>
                    <span className="t-meta">{f.hint}</span>
                  </div>
                  {f.type === 'auto' && (
                    <span className="ed-auto">
                      <Icon name="check" size={13} /> {me.degree} · {me.average}% average · {me.creditsCompleted} credits
                    </span>
                  )}
                  {f.type === 'file' && (
                    <FilePick value={files[f.key]} onChange={(name) => setFiles({ ...files, [f.key]: name })} />
                  )}
                  {f.type === 'url' && (
                    <input className="ed-input" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder={f.hint} />
                  )}
                </div>
              ))}
            </div>
            <div className="ed-modal-foot">
              <Synced>Your module marks stay private</Synced>
              <button className="btn btn--ghost" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn--accent" disabled={missing.length > 0} onClick={submit}>
                Submit application
              </button>
            </div>
            {missing.length > 0 && <div className="t-meta">Still needed: {missing.map((m) => m.label).join(', ')}</div>}
          </>
        )}
      </div>
    </div>
  );
}

/** Demo file picker — keeps the file name (no upload in a no-backend prototype). */
function FilePick({ value, onChange }) {
  return (
    <label className="ed-file">
      <input type="file" accept=".pdf,.doc,.docx" hidden onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0].name)} />
      {value ? (
        <span className="ed-file-name">
          <Icon name="check" size={13} /> {value}
        </span>
      ) : (
        <span className="ed-file-empty">Choose a file</span>
      )}
      <span className="ed-file-btn">{value ? 'Change' : 'Upload'}</span>
    </label>
  );
}
