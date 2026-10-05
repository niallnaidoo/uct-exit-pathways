# UCT Exit Pathways — EdOS × Careers Service

Two products that work as one, built around the **exit pathways** a graduating
student can take: **further study**, **employment**, **start-up &
self-discovery**, and the outcome we're working to prevent, **unemployment**.
Students can choose more than one (e.g. a job *and* Honours).

- **EdOS** (UCT student edition): students plan their exit pathways, see
  opportunities checked against their own marks, get opportunities sent to them
  by the Careers Service, apply (CV, cover letter, LinkedIn — EdOS attaches the
  transcript), follow each application stage, book support, and work with an
  alumni mentor. Graduates report where they landed.
- **Careers Service platform**: the staff console (cohort pathways, students,
  **EdOS engagement** dashboard, employment & opportunities with applicant
  pipelines, send-to-students, unemployment risk, alumni mentorship, graduate
  destinations); the **employer portal** (post jobs *and* bursaries, target by
  degree / year / average, manage applicants); alumni mentor sign-up and
  dashboards.

They share **no database** — every fact that crosses is an event in a
documented contract. EdOS integration guide: **[docs/EDOS-INTEGRATION.md](docs/EDOS-INTEGRATION.md)**.
Contract & production transport: **[docs/INTEGRATION.md](docs/INTEGRATION.md)**.

> Prototype, browser-only, **no backend**. All people, organisations and
> opportunities are synthetic samples.

## Run it

```bash
npm install
npm run dev          # http://localhost:3300
```

Open **http://localhost:3300** — one sign-in page; each person lands in their own
product. Click a demo person, or use email + password `demo`.

| Who | Lands in |
|---|---|
| Student / graduate | EdOS (`/edos/`) |
| Careers staff (`careers@uct.ac.za`) | Careers console (`/careers/`) |
| Employer (`recruit@ubuntubank.example`) | Employer portal (`/careers/#/employer`) |
| Alumni mentor (`naledi.khumalo@example.com`) | Mentor dashboard |

`/split/` shows EdOS and Careers side by side (pick who's signed into each).
"Reset demo data" is on the sign-in page.

## Walkthrough (good order for the team demo / tutorial videos)

1. **Employer** (Ubuntu Bank) → Post an opportunity → Bursary → target *BCom ·
   3rd year · 60%+* → require CV + cover letter + transcript → Publish. The
   wizard shows how many students it reaches.
2. **Careers staff** → *Employment & opportunities* → open it → **Send to
   students** (eligible students, pathway fits pre-selected).
3. **Student** (Kagiso, `mlfkag001@myuct.ac.za`) → Home shows *Sent to you* →
   Opportunities → Apply (CV, cover letter; transcript attached by EdOS).
4. **Employer** → open the bursary → move Kagiso to *Interview*. Kagiso's EdOS
   shows *Interview* and an inbox notification.
5. **Careers staff** → *EdOS engagement*: last opportunities check, days since
   mentor contact, days till next test, gradebook, interventions.
6. **Careers staff** → *Unemployment risk* → Reach out to Yusuf. **Yusuf** sees
   the support on his EdOS home → Book it.
7. **Student** (Nomvula) → Exit pathways → choose Employment + Further study →
   Save. Careers sees her plan and her risk drop.
8. **Student** (Zinhle) → Alumni mentor → accept Ayesha's offer → message.
9. **Graduate** (Fatima) → Where are you now? → Employed. Careers' destinations
   update.

## Layout

```
apps/
  index.html, login/      the one sign-in page
  split/                  side-by-side view
  edos/src/pathways/      ★ EdOS module — drops into the EdOS repo
  edos/src/host/          stand-in for the existing EdOS shell
  careers/                Careers Service: console, employer portal, mentors
packages/
  bridge/                 event contract, reference reducer, vocabulary, demo data
  demo-auth/              demo sign-in (replaced by EdOS auth / UCT SSO)
docs/
  EDOS-INTEGRATION.md     copy-paste steps for the EdOS repo
  INTEGRATION.md          ownership, events, production transport, POPIA
```
