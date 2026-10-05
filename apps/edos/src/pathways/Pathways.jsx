/**
 * EdOS — exit pathway planner. Students choose one or more pathways (e.g.
 * work AND further study — many apply for jobs and Honours/bursaries at the
 * same time), tick off readiness, and save. Saving emits `pathway.declared`.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEdos, declarePathway } from './store.js';
import { Icon, Synced } from './ui.jsx';
import { PATHWAYS, READINESS, INDUSTRIES } from '../../../../packages/bridge/vocab.js';

const WHAT_HELPS = {
  study: 'UCT Honours & Masters, programmes elsewhere, bursaries and scholarships.',
  employment: 'Graduate programmes, jobs, internships and work-readiness support.',
  venture: 'Start-up support, volunteering, gap and exploration programmes.',
  unsure: 'A careers advisor, an alumni mentor and a look at every option.',
};

/** Readiness items for every chosen pathway, without duplicates. */
export function readinessItems(pathways) {
  const seen = new Set();
  return pathways.flatMap((p) => READINESS[p] ?? []).filter((i) => !seen.has(i.key) && seen.add(i.key));
}

export function Pathways() {
  const v = useEdos();
  const nav = useNavigate();
  const [chosen, setChosen] = useState(v.decl?.pathways ?? []);
  const [readiness, setReadiness] = useState(v.decl?.readiness ?? {});
  const [interests, setInterests] = useState(v.decl?.interests ?? []);
  const [note, setNote] = useState(v.decl?.note ?? '');
  const [saved, setSaved] = useState(false);
  const counts = Object.fromEntries(
    PATHWAYS.map((p) => [p.key, v.opportunities.filter((o) => o.pathway === p.key && o.eligibility.ok).length]),
  );
  const items = readinessItems(chosen);
  const dirty = () => setSaved(false);

  // "Not sure yet" is exclusive; the others combine freely.
  function toggle(key) {
    dirty();
    if (key === 'unsure') return setChosen(chosen.includes('unsure') ? [] : ['unsure']);
    const rest = chosen.filter((k) => k !== 'unsure');
    setChosen(rest.includes(key) ? rest.filter((k) => k !== key) : [...rest, key]);
  }

  function save() {
    declarePathway({ pathways: chosen, readiness, interests, note });
    setSaved(true);
  }

  return (
    <div className="ed-page">
      <header className="ed-page-head">
        <div className="t-eyebrow">Exit pathways</div>
        <h1 className="t-display">What comes after UCT?</h1>
        <p className="t-body">
          Choose as many as fit — lots of students apply for jobs <em>and</em> Honours or bursaries at the same time.
          You can change it any time. Your plan shapes what you see and the support the Careers Service lines up.
        </p>
      </header>

      <div className="ed-step-label">1 · Where are you heading? (choose one or more)</div>
      <div className="ed-pw-grid">
        {PATHWAYS.map((p) => {
          const on = chosen.includes(p.key);
          const order = chosen.indexOf(p.key);
          return (
            <button key={p.key} className={`card ed-pw-card ${p.tone} ${on ? 'on' : ''}`} onClick={() => toggle(p.key)} aria-pressed={on}>
              <span className="ed-pw-check">{on && <Icon name="check" size={14} />}</span>
              <strong>
                {p.label}
                {on && chosen.length > 1 && <span className="ed-pw-order">{order === 0 ? 'Main' : 'Also'}</span>}
              </strong>
              <span className="t-body">{p.student}</span>
              <span className="ed-pw-unlock">
                {p.key === 'unsure' ? WHAT_HELPS.unsure : `${counts[p.key]} open for you · ${WHAT_HELPS[p.key]}`}
              </span>
            </button>
          );
        })}
      </div>

      {chosen.length > 0 && (
        <>
          <div className="ed-step-label">2 · How ready are you?</div>
          <div className="card ed-ready-list">
            {items.map((i) => (
              <label key={i.key} className={`ed-ready ${readiness[i.key] ? 'done' : ''}`}>
                <input
                  type="checkbox"
                  checked={!!readiness[i.key]}
                  onChange={(e) => {
                    setReadiness({ ...readiness, [i.key]: e.target.checked });
                    dirty();
                  }}
                />
                <span>{i.label}</span>
              </label>
            ))}
          </div>

          <div className="ed-step-label">3 · Fields you’re curious about</div>
          <div className="ed-backup">
            {INDUSTRIES.map((x) => (
              <button
                key={x}
                className={`ed-chip ${interests.includes(x) ? 'on' : ''}`}
                onClick={() => {
                  setInterests(interests.includes(x) ? interests.filter((y) => y !== x) : [...interests, x]);
                  dirty();
                }}
              >
                {x}
              </button>
            ))}
          </div>
          <label className="ed-field" style={{ marginTop: 16 }}>
            <span>Anything you want the Careers Service to know? (optional)</span>
            <textarea className="ed-input" rows={2} value={note} onChange={(e) => { setNote(e.target.value); dirty(); }} />
          </label>

          <div className="ed-save-bar">
            <Synced>Saving shares your pathways, readiness and average with the UCT Careers Service</Synced>
            {saved ? (
              <button className="btn btn--accent" onClick={() => nav('/student/opportunities')}>
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
