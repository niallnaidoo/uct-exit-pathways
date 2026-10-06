/**
 * Transcript section for EdOS's Marks & tests page.
 *
 *   upload (PDF/image or CSV template) → "reading" → review the courses found →
 *   save → visualise: average by year, results by class, every course.
 *
 * Drop-in: `<TranscriptSection student={me} current={me.modules} />`.
 */
import { useRef, useState } from 'react';
import {
  BANDS,
  bandFor,
  getTranscript,
  saveTranscript,
  removeTranscript,
  parseTranscriptCsv,
  simulateFromRecord,
  summarise,
  templateCsv,
} from './transcript.js';
import './transcript.css';

export function TranscriptSection({ student, current = [] }) {
  const sn = student.studentNumber;
  const [saved, setSaved] = useState(() => getTranscript(sn));
  const [stage, setStage] = useState('idle'); // idle | reading | review
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  async function onFile(file) {
    if (!file) return;
    setError(null);
    setStage('reading');
    try {
      const isCsv = /\.csv$/i.test(file.name) || file.type === 'text/csv';
      const courses = isCsv ? parseTranscriptCsv(await file.text()) : simulateFromRecord(student);
      // A short pause so the student sees it being read (and it reads as real).
      await new Promise((r) => setTimeout(r, isCsv ? 300 : 1100));
      if (!courses.length) throw new Error('We couldn’t find any completed courses on that transcript.');
      setDraft({ fileName: file.name, source: isCsv ? 'csv' : 'pdf', courses });
      setStage('review');
    } catch (e) {
      setError(e.message);
      setStage('idle');
    }
  }

  function confirm() {
    const t = { ...draft, uploadedAt: new Date().toISOString() };
    saveTranscript(sn, t);
    setSaved(t);
    setDraft(null);
    setStage('idle');
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([templateCsv()], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'uct-transcript-template.csv' });
    a.click();
    URL.revokeObjectURL(url);
  }

  const picker = (
    <input
      ref={fileRef}
      type="file"
      accept=".pdf,.png,.jpg,.jpeg,.csv,text/csv,application/pdf,image/*"
      hidden
      onChange={(e) => {
        onFile(e.target.files?.[0]);
        e.target.value = '';
      }}
    />
  );

  if (stage === 'reading')
    return (
      <section className="tr-card card">
        <div className="tr-reading">
          <span className="tr-spinner" aria-hidden="true" />
          <div>
            <strong>Reading your transcript…</strong>
            <small>Finding your courses, credits and marks</small>
          </div>
        </div>
      </section>
    );

  if (stage === 'review' && draft) {
    const s = summarise(draft.courses);
    return (
      <section className="tr-card card">
        <div className="tr-head">
          <div>
            <div className="t-eyebrow">Check before saving</div>
            <h2 className="tr-h2">We found {draft.courses.length} courses</h2>
            <p className="t-meta">
              From <strong>{draft.fileName}</strong> · {s.byYear.length} year{s.byYear.length === 1 ? '' : 's'} · {s.average}% average
            </p>
          </div>
        </div>
        {draft.source === 'pdf' && (
          <p className="tr-note">
            Prototype: reading official UCT transcript PDFs will use UCT’s template. For now we’ve filled this from your
            student record so you can see how it works.
          </p>
        )}
        <CourseTable courses={draft.courses} />
        <div className="tr-actions">
          <button className="btn btn--ghost" onClick={() => { setDraft(null); setStage('idle'); }}>
            Cancel
          </button>
          <button className="btn btn--accent" onClick={confirm}>
            Looks right — save transcript
          </button>
        </div>
      </section>
    );
  }

  if (!saved)
    return (
      <section className="tr-card card">
        {picker}
        <div
          className="tr-drop"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFile(e.dataTransfer.files?.[0]);
          }}
        >
          <div className="tr-drop-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </svg>
          </div>
          <div className="tr-drop-text">
            <strong>Upload your UCT transcript</strong>
            <small>See every year’s marks at a glance. PDF or photo of your official transcript, or a CSV.</small>
          </div>
          <button className="btn btn--accent" onClick={() => fileRef.current?.click()}>
            Choose file
          </button>
        </div>
        {error && <div className="tr-error">{error}</div>}
        <div className="tr-foot">
          <button className="tr-link" onClick={downloadTemplate}>
            Download the CSV template
          </button>
          <span className="t-meta">Your transcript stays in EdOS — it isn’t shared with the Careers Service.</span>
        </div>
      </section>
    );

  return (
    <TranscriptView
      transcript={saved}
      current={current}
      picker={picker}
      onReplace={() => fileRef.current?.click()}
      onRemove={() => {
        if (!window.confirm('Remove your uploaded transcript?')) return;
        removeTranscript(sn);
        setSaved(null);
      }}
    />
  );
}

/* ─────────────────────────── Visualisation ─────────────────────────── */

function TranscriptView({ transcript, current, picker, onReplace, onRemove }) {
  const s = summarise(transcript.courses);
  // This year's modules (in progress) — shown beside the transcript years.
  const live = current.filter((m) => m.mark != null);
  const liveCredits = live.reduce((t, m) => t + m.credits, 0);
  const liveAvg = liveCredits ? Math.round(live.reduce((t, m) => t + m.mark * m.credits, 0) / liveCredits) : null;
  const thisYear = new Date().getFullYear();
  const bars = [
    ...s.byYear.map((y) => ({ ...y, label: String(y.year) })),
    ...(liveAvg != null && !s.byYear.some((y) => y.year === thisYear)
      ? [{ year: thisYear, label: `${thisYear}`, average: liveAvg, credits: liveCredits, count: live.length, inProgress: true }]
      : []),
  ];
  const trend = bars.length >= 2 ? bars.at(-1).average - bars[0].average : 0;

  return (
    <section className="tr-wrap">
      {picker}
      <div className="tr-kpis">
        <div className="card tr-kpi">
          <span className="t-num">{s.average}%</span>
          <small>Transcript average</small>
        </div>
        <div className="card tr-kpi">
          <span className="t-num">{s.creditsPassed}</span>
          <small>Credits passed</small>
        </div>
        <div className="card tr-kpi">
          <span className="t-num">{s.firsts}</span>
          <small>First-class results</small>
        </div>
        <div className="card tr-kpi">
          <span className="t-num">
            {trend > 0 ? '+' : ''}
            {trend}
          </span>
          <small>Points since first year</small>
        </div>
      </div>

      <div className="tr-grid">
        <div className="card tr-chart-card">
          <h3>Average by year</h3>
          <p className="t-meta">Credit-weighted. Dashed lines show UCT’s class boundaries.</p>
          <YearChart bars={bars} />
        </div>
        <div className="card tr-chart-card">
          <h3>Results by class</h3>
          <p className="t-meta">How many of your {s.count} courses landed in each class.</p>
          <BandChart bands={s.bands} total={s.count} />
        </div>
      </div>

      <div className="card tr-card">
        <div className="tr-head">
          <div>
            <h3 style={{ margin: 0 }}>Every course</h3>
            <p className="t-meta" style={{ margin: '4px 0 0' }}>
              From {transcript.fileName} · uploaded {new Date(transcript.uploadedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="tr-head-actions">
            <button className="btn btn--ghost btn--sm" onClick={onReplace}>
              Upload a newer transcript
            </button>
            <button className="tr-link" onClick={onRemove}>
              Remove
            </button>
          </div>
        </div>
        <CourseTable courses={transcript.courses} />
      </div>
    </section>
  );
}

const Y_LINES = [
  { v: 75, label: '1st' },
  { v: 70, label: '2+' },
  { v: 60, label: '2−' },
  { v: 50, label: 'Pass' },
];

/** Vertical bars, one per year, with class-boundary reference lines. */
function YearChart({ bars }) {
  const [hover, setHover] = useState(null);
  const W = 520;
  const H = 280;
  const pad = { l: 40, r: 12, t: 24, b: 30 };
  // Axis 40–90%: differences between years stay readable and the class lines don't crowd.
  const lo = 40;
  const hi = 90;
  const y = (v) => pad.t + (1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const slot = (W - pad.l - pad.r) / Math.max(bars.length, 1);
  const bw = Math.min(46, slot * 0.5);
  return (
    <div className="tr-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Average by year: ${bars.map((b) => `${b.label} ${b.average}%`).join(', ')}`}>
        <defs>
          <pattern id="tr-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--accent-soft)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--accent)" strokeWidth="2" />
          </pattern>
        </defs>
        {Y_LINES.map((l) => (
          <g key={l.v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(l.v)} y2={y(l.v)} className="tr-ref" />
            <text x={pad.l - 6} y={y(l.v) + 4} textAnchor="end" className="tr-axis">
              {l.label}
            </text>
          </g>
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={y(lo)} y2={y(lo)} className="tr-base" />
        {bars.map((b, i) => {
          const cx = pad.l + slot * i + slot / 2;
          const top = y(b.average);
          return (
            <g key={b.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={cx - slot / 2} y={pad.t} width={slot} height={H - pad.t - pad.b} fill="transparent" />
              <path
                d={`M${cx - bw / 2},${y(lo)} V${top + 4} Q${cx - bw / 2},${top} ${cx - bw / 2 + 4},${top} H${cx + bw / 2 - 4} Q${cx + bw / 2},${top} ${cx + bw / 2},${top + 4} V${y(lo)} Z`}
                fill={b.inProgress ? 'url(#tr-hatch)' : 'var(--accent)'}
                opacity={hover == null || hover === i ? 1 : 0.55}
              />
              <text x={cx} y={top - 7} textAnchor="middle" className="tr-val">
                {b.average}%
              </text>
              <text x={cx} y={H - 10} textAnchor="middle" className="tr-axis">
                {b.label}
                {b.inProgress ? ' · now' : ''}
              </text>
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div className="tr-tip" style={{ left: `${((pad.l + slot * hover + slot / 2) / W) * 100}%` }}>
          <strong>
            {bars[hover].label}
            {bars[hover].inProgress ? ' (in progress)' : ''}
          </strong>
          <span>{bars[hover].average}% average</span>
          <span>
            {bars[hover].count} course{bars[hover].count === 1 ? '' : 's'} · {bars[hover].credits} credits
          </span>
        </div>
      )}
    </div>
  );
}

/** Horizontal bars: number of courses per UCT class. */
function BandChart({ bands, total }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...bands.map((b) => b.count), 1);
  return (
    <div className="tr-bands" role="list">
      {bands.map((b) => (
        <div
          key={b.key}
          className={`tr-band ${hover && hover !== b.key ? 'dim' : ''}`}
          role="listitem"
          onMouseEnter={() => setHover(b.key)}
          onMouseLeave={() => setHover(null)}
          title={`${b.label}: ${b.count} of ${total} courses (${total ? Math.round((b.count / total) * 100) : 0}%)`}
        >
          <span className="tr-band-label">
            <strong>{b.short}</strong>
            <small>{b.label}</small>
          </span>
          <span className="tr-band-track">
            <span className="tr-band-bar" style={{ width: `${(b.count / max) * 100}%` }} />
          </span>
          <span className="tr-band-n">{b.count}</span>
        </div>
      ))}
    </div>
  );
}

/** The table view — every course, grouped by year. */
function CourseTable({ courses }) {
  const years = [...new Set(courses.map((c) => c.year))].sort();
  return (
    <div className="tr-table-wrap">
      <table className="tr-table">
        <thead>
          <tr>
            <th>Course</th>
            <th>Term</th>
            <th className="num">Credits</th>
            <th className="tr-markcol">Mark</th>
            <th>Class</th>
          </tr>
        </thead>
        {years.map((y) => (
          <tbody key={y ?? 'n'}>
            <tr className="tr-year-row">
              <td colSpan={5}>{y ?? 'Year not given'}</td>
            </tr>
            {courses
              .filter((c) => c.year === y)
              .map((c, i) => {
                const band = bandFor(c.mark);
                return (
                  <tr key={`${c.code}-${i}`}>
                    <td>
                      <code>{c.code}</code> {c.name}
                    </td>
                    <td className="t-meta">{c.term}</td>
                    <td className="num">{c.credits || '—'}</td>
                    <td className="tr-markcol">
                      <span className="tr-mark">
                        <span className="tr-mark-track">
                          <span className="tr-mark-bar" style={{ width: `${c.mark}%` }} />
                        </span>
                        <b>{c.mark}%</b>
                      </span>
                    </td>
                    <td>
                      <span className={`tr-sym ${band.key === 'F' ? 'fail' : band.key === '1' ? 'first' : ''}`}>{band.short}</span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        ))}
      </table>
    </div>
  );
}

export { BANDS };
