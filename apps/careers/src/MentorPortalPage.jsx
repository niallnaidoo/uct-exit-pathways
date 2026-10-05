/**
 * Alumni mentor dashboard — the mentor's private, no-login link (#/alumni/:id?t=).
 *
 * Privacy by design: a mentor sees their OWN mentees (full details once the
 * student has agreed), anonymised candidates (first name + initial, no contact
 * details), and never any other mentor. Potential matches are filtered by the
 * mentor's profile; every other available student sits on a separate tab.
 */
import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from './query.js';
import { clearSession, loginUrl } from '../../../packages/demo-auth/session.js';
import * as api from './api.js';
import { Icon } from './atoms.jsx';
import {
  FACULTIES,
  INDUSTRIES,
  SKILLS,
  STAGES,
  MILESTONES,
  RESOURCES,
  REFERRAL_MAP,
  PULSE_QUESTIONS,
  MATCH_THRESHOLD,
  MEETING_FORMATS,
  maxMentees,
  milestoneProgress,
  menteeShortName,
} from './mentorship-model.js';
import {
  ChipSelect,
  Field,
  MentorProfileCard,
  MenteeCard,
  PersonPhoto,
  Segmented,
  fmtDate,
  fmtAgo,
} from './mentorship-ui.jsx';

const portalKey = (id, token) => ['mentor-portal', id, token];
const today = () => new Date().toISOString().slice(0, 10);

export function MentorPortalPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';
  const [tab, setTab] = useState('overview');
  const [flash, setFlash] = useState(null);
  const { data, error, isLoading } = useQuery({
    queryKey: portalKey(id, token),
    queryFn: () => api.getMentorPortal(id, token),
    retry: false,
    // Always fresh: approvals, offers and replies land from the other side.
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: portalKey(id, token) });
  const notify = (message, kind = 'ok') => {
    setFlash({ message, kind });
    setTimeout(() => setFlash(null), 3200);
  };
  // Every action on this page goes through here: call, refresh, toast.
  const act = async (fn, okMsg) => {
    try {
      await fn();
      refresh();
      if (okMsg) notify(okMsg);
      return true;
    } catch (e) {
      notify(e.message ? e.message[0].toUpperCase() + e.message.slice(1) : 'Something went wrong', 'err');
      return false;
    }
  };

  if (isLoading) return <div className="ms-page ms-center muted">Loading your dashboard…</div>;
  if (error || !data)
    return (
      <div className="ms-page">
        <div className="mentor-card">
          <div className="mentor-eyebrow">Alumni mentorship</div>
          <h1>This link isn’t valid</h1>
          <p>It may have been replaced or switched off. Please contact the programme office for a new link.</p>
        </div>
      </div>
    );

  const { mentor, mentorships, available } = data;
  const approved = mentor.status === 'approved';
  const active = mentorships.filter((m) => m.status === 'active');
  const offered = mentorships.filter((m) => m.status === 'offered');
  const cap = maxMentees(mentor);
  const atCapacity = active.length + offered.length >= cap;
  const matches = available.filter((t) => t.match.eligible && t.match.score >= MATCH_THRESHOLD);
  const unread = active.reduce((n, m) => n + (m.messages.at(-1)?.from === 'mentee' ? 1 : 0), 0);
  const ctx = { id, token, mentor, act, notify, atCapacity, cap, setTab };

  const tabs = approved
    ? [
        { key: 'overview', label: 'Dashboard', icon: Icon.Dashboard },
        { key: 'mentees', label: 'My mentees', icon: Icon.Users, badge: active.length || null },
        { key: 'matches', label: 'Potential matches', icon: Icon.Star, badge: matches.filter((t) => !t.offered).length || null },
        { key: 'available', label: 'All available students', icon: Icon.Clubs },
        { key: 'meetings', label: 'Meetings', icon: Icon.Clock },
        { key: 'messages', label: 'Messages', icon: Icon.Mail, badge: unread || null },
        { key: 'resources', label: 'Resources & guides', icon: Icon.Doc },
        { key: 'checkin', label: 'Feedback & check-in', icon: Icon.Bell },
        { key: 'profile', label: 'My profile', icon: Icon.Eye },
      ]
    : [
        { key: 'overview', label: 'Application', icon: Icon.Dashboard },
        { key: 'resources', label: 'Training & guides', icon: Icon.Doc },
        { key: 'profile', label: 'My profile', icon: Icon.Eye },
      ];
  const current = tabs.some((t) => t.key === tab) ? tab : 'overview';

  return (
    <div className="ms-page ms-portal">
      <header className="ms-portal-top">
        <div className="ms-portal-who">
          <PersonPhoto photo={mentor.photo} name={`${mentor.firstName} ${mentor.lastName}`} size={40} />
          <div>
            <div className="ms-portal-name">
              {mentor.firstName} {mentor.lastName}
            </div>
            <div className="ms-portal-sub">Alumni mentor · {data.settings?.orgShort ?? 'UCT'} Mentorship Programme</div>
          </div>
        </div>
        <div className="ms-portal-right">
          <span className={`ms-status ${mentor.status}`}>
            {approved ? 'Approved mentor' : mentor.status === 'declined' ? 'Not approved' : 'Under review'}
          </span>
          <button
            className="app-signout"
            onClick={() => {
              clearSession('careers');
              window.location.href = loginUrl();
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="ms-portal-body">
        <nav className="ms-side">
          {tabs.map((t) => (
            <button key={t.key} className={`ms-side-btn ${current === t.key ? 'on' : ''}`} onClick={() => setTab(t.key)}>
              <t.icon />
              <span>{t.label}</span>
              {t.badge ? <em>{t.badge}</em> : null}
            </button>
          ))}
        </nav>
        <main className="ms-main">
          {current === 'overview' &&
            (approved ? (
              <Overview ctx={ctx} active={active} offered={offered} matches={matches} />
            ) : (
              <PendingView mentor={mentor} />
            ))}
          {current === 'mentees' && <MyMentees ctx={ctx} active={active} offered={offered} />}
          {current === 'matches' && (
            <CandidateList
              ctx={ctx}
              list={matches}
              title="Potential matches"
              sub="Students whose interests, faculty and stage fit what you said you can support. Make an offer — the student agrees before anything starts."
              empty="No students fit your profile right now. Try the ‘All available students’ tab, or broaden who you can support in My profile."
            />
          )}
          {current === 'available' && (
            <CandidateList
              ctx={ctx}
              list={available}
              filters
              title="All available students"
              sub="Every student still looking for a mentor — in case you’d like to take on someone outside your usual profile."
              empty="Every student currently has a mentor."
            />
          )}
          {current === 'meetings' && <Meetings ctx={ctx} active={active} />}
          {current === 'messages' && <Messages ctx={ctx} active={active} />}
          {current === 'resources' && <Resources />}
          {current === 'checkin' && <CheckIn ctx={ctx} active={active} pulses={data.pulses} />}
          {current === 'profile' && <ProfileTab ctx={ctx} />}
        </main>
      </div>
      {flash && <div className={`toast ms-toast ${flash.kind === 'err' ? 'toast-err' : ''}`}>{flash.message}</div>}
    </div>
  );
}

function Head({ title, sub, right }) {
  return (
    <div className="ms-head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

function PendingView({ mentor }) {
  if (mentor.status === 'declined')
    return (
      <>
        <Head title="Thank you for applying" />
        <div className="ms-note">
          The programme office wasn’t able to approve your application this time. They’ll be in touch by email
          with more detail.
        </div>
      </>
    );
  return (
    <>
      <Head
        title={`Welcome, ${mentor.firstName}`}
        sub="Your application is with the programme office. Once you’re approved, this becomes your mentoring dashboard."
      />
      <ol className="ms-track">
        <li className="done">
          <span>
            <Icon.Check />
          </span>
          <div>
            <strong>Application submitted</strong>
            <small>{mentor.appliedAt ? fmtDate(mentor.appliedAt) : 'Received'}</small>
          </div>
        </li>
        <li className="now">
          <span>2</span>
          <div>
            <strong>Reference check &amp; review</strong>
            <small>About three working days</small>
          </div>
        </li>
        <li>
          <span>3</span>
          <div>
            <strong>Micro-training &amp; orientation</strong>
            <small>45–60 min self-paced, plus a live session</small>
          </div>
        </li>
        <li>
          <span>4</span>
          <div>
            <strong>See your matches</strong>
            <small>Students who fit your profile appear here</small>
          </div>
        </li>
      </ol>
      <div className="ms-mini-label" style={{ marginTop: 22 }}>
        How students will see you
      </div>
      <div style={{ maxWidth: 520 }}>
        <MentorProfileCard mentor={mentor} />
      </div>
    </>
  );
}

function Overview({ ctx, active, offered, matches }) {
  const { mentor, cap, setTab } = ctx;
  const upcoming = active
    .flatMap((m) => m.meetings.map((mt) => ({ ...mt, mentee: m.mentee })))
    .filter((mt) => mt.date >= today())
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const fresh = matches.filter((t) => !t.offered);
  return (
    <>
      <Head title={`Hi ${mentor.firstName}`} sub="Here’s where your mentoring stands." />
      <div className="ms-kpis">
        <button className="ms-kpi" onClick={() => setTab('mentees')}>
          <strong>
            {active.length}
            <small>/{cap}</small>
          </strong>
          <span>Active mentees</span>
        </button>
        <button className="ms-kpi" onClick={() => setTab('mentees')}>
          <strong>{offered.length}</strong>
          <span>Offers awaiting a reply</span>
        </button>
        <button className="ms-kpi" onClick={() => setTab('matches')}>
          <strong>{fresh.length}</strong>
          <span>New potential matches</span>
        </button>
        <button className="ms-kpi" onClick={() => setTab('meetings')}>
          <strong>{upcoming.length}</strong>
          <span>Upcoming meetings</span>
        </button>
      </div>

      <div className="ms-two">
        <section className="ms-box">
          <div className="ms-box-head">
            <h3>Upcoming meetings</h3>
            <button className="link-btn" onClick={() => setTab('meetings')}>
              Plan a meeting
            </button>
          </div>
          {upcoming.length === 0 ? (
            <p className="muted ms-empty-line">Nothing booked yet.</p>
          ) : (
            upcoming.slice(0, 4).map((mt) => <MeetingRow key={mt.id} mt={mt} />)
          )}
        </section>
        <section className="ms-box">
          <div className="ms-box-head">
            <h3>Your mentees</h3>
            <button className="link-btn" onClick={() => setTab('mentees')}>
              View all
            </button>
          </div>
          {active.length === 0 ? (
            <p className="muted ms-empty-line">
              No active mentees yet.{' '}
              <button className="link-btn" onClick={() => setTab('matches')}>
                See your matches
              </button>
            </p>
          ) : (
            active.map((m) => (
              <div className="ms-mini-mentee" key={m.id}>
                <PersonPhoto name={`${m.mentee.firstName} ${m.mentee.lastName}`} size={32} />
                <div>
                  <strong>
                    {m.mentee.firstName} {m.mentee.lastName}
                  </strong>
                  <small>{nextMilestone(m)}</small>
                </div>
                <div className="ms-bar" title={`${milestoneProgress(m)}% through the programme`}>
                  <span style={{ width: `${milestoneProgress(m)}%` }} />
                </div>
              </div>
            ))
          )}
        </section>
      </div>
      {fresh.length > 0 && active.length + offered.length < cap && (
        <section className="ms-box ms-callout">
          <div>
            <h3>
              {fresh.length} student{fresh.length === 1 ? '' : 's'} match your profile
            </h3>
            <p className="muted">
              Top match: {menteeShortName({ firstName: fresh[0].firstName, lastName: fresh[0].lastInitial })} ·{' '}
              {fresh[0].degree} · {fresh[0].match.score}% match
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setTab('matches')}>
            Review matches
          </button>
        </section>
      )}
    </>
  );
}

function nextMilestone(m) {
  const next = MILESTONES.find((ms) => !m.milestones?.[ms.key]);
  return next ? `Next: ${next.label} (${next.when})` : 'All milestones complete';
}

function MeetingRow({ mt }) {
  return (
    <div className="ms-meeting">
      <div className="ms-meeting-date">
        <strong>{new Date(`${mt.date}T12:00:00`).getDate()}</strong>
        <span>{new Date(`${mt.date}T12:00:00`).toLocaleDateString('en-ZA', { month: 'short' })}</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <strong>
          {mt.mentee ? `${mt.mentee.firstName} ${mt.mentee.lastName ?? ''}` : 'Meeting'} · {mt.time}
        </strong>
        <small>
          {mt.format}
          {mt.agenda ? ` — ${mt.agenda}` : ''}
        </small>
      </div>
    </div>
  );
}

function MyMentees({ ctx, active, offered }) {
  const { id, token, act, setTab } = ctx;
  return (
    <>
      <Head title="My mentees" sub="Only the students who have agreed to be mentored by you." />
      {active.length === 0 && (
        <div className="ms-note">
          No active mentees yet. When a student accepts your offer they’ll appear here with their contact details.
        </div>
      )}
      <div className="ms-grid">
        {active.map((m) => (
          <MenteeCard
            key={m.id}
            mentee={m.mentee}
            full
            mentorAvailability={ctx.mentor.availability}
            academics={m.academics}
            footer={
              <div className="ms-milestones">
                <div className="ms-mini-label">
                  Programme milestones · {milestoneProgress(m)}%
                </div>
                {MILESTONES.map((ms) => (
                  <label key={ms.key} className={`ms-ms ${m.milestones?.[ms.key] ? 'done' : ''}`}>
                    <input
                      type="checkbox"
                      checked={!!m.milestones?.[ms.key]}
                      onChange={(e) =>
                        act(() => api.setMilestone(id, token, m.id, ms.key, e.target.checked), e.target.checked ? `${ms.label} ticked off` : null)
                      }
                    />
                    <span>
                      <strong>{ms.label}</strong> <em>{ms.when}</em>
                      <small>{ms.detail}</small>
                    </span>
                  </label>
                ))}
                <div className="ms-card-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => setTab('messages')}>
                    Message
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => setTab('meetings')}>
                    Plan meeting
                  </button>
                </div>
              </div>
            }
          />
        ))}
      </div>
      {offered.length > 0 && (
        <>
          <div className="ms-mini-label" style={{ margin: '26px 0 10px' }}>
            Waiting for the student to agree
          </div>
          <div className="ms-grid">
            {offered.map((m) => (
              <MenteeCard
                key={m.id}
                mentee={m.mentee}
                footer={
                  <div className="ms-card-actions">
                    <span className="muted" style={{ fontSize: 12.5 }}>
                      Offered {fmtAgo(m.offeredAt)}
                    </span>
                    <button className="link-btn" onClick={() => act(() => api.withdrawOffer(id, token, m.id), 'Offer withdrawn')}>
                      Withdraw
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function CandidateList({ ctx, list, title, sub, empty, filters }) {
  const { id, token, act, atCapacity, cap } = ctx;
  const [q, setQ] = useState('');
  const [faculty, setFaculty] = useState('');
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return list.filter(
      (t) =>
        (!faculty || t.faculty === faculty) &&
        (!needle ||
          [t.firstName, t.degree, t.goals, ...(t.careerInterests ?? []), ...(t.skillsWanted ?? [])]
            .join(' ')
            .toLowerCase()
            .includes(needle)),
    );
  }, [list, q, faculty]);
  return (
    <>
      <Head title={title} sub={sub} />
      {atCapacity && (
        <div className="ms-note">
          You’ve reached your limit of {cap} mentee{cap === 1 ? '' : 's'}. Raise it in My profile to make more offers.
        </div>
      )}
      {filters && (
        <div className="ms-filters">
          <input placeholder="Search interests, degree, goals…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={faculty} onChange={(e) => setFaculty(e.target.value)}>
            <option value="">All faculties</option>
            {FACULTIES.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>
      )}
      {shown.length === 0 ? (
        <div className="ms-note">{list.length ? 'No students match that search.' : empty}</div>
      ) : (
        <div className="ms-grid">
          {shown.map((t) => (
            <MenteeCard
              key={t.id}
              mentee={t}
              match={t.match}
              mentorAvailability={ctx.mentor.availability}
              footer={
                <div className="ms-card-actions">
                  {t.offered ? (
                    <span className="ms-offered">
                      <Icon.Check /> Offer sent — waiting for {t.firstName}
                    </span>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={atCapacity}
                      onClick={() =>
                        act(() => api.offerMentorship(id, token, t.id), `Offer sent — ${t.firstName} will be asked to agree`)
                      }
                    >
                      Offer to mentor {t.firstName}
                    </button>
                  )}
                </div>
              }
            />
          ))}
        </div>
      )}
    </>
  );
}

function Meetings({ ctx, active }) {
  const { id, token, act } = ctx;
  const blank = { matchId: active[0]?.id ?? '', date: '', time: '', format: 'Online', agenda: '' };
  const [form, setForm] = useState(blank);
  const set = (p) => setForm((f) => ({ ...f, ...p }));
  const all = active
    .flatMap((m) => m.meetings.map((mt) => ({ ...mt, mentee: m.mentee })))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const upcoming = all.filter((mt) => mt.date >= today());
  const past = all.filter((mt) => mt.date < today()).reverse();
  async function book(e) {
    e.preventDefault();
    const okd = await act(() => api.scheduleMeeting('mentor', id, token, form), 'Meeting booked — your mentee can see it');
    if (okd) setForm({ ...blank, matchId: form.matchId });
  }
  return (
    <>
      <Head title="Meetings" sub="Plan a meeting with a mentee, and see what’s coming up." />
      {active.length === 0 ? (
        <div className="ms-note">Meetings open once a student has agreed to be your mentee.</div>
      ) : (
        <form className="ms-box ms-book" onSubmit={book}>
          <h3>Plan a meeting</h3>
          <div className="fld-row">
            <label className="fld">
              <span>With</span>
              <select value={form.matchId} onChange={(e) => set({ matchId: e.target.value })}>
                {active.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.mentee.firstName} {m.mentee.lastName}
                  </option>
                ))}
              </select>
            </label>
            <label className="fld">
              <span>Date</span>
              <input type="date" min={today()} value={form.date} onChange={(e) => set({ date: e.target.value })} />
            </label>
            <label className="fld">
              <span>Time</span>
              <input type="time" value={form.time} onChange={(e) => set({ time: e.target.value })} />
            </label>
          </div>
          <div className="ms-field-label">Format</div>
          <Segmented options={MEETING_FORMATS.filter((f) => f !== 'Either')} value={form.format} onChange={(format) => set({ format })} />
          <label className="fld" style={{ marginTop: 12 }}>
            <span>Agenda (optional)</span>
            <input value={form.agenda} onChange={(e) => set({ agenda: e.target.value })} placeholder="e.g. Mock interview practice" />
          </label>
          <button className="btn btn-primary" type="submit">
            Book meeting
          </button>
        </form>
      )}
      <div className="ms-two">
        <section className="ms-box">
          <h3>Upcoming</h3>
          {upcoming.length ? upcoming.map((mt) => <MeetingRow key={mt.id} mt={mt} />) : <p className="muted ms-empty-line">Nothing booked.</p>}
        </section>
        <section className="ms-box">
          <h3>Past</h3>
          {past.length ? past.map((mt) => <MeetingRow key={mt.id} mt={mt} />) : <p className="muted ms-empty-line">No past meetings yet.</p>}
        </section>
      </div>
    </>
  );
}

function Messages({ ctx, active }) {
  const { id, token, act } = ctx;
  const [sel, setSel] = useState(active[0]?.id ?? null);
  const [text, setText] = useState('');
  const thread = active.find((m) => m.id === sel);
  async function send(e) {
    e.preventDefault();
    if (!text.trim() || !thread) return;
    const okd = await act(() => api.sendMessage('mentor', id, token, { matchId: thread.id, text }));
    if (okd) setText('');
  }
  return (
    <>
      <Head title="Messages" sub="Talk to your mentees here. Messages are only between you and your own mentees." />
      {active.length === 0 ? (
        <div className="ms-note">Messaging opens once a student has agreed to be your mentee.</div>
      ) : (
        <div className="ms-chat">
          <div className="ms-chat-list">
            {active.map((m) => {
              const last = m.messages.at(-1);
              return (
                <button key={m.id} className={`ms-chat-item ${sel === m.id ? 'on' : ''}`} onClick={() => setSel(m.id)}>
                  <PersonPhoto name={`${m.mentee.firstName} ${m.mentee.lastName}`} size={32} />
                  <span>
                    <strong>
                      {m.mentee.firstName} {m.mentee.lastName}
                    </strong>
                    <small>{last ? last.text : 'No messages yet'}</small>
                  </span>
                  {last?.from === 'mentee' && <i className="ms-dot" />}
                </button>
              );
            })}
          </div>
          <div className="ms-chat-thread">
            <div className="ms-chat-msgs">
              {thread?.messages.length ? (
                thread.messages.map((msg) => (
                  <div key={msg.id} className={`ms-bubble ${msg.from === 'mentor' ? 'me' : ''}`}>
                    {msg.text}
                    <small>{fmtAgo(msg.at)}</small>
                  </div>
                ))
              ) : (
                <p className="muted ms-empty-line">Say hello — a short intro and a suggested first meeting time works well.</p>
              )}
            </div>
            <form className="ms-chat-input" onSubmit={send}>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${thread?.mentee.firstName ?? ''}…`} />
              <button className="btn btn-primary" type="submit" disabled={!text.trim()}>
                Send
              </button>
            </form>
            <div className="ms-chat-foot">Keep contact on the platform. The programme office can review messages for safeguarding.</div>
          </div>
        </div>
      )}
    </>
  );
}

export function Resources() {
  return (
    <>
      <Head title="Resources & mentoring guides" sub="Short, practical guides — and who to call if something comes up." />
      <div className="ms-res-grid">
        {RESOURCES.map((r) => (
          <article key={r.title} className="ms-res">
            <span className="ms-res-kind">{r.kind}</span>
            <h3>{r.title}</h3>
            <p>{r.body}</p>
          </article>
        ))}
      </div>
      <section className="ms-box" style={{ marginTop: 18 }}>
        <h3>UCT referral map</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          You don’t need to solve everything. Point your mentee to the right service.
        </p>
        <div className="ms-referrals">
          {REFERRAL_MAP.map((r) => (
            <div key={r.name}>
              <strong>{r.name}</strong>
              <span>{r.when}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

const CONCERN_TIERS = [
  { key: 'L1', label: 'Service issue', hint: 'Scheduling, missed meetings, slow replies' },
  { key: 'L2', label: 'Conduct or boundary concern', hint: 'Something that doesn’t feel right' },
  { key: 'L3', label: 'Serious or safeguarding', hint: 'Someone may be at risk — escalated immediately' },
];

/** Pulse survey + raise-a-concern. Used by mentors and mentees alike. */
export function CheckIn({ ctx, active, pulses, kind = 'mentor', otherName }) {
  const { id, token, act } = ctx;
  const [matchId, setMatchId] = useState(active[0]?.id ?? '');
  const [answers, setAnswers] = useState({});
  const [comment, setComment] = useState('');
  const [concern, setConcern] = useState('');
  const [concernText, setConcernText] = useState('');
  const complete = PULSE_QUESTIONS.every((q) => answers[q.key]);

  async function submitPulse(e) {
    e.preventDefault();
    const okd = await act(
      () => api.submitPulse(kind, id, token, { matchId, answers, comment }),
      'Thanks — check-in received',
    );
    if (okd) {
      setAnswers({});
      setComment('');
    }
  }
  async function raise(e) {
    e.preventDefault();
    const okd = await act(
      () => api.submitPulse(kind, id, token, { matchId, answers: {}, comment: concernText, concern }),
      concern === 'L3' ? 'Escalated — the programme office will contact you today' : 'Concern logged — the office will respond within 2 working days',
    );
    if (okd) {
      setConcern('');
      setConcernText('');
    }
  }
  return (
    <>
      <Head title="Feedback & check-in" sub="A one-minute pulse on how things are going. Low scores prompt a friendly check-in from the office." />
      <form className="ms-box" onSubmit={submitPulse}>
        <h3>Quick pulse</h3>
        {active.length > 1 && (
          <label className="fld" style={{ maxWidth: 320 }}>
            <span>About</span>
            <select value={matchId} onChange={(e) => setMatchId(e.target.value)}>
              {active.map((m) => (
                <option key={m.id} value={m.id}>
                  {otherName ? otherName(m) : `${m.mentee.firstName} ${m.mentee.lastName}`}
                </option>
              ))}
            </select>
          </label>
        )}
        {PULSE_QUESTIONS.map((q) => (
          <div key={q.key} className="ms-pulse-q">
            <span>{q.label}</span>
            <div className="ms-scale">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  className={answers[q.key] === n ? 'on' : ''}
                  onClick={() => setAnswers((a) => ({ ...a, [q.key]: n }))}
                  aria-label={`${n} of 5`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="ms-scale-legend">
          <span>1 = not well</span>
          <span>5 = really well</span>
        </div>
        <label className="fld">
          <span>Anything to add? (optional)</span>
          <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
        </label>
        <button className="btn btn-primary" type="submit" disabled={!complete}>
          Send check-in
        </button>
      </form>

      <form className="ms-box" onSubmit={raise}>
        <h3>Raise a concern</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Goes straight to the programme office. They respond within 2 working days, or the same day for serious
          concerns.
        </p>
        <div className="ms-tiers">
          {CONCERN_TIERS.map((t) => (
            <label key={t.key} className={`ms-tier ${concern === t.key ? 'on' : ''} ${t.key === 'L3' ? 'urgent' : ''}`}>
              <input type="radio" name="tier" checked={concern === t.key} onChange={() => setConcern(t.key)} />
              <strong>{t.label}</strong>
              <small>{t.hint}</small>
            </label>
          ))}
        </div>
        {/* Numbers to be confirmed by the programme office before launch. */}
        {concern === 'L3' && (
          <div className="ms-urgent">
            If someone is in immediate danger, call Campus Protection Services on <strong>021 650 2222</strong> or the
            UCT Student Careline on <strong>0800 24 25 26</strong> now.
          </div>
        )}
        {concern && (
          <>
            <label className="fld">
              <span>What happened?</span>
              <textarea rows={3} value={concernText} onChange={(e) => setConcernText(e.target.value)} />
            </label>
            <button className="btn btn-primary" type="submit" disabled={!concernText.trim()}>
              Send to the programme office
            </button>
          </>
        )}
      </form>
      {pulses?.length > 0 && (
        <p className="muted" style={{ fontSize: 12.5 }}>
          You’ve sent {pulses.length} check-in{pulses.length === 1 ? '' : 's'} — last one {fmtAgo(pulses.at(-1).at)}.
        </p>
      )}
    </>
  );
}

function ProfileTab({ ctx }) {
  const { id, token, mentor, act } = ctx;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    role: mentor.role ?? '',
    organisation: mentor.organisation ?? '',
    location: mentor.location ?? '',
    bio: mentor.bio ?? '',
    maxMentees: maxMentees(mentor),
    supportIndustries: mentor.supportIndustries ?? [],
    supportFaculties: mentor.supportFaculties ?? [],
    skillsToMentor: mentor.skillsToMentor ?? [],
    supportStages: mentor.supportStages ?? [],
  });
  const set = (p) => setForm((f) => ({ ...f, ...p }));
  async function save(e) {
    e.preventDefault();
    if (await act(() => api.updateMentorProfile(id, token, form), 'Profile updated')) setEditing(false);
  }
  return (
    <>
      <Head
        title="My profile"
        sub="This is how students see you. Your email and phone stay private until a student agrees to the match."
        right={
          !editing && (
            <button className="btn btn-outline" onClick={() => setEditing(true)}>
              Edit
            </button>
          )
        }
      />
      <div className="ms-two">
        <div>
          <MentorProfileCard mentor={{ ...mentor, ...form }} />
        </div>
        {editing ? (
          <form className="ms-box" onSubmit={save}>
            <div className="fld-row">
              <label className="fld">
                <span>Current role</span>
                <input value={form.role} onChange={(e) => set({ role: e.target.value })} />
              </label>
              <label className="fld">
                <span>Organisation</span>
                <input value={form.organisation} onChange={(e) => set({ organisation: e.target.value })} />
              </label>
            </div>
            <label className="fld">
              <span>Location</span>
              <input value={form.location} onChange={(e) => set({ location: e.target.value })} />
            </label>
            <label className="fld">
              <span>Bio</span>
              <textarea rows={4} value={form.bio} onChange={(e) => set({ bio: e.target.value })} />
            </label>
            <Field label="Career / industry interests">
              <ChipSelect options={INDUSTRIES} value={form.supportIndustries} onChange={(v) => set({ supportIndustries: v })} />
            </Field>
            <Field label="Faculties">
              <ChipSelect options={FACULTIES} value={form.supportFaculties} onChange={(v) => set({ supportFaculties: v })} />
            </Field>
            <Field label="Skills you mentor in">
              <ChipSelect options={SKILLS} value={form.skillsToMentor} onChange={(v) => set({ skillsToMentor: v })} />
            </Field>
            <Field label="Academic stage">
              <ChipSelect options={STAGES} value={form.supportStages} onChange={(v) => set({ supportStages: v })} />
            </Field>
            <div className="ms-field-label">Maximum mentees</div>
            <div className="ms-stepper" style={{ marginBottom: 14 }}>
              <button type="button" onClick={() => set({ maxMentees: Math.max(1, form.maxMentees - 1) })}>
                −
              </button>
              <strong>{form.maxMentees}</strong>
              <button type="button" onClick={() => set({ maxMentees: Math.min(6, form.maxMentees + 1) })}>
                +
              </button>
            </div>
            <div className="ms-card-actions">
              <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" type="submit">
                Save
              </button>
            </div>
          </form>
        ) : (
          <section className="ms-box">
            <h3>Who you support</h3>
            <dl className="ms-dl">
              <dt>Career interests</dt>
              <dd>{(mentor.supportIndustries ?? []).join(', ')}</dd>
              <dt>Faculties</dt>
              <dd>{(mentor.supportFaculties ?? []).join(', ')}</dd>
              <dt>Skills</dt>
              <dd>{(mentor.skillsToMentor ?? []).join(', ')}</dd>
              <dt>Academic stage</dt>
              <dd>{(mentor.supportStages ?? []).join(', ')}</dd>
              <dt>Maximum mentees</dt>
              <dd>{maxMentees(mentor)}</dd>
            </dl>
            <p className="muted" style={{ fontSize: 12.5 }}>
              Changing these updates your potential matches straight away.
            </p>
          </section>
        )}
      </div>
    </>
  );
}
