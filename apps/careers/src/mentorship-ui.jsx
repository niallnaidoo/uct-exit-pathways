/**
 * Shared building blocks for the alumni mentorship pages — chip pickers, the
 * mentor profile card (exactly what students see), the anonymised student card,
 * and the photo picker.
 */
import { useRef } from 'react';
import { Icon, Avatar } from './atoms.jsx';
import { menteeShortName } from './mentorship-model.js';
import { DAYS, SLOTS, slotKey, availabilityText, sharedSlots } from '../../../packages/bridge/vocab.js';
import './mentorship.css';

/** Multi-select chips. */
export function ChipSelect({ options, value = [], onChange, max }) {
  const toggle = (opt) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else if (!max || value.length < max) onChange([...value, opt]);
  };
  return (
    <div className="ms-chips" role="group">
      {options.map((opt) => {
        const on = value.includes(opt);
        return (
          <button
            type="button"
            key={opt}
            className={`ms-chip ${on ? 'on' : ''}`}
            aria-pressed={on}
            onClick={() => toggle(opt)}
          >
            {on && <Icon.Check />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/** Single-select segmented choice. */
export function Segmented({ options, value, onChange }) {
  return (
    <div className="ms-seg" role="radiogroup">
      {options.map((opt) => (
        <button
          type="button"
          key={opt}
          role="radio"
          aria-checked={value === opt}
          className={`ms-seg-btn ${value === opt ? 'on' : ''}`}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

/** A labelled field group with an optional hint. */
export function Field({ label, hint, children, required }) {
  return (
    <div className="ms-field">
      <div className="ms-field-label">
        {label}
        {required && <span className="ms-req">*</span>}
      </div>
      {hint && <div className="ms-field-hint">{hint}</div>}
      {children}
    </div>
  );
}

/** Photo picker — downsized to a small JPEG so it stays light. */
export function PhotoInput({ value, name, onChange }) {
  const ref = useRef(null);
  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const url = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(file);
    });
    const img = new Image();
    img.onload = () => {
      const size = 240;
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const s = Math.min(img.width, img.height);
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      onChange(c.toDataURL('image/jpeg', 0.82));
    };
    img.src = url;
  }
  return (
    <div className="ms-photo">
      <PersonPhoto photo={value} name={name?.trim() || '?'} size={72} />
      <div>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => ref.current?.click()}>
          {value ? 'Change photo' : 'Upload a photo'}
        </button>
        {value && (
          <button type="button" className="link-btn" onClick={() => onChange('')} style={{ marginLeft: 10 }}>
            Remove
          </button>
        )}
        <div className="ms-field-hint">A friendly headshot helps students connect. Optional.</div>
      </div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={onFile} />
    </div>
  );
}

export function PersonPhoto({ photo, name, size = 40 }) {
  if (photo)
    return <img className="ms-avatar" src={photo} alt="" style={{ width: size, height: size }} />;
  return <Avatar name={name} size={size} />;
}

const Tags = ({ items, tone }) =>
  items?.length ? (
    <div className="ms-tags">
      {items.map((t) => (
        <span key={t} className={`ms-tag ${tone ?? ''}`}>
          {t}
        </span>
      ))}
    </div>
  ) : null;

/** The mentor profile exactly as a student sees it. */
export function MentorProfileCard({ mentor, footer, showContact }) {
  const name = `${mentor.firstName ?? ''} ${mentor.lastName ?? ''}`.trim() || 'Your name';
  const meta = [mentor.qualification, mentor.gradYear && `Class of ${mentor.gradYear}`]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className="ms-profile">
      <div className="ms-profile-head">
        <PersonPhoto photo={mentor.photo} name={name} size={64} />
        <div className="ms-profile-id">
          <div className="ms-profile-name">{name}</div>
          <div className="ms-profile-role">
            {[mentor.role, mentor.organisation].filter(Boolean).join(' at ') || 'Current role'}
          </div>
          {meta && <div className="ms-profile-meta">{meta}</div>}
        </div>
      </div>
      <div className="ms-profile-facts">
        {mentor.industry && <span>{mentor.industry}</span>}
        {mentor.location && <span>{mentor.location}</span>}
        {mentor.faculty && <span>{mentor.faculty}</span>}
        {mentor.sportingCode && <span>{mentor.sportingCode} alumnus</span>}
      </div>
      {mentor.bio && <p className="ms-profile-bio">{mentor.bio}</p>}
      {mentor.expertise?.length > 0 && (
        <div className="ms-profile-block">
          <div className="ms-mini-label">Can help with</div>
          <Tags items={mentor.expertise} tone="green" />
        </div>
      )}
      {mentor.languages?.length > 0 && (
        <div className="ms-profile-block">
          <div className="ms-mini-label">Languages</div>
          <Tags items={mentor.languages} />
        </div>
      )}
      <div className="ms-profile-prefs">
        {[mentor.mentoringType, mentor.meetingFormat && `Meets ${mentor.meetingFormat.toLowerCase()}`, mentor.frequency, mentor.period]
          .filter(Boolean)
          .map((p) => (
            <span key={p}>{p}</span>
          ))}
      </div>
      {mentor.availability?.length > 0 && (
        <div className="ms-free">
          <Icon.Clock />
          <span>
            <strong>Usually free: </strong>
            {availabilityText(mentor.availability)}
          </span>
        </div>
      )}
      {(mentor.linkedin || (showContact && mentor.email)) && (
        <div className="ms-profile-links">
          {mentor.linkedin && (
            <a href={mentor.linkedin} target="_blank" rel="noreferrer">
              LinkedIn profile ↗
            </a>
          )}
          {showContact && mentor.email && <a href={`mailto:${mentor.email}`}>{mentor.email}</a>}
        </div>
      )}
      {footer}
    </div>
  );
}

/** A student as a mentor sees them — anonymised until the match is agreed. */
export function MenteeCard({ mentee, match, footer, full, mentorAvailability, academics }) {
  const both = sharedSlots(mentorAvailability, mentee.availability);
  const name = full
    ? `${mentee.firstName} ${mentee.lastName ?? ''}`.trim()
    : menteeShortName({ firstName: mentee.firstName, lastName: mentee.lastInitial ?? mentee.lastName });
  return (
    <div className="ms-mentee">
      <div className="ms-mentee-head">
        <Avatar name={name} size={40} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="ms-mentee-name">{name}</div>
          <div className="ms-mentee-sub">
            {[mentee.stage, mentee.degree || mentee.faculty].filter(Boolean).join(' · ')}
          </div>
        </div>
        {match && (
          <div className={`ms-score ${match.score >= 70 ? 'hi' : match.score >= 40 ? 'mid' : ''}`} title="Profile match">
            {match.score}%
            <span>match</span>
          </div>
        )}
      </div>
      {mentee.goals && <p className="ms-mentee-goal">“{mentee.goals}”</p>}
      <div className="ms-mentee-tags">
        <Tags items={mentee.careerInterests} />
        <Tags items={mentee.skillsWanted} tone="green" />
      </div>
      {match?.reasons?.length > 0 && (
        <div className="ms-reasons">
          {match.reasons.map((r) => (
            <span key={r}>
              <Icon.Check /> {r}
            </span>
          ))}
        </div>
      )}
      {(both.length > 0 || (full && mentee.availability?.length > 0)) && (
        <div className="ms-free">
          <Icon.Clock />
          <span>
            {both.length ? <strong>You’re both free: </strong> : <strong>Free: </strong>}
            {availabilityText(both.length ? both : mentee.availability)}
          </span>
        </div>
      )}
      {full && (mentee.email || mentee.accessNeeds) && (
        <div className="ms-mentee-contact">
          {mentee.email && <a href={`mailto:${mentee.email}`}>{mentee.email}</a>}
          {mentee.accessNeeds && <span>Access needs: {mentee.accessNeeds}</span>}
        </div>
      )}
      {full && <MarksAndTests academics={academics} name={mentee.firstName} />}
      {footer}
    </div>
  );
}

/** Hash-routed public link builder. */
export function publicLink(path) {
  return `${window.location.origin}${window.location.pathname}#${path}`;
}

export const fmtDate = (d) =>
  d
    ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString('en-ZA', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : '';
export const fmtAgo = (iso) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
};

/**
 * The mentee's subjects, marks and upcoming tests — shared from EdOS by the
 * student, for their mentor only.
 */
export function MarksAndTests({ academics, name }) {
  const today = new Date().toISOString().slice(0, 10);
  if (!academics?.shared)
    return <div className="ms-academics off">{name} hasn’t shared marks &amp; tests from EdOS.</div>;
  const days = (d) => Math.ceil((new Date(`${d}T12:00:00`) - Date.now()) / 86400000);
  return (
    <details className="ms-academics">
      <summary>
        <span>Marks &amp; tests</span>
        <small>shared from EdOS</small>
      </summary>
      {academics.modules.map((m) => {
        const next = m.assessments.find((a) => a.date >= today);
        const due = m.assessments.filter((a) => a.date < today && a.mark == null).length;
        return (
          <div key={m.code} className="ms-mod">
            <div className="ms-mod-head">
              <code>{m.code}</code>
              <span>{m.name}</span>
              <strong>{m.mark}%</strong>
            </div>
            <div className="ms-mod-sub">
              {next ? (
                <span className={days(next.date) <= 7 ? 'soon' : ''}>
                  {next.label} in {days(next.date)} days
                </span>
              ) : (
                <span>No tests coming up</span>
              )}
              {m.assessments
                .filter((a) => a.mark != null)
                .map((a) => (
                  <span key={a.label}>
                    {a.label} {a.mark}%
                  </span>
                ))}
              {due > 0 && <span className="due">{due} mark{due > 1 ? 's' : ''} outstanding</span>}
            </div>
          </div>
        );
      })}
    </details>
  );
}

/** Day × time-slot picker (same grid students use in EdOS). */
export function AvailabilityGrid({ value = [], onChange }) {
  const toggle = (k) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  return (
    <div className="ms-avail">
      <div className="ms-avail-grid">
        <span />
        {DAYS.map((d) => (
          <span key={d} className="ms-avail-day">
            {d}
          </span>
        ))}
        {SLOTS.map((s) => (
          <div key={s.key} className="ms-avail-row">
            <span className="ms-avail-slot">
              <strong>{s.label}</strong>
              <small>{s.time}</small>
            </span>
            {DAYS.map((d) => {
              const k = slotKey(d, s.key);
              const on = value.includes(k);
              return (
                <button type="button" key={k} className={`ms-avail-cell ${on ? 'on' : ''}`} aria-pressed={on} aria-label={`${d} ${s.label}`} onClick={() => toggle(k)}>
                  {on && <Icon.Check />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="ms-field-hint" style={{ margin: 0 }}>
        {value.length ? availabilityText(value) : 'Tap the times you’re usually free.'}
      </div>
    </div>
  );
}
