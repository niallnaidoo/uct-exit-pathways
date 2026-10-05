# EdOS × Careers Service — integration design

Two products, one student journey. This document is the hand-over for the
development team: what each system owns, the events that connect them, and how
to replace the prototype transport with production infrastructure.

## 1. Who owns what

| | **EdOS** (learning platform) | **Careers Service platform** |
|---|---|---|
| Users | Students and graduates (UCT SSO) | Careers staff (SSO); alumni mentors (private token links) |
| System of record for | The student: identity, modules, marks, credits, graduation; their **choices** (exit pathway, applications, mentor request, destination) | **Opportunities** (jobs, programmes, bursaries, scholarships, volunteering, start-up support); **support** (interventions); **alumni mentors** and matching |
| Never stores | Mentor contact details, referees, pulse surveys | Module-level marks (only the average + credits are shared) |

There is **no shared database**. Each system keeps its own read model, built
from the events below.

## 2. The four exit pathways

`study` (further study) · `employment` · `venture` (start-up & self-discovery /
planned gap) · `unsure`. A graduate's outcome adds `seeking` — unemployment,
the outcome the programme exists to reduce. Vocabulary lives in
`packages/bridge/vocab.js` and is shared by both systems.

## 3. The event contract

Source of truth: `packages/bridge/contract.js`. Every event has the envelope:

```json
{ "seq": 101, "id": "evt-101-…", "type": "pathway.declared", "from": "edos",
  "at": "2026-10-05T09:36:23.784Z", "payload": { … } }
```

**EdOS → Careers**

| Event | Payload | Careers uses it to… |
|---|---|---|
| `student.synced` | studentNumber, names, email, faculty, degree, yearOfStudy, stage, expectedGraduation, average, credits, status, nextTest, gradebook{recorded,due,total} | Know the cohort without re-capturing anyone; engagement dashboard |
| `opportunities.viewed` | studentNumber | "Last checked opportunities" on the engagement dashboard |
| `pathway.declared` | pathways[] (one or more), readiness{}, interests[], note | Track the pathway mix; score unemployment risk |
| `opportunity.saved` | opportunityId, saved | Measure interest |
| `application.submitted` | applicationId, opportunityId, attachments{cv, coverLetter, transcript}, answers{linkedin} | Applicant appears in the employer's pipeline |
| `mentorship.requested` | interests, skills, goals, languages, format, availability["Tue-evening", …] | Create a mentee for matching; free times are matched against mentors' |
| `mentorship.offer.responded` | matchId, accept | Activate the match (nothing starts until the student agrees) |
| `mentorship.academics.shared` | matchId, shared, modules[{code, name, mark, assessments[{label, date, weight, mark}]}] | With consent (on accepting), the student's marks & tests go to **that mentor only** — shown on the mentor's mentee card; never in the Careers office views |
| `intervention.updated` | interventionId, status booked/done/declined | Close the loop on support |
| `destination.reported` | destination, detail, organisation | Graduate destinations; flag graduates still seeking work |

**Careers → EdOS**

| Event | Payload | EdOS uses it to… |
|---|---|---|
| `opportunity.published` / `opportunity.closed` | full opportunity incl. faculties, degrees (e.g. BCom), years, minAverage, requirements, employerId | Show it to eligible students — EdOS checks eligibility against the live record |
| `opportunity.sent` | opportunityId, studentNumbers[], message | "Sent to you" in the student's EdOS |
| `intervention.assigned` | type, title, message, dueDate | Put a support task on the student's home page |
| `mentorship.offer.made` | matchId, mentor **public** profile, score | Let the student accept or decline |
| `mentorship.match.updated` / `mentorship.milestone.updated` | status / milestone key | Keep the student's mentorship view current |

**Both directions:** `application.updated` (employer/Careers move the stage —
shortlisted, interview, offer; the student accepts or withdraws),
`mentorship.message.sent`, `mentorship.meeting.scheduled`.

The bus refuses an event from the wrong system (`publish` checks `from` against
the contract), as the production integration service should.

## 4. Prototype transport vs production

| | Prototype (this repo) | Production |
|---|---|---|
| Publish | `bus.publish()` appends to a localStorage log | `POST /events` to an integration service (or SNS/EventBridge), which validates against the contract and signs |
| Deliver | BroadcastChannel + `storage` events (same origin) | HTTPS webhooks to each subscriber (HMAC-signed, retried, idempotent on `id`) |
| Read model | `project()` replays the log on load | Each system persists its own tables, updated by its webhook handler — `packages/bridge/project.js` is the reference reducer |
| Seed | `packages/bridge/demo/*` (synthetic) | EdOS: student information system sync; Careers: its own DB |

Suggested production rules: at-least-once delivery, consumers dedupe on `id`,
order by `seq` per student, dead-letter queue + replay, POPIA audit log of every
event that carries personal data, 24-month retention then anonymise.

## 5. Data protection (POPIA)

- Data minimisation: Careers receives average + credits, never module marks.
- Mentors see a student's first name + initial, degree and interests until the
  student accepts; students see a mentor's public profile only (no contact
  details are in any event).
- Graduates opt in to destination reporting through EdOS.
- UCT remains the data owner; both systems are processors on its instruction.

## 6. Where things live

```
packages/bridge/   contract.js · bus.js · project.js · vocab.js · describe.js · demo/
apps/edos/src/pathways/   EdOS module (see EDOS-INTEGRATION.md)
apps/careers/      Careers console, employer portal, alumni mentor sign-up + dashboard
apps/login/        shared sign-in · apps/split/ side-by-side view
```
