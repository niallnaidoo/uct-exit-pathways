/**
 * EdOS — the student side of the alumni mentorship programme.
 * Ask for a mentor (your academic profile goes with it), agree to an offer,
 * then message and meet your mentor — all from inside EdOS. The mentor works
 * from the Careers Service platform; the bus carries the conversation.
 */
import { useState } from 'react';
import { useEdos, requestMentor, respondToOffer, sendMessage, bookMeeting } from './store.js';
import { Icon, Initials, Synced, Section } from './ui.jsx';
import { INDUSTRIES, SKILLS, LANGUAGES, MILESTONES } from '../../../../packages/bridge/vocab.js';
import { timeAgo } from '../../../../packages/bridge/describe.js';

export function Mentor() {
  const v = useEdos();
  return (
    <div className="ed-page">
      <header className="ed-page-head">
        <div className="t-eyebrow">Alumni mentorship</div>
        <h1 className="t-display">{v.match ? 'Your mentor' : 'Find an alumni mentor'}</h1>
        {!v.match && (
          <p className="t-body">
            UCT graduates working in your field, giving a few hours a month to help you take your next step.
          </p>
        )}
      </header>
      {v.match ? (
        <Active v={v} />
      ) : v.offers.length ? (
        <Offers offers={v.offers} />
      ) : v.mentorRequest ? (
        <Waiting v={v} />
      ) : (
        <RequestForm v={v} />
      )}
    </div>
  );
}

function RequestForm({ v }) {
  const { me } = v;
  const [f, setF] = useState({
    careerInterests: v.decl?.interests ?? [],
    skillsWanted: [],
    goals: '',
    languages: ['English'],
    meetingFormat: 'Either',
    availability: '',
    accessNeeds: '',
  });
  const toggle = (k, x) => setF({ ...f, [k]: f[k].includes(x) ? f[k].filter((y) => y !== x) : [...f[k], x] });
  const ready = f.careerInterests.length && f.skillsWanted.length && f.goals.trim().length >= 10;
  return (
    <div className="ed-grid-side">
      <div className="card ed-form-card">
        <div className="ed-step-label">Fields you’re interested in</div>
        <div className="ed-backup">
          {INDUSTRIES.map((x) => (
            <button key={x} className={`ed-chip ${f.careerInterests.includes(x) ? 'on' : ''}`} onClick={() => toggle('careerInterests', x)}>
              {x}
            </button>
          ))}
        </div>
        <div className="ed-step-label">What would you like help with?</div>
        <div className="ed-backup">
          {SKILLS.map((x) => (
            <button key={x} className={`ed-chip ${f.skillsWanted.includes(x) ? 'on' : ''}`} onClick={() => toggle('skillsWanted', x)}>
              {x}
            </button>
          ))}
        </div>
        <label className="ed-field">
          <span>Your main goal for this year</span>
          <textarea className="ed-input" rows={2} value={f.goals} onChange={(e) => setF({ ...f, goals: e.target.value })} placeholder="e.g. Land a place on a graduate programme in marketing." />
        </label>
        <div className="ed-step-label">Languages</div>
        <div className="ed-backup">
          {LANGUAGES.map((x) => (
            <button key={x} className={`ed-chip ${f.languages.includes(x) ? 'on' : ''}`} onClick={() => toggle('languages', x)}>
              {x}
            </button>
          ))}
        </div>
        <div className="ed-row">
          <label className="ed-field">
            <span>Meet</span>
            <select className="ed-input" value={f.meetingFormat} onChange={(e) => setF({ ...f, meetingFormat: e.target.value })}>
              <option>Either</option>
              <option>Online</option>
              <option>In person</option>
            </select>
          </label>
          <label className="ed-field">
            <span>When are you usually free?</span>
            <input className="ed-input" value={f.availability} onChange={(e) => setF({ ...f, availability: e.target.value })} />
          </label>
        </div>
        <div className="ed-form-foot">
          <Synced>Goes to the alumni mentors who fit</Synced>
          <button className="btn btn--accent" disabled={!ready} onClick={() => requestMentor(f)}>
            Ask for a mentor
          </button>
        </div>
      </div>
      <aside className="card card--soft ed-side-note">
        <div className="t-eyebrow">Already attached from EdOS</div>
        <ul>
          <li>{me.faculty}</li>
          <li>{me.degree}</li>
          <li>{me.stage}</li>
          <li>Average {me.average}%</li>
        </ul>
        <p className="t-meta">
          No need to type these again. Mentors see your first name, degree and interests — never your contact details
          until you accept them.
        </p>
      </aside>
    </div>
  );
}

function Waiting({ v }) {
  return (
    <div className="card ed-form-card">
      <div className="ed-wait">
        <Icon name="clock" size={20} />
        <div>
          <strong>Your request is with our alumni mentors</strong>
          <p className="t-body">
            Sent {timeAgo(v.mentorRequest.requestedAt)}. Mentors whose experience fits your interests (
            {v.mentorRequest.careerInterests.join(', ')}) can see it. When one offers, it shows up here and you choose.
          </p>
        </div>
      </div>
    </div>
  );
}

function MentorCard({ m, footer, showContact }) {
  return (
    <div className="card ed-mentor-card">
      <div className="ed-person">
        <Initials name={`${m.firstName} ${m.lastName}`} size={52} dark />
        <div>
          <strong className="ed-mentor-name">
            {m.firstName} {m.lastName}
          </strong>
          <small>
            {m.role} · {m.organisation}
          </small>
          <small>
            {m.qualification} · Class of {m.gradYear}
          </small>
        </div>
      </div>
      {m.bio && <p className="t-body">{m.bio}</p>}
      <div className="ed-tags">
        {(m.expertise ?? []).map((x) => (
          <span key={x} className="pill pill--soft">
            {x}
          </span>
        ))}
      </div>
      <div className="t-meta">
        {[m.mentoringType, m.meetingFormat && `Meets ${m.meetingFormat.toLowerCase()}`, m.frequency, m.period].filter(Boolean).join(' · ')}
      </div>
      {showContact && m.email && <div className="t-meta">{m.email}</div>}
      {footer}
    </div>
  );
}

function Offers({ offers }) {
  return (
    <>
      <p className="t-body" style={{ marginTop: 0 }}>
        {offers.length === 1 ? 'A UCT alumnus has' : `${offers.length} UCT alumni have`} offered to mentor you. Nothing
        starts until you agree.
      </p>
      <div className="ed-grid-2">
        {offers.map((o) => (
          <MentorCard
            key={o.id}
            m={o.mentor}
            footer={
              <div className="ed-opp-actions">
                <button className="btn btn--ghost btn--sm" onClick={() => respondToOffer(o.id, false, 'Not the right fit')}>
                  Not for me
                </button>
                <button className="btn btn--accent btn--sm" onClick={() => respondToOffer(o.id, true)}>
                  Accept {o.mentor.firstName} as my mentor
                </button>
              </div>
            }
          />
        ))}
      </div>
    </>
  );
}

function Active({ v }) {
  const x = v.match;
  const [text, setText] = useState('');
  const [mt, setMt] = useState({ date: '', time: '', format: 'Online', agenda: '' });
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = x.meetings.filter((m) => m.date >= today);
  return (
    <div className="ed-grid-side">
      <div>
        <Section title={`Conversation with ${x.mentor.firstName}`}>
          <div className="card ed-chat">
            <div className="ed-chat-msgs">
              {x.messages.length === 0 && <p className="t-meta">Say hi — suggest a time for your kick-off.</p>}
              {x.messages.map((m) => (
                <div key={m.id} className={`ed-bubble ${m.from === 'mentee' ? 'me' : ''}`}>
                  {m.text}
                  <small>{timeAgo(m.at)}</small>
                </div>
              ))}
            </div>
            <form
              className="ed-chat-input"
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim()) return;
                sendMessage(x.id, text.trim());
                setText('');
              }}
            >
              <input className="ed-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${x.mentor.firstName}…`} />
              <button className="btn btn--accent" type="submit" disabled={!text.trim()}>
                <Icon name="send" size={14} /> Send
              </button>
            </form>
          </div>
        </Section>
        <Section title="Meetings">
          <div className="card ed-form-card">
            {upcoming.length === 0 && <p className="t-meta">Nothing booked.</p>}
            {upcoming.map((m) => (
              <div key={m.id} className="ed-meeting">
                <div className="ed-meeting-date">
                  <strong>{new Date(`${m.date}T12:00:00`).getDate()}</strong>
                  <span>{new Date(`${m.date}T12:00:00`).toLocaleDateString('en-ZA', { month: 'short' })}</span>
                </div>
                <div>
                  <strong>
                    {m.time} · {m.format}
                  </strong>
                  <small>{m.agenda}</small>
                </div>
              </div>
            ))}
            <div className="ed-row" style={{ marginTop: 12 }}>
              <input className="ed-input" type="date" min={today} value={mt.date} onChange={(e) => setMt({ ...mt, date: e.target.value })} />
              <input className="ed-input" type="time" value={mt.time} onChange={(e) => setMt({ ...mt, time: e.target.value })} />
              <select className="ed-input" value={mt.format} onChange={(e) => setMt({ ...mt, format: e.target.value })}>
                <option>Online</option>
                <option>In person</option>
              </select>
            </div>
            <div className="ed-row">
              <input className="ed-input" placeholder="What would you like to cover?" value={mt.agenda} onChange={(e) => setMt({ ...mt, agenda: e.target.value })} />
              <button
                className="btn btn--ghost"
                disabled={!mt.date || !mt.time}
                onClick={() => {
                  bookMeeting(x.id, mt);
                  setMt({ date: '', time: '', format: 'Online', agenda: '' });
                }}
              >
                Book
              </button>
            </div>
          </div>
        </Section>
      </div>
      <aside>
        <MentorCard m={x.mentor} showContact />
        <div className="card ed-form-card" style={{ marginTop: 14 }}>
          <div className="t-eyebrow">Your programme</div>
          <ol className="ed-milestones">
            {MILESTONES.map((ms, i) => {
              const done = !!x.milestones?.[ms.key];
              return (
                <li key={ms.key} className={done ? 'done' : ''}>
                  <span>{done ? <Icon name="check" size={12} /> : i + 1}</span>
                  <div>
                    <strong>{ms.label}</strong>
                    <small>{ms.when}</small>
                  </div>
                </li>
              );
            })}
          </ol>
          <span className="t-meta">Your mentor ticks these off as you go.</span>
        </div>
      </aside>
    </div>
  );
}
