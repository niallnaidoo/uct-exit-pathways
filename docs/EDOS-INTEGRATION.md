# Adding Exit Pathways to EdOS — step by step

The EdOS side of this prototype is built as a **module** that drops into the
EdOS repo (`Rorschach-Innovation-Services/Learning-Management-system-`,
`frontend/src`). It uses EdOS's own conventions: `/student/...` routes,
`{ label, icon, to }` sidebar entries, EdOS icon names, `brand.css` classes
(`card`, `btn`, `pill`, `nav-row`, `t-display`, `t-eyebrow`…).

```
apps/edos/src/
  pathways/            ← THE MODULE — copy this folder into EdOS
    index.jsx          routes, sidebar entries, widgets (the public surface)
    Pathways.jsx       exit pathway planner (choose one or more)
    Opportunities.jsx  opportunities, "Sent to you", apply, My applications
    Mentor.jsx         alumni mentor: request, accept, message, meet
    widgets.jsx        Home-page cards (pathway, mentor, support, for-you, destination)
    store.js           data layer — the only file with integration points
    ui.jsx, pathways.css
  host/                ← stand-in for what EdOS already has (shell, Home, Marks, Inbox)
```

## 1. Copy

| From this repo | To the EdOS repo |
|---|---|
| `apps/edos/src/pathways/` | `frontend/src/pages/student/pathways/` |
| `packages/bridge/{vocab,contract,project,describe}.js` | `frontend/src/pathways-bridge/` |

(`packages/bridge/bus.js` and `demo/` are prototype-only; don't copy them.)

## 2. Routes — `frontend/src/App.tsx`

```tsx
import { pathwayRoutes } from './pages/student/pathways';

<Route element={<RoleLayout allow={['student']} />}>
  <Route path="/student/home" element={<StudentHome />} />
  {/* … existing student routes … */}
  {pathwayRoutes}
</Route>
```

## 3. Sidebar — `frontend/src/components/Sidebar.tsx`

```tsx
import { pathwayNav } from '../pages/student/pathways';

student: [
  { label: 'Home', icon: 'home', to: '/student/home' },
  // … existing items …
  ...pathwayNav, // Exit pathways (target) · Opportunities (star) · Alumni mentor (users)
],
```

## 4. Home page — `frontend/src/pages/student/Home.tsx`

```tsx
import { PathwayCard, MentorCard, SupportFromCareers, OpportunitiesForYou, DestinationCard } from './pathways';

<PathwayCard />  <MentorCard />
<SupportFromCareers />      {/* renders nothing if Careers sent no support */}
<OpportunitiesForYou />     {/* "Sent to you" first, then best matches */}
{user.status === 'graduated' && <DestinationCard />}
```

Inbox: `usePathways().inbox` returns notifications (support, sends, application
stages, mentor messages) to merge into `StudentInbox`.

## 5. Data layer — `pathways/store.js` (two marked `INTEGRATION` spots)

| Prototype | In EdOS |
|---|---|
| `getPersona()` reads the demo session | `useAuth().user` → the student's number |
| `ROSTER` (demo academic records) | EdOS API — `GET /students/:id/assessments` already gives modules, marks and test dates |
| `publish(type, payload, 'edos')` | `api.post('/pathways/events', { type, payload })` — backend signs and forwards to Careers |
| `readLog()` + `project()` | `api.get('/pathways/feed?studentId=…')` — backend keeps the read model, updated by Careers' webhooks (`project.js` is the reference reducer) |

Everything else in the module is UI and stays as is.

## 6. What EdOS must send Careers

| When | Event |
|---|---|
| Nightly (SIS sync) | `student.synced` — incl. `nextTest` and `gradebook` summary (marks recorded / outstanding). Never module marks. |
| Student opens Opportunities | `opportunities.viewed` (max once per 10 minutes) |
| Student saves pathway / applies / answers support / accepts mentor | `pathway.declared`, `application.submitted`, `intervention.updated`, `mentorship.offer.responded` |

Full list and payloads: `packages/bridge/contract.js` and [INTEGRATION.md](INTEGRATION.md).

## 7. The Careers Service platform

`apps/careers/` deploys on its own (staff console, employer portal, alumni
mentor sign-up and dashboards). It sends EdOS: `opportunity.published`,
`opportunity.sent`, `application.updated` (employer stage changes),
`intervention.assigned`, mentorship offers/messages/meetings/milestones.
