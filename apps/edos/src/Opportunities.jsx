/**
 * EdOS — opportunities published by the UCT Careers Service.
 *
 * Careers sets the criteria; EdOS checks them against the student's live
 * marks, so every card says plainly whether you can apply and why. Saving and
 * applying are events back to Careers.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEdos, toggleSave, applyTo, updateApplication } from './store.js';
import { Icon, PathwayTag, Closing, kindLabel, Synced } from './ui.jsx';

const TABS = [
  { key: 'foryou', label: 'For you' },
  { key: 'employment', label: 'Jobs & graduate programmes' },
  { key: 'study', label: 'Further study' },
  { key: 'venture', label: 'Volunteering & start-ups' },
  { key: 'mine', label: 'Saved & applied' },
];
const STUDY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'uct-programme', label: 'UCT programmes' },
  { key: 'external-programme', label: 'External programmes' },
  { key: 'bursary', label: 'Bursaries' },
  { key: 'scholarship', label: 'Scholarships' },
];
const APP_STATUSES = [
  { key: 'submitted', label: 'Applied' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'offer', label: 'Offer received' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'unsuccessful', label: 'Unsuccessful' },
];

export function Opportunities() {
  const v = useEdos();
  const [params] = useSearchParams();
  const openId = params.get('open');
  const [tab, setTab] = useState('foryou');
  const [studyKind, setStudyKind] = useState('all');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [applying, setApplying] = useState(null);

  useEffect(() => {
    if (!openId) return;
    const el = document.getElementById(`opp-${openId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [openId]);

  let list = v.opportunities;
  if (tab === 'foryou') list = list.filter((o) => o.eligibility.ok).slice(0, 8);
  else if (tab === 'mine') list = list.filter((o) => o.saved || o.application);
  else list = list.filter((o) => o.pathway === tab);
  if (tab === 'study' && studyKind !== 'all') list = list.filter((o) => o.kind === studyKind);
  if (eligibleOnly && tab !== 'foryou') list = list.filter((o) => o.eligibility.ok);

  return (
    <div className="ed-page">
      {applying && <ApplyModal o={applying} me={v.me} onClose={() => setApplying(null)} />}
      <header className="ed-page-head">
        <div className="t-eyebrow">From the UCT Careers Service</div>
        <h1 className="t-display">Opportunities</h1>
        <p className="t-body">
          Jobs, UCT and external programmes, bursaries, scholarships, volunteering and start-up support — checked
          against your marks, so you know what you can apply for.
        </p>
      </header>

      <div className="tabs ed-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${tab === t.key ? 'is-active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
            {t.key === 'mine' && v.applications.length + v.opportunities.filter((o) => o.saved).length > 0 && (
              <span className="ed-count">{v.opportunities.filter((o) => o.saved || o.application).length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="ed-filter-row">
        {tab === 'study' &&
          STUDY_FILTERS.map((f) => (
            <button key={f.key} className={`ed-chip ${studyKind === f.key ? 'on' : ''}`} onClick={() => setStudyKind(f.key)}>
              {f.label}
            </button>
          ))}
        {tab !== 'foryou' && (
          <label className="ed-toggle">
            <input type="checkbox" checked={eligibleOnly} onChange={(e) => setEligibleOnly(e.target.checked)} />
            Only ones I’m eligible for
          </label>
        )}
      </div>

      {tab === 'foryou' && !v.decl && (
        <div className="card ed-nudge">
          <Icon name="compass" size={18} />
          <span>
            These are everything you qualify for. <a href="#/pathways">Choose a pathway</a> and we’ll put the most relevant
            first.
          </span>
        </div>
      )}

      <div className="ed-opp-list">
        {list.map((o) => (
          <OppCard key={o.id} o={o} highlight={o.id === openId} onApply={() => setApplying(o)} />
        ))}
        {list.length === 0 && <div className="card ed-empty">Nothing here yet.</div>}
      </div>
    </div>
  );
}

function OppCard({ o, highlight, onApply }) {
  const el = o.eligibility;
  return (
    <article id={`opp-${o.id}`} className={`card ed-opp ${highlight ? 'hl' : ''} ${el.ok ? '' : 'inelig'}`}>
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
        {o.value ? ` · ${o.value}` : ''}
      </div>
      {o.summary && <p className="t-body">{o.summary}</p>}
      <div className={`ed-elig ${el.ok ? 'ok' : 'no'}`}>
        <Icon name={el.ok ? 'check' : 'x'} size={13} />
        {el.ok ? (el.reasons.length ? el.reasons.join(' · ') : 'Open to you') : el.reasons.filter((r) => !r.startsWith('You meet')).join(' · ')}
      </div>
      <div className="ed-opp-actions">
        <button className={`btn btn--ghost btn--sm ${o.saved ? 'is-saved' : ''}`} onClick={() => toggleSave(o.id, !o.saved)}>
          <Icon name="bookmark" size={13} /> {o.saved ? 'Saved' : 'Save'}
        </button>
        {o.application ? (
          <div className="ed-app-status">
            <span className="t-meta">Your application:</span>
            <select value={o.application.status} onChange={(e) => updateApplication(o.application.id, e.target.value)}>
              {APP_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <button className="btn btn--accent btn--sm" disabled={!el.ok} onClick={onApply}>
            Apply through EdOS
          </button>
        )}
      </div>
    </article>
  );
}

function ApplyModal({ o, me, onClose }) {
  const [done, setDone] = useState(false);
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
              {o.organisation} has your application for <strong>{o.title}</strong>. Track it under <em>Saved &amp;
              applied</em> and update it when you hear back — it helps the Careers Service support you.
            </p>
            <button className="btn" onClick={onClose}>
              Done
            </button>
          </>
        ) : (
          <>
            <div className="t-eyebrow">Apply</div>
            <h2>{o.title}</h2>
            <p className="t-meta">{o.organisation}</p>
            <div className="ed-share-box">
              <div className="t-eyebrow">Sent with your application, straight from EdOS</div>
              <ul>
                <li>
                  {me.firstName} {me.lastName} · {me.studentNumber}
                </li>
                <li>
                  {me.degree} · {me.stage}
                </li>
                <li>Average {me.average}% · {me.creditsCompleted} credits</li>
              </ul>
              <span className="t-meta">No forms to fill in. Your module marks stay private.</span>
            </div>
            <div className="ed-modal-foot">
              <Synced>The Careers Service sees that you applied</Synced>
              <button className="btn btn--ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn btn--accent"
                onClick={() => {
                  applyTo(o.id);
                  setDone(true);
                }}
              >
                Submit application
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
