/**
 * Alumni mentor sign-up — the public link alumni click to join (#/join).
 *
 * Follows the Alumni office's brief step by step: welcome & purpose → profile →
 * who you can support → mentoring preferences → boundaries & expectations →
 * review (a preview of the profile exactly as students will see it) → submit.
 * After approval the mentor lands on their private dashboard (#/alumni/:id).
 * A draft is kept in this browser so a mentor can stop and come back.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from './api.js';
import { IS_DEMO } from './api.js';
import { Icon } from './atoms.jsx';
import {
  FACULTIES,
  INDUSTRIES,
  SKILLS,
  LANGUAGES,
  STAGES,
  MENTORING_TYPES,
  MEETING_FORMATS,
  FREQUENCIES,
  PERIODS,
  EXPECTATIONS,
  CONSENTS,
} from './mentorship-model.js';
import {
  ChipSelect,
  Segmented,
  Field,
  PhotoInput,
  MentorProfileCard,
  publicLink,
} from './mentorship-ui.jsx';

const DRAFT_KEY = 'uct-mentor-join-draft';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const THIS_YEAR = new Date().getFullYear();

const BLANK = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  studentNumber: '',
  gradYear: '',
  qualification: '',
  faculty: '',
  role: '',
  organisation: '',
  industry: '',
  location: '',
  expertise: [],
  languages: ['English'],
  bio: '',
  linkedin: '',
  photo: '',
  supportIndustries: [],
  supportFaculties: [],
  skillsToMentor: [],
  supportStages: [],
  mentoringType: '',
  meetingFormat: '',
  frequency: '',
  period: '',
  maxMentees: 2,
  consents: {},
  referees: [
    { name: '', email: '' },
    { name: '', email: '' },
  ],
};

const STEPS = [
  { key: 'welcome', label: 'Welcome' },
  { key: 'profile', label: 'Your profile' },
  { key: 'support', label: 'Who you can support' },
  { key: 'prefs', label: 'Mentoring preferences' },
  { key: 'boundaries', label: 'Boundaries & expectations' },
  { key: 'review', label: 'Review & submit' },
];

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return { ...BLANK, ...JSON.parse(raw) };
  } catch {
    /* no storage */
  }
  return BLANK;
}

/** What's still missing on a step (empty = step is complete). */
function missing(step, f) {
  const out = [];
  if (step === 'profile') {
    if (!f.firstName.trim() || !f.lastName.trim()) out.push('your name');
    if (!EMAIL_RE.test(f.email.trim())) out.push('a valid email');
    const y = Number(f.gradYear);
    if (!y || y < 1950 || y > THIS_YEAR) out.push('graduation year');
    if (!f.qualification.trim()) out.push('qualification');
    if (!f.faculty) out.push('faculty');
    if (!f.role.trim() || !f.organisation.trim()) out.push('current role and organisation');
    if (!f.industry) out.push('industry');
    if (!f.location.trim()) out.push('location');
    if (!f.expertise.length) out.push('at least one area of expertise');
    if (!f.languages.length) out.push('a language');
    if (f.bio.trim().length < 30) out.push('a short bio (a sentence or two)');
  }
  if (step === 'support') {
    if (!f.supportIndustries.length) out.push('career / industry interests');
    if (!f.supportFaculties.length) out.push('faculties');
    if (!f.skillsToMentor.length) out.push('skills to mentor in');
    if (!f.supportStages.length) out.push('academic stage');
  }
  if (step === 'prefs') {
    if (!f.mentoringType) out.push('1:1 or group');
    if (!f.meetingFormat) out.push('meeting format');
    if (!f.frequency) out.push('frequency');
    if (!f.period) out.push('mentoring period');
  }
  if (step === 'boundaries') {
    if (CONSENTS.some((c) => !f.consents[c.key])) out.push('accept each agreement');
    if (f.referees.some((r) => !r.name.trim() || !EMAIL_RE.test(r.email.trim())))
      out.push('two referees (name and email)');
  }
  return out;
}

export function MentorJoinPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(loadDraft);
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {});
  }, []);
  useEffect(() => {
    if (done) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
      /* photo too big for storage, or private mode — the draft is a convenience */
    }
  }, [form, done]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, done]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const cur = STEPS[step];
  const gaps = missing(cur.key, form);
  const org = settings?.orgShort || 'UCT';

  function next() {
    if (gaps.length) return setTried(true);
    setTried(false);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setTried(false);
    setStep((s) => Math.max(s - 1, 0));
  }
  function jump(i) {
    // Only allow jumping back, or forward over steps that are already complete.
    for (let k = 0; k < i; k++) if (missing(STEPS[k].key, form).length) return setStep(k);
    setStep(i);
  }

  async function submit() {
    const firstGap = STEPS.findIndex((s) => missing(s.key, form).length);
    if (firstGap !== -1) {
      setTried(true);
      return setStep(firstGap);
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.submitMentorApplication({
        ...form,
        gradYear: Number(form.gradYear),
        maxMentees: Number(form.maxMentees),
      });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      setDone(res);
    } catch (e) {
      setError(e.message || 'Could not submit — please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const link = `/alumni/${done.id}?t=${done.token}`;
    return (
      <div className="ms-page">
        <div className="ms-done">
          <div className="ms-done-icon">
            <Icon.Check />
          </div>
          <div className="mentor-eyebrow">Application received</div>
          <h1>Thank you, {form.firstName}.</h1>
          <p>
            Your mentor profile is with the {org} Alumni office. Here’s what happens next:
          </p>
          <ol className="ms-next">
            <li>
              <strong>Review</strong> — we contact your two referees and check your profile (about
              three working days).
            </li>
            <li>
              <strong>Training</strong> — a short self-paced course (45–60 min) and a live
              orientation session.
            </li>
            <li>
              <strong>Your dashboard</strong> — once approved, you’ll get a private link to your
              dashboard to see students who match your profile.
            </li>
          </ol>
          <div className="ms-link-box">
            <div className="ms-mini-label">Your private dashboard link — keep it safe</div>
            <code>{publicLink(link)}</code>
          </div>
          <div className="ms-done-actions">
            <button className="btn btn-primary" onClick={() => navigate(link)}>
              Open my dashboard
            </button>
            {IS_DEMO && (
              <button
                className="btn btn-outline"
                onClick={async () => {
                  await api.reviewMentor(done.id, 'approved');
                  navigate(link);
                }}
              >
                Demo: approve me now
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ms-page">
      <header className="ms-top">
        <span className="login-mark">{org}</span>
        <div>
          <div className="ms-top-title">Alumni Mentorship Programme</div>
          <div className="ms-top-sub">Become a mentor</div>
        </div>
      </header>

      <div className="ms-join">
        <nav className="ms-rail" aria-label="Steps">
          {STEPS.map((s, i) => {
            const complete = i < step && !missing(s.key, form).length;
            return (
              <button
                key={s.key}
                className={`ms-rail-step ${i === step ? 'on' : ''} ${complete ? 'done' : ''}`}
                onClick={() => jump(i)}
              >
                <span className="ms-rail-n">{complete ? <Icon.Check /> : i + 1}</span>
                <span className="ms-rail-label">{s.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="ms-panel">
          <div className="ms-progress">
            <span style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
          </div>
          <div className="ms-step-count">
            Step {step + 1} of {STEPS.length}
          </div>

          {cur.key === 'welcome' && <WelcomeStep org={org} />}
          {cur.key === 'profile' && <ProfileStep form={form} set={set} />}
          {cur.key === 'support' && <SupportStep form={form} set={set} />}
          {cur.key === 'prefs' && <PrefsStep form={form} set={set} />}
          {cur.key === 'boundaries' && <BoundariesStep form={form} set={set} />}
          {cur.key === 'review' && <ReviewStep form={form} onEdit={setStep} />}

          {tried && gaps.length > 0 && (
            <div className="form-error" role="alert">
              Still needed: {gaps.join(', ')}.
            </div>
          )}
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <div className="ms-actions">
            {step > 0 ? (
              <button className="btn btn-outline" onClick={back}>
                Back
              </button>
            ) : (
              <span />
            )}
            {cur.key === 'review' ? (
              <button className="btn btn-primary" onClick={submit} disabled={busy}>
                {busy ? 'Submitting…' : 'Submit my application'}
              </button>
            ) : (
              <button className="btn btn-primary" onClick={next}>
                {step === 0 ? 'Get started' : 'Continue'}
                <Icon.Arrow />
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function WelcomeStep({ org }) {
  return (
    <div className="ms-welcome">
      <h1>Help a {org} student take their next step.</h1>
      <p className="ms-lead">
        The Alumni Mentorship Programme pairs alumni with penultimate- and final-year students
        across every faculty. You share what you’ve learned since graduating — about careers, job
        readiness and the working world — and help a student turn their degree into a plan.
      </p>
      <div className="ms-welcome-grid">
        <div>
          <strong>Who you’ll mentor</strong>
          <span>Students in their last two years, Honours, or career-changing Masters.</span>
        </div>
        <div>
          <strong>What it takes</strong>
          <span>About 1–2 hours a month, online or in person, for 6 or 12 months.</span>
        </div>
        <div>
          <strong>How matching works</strong>
          <span>You only see students who fit your profile. Both of you agree before it starts.</span>
        </div>
        <div>
          <strong>Your support</strong>
          <span>Short training, guides, and a programme office on hand if anything comes up.</span>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 13 }}>
        Signing up takes about 10 minutes. Your progress is saved in this browser, so you can stop
        and come back.
      </p>
    </div>
  );
}

function ProfileStep({ form, set }) {
  return (
    <div>
      <h2 className="ms-h2">Create your mentor profile</h2>
      <p className="ms-sub">This is what students will see when they’re matched with you.</p>
      <PhotoInput
        value={form.photo}
        name={`${form.firstName} ${form.lastName}`}
        onChange={(photo) => set({ photo })}
      />
      <div className="fld-row">
        <label className="fld">
          <span>First name *</span>
          <input value={form.firstName} onChange={(e) => set({ firstName: e.target.value })} />
        </label>
        <label className="fld">
          <span>Last name *</span>
          <input value={form.lastName} onChange={(e) => set({ lastName: e.target.value })} />
        </label>
      </div>
      <div className="fld-row">
        <label className="fld">
          <span>Email *</span>
          <input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
        </label>
        <label className="fld">
          <span>Phone (optional)</span>
          <input value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
        </label>
      </div>
      <div className="fld-row">
        <label className="fld">
          <span>Graduation year *</span>
          <input
            type="number"
            inputMode="numeric"
            min="1950"
            max={THIS_YEAR}
            value={form.gradYear}
            onChange={(e) => set({ gradYear: e.target.value })}
            placeholder="e.g. 2014"
          />
        </label>
        <label className="fld">
          <span>Qualification *</span>
          <input
            value={form.qualification}
            onChange={(e) => set({ qualification: e.target.value })}
            placeholder="e.g. BCom (Hons) Finance"
          />
        </label>
      </div>
      <div className="fld-row">
        <label className="fld">
          <span>Faculty *</span>
          <select value={form.faculty} onChange={(e) => set({ faculty: e.target.value })}>
            <option value="">Choose…</option>
            {FACULTIES.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="fld">
          <span>UCT student / ID number (optional)</span>
          <input
            value={form.studentNumber}
            onChange={(e) => set({ studentNumber: e.target.value })}
            placeholder="Helps us verify you’re an alumnus"
          />
        </label>
      </div>
      <div className="fld-row">
        <label className="fld">
          <span>Current role *</span>
          <input value={form.role} onChange={(e) => set({ role: e.target.value })} placeholder="e.g. Senior Associate" />
        </label>
        <label className="fld">
          <span>Organisation *</span>
          <input value={form.organisation} onChange={(e) => set({ organisation: e.target.value })} />
        </label>
      </div>
      <div className="fld-row">
        <label className="fld">
          <span>Industry *</span>
          <select value={form.industry} onChange={(e) => set({ industry: e.target.value })}>
            <option value="">Choose…</option>
            {INDUSTRIES.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="fld">
          <span>Location *</span>
          <input value={form.location} onChange={(e) => set({ location: e.target.value })} placeholder="City, or ‘online’" />
        </label>
      </div>
      <Field label="Areas of expertise" required hint="Pick the things you know best.">
        <ChipSelect options={SKILLS} value={form.expertise} onChange={(expertise) => set({ expertise })} />
      </Field>
      <Field label="Languages you can mentor in" required>
        <ChipSelect options={LANGUAGES} value={form.languages} onChange={(languages) => set({ languages })} />
      </Field>
      <label className="fld">
        <span>Short bio *</span>
        <textarea
          rows={4}
          value={form.bio}
          maxLength={600}
          onChange={(e) => set({ bio: e.target.value })}
          placeholder="Your path since UCT, and what you’d love to help a student with."
        />
        <small className="ms-count">{form.bio.length}/600</small>
      </label>
      <label className="fld">
        <span>LinkedIn profile (optional)</span>
        <input
          value={form.linkedin}
          onChange={(e) => set({ linkedin: e.target.value })}
          placeholder="https://www.linkedin.com/in/…"
        />
      </label>
    </div>
  );
}

function SupportStep({ form, set }) {
  return (
    <div>
      <h2 className="ms-h2">Tell us who you can support</h2>
      <p className="ms-sub">
        We use this to show you only the students who fit. You can change it later.
      </p>
      <Field label="Career / industry interests" required hint="Students interested in these fields will be matched to you.">
        <ChipSelect
          options={INDUSTRIES}
          value={form.supportIndustries}
          onChange={(supportIndustries) => set({ supportIndustries })}
        />
      </Field>
      <Field label="Qualification / faculty" required hint="Students from which faculties?">
        <ChipSelect
          options={FACULTIES}
          value={form.supportFaculties}
          onChange={(supportFaculties) => set({ supportFaculties })}
        />
      </Field>
      <Field label="Skills you can mentor in" required>
        <ChipSelect
          options={SKILLS}
          value={form.skillsToMentor}
          onChange={(skillsToMentor) => set({ skillsToMentor })}
        />
      </Field>
      <Field label="Academic stage of mentee" required>
        <ChipSelect
          options={STAGES}
          value={form.supportStages}
          onChange={(supportStages) => set({ supportStages })}
        />
      </Field>
    </div>
  );
}

function PrefsStep({ form, set }) {
  return (
    <div>
      <h2 className="ms-h2">Define your mentoring preferences</h2>
      <p className="ms-sub">This shapes who you’re matched with and what students can expect.</p>
      <Field label="How would you like to mentor?" required>
        <Segmented options={MENTORING_TYPES} value={form.mentoringType} onChange={(mentoringType) => set({ mentoringType })} />
      </Field>
      <Field label="Preferred meeting format" required>
        <Segmented options={MEETING_FORMATS} value={form.meetingFormat} onChange={(meetingFormat) => set({ meetingFormat })} />
      </Field>
      <Field label="How often can you meet?" required>
        <Segmented options={FREQUENCIES} value={form.frequency} onChange={(frequency) => set({ frequency })} />
      </Field>
      <Field label="Preferred mentoring period" required>
        <Segmented options={PERIODS} value={form.period} onChange={(period) => set({ period })} />
      </Field>
      <Field label="Maximum number of mentees" hint="You’ll never be offered more than this at once.">
        <div className="ms-stepper">
          <button type="button" onClick={() => set({ maxMentees: Math.max(1, form.maxMentees - 1) })} aria-label="Fewer">
            −
          </button>
          <strong>{form.maxMentees}</strong>
          <button type="button" onClick={() => set({ maxMentees: Math.min(6, form.maxMentees + 1) })} aria-label="More">
            +
          </button>
        </div>
      </Field>
    </div>
  );
}

function BoundariesStep({ form, set }) {
  const setRef = (i, patch) =>
    set({ referees: form.referees.map((r, k) => (k === i ? { ...r, ...patch } : r)) });
  return (
    <div>
      <h2 className="ms-h2">Boundaries &amp; expectations</h2>
      <p className="ms-sub">
        Mentoring works best when everyone knows where the lines are. Please read and accept.
      </p>
      <ul className="ms-expect">
        {EXPECTATIONS.map((e) => (
          <li key={e}>
            <Icon.Shield />
            <span>{e}</span>
          </li>
        ))}
      </ul>
      <div className="ms-consents">
        {CONSENTS.map((c) => (
          <label key={c.key} className="ms-consent">
            <input
              type="checkbox"
              checked={!!form.consents[c.key]}
              onChange={(e) => set({ consents: { ...form.consents, [c.key]: e.target.checked } })}
            />
            <span>{c.label}</span>
          </label>
        ))}
      </div>
      <Field label="Two referees" required hint="Someone who knows you professionally. We send them a short reference form.">
        {form.referees.map((r, i) => (
          <div className="fld-row" key={i}>
            <label className="fld">
              <span>Referee {i + 1} name</span>
              <input value={r.name} onChange={(e) => setRef(i, { name: e.target.value })} />
            </label>
            <label className="fld">
              <span>Referee {i + 1} email</span>
              <input type="email" value={r.email} onChange={(e) => setRef(i, { email: e.target.value })} />
            </label>
          </div>
        ))}
      </Field>
    </div>
  );
}

function ReviewStep({ form, onEdit }) {
  const rows = [
    ['Career interests', form.supportIndustries, 2],
    ['Faculties', form.supportFaculties, 2],
    ['Skills to mentor', form.skillsToMentor, 2],
    ['Academic stage', form.supportStages, 2],
    ['Mentoring', [form.mentoringType, form.meetingFormat, form.frequency, form.period, `Up to ${form.maxMentees} mentees`], 3],
  ];
  return (
    <div>
      <h2 className="ms-h2">Review &amp; submit</h2>
      <p className="ms-sub">This is exactly how your profile will appear to students.</p>
      <div className="ms-review">
        <div className="ms-review-preview">
          <div className="ms-mini-label">Student view</div>
          <MentorProfileCard mentor={form} />
          <button className="link-btn" onClick={() => onEdit(1)}>
            Edit profile
          </button>
        </div>
        <div className="ms-review-side">
          <div className="ms-mini-label">Used for matching (not shown to students)</div>
          {rows.map(([label, items, stepIdx]) => (
            <div className="ms-review-row" key={label}>
              <div className="ms-review-k">
                {label}
                <button className="link-btn" onClick={() => onEdit(stepIdx)}>
                  Edit
                </button>
              </div>
              <div className="ms-review-v">{items.filter(Boolean).join(' · ')}</div>
            </div>
          ))}
          <div className="ms-review-row">
            <div className="ms-review-k">Private to the programme office</div>
            <div className="ms-review-v">
              {form.email}
              {form.phone ? ` · ${form.phone}` : ''} · referees: {form.referees.map((r) => r.name).join(', ')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
