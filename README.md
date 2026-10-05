# UCT Exit Pathways — EdOS × Careers Service

Two products that talk to each other, built around the four **exit pathways**
a graduating student can take: **further study**, **employment**, **start-up &
self-discovery**, and the outcome we're working to prevent, **unemployment**.

- **EdOS** (UCT student edition): the student's learning platform. Students plan
  their exit pathway, see opportunities checked against their own marks, apply,
  get support from the Careers Service, and work with an alumni mentor, all
  without leaving EdOS. Graduates keep access and report where they landed.
- **Careers Service platform**: run by UCT Careers. Publishes jobs, UCT and
  external programmes, bursaries, scholarships, volunteering and start-up
  support into EdOS; spots students at risk of unemployment and reaches them;
  runs the alumni mentorship programme; tracks graduate destinations.

They share **no database**. Every fact that crosses between them is an event in
a documented contract. See **[docs/INTEGRATION.md](docs/INTEGRATION.md)**.

> Prototype, browser-only, **no backend**. All people, organisations and
> opportunities are synthetic samples.

## Run it

```bash
npm install
npm run dev          # http://localhost:3300
```

| URL | What |
|---|---|
| `/` | **Showcase**: EdOS and Careers side by side with the live integration bus and a guided walkthrough |
| `/edos/` | EdOS. Use the demo bar to switch student (or `#/?as=STUDENTNUMBER`) |
| `/careers/` | Careers Service console. Any email, password `careers` |
| `/careers/#/join` | Alumni mentor sign-up |
| `/careers/#/alumni/alm-demo-1?t=demo-a1` | A mentor's private dashboard |

"Reset demo" (on any page) clears both systems and the bus back to the seed.

## The full circle (try it)

1. **EdOS** as Nomvula (no plan yet) → Exit pathways → choose Employment → Save.
   **Careers**: cohort chart updates; her unemployment risk drops.
2. **Careers** → Opportunities → Publish to EdOS. **EdOS**: it appears in
   *For you*, with "You meet the 60% average" or what's missing.
3. **EdOS** → Apply through EdOS. **Careers**: the Applied count ticks up.
4. **Careers** → Unemployment risk → Reach out to Yusuf. **EdOS** as Yusuf:
   the support is on his home page → Book it. **Careers** sees *booked*.
5. **EdOS** as Zinhle → accept Ayesha's mentor offer, send a message.
   **Careers** (Ayesha's dashboard) → reply, tick a milestone. Zinhle sees both.
6. **EdOS** as Fatima (class of 2025) → Where are you now? → Employed.
   **Careers** → Graduate destinations updates.

## Layout

```
apps/
  index.html, showcase/   integration showcase
  edos/                   EdOS UCT edition (EdOS design system: brand.css)
  careers/                Careers Service (console, mentor sign-up, mentor dashboard)
packages/bridge/
  contract.js             the event contract (types, owner system, payloads)
  bus.js                  prototype transport — swap for webhooks in production
  project.js              reference reducer: events → read model
  vocab.js                shared vocabulary (pathways, opportunity kinds, …)
  describe.js             human-readable event sentences
  demo/                   synthetic roster, alumni, opportunities, seed history
docs/INTEGRATION.md       ownership, contract, production transport, POPIA
```

Stack: Vite 5 + React 18, no backend. One Vite server serves all three pages
from a single origin so the in-browser bus can connect them.
