/**
 * EdOS — exit pathway planner. The student picks where they're heading after
 * UCT (and a backup), ticks off readiness, and saves. Saving emits
 * `pathway.declared` — the Careers Service sees it instantly.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEdos, declarePathway } from './store.js';
import { Icon, Synced } from './ui.jsx';
import { PATHWAYS, READINESS, INDUSTRIES } from '../../../packages/bridge/vocab.js';

const WHAT_HELPS = {
  study: 'UCT Honours & Masters, programmes elsewhere, bursaries and scholarships.',
  employment: 'Graduate programmes, jobs, internships and work-readiness support.',
  venture: 'Start-up support, volunteering, gap and exploration programmes.',
  unsure: 'A careers advisor, an alumni mentor and a look at every option.',
};

export function Pathways() {
  const v = useEdos();
  const nav = useNavigate();
  const [primary, setPrimary] = useState(v.decl?.primary ?? '');
  const [backup, setBackup] = useState(v.decl?.backup ?? '');
  const [readiness, setReadiness] = useState(v.decl?.readiness ?? {});
  const [interests, setInterests] = useState(v.decl?.interests ?? []);
  const [note, setNote] = useState(v.decl?.note ?? '');
  const [saved, setSaved] = useState(false);
  const counts = Object.fromEntries(
    PATHWAYS.map((p) => [p.key, v.opportunities.filter((o) => o.pathway === p.key && o.eligibility.ok).length]),
  );
  const items = READINESS[primary] ?? [];

  function save() {
    declarePathway({ primary, backup: backup && backup !== primary ? backup : null, readiness, interests, note });
    setSaved(true);
  }

  return (
    <div className="ed-page">
      <header className="ed-page-head">
        <div className="t-eyebrow">Exit pathways</div>
        <h1 className="t-display">What comes after UCT?</h1>
        <p className="t-body">
          There’s no wrong answer, and you can change it any time. Your plan shapes the opportunities you see and the
          support the Careers Service lines up for you.
        </p>
      </header>

      <div className="ed-step-label">1 · Choose your main pathway</div>
      <div className="ed-pw-grid">
        {PATHWAYS.map((p) => (
          <button key={p.key} className={`card ed-pw-card ${p.tone} ${primary === p.key ? 'on' : ''}`} onClick={() => { setPrimary(p.key); setSaved(false); }}>
            <span className="ed-pw-check">{primary === p.key && <Icon name="check" size={14} />}</span>
            <strong>{p.label}</strong>
            <span className="t-body">{p.student}</span>
            <span className="ed-pw-unlock">
              {p.key === 'unsure' ? WHAT_HELPS.unsure : `${counts[p.key]} open for you · ${WHAT_HELPS[p.key]}`}
            </span>
          </button>
        ))}
      </div>

      {primary && (
        <>
          <div className="ed-step-label">2 · A backup plan (optional)</div>
          <div className="ed-backup">
            {PATHWAYS.filter((p) => p.key !== primary && p.key !== 'unsure').map((p) => (
              <button key={p.key} className={`ed-chip ${backup === p.key ? 'on' : ''}`} onClick={() => { setBackup(backup === p.key ? '' : p.key); setSaved(false); }}>
                {p.label}
              </button>
            ))}
          </div>

          <div className="ed-step-label">3 · How ready are you?</div>
          <div className="card ed-ready-list">
            {items.map((i) => (
              <label key={i.key} className={`ed-ready ${readiness[i.key] ? 'done' : ''}`}>
                <input
                  type="checkbox"
                  checked={!!readiness[i.key]}
                  onChange={(e) => { setReadiness({ ...readiness, [i.key]: e.target.checked }); setSaved(false); }}
                />
                <span>{i.label}</span>
              </label>
            ))}
          </div>

          <div className="ed-step-label">4 · Fields you’re curious about</div>
          <div className="ed-backup">
            {INDUSTRIES.map((x) => (
              <button
                key={x}
                className={`ed-chip ${interests.includes(x) ? 'on' : ''}`}
                onClick={() => { setInterests(interests.includes(x) ? interests.filter((y) => y !== x) : [...interests, x]); setSaved(false); }}
              >
                {x}
              </button>
            ))}
          </div>
          <label className="ed-field" style={{ marginTop: 16 }}>
            <span>Anything you want the Careers Service to know? (optional)</span>
            <textarea className="ed-input" rows={2} value={note} onChange={(e) => { setNote(e.target.value); setSaved(false); }} />
          </label>

          <div className="ed-save-bar">
            <Synced>Saving shares your pathway, readiness and average with the UCT Careers Service</Synced>
            {saved ? (
              <button className="btn btn--accent" onClick={() => nav('/opportunities')}>
                Saved ✓ — see your opportunities <Icon name="arrow" size={14} />
              </button>
            ) : (
              <button className="btn btn--accent" onClick={save}>
                Save my plan
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
