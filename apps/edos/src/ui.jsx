/** EdOS UI primitives — icons and small shared pieces (EdOS design system). */
import { pathwayMeta, kindMeta } from '../../../packages/bridge/vocab.js';
import { daysUntil } from '../../../packages/bridge/project.js';

const P = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  book: 'M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5zM4 19.5A1.5 1.5 0 0 0 5.5 21H20',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm3.5-12.5-2 5-5 2 2-5z',
  briefcase: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
  users: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 19v-1a4 4 0 0 0-3-3.9M15.5 3.2a3.5 3.5 0 0 1 0 6.6',
  inbox: 'M3 13h5l1.5 3h5L16 13h5M5 5h14l2 8v6H3v-6z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6 6 18',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  flag: 'M5 21V4h11l-1.5 4L16 12H5',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  send: 'M4 12 20 4l-6 16-3-7z',
  grad: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5',
};

export function Icon({ name, size = 16, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      <path d={P[name]} />
    </svg>
  );
}

export function PathwayTag({ pathway, small }) {
  const p = typeof pathway === 'string' ? pathwayMeta(pathway) : pathway;
  if (!p) return <span className={`ed-pw none ${small ? 'sm' : ''}`}>No pathway yet</span>;
  return <span className={`ed-pw ${p.tone} ${small ? 'sm' : ''}`}>{p.label}</span>;
}

export function Initials({ name, size = 36, dark }) {
  const init = name
    .split(' ')
    .map((x) => x[0])
    .slice(0, 2)
    .join('');
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36, ...(dark ? { background: 'var(--ink)', color: 'var(--paper)' } : {}) }}>
      {init}
    </span>
  );
}

export function Closing({ date }) {
  if (!date) return null;
  const d = daysUntil(date);
  const cls = d <= 7 ? 'soon' : '';
  return <span className={`ed-closing ${cls}`}>{d <= 0 ? 'Closes today' : `Closes in ${d} day${d === 1 ? '' : 's'}`}</span>;
}

export const kindLabel = (k) => kindMeta(k).label;

export function Section({ eyebrow, title, action, children }) {
  return (
    <section className="ed-section">
      <div className="ed-section-head">
        <div>
          {eyebrow && <div className="t-eyebrow">{eyebrow}</div>}
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** The quiet "this came from / goes to the Careers Service" marker. */
export function Synced({ children = 'Shared with the UCT Careers Service' }) {
  return (
    <span className="ed-synced">
      <Icon name="link" size={12} />
      {children}
    </span>
  );
}
