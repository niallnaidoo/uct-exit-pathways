/**
 * Programme office view of the alumni mentorship programme (inside the admin
 * app): approve mentor applications, see every student and match, pair people
 * directly, and pick up low-scoring check-ins and raised concerns.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { qk, queryClient } from './query.js';
import * as api from './api.js';
import { Icon, Pill, Btn, Card, EmptyState, Avatar } from './atoms.jsx';
import {
  MATCH_STATUS,
  MILESTONES,
  PULSE_QUESTIONS,
  matchScore,
  maxMentees,
  milestoneProgress,
} from './mentorship-model.js';
import { MentorProfileCard, publicLink, fmtAgo } from './mentorship-ui.jsx';

const inv = () => queryClient.invalidateQueries({ queryKey: qk.programme() });
const fullName = (p) => (p ? `${p.firstName} ${p.lastName}` : '—');
/** Students live in EdOS — the office opens a student's EdOS view, not a link of ours. */
const edosLink = (sn) => new URL(`../edos/${sn ? `#/?as=${sn}` : ''}`, window.location.href).href;

function copy(text, toast, what) {
  navigator.clipboard?.writeText(text).then(
    () => toast(`${what} copied.`),
    () => window.prompt('Copy this link:', text),
  );
}

export function MentorshipTab({ toast }) {
  const { data } = useQuery({
    queryKey: qk.programme(),
    queryFn: api.getProgramme,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
  const [view, setView] = useState('applications');
  if (!data) return <div className="muted">Loading…</div>;
  const { alumni, mentees, matches, pulses } = data;

  const pending = alumni.filter((a) => a.status === 'pending');
  const approved = alumni.filter((a) => a.status === 'approved');
  const active = matches.filter((m) => m.status === 'active');
  const offered = matches.filter((m) => m.status === 'offered');
  const matchedIds = new Set(active.map((m) => m.menteeId));
  const looking = mentees.filter((t) => !matchedIds.has(t.id));
  const flagged = pulses.filter((p) => p.review && !p.resolved);

  const run = async (fn, msg) => {
    try {
      await fn();
      inv();
      if (msg) toast(msg);
    } catch (e) {
      toast(e.message || 'Something went wrong.', 'err');
    }
  };

  const views = [
    { key: 'applications', label: 'Mentor applications', n: pending.length },
    { key: 'mentors', label: 'Mentors', n: approved.length },
    { key: 'students', label: 'Students', n: mentees.length },
    { key: 'matches', label: 'Matches', n: active.length + offered.length },
    { key: 'checkins', label: 'Check-ins & concerns', n: flagged.length },
  ];

  return (
    <>
      <div className="ms-admin-kpis">
        <div>
          <strong>{approved.length}</strong>
          <span>Approved mentors</span>
        </div>
        <div className={pending.length ? 'warn' : ''}>
          <strong>{pending.length}</strong>
          <span>Applications to review</span>
        </div>
        <div>
          <strong>{active.length}</strong>
          <span>Active mentorships</span>
        </div>
        <div>
          <strong>{offered.length}</strong>
          <span>Awaiting a student’s yes</span>
        </div>
        <div>
          <strong>{looking.length}</strong>
          <span>Students still looking</span>
        </div>
        <div className={flagged.length ? 'warn' : ''}>
          <strong>{flagged.length}</strong>
          <span>Need a case review</span>
        </div>
      </div>

      <Card title="How people join" sub="Alumni sign up with a link (no password — each gets a private dashboard link). Students come through EdOS.">
        <div className="ms-share">
          <div>
            <strong>Alumni mentor sign-up</strong>
            <code>{publicLink('/join')}</code>
            <Btn size="sm" onClick={() => copy(publicLink('/join'), toast, 'Mentor sign-up link')}>
              Copy
            </Btn>
            <a className="link-btn" href={publicLink('/join')} target="_blank" rel="noreferrer">
              Open ↗
            </a>
          </div>
          <div>
            <strong>Students</strong>
            <span className="muted" style={{ fontSize: 13 }}>
              Ask for a mentor inside EdOS (Mentor tab). Their academic profile comes with the request — nothing to
              re-capture.
            </span>
            <a className="link-btn" href={edosLink()} target="_blank" rel="noreferrer">
              Open EdOS ↗
            </a>
          </div>
        </div>
      </Card>

      <div className="ms-subtabs">
        {views.map((v) => (
          <button key={v.key} className={view === v.key ? 'on' : ''} onClick={() => setView(v.key)}>
            {v.label}
            {v.n ? <em>{v.n}</em> : null}
          </button>
        ))}
      </div>

      {view === 'applications' && <Applications pending={pending} run={run} />}
      {view === 'mentors' && <MentorsTable alumni={alumni} matches={matches} toast={toast} />}
      {view === 'students' && (
        <StudentsTable mentees={mentees} alumni={approved} matches={matches} run={run} toast={toast} />
      )}
      {view === 'matches' && <MatchesTable matches={matches} alumni={alumni} mentees={mentees} run={run} />}
      {view === 'checkins' && <CheckinsTable pulses={pulses} alumni={alumni} mentees={mentees} />}
    </>
  );
}

function Applications({ pending, run }) {
  if (!pending.length)
    return (
      <Card>
        <EmptyState icon={Icon.Check} title="No applications waiting" sub="New mentor sign-ups appear here for review." />
      </Card>
    );
  return (
    <div className="ms-grid">
      {pending.map((a) => (
        <MentorProfileCard
          key={a.id}
          mentor={a}
          footer={
            <div className="ms-vet">
              <div className="ms-mini-label">For the office only</div>
              <div className="ms-vet-row">
                <span>Applied</span>
                {fmtAgo(a.appliedAt)}
              </div>
              <div className="ms-vet-row">
                <span>Contact</span>
                {a.email}
                {a.phone ? ` · ${a.phone}` : ''}
              </div>
              <div className="ms-vet-row">
                <span>Referees</span>
                {(a.referees ?? []).map((r) => `${r.name} (${r.email})`).join(' · ') || '—'}
              </div>
              <div className="ms-vet-row">
                <span>Agreements</span>
                {['conduct', 'safeguarding', 'popia'].every((k) => a.consents?.[k]) ? 'Code of Conduct, Safeguarding, POPIA ✓' : 'Incomplete'}
              </div>
              <div className="ms-vet-row">
                <span>Supports</span>
                {(a.supportFaculties ?? []).join(', ')} · up to {maxMentees(a)} mentees
              </div>
              <div className="ms-card-actions">
                <button className="link-btn" onClick={() => run(() => api.reviewMentor(a.id, 'declined'), `${a.firstName}'s application declined.`)}>
                  Decline
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => run(() => api.reviewMentor(a.id, 'approved'), `${a.firstName} approved — they can now see their matches.`)}>
                  Approve mentor
                </button>
              </div>
            </div>
          }
        />
      ))}
    </div>
  );
}

function MentorsTable({ alumni, matches, toast }) {
  return (
    <Card title="Mentors" sub="Only the office sees this list. Mentors never see one another.">
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Mentor</th>
              <th>Industry</th>
              <th>Supports</th>
              <th>Mentees</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {alumni.map((a) => {
              const n = matches.filter((m) => m.mentorId === a.id && m.status === 'active').length;
              const link = publicLink(`/alumni/${a.id}?t=${a.token}`);
              return (
                <tr key={a.id}>
                  <td>
                    <div className="cell-id">
                      <Avatar name={fullName(a)} size={26} />
                      <div>
                        <strong>{fullName(a)}</strong>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {a.role} · {a.organisation}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{a.industry}</td>
                  <td style={{ fontSize: 12.5 }}>{(a.supportFaculties ?? []).join(', ')}</td>
                  <td>
                    {n}/{maxMentees(a)}
                  </td>
                  <td>
                    <Pill tone={a.status === 'approved' ? 'teal' : a.status === 'pending' ? 'gold' : 'muted'}>
                      {a.status === 'approved' ? 'Approved' : a.status === 'pending' ? 'Under review' : 'Declined'}
                    </Pill>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="link-btn" onClick={() => copy(link, toast, `${a.firstName}'s dashboard link`)}>
                      Copy link
                    </button>{' '}
                    <a className="link-btn" href={link} target="_blank" rel="noreferrer">
                      Open ↗
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function StudentsTable({ mentees, alumni, matches, run, toast }) {
  const [pairing, setPairing] = useState(null);
  const statusOf = (t) => {
    const mine = matches.filter((m) => m.menteeId === t.id);
    if (mine.some((m) => m.status === 'active')) return { label: 'Matched', tone: 'teal' };
    if (mine.some((m) => m.status === 'offered')) return { label: 'Offer waiting', tone: 'gold' };
    return { label: 'Looking', tone: 'navy' };
  };
  return (
    <>
      {pairing && (
        <PairModal mentee={pairing} alumni={alumni} matches={matches} run={run} onClose={() => setPairing(null)} />
      )}
      <Card title="Students who asked for a mentor" sub="Requests arrive from EdOS with the student’s faculty, degree, stage and average attached.">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Student</th>
                <th>Degree</th>
                <th>Stage</th>
                <th>Interests</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {mentees.map((t) => {
                const s = statusOf(t);
                return (
                  <tr key={t.id}>
                    <td>
                      <div className="cell-id">
                        <Avatar name={fullName(t)} size={26} />
                        <div>
                          <strong>{fullName(t)}</strong>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {t.studentNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{t.degree}</td>
                    <td>{t.stage}</td>
                    <td style={{ fontSize: 12.5 }}>{(t.careerInterests ?? []).join(', ')}</td>
                    <td>
                      <Pill tone={s.tone}>{s.label}</Pill>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {s.label === 'Looking' && (
                        <button className="link-btn" onClick={() => setPairing(t)}>
                          Suggest mentors
                        </button>
                      )}{' '}
                      <a className="link-btn" href={edosLink(t.studentNumber)} target="_blank" rel="noreferrer">
                        View in EdOS ↗
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

/** Algorithmic pre-match for one student; the office confirms and sends an offer. */
function PairModal({ mentee, alumni, matches, run, onClose }) {
  const ranked = useMemo(
    () =>
      alumni
        .map((a) => {
          const load = matches.filter((m) => m.mentorId === a.id && ['active', 'offered'].includes(m.status)).length;
          return { a, load, full: load >= maxMentees(a), ...matchScore(a, mentee) };
        })
        .filter((r) => r.eligible)
        .sort((x, y) => y.score - x.score)
        .slice(0, 3),
    [alumni, matches, mentee],
  );
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="modal-head">
          <div className="modal-title">Top mentors for {fullName(mentee)}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon.X />
          </button>
        </div>
        <div className="modal-body">
          <p className="muted" style={{ marginTop: 0 }}>
            Ranked on faculty, career interests, skills, stage and language. Sending an offer asks {mentee.firstName} to
            agree — they can accept or decline.
          </p>
          {ranked.length === 0 && <p>No approved mentors support this student’s stage yet.</p>}
          {ranked.map((r) => (
            <div key={r.a.id} className="ms-pair">
              <Avatar name={fullName(r.a)} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{fullName(r.a)}</strong>
                <div className="muted" style={{ fontSize: 12.5 }}>
                  {r.a.role} · {r.a.organisation} · {r.load}/{maxMentees(r.a)} mentees
                </div>
                <div className="ms-reasons">
                  {r.reasons.map((x) => (
                    <span key={x}>
                      <Icon.Check /> {x}
                    </span>
                  ))}
                </div>
              </div>
              <div className={`ms-score ${r.score >= 70 ? 'hi' : r.score >= 40 ? 'mid' : ''}`}>
                {r.score}%<span>match</span>
              </div>
              <Btn
                size="sm"
                tone="primary"
                disabled={r.full}
                onClick={async () => {
                  await run(() => api.adminOfferMatch(r.a.id, mentee.id), `Offer sent to ${mentee.firstName}.`);
                  onClose();
                }}
              >
                {r.full ? 'At capacity' : 'Offer'}
              </Btn>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MatchesTable({ matches, alumni, mentees, run }) {
  const byId = (list, id) => list.find((x) => x.id === id);
  const shown = matches.filter((m) => !['declined', 'withdrawn'].includes(m.status));
  return (
    <Card title="Matches" sub="Every mentorship, its milestone progress, and the 30-day no-fault rematch window.">
      {shown.length === 0 ? (
        <EmptyState icon={Icon.Users} title="No matches yet" />
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Student</th>
                <th>Mentor</th>
                <th>Fit</th>
                <th>Milestones</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((m) => {
                const st = MATCH_STATUS[m.status] ?? MATCH_STATUS.active;
                const days = m.startedAt ? Math.floor((Date.now() - new Date(m.startedAt)) / 86400000) : null;
                const next = MILESTONES.find((ms) => !m.milestones?.[ms.key]);
                return (
                  <tr key={m.id}>
                    <td>{fullName(byId(mentees, m.menteeId))}</td>
                    <td>{fullName(byId(alumni, m.mentorId))}</td>
                    <td>{m.score ?? '—'}%</td>
                    <td style={{ minWidth: 150 }}>
                      <div className="ms-bar">
                        <span style={{ width: `${milestoneProgress(m)}%` }} />
                      </div>
                      <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>
                        {next ? `Next: ${next.label}` : 'Complete'}
                      </div>
                    </td>
                    <td>
                      <Pill tone={st.tone}>{st.label}</Pill>
                      {m.status === 'active' && days != null && days <= 30 && (
                        <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>
                          Day {days} of 30-day window
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {m.status === 'active' && (
                        <>
                          <button
                            className="link-btn"
                            onClick={() => {
                              const reason = window.prompt('Reason for the rematch (kept for reporting):');
                              if (reason != null) run(() => api.setMatchStatus(m.id, 'rematch', reason), 'Marked for rematch.');
                            }}
                          >
                            Rematch
                          </button>{' '}
                          <button className="link-btn" onClick={() => run(() => api.setMatchStatus(m.id, 'closed'), 'Mentorship closed out.')}>
                            Close out
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

const TIER_LABEL = { L1: 'L1 · Service issue', L2: 'L2 · Conduct / boundary', L3: 'L3 · Serious / safeguarding' };

function CheckinsTable({ pulses, alumni, mentees }) {
  const who = (p) => fullName((p.by === 'mentor' ? alumni : mentees).find((x) => x.id === p.personId));
  const sorted = [...pulses].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <Card
      title="Check-ins & concerns"
      sub="Pulse surveys and raised concerns. Low scores and every concern open a case review — respond within 2 working days (L3: same day)."
    >
      {sorted.length === 0 ? (
        <EmptyState icon={Icon.Bell} title="No check-ins yet" sub="Mentors and students send a quick pulse from their dashboards." />
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>From</th>
                <th>Scores</th>
                <th>Comment</th>
                <th>Flag</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{who(p)}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {p.by === 'mentor' ? 'Mentor' : 'Student'}
                    </div>
                  </td>
                  <td style={{ fontSize: 12.5 }}>
                    {PULSE_QUESTIONS.map((q) => p.answers?.[q.key]).filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td style={{ fontSize: 12.5, maxWidth: 280 }}>{p.comment || <span className="muted">—</span>}</td>
                  <td>
                    {p.concern ? (
                      <Pill tone={p.concern === 'L3' ? 'coral' : 'gold'}>{TIER_LABEL[p.concern]}</Pill>
                    ) : p.review ? (
                      <Pill tone="gold">Low score — review</Pill>
                    ) : (
                      <Pill tone="muted">OK</Pill>
                    )}
                  </td>
                  <td style={{ fontSize: 12.5 }}>{fmtAgo(p.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
