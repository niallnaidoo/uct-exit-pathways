/**
 * Exit Pathways widgets — drop these into EdOS's existing student Home page.
 * Each one is self-contained (reads the pathways store), so integration is
 * just placing the component.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEdos, respondToSupport, reportDestination } from './store.js';
import { Icon, PathwayTag, Section, Synced, Closing, kindLabel, Initials } from './ui.jsx';
import { DESTINATIONS, interventionMeta } from '../../../../packages/bridge/vocab.js';
import { readinessItems } from './Pathways.jsx';

/** "Your exit pathways" card. */
export function PathwayCard() {
  const v = useEdos();
  const items = v.decl ? readinessItems(v.decl.pathways) : [];
  const done = items.filter((r) => v.decl?.readiness?.[r.key]).length;
  return (
    <div className="card ed-pathway-card appear">
      <div className="t-eyebrow">Your exit pathways</div>
      {v.decl ? (
        <>
          <div className="ed-pw-row">
            {v.decl.pathways.map((p) => (
              <PathwayTag key={p} pathway={p} />
            ))}
          </div>
          {items.length > 0 && (
            <>
              <div className="ed-progress">
                <span style={{ width: `${(done / items.length) * 100}%` }} />
              </div>
              <div className="t-meta">
                {done} of {items.length} readiness steps done
              </div>
            </>
          )}
          <Link to="/student/pathways" className="btn btn--ghost btn--sm" style={{ marginTop: 14 }}>
            Update my plan
          </Link>
        </>
      ) : (
        <>
          <p className="t-body" style={{ margin: '8px 0 14px' }}>
            Further study, a job, a start-up or a gap year — or a mix. Tell us, and the right opportunities and people
            find you.
          </p>
          <Link to="/student/pathways" className="btn btn--accent">
            Plan what’s next <Icon name="arrow" size={14} />
          </Link>
        </>
      )}
    </div>
  );
}

/** "Alumni mentor" card. */
export function MentorCard() {
  const v = useEdos();
  const nextMeeting = v.match?.meetings.find((m) => m.date >= new Date().toISOString().slice(0, 10));
  return (
    <div className="card ed-mentor-mini appear">
      <div className="t-eyebrow">Alumni mentor</div>
      {v.match ? (
        <>
          <div className="ed-person">
            <Initials name={`${v.match.mentor.firstName} ${v.match.mentor.lastName}`} dark />
            <div>
              <strong>
                {v.match.mentor.firstName} {v.match.mentor.lastName}
              </strong>
              <small>
                {v.match.mentor.role} · {v.match.mentor.organisation}
              </small>
            </div>
          </div>
          {nextMeeting && (
            <div className="ed-next">
              <Icon name="clock" size={14} /> Next: {nextMeeting.date} at {nextMeeting.time} · {nextMeeting.format}
            </div>
          )}
          <Link to="/student/mentor" className="btn btn--ghost btn--sm" style={{ marginTop: 12 }}>
            Open conversation
          </Link>
        </>
      ) : v.offers.length ? (
        <>
          <p className="t-body" style={{ margin: '8px 0 12px' }}>
            <strong>{v.offers[0].mentor.firstName}</strong>, a UCT alumnus at {v.offers[0].mentor.organisation}, has offered
            to mentor you.
          </p>
          <Link to="/student/mentor" className="btn btn--accent btn--sm">
            See the offer
          </Link>
        </>
      ) : (
        <>
          <p className="t-body" style={{ margin: '8px 0 12px' }}>
            {v.mentorRequest
              ? 'Your request is with the alumni mentors who fit your interests.'
              : 'Get matched with a UCT graduate working where you want to be.'}
          </p>
          <Link to="/student/mentor" className="btn btn--ghost btn--sm">
            {v.mentorRequest ? 'View request' : 'Ask for a mentor'}
          </Link>
        </>
      )}
    </div>
  );
}

/** Support the Careers Service set up for this student. Renders nothing if none. */
export function SupportFromCareers() {
  const v = useEdos();
  const open = v.interventions.filter((i) => i.status === 'open' || i.status === 'booked');
  if (!open.length) return null;
  return (
    <Section eyebrow="From the UCT Careers Service" title="Support set up for you">
      {open.map((i) => (
        <SupportCard key={i.id} i={i} />
      ))}
    </Section>
  );
}

function SupportCard({ i }) {
  const [note, setNote] = useState('');
  const meta = interventionMeta(i.type);
  return (
    <div className={`card ed-support ${i.status}`}>
      <div className="ed-support-icon">
        <Icon name="spark" size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="ed-support-title">
          <strong>{i.title || meta.label}</strong>
          {i.status === 'booked' && <span className="pill pill--tier3">Booked</span>}
        </div>
        <p className="t-body" style={{ margin: '4px 0 0' }}>
          {i.message}
        </p>
        <div className="t-meta" style={{ marginTop: 6 }}>
          From {i.by}
          {i.dueDate ? ` · respond by ${i.dueDate}` : ''}
        </div>
        {i.status === 'open' && (
          <div className="ed-support-actions">
            <input className="ed-input" placeholder="Preferred day/time (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="btn btn--accent btn--sm" onClick={() => respondToSupport(i.id, 'booked', note || 'Booked')}>
              Book it
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => respondToSupport(i.id, 'declined', 'Not now')}>
              Not now
            </button>
          </div>
        )}
        {i.status === 'booked' && (
          <div className="ed-support-actions">
            <button className="btn btn--ghost btn--sm" onClick={() => respondToSupport(i.id, 'done', 'Attended')}>
              <Icon name="check" size={14} /> I went
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Opportunities sent to the student, then the best of the rest. */
export function OpportunitiesForYou() {
  const v = useEdos();
  const sent = v.opportunities.filter((o) => o.sent && !o.application);
  const rest = v.opportunities.filter((o) => o.eligibility.ok && !o.sent).slice(0, Math.max(0, 3 - sent.length));
  const list = [...sent, ...rest].slice(0, 3);
  return (
    <Section
      eyebrow={sent.length ? 'Sent to you by the Careers Service' : v.decl ? 'Matched to your pathways and marks' : 'You’re eligible for these'}
      title="Opportunities for you"
      action={
        <Link to="/student/opportunities" className="t-meta ed-link">
          See all {v.opportunities.length} <Icon name="arrow" size={12} />
        </Link>
      }
    >
      <div className="ed-opp-mini-grid">
        {list.map((o) => (
          <Link key={o.id} to={`/student/opportunities?open=${o.id}`} className={`card card-lift ed-opp-mini ${o.sent ? 'sent' : ''}`}>
            <div className="ed-opp-mini-tags">
              <PathwayTag pathway={o.pathway} small />
              {o.sent && <span className="ed-sent-chip">Sent to you</span>}
            </div>
            <strong>{o.title}</strong>
            <span className="t-meta">{o.organisation}</span>
            <span className="ed-opp-mini-foot">
              {kindLabel(o.kind)} · <Closing date={o.closingDate} />
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}

/** Graduates: "Where are you now?" — reports the destination to Careers. */
export function DestinationCard() {
  const v = useEdos();
  const [f, setF] = useState({
    destination: v.destination?.destination ?? '',
    detail: v.destination?.detail ?? '',
    organisation: v.destination?.organisation ?? '',
  });
  const [saved, setSaved] = useState(false);
  return (
    <Section eyebrow="Graduate destination" title="Where are you now?">
      <div className="card ed-form-card">
        <div className="ed-choice-grid">
          {DESTINATIONS.map((d) => (
            <button key={d.key} className={`ed-choice ${f.destination === d.key ? 'on' : ''} ${d.tone}`} onClick={() => setF({ ...f, destination: d.key })}>
              {d.label}
            </button>
          ))}
        </div>
        <div className="ed-row">
          <label className="ed-field">
            <span>{f.destination === 'seeking' ? 'What are you looking for?' : 'Role or programme'}</span>
            <input className="ed-input" value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} />
          </label>
          {f.destination !== 'seeking' && (
            <label className="ed-field">
              <span>Organisation / institution</span>
              <input className="ed-input" value={f.organisation} onChange={(e) => setF({ ...f, organisation: e.target.value })} />
            </label>
          )}
        </div>
        <div className="ed-form-foot">
          <Synced />
          <button
            className="btn btn--accent"
            disabled={!f.destination}
            onClick={() => {
              reportDestination(f);
              setSaved(true);
            }}
          >
            {saved ? 'Updated ✓' : 'Update my destination'}
          </button>
        </div>
        {f.destination === 'seeking' && (
          <p className="t-meta" style={{ marginTop: 10 }}>
            You’re not on your own. The Careers Service will reach out with placements and support — and graduate
            opportunities stay open to you in EdOS.
          </p>
        )}
      </div>
    </Section>
  );
}
