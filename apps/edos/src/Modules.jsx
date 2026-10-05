/** EdOS — the student's modules and marks (EdOS is the system of record). */
import { useEdos } from './store.js';
import { Synced } from './ui.jsx';

export function Modules() {
  const { me } = useEdos();
  const pct = Math.round((me.creditsCompleted / me.creditsRequired) * 100);
  return (
    <div className="ed-page">
      <header className="ed-page-head">
        <div className="t-eyebrow">{me.degree}</div>
        <h1 className="t-display">My modules</h1>
      </header>
      <div className="ed-stat-row">
        <div className="card ed-stat">
          <span className="t-num">{me.average}%</span>
          <small>Average</small>
        </div>
        <div className="card ed-stat">
          <span className="t-num">{pct}%</span>
          <small>
            Of degree complete ({me.creditsCompleted}/{me.creditsRequired} credits)
          </small>
        </div>
        <div className="card ed-stat">
          <span className="t-num">{me.expectedGraduation}</span>
          <small>Expected graduation</small>
        </div>
      </div>
      <div className="card ed-mod-list">
        {me.modules.length === 0 && <p className="t-meta">No modules this semester.</p>}
        {me.modules.map((m) => (
          <div key={m.code} className="ed-mod">
            <span className="ed-mod-code">{m.code}</span>
            <div className="ed-mod-name">
              <strong>{m.name}</strong>
              <small>{m.credits} credits</small>
            </div>
            <div className="ed-mod-mark">
              <div className="ed-progress">
                <span style={{ width: `${m.mark}%` }} />
              </div>
              <strong>{m.mark}%</strong>
            </div>
          </div>
        ))}
      </div>
      <p className="t-meta" style={{ marginTop: 14 }}>
        <Synced>The Careers Service sees your average and credits — not your module marks</Synced>
      </p>
    </div>
  );
}
