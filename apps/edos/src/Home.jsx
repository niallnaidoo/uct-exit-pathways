/** EdOS — student home: academic snapshot, exit pathway, and what Careers sent. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEdos, respondToSupport, reportDestination } from './store.js';
import { Icon, PathwayTag, Section, Synced, Closing, kindLabel, Initials } from './ui.jsx';
import { READINESS, DESTINATIONS, interventionMeta } from '../../../packages/bridge/vocab.js';

export function Home() {
  const v = useEdos();
  const { me } = v;
  if (me.status === 'graduated') return <GraduateHome v={v} />;
  const readiness = v.decl ? READINESS[v.decl.primary] ?? [] : [];
  const done = readiness.filter((r) => v.decl?.readiness?.[r.key]).length;
  const openSupport = v.interventions.filter((i) => i.status === 'open' || i.status === 'booked');
  const forYou = v.opportunities.filter((o) => o.eligibility.ok).slice(0, 3);
  const nextMeeting = v.match?.meetings.find((m) => m.date >= new Date().toISOString().slice(0, 10));
  const hour = new Date().getHours();

  return (
    <div className="ed-page">
      <div className="card card--ink ed-hero appear">
        <div className="ed-hero-main">
          <div className="t-eyebrow" style={{ color: 'rgba(243,238,229,0.6)' }}>
            {me.stage} · {me.degree}
          </div>
          <h1 className="t-display">
            Good {hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, {me.firstName}.
          </h1>
          <p>
            {v.decl
              ? `You're heading for ${v.decl.primary === 'unsure' ? 'a decision — and that’s fine' : 'your next step'}. Here’s what will help this week.`
              : 'You graduate in ' + me.expectedGraduation + '. Have you thought about what comes next? It takes two minutes to plan.'}
          </p>
        </div>
        <div className="ed-hero-stats">
          <div>
            <span className="t-num">{me.average}%</span>
            <small>Average</small>
          </div>
          <div>
            <span className="t-num">
              {me.creditsCompleted}
              <em>/{me.creditsRequired}</em>
            </span>
            <small>Credits</small>
          </div>
          <div>
            <span className="t-num">{me.modules.length}</span>
            <small>Modules now</small>
          </div>
        </div>
      </div>

      <div className="ed-grid-2">
        <div className="card ed-pathway-card appear">
          <div className="t-eyebrow">Your exit pathway</div>
          {v.decl ? (
            <>
              <div className="ed-pw-row">
                <PathwayTag pathway={v.decl.primary} />
                {v.decl.backup && <span className="t-meta">then {v.decl.backup && <PathwayTag pathway={v.decl.backup} small />}</span>}
              </div>
              {readiness.length > 0 && (
                <>
                  <div className="ed-progress">
                    <span style={{ width: `${(done / readiness.length) * 100}%` }} />
                  </div>
                  <div className="t-meta">
                    {done} of {readiness.length} readiness steps done
                  </div>
                </>
              )}
              <Link to="/pathways" className="btn btn--ghost btn--sm" style={{ marginTop: 14 }}>
                Update my plan
              </Link>
            </>
          ) : (
            <>
              <p className="t-body" style={{ margin: '8px 0 14px' }}>
                Further study, a job, a start-up or a gap year — or not sure yet. Tell us, and the right opportunities
                and people find you.
              </p>
              <Link to="/pathways" className="btn btn--accent">
                Plan what’s next <Icon name="arrow" size={14} />
              </Link>
            </>
          )}
        </div>

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
              <Link to="/mentor" className="btn btn--ghost btn--sm" style={{ marginTop: 12 }}>
                Open conversation
              </Link>
            </>
          ) : v.offers.length ? (
            <>
              <p className="t-body" style={{ margin: '8px 0 12px' }}>
                <strong>{v.offers[0].mentor.firstName}</strong>, a UCT alumnus at {v.offers[0].mentor.organisation}, has
                offered to mentor you.
              </p>
              <Link to="/mentor" className="btn btn--accent btn--sm">
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
              <Link to="/mentor" className="btn btn--ghost btn--sm">
                {v.mentorRequest ? 'View request' : 'Ask for a mentor'}
              </Link>
            </>
          )}
        </div>
      </div>

      {openSupport.length > 0 && (
        <Section eyebrow="From the UCT Careers Service" title="Support set up for you">
          {openSupport.map((i) => (
            <SupportCard key={i.id} i={i} />
          ))}
        </Section>
      )}

      <Section
        eyebrow={v.decl ? 'Matched to your pathway and marks' : 'You’re eligible for these'}
        title="Opportunities for you"
        action={
          <Link to="/opportunities" className="t-meta ed-link">
            See all {v.opportunities.length} <Icon name="arrow" size={12} />
          </Link>
        }
      >
        <div className="ed-opp-mini-grid">
          {forYou.map((o) => (
            <Link key={o.id} to={`/opportunities?open=${o.id}`} className="card card-lift ed-opp-mini">
              <PathwayTag pathway={o.pathway} small />
              <strong>{o.title}</strong>
              <span className="t-meta">{o.organisation}</span>
              <span className="ed-opp-mini-foot">
                {kindLabel(o.kind)} · <Closing date={o.closingDate} />
              </span>
            </Link>
          ))}
        </div>
      </Section>
    </div>
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

/** Graduates keep EdOS access — and tell UCT where they landed. */
function GraduateHome({ v }) {
  const { me } = v;
  const [f, setF] = useState({ destination: v.destination?.destination ?? '', detail: v.destination?.detail ?? '', organisation: v.destination?.organisation ?? '' });
  const [saved, setSaved] = useState(false);
  const openSupport = v.interventions.filter((i) => i.status === 'open' || i.status === 'booked');
  return (
    <div className="ed-page">
      <div className="card card--ink ed-hero appear">
        <div className="ed-hero-main">
          <div className="t-eyebrow" style={{ color: 'rgba(243,238,229,0.6)' }}>
            Class of {me.expectedGraduation} · {me.degree}
          </div>
          <h1 className="t-display">Welcome back, {me.firstName}.</h1>
          <p>You’ll always have a home at UCT. Tell us where you are now — it helps us support you and the students behind you.</p>
        </div>
      </div>
      {openSupport.length > 0 && (
        <Section eyebrow="From the UCT Careers Service" title="Support set up for you">
          {openSupport.map((i) => (
            <SupportCard key={i.id} i={i} />
          ))}
        </Section>
      )}
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
    </div>
  );
}
