# UCT Exit Pathways — EdOS × Careers Service

> **Try it:** **https://niallnaidoo.github.io/uct-exit-pathways/**
> Click any person on the sign-in page (every demo password is `demo`).
> **Give feedback:** [open the feedback form](https://github.com/niallnaidoo/uct-exit-pathways/issues/new?template=feedback.yml) (needs a free GitHub account), or reply to Niall's email with your notes and screenshots.
> A short **[quick guide (PDF)](docs/Exit-Pathways-Quick-Guide.pdf)** explains who to sign in as and what to try.

**No UCT graduate should leave without a plan.** This prototype supports UCT's
university-wide mentorship and careers programme around four **exit pathways**:
**further study**, **employment**, **start-up & self-discovery**, and the
outcome we're working to prevent, **unemployment**. Students can choose more
than one (e.g. a job *and* Honours).

- **EdOS** (the student's learning platform): plan exit pathways, see
  opportunities checked against your own marks, receive opportunities the Careers
  Service sends you, apply (CV, cover letter, LinkedIn — EdOS attaches the
  transcript), follow each application stage, book support, work with an alumni
  mentor, see marks, tests and an uploaded UCT transcript. Graduates report where
  they landed.
- **Careers Service platform**: the staff console (cohort pathways, students,
  EdOS engagement, opportunities and applicant pipelines, send-to-students,
  unemployment risk, alumni mentorship, graduate destinations); the **employer
  portal** (post jobs *and* bursaries, target by degree / year / average, manage
  applicants); alumni mentor sign-up and dashboards.

The two platforms share **no database** — everything that crosses between them
is a defined event. Details for developers: [docs/EDOS-INTEGRATION.md](docs/EDOS-INTEGRATION.md)
and [docs/INTEGRATION.md](docs/INTEGRATION.md).

> **Prototype.** Runs entirely in your browser — nothing you type is sent
> anywhere, and your changes are only saved in your own browser. People,
> employers and opportunities are **fictional samples**. Reading official UCT
> transcript PDFs is simulated until UCT's transcript template is available (the
> CSV template works for real). Emails, single sign-on and Office 365 are not
> connected yet.

### What to try

| Sign in as | Try |
|---|---|
| **Nomvula** (student, no plan yet) | Exit pathways → choose one or more → Save. Then Opportunities → *Sent to you*. |
| **Kagiso** (student) | Opportunities → Apply → follow it under *My applications*. Marks & tests → upload any PDF to see the transcript charts. |
| **Yusuf** (student, at risk) | Book the support the Careers Service set up. |
| **Zinhle** (student) | Alumni mentor → accept the offer → send a message. |
| **Fatima** (graduate) | Tell UCT where you are now. |
| **Thembi Nkosi** (Careers Service) | Engagement, Unemployment risk → Reach out, Opportunities → Send to students. |
| **Ubuntu Bank** (employer) | Post an opportunity (a job or a bursary), then move applicants through the stages. |
| **Naledi Khumalo** (alumni mentor) | My mentees — shared free times and marks & tests. |

**Side-by-side view** (link on the sign-in page) shows EdOS and the Careers
Service together. **Reset demo data** puts everything back to the start.

## For developers — run it locally


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
2. **Careers staff** → *Opportunities* → open it → **Send to
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
