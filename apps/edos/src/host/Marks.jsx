/**
 * Stand-in for EdOS's Marks page — the gradebook and upcoming tests. EdOS is
 * the system of record; Careers only receives the summary (next test date,
 * marks recorded vs outstanding, average) in `student.synced`.
 */
import { useEdos } from '../pathways/store.js';
import { Synced } from '../pathways/ui.jsx';
import { nextTest, gradebookSummary } from '../../../../packages/bridge/demo/roster.js';
import { TranscriptSection } from '../transcript/Transcript.jsx';

const fmt = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
const daysTo = (d) => Math.ceil((new Date(`${d}T12:00:00`) - Date.now()) / 86400000);

export function Marks() {
  const { me, match } = useEdos();
  const today = new Date().toISOString().slice(0, 10);
  const test = nextTest(me);
  const gb = gradebookSummary(me);
  const upcoming = me.modules
    .flatMap((m) => m.assessments.map((a) => ({ ...a, code: m.code, module: m.name })))
    .filter((a) => a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="ed-page">
      <header className="ed-page-head">
        <div className="t-eyebrow">{me.degree}</div>
        <h1 className="t-display">Marks &amp; tests</h1>
        {match?.academics?.shared && (
          <p className="t-meta" style={{ marginTop: 6 }}>
            <Synced>
              Shared with your mentor {match.mentor.firstName} {match.mentor.lastName}
            </Synced>
          </p>
        )}
      </header>
      <div className="ed-stat-row">
        <div className="card ed-stat">
          <span className="t-num">{me.average}%</span>
          <small>Average</small>
        </div>
        <div className="card ed-stat">
          <span className="t-num">{test ? `${daysTo(test.date)} days` : '—'}</span>
          <small>{test ? `Until ${test.label} · ${test.code}` : 'No tests coming up'}</small>
        </div>
        <div className="card ed-stat">
          <span className="t-num">
            {gb.recorded}/{gb.recorded + gb.due}
          </span>
          <small>{gb.due ? `Marks recorded · ${gb.due} still to come back` : 'All marks recorded'}</small>
        </div>
      </div>

      <section className="ed-section">
        <h2 className="ed-h2">My transcript</h2>
        <TranscriptSection student={me} current={me.modules} />
      </section>

      <section className="ed-section">
        <h2 className="ed-h2">Coming up</h2>
        <div className="card ed-upcoming">
          {upcoming.slice(0, 6).map((a) => (
            <div key={a.id} className="ed-up">
              <div className="ed-meeting-date">
                <strong>{new Date(`${a.date}T12:00:00`).getDate()}</strong>
                <span>{new Date(`${a.date}T12:00:00`).toLocaleDateString('en-ZA', { month: 'short' })}</span>
              </div>
              <div>
                <strong>
                  {a.label} · {a.code}
                </strong>
                <small>
                  {a.module} · {a.weight}% of module
                </small>
              </div>
              <span className={`ed-in ${daysTo(a.date) <= 7 ? 'soon' : ''}`}>in {daysTo(a.date)} days</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ed-section">
        <h2 className="ed-h2">This year’s gradebook</h2>
        {me.modules.map((m) => (
          <div key={m.code} className="card ed-gb">
            <div className="ed-gb-head">
              <span className="ed-mod-code">{m.code}</span>
              <strong>{m.name}</strong>
              <span className="t-meta">{m.credits} credits</span>
              <span className="ed-gb-mark">{m.mark}%</span>
            </div>
            <table className="ed-gb-tbl">
              <tbody>
                {m.assessments.map((a) => (
                  <tr key={a.id}>
                    <td>{a.label}</td>
                    <td className="t-meta">{fmt(a.date)}</td>
                    <td className="t-meta">{a.weight}%</td>
                    <td className="ed-gb-val">
                      {a.mark != null ? (
                        `${a.mark}%`
                      ) : a.date < today ? (
                        <span className="ed-gb-due">Mark due</span>
                      ) : (
                        <span className="t-meta">Upcoming</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>
      <p className="t-meta">
        <Synced>The Careers Service sees your average, next test date and marks-recorded count — not individual marks</Synced>
      </p>
    </div>
  );
}
