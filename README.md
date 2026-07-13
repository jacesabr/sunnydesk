# SunnyDesk — AI front desk for hotels

Two things live in this repo:

1. **The marketing site** — `index.html`, a single-file static page (no build step). Deployed as the
   Render static site `sunnydesk` (publish path `.`, auto-deploys on push to `main`).
2. **The live demo backend** — `server/`, a zero-dependency Node service (Node 22+) that powers the
   voice demo on the site. Deployed as the Render web service `sunnydesk-demo`.

Full walkthrough of every piece, and how to fix/upgrade it: **[design/build-guide.html](design/build-guide.html)**
(read it in a browser) / [design/build-guide.md](design/build-guide.md).

## The demo (what a visitor can do)

- **Call an AI front desk** and just talk. The voice agent (OpenAI `gpt-realtime`, voice `marin` — the
  same stack as our real hotel deployment) checks rooms, quotes rates, and takes a booking.
- **Build a demo for their own hotel** — paste a URL, pick a language, and we scrape the site and spin
  up an agent that knows their hotel in seconds.
- Three example hotels ship built-in: **The Amber Haveli** (Jaipur, Hindi), **Hotel Lindenhof**
  (Mosel, German), **Driftwood Harbour Hotel** (Vancouver, English).

Everything hotel-side is **mock** — availability and reservations are generated in memory; **no real
database or booking system is ever touched.** The page and the agent both say so.

## Run it locally

```bash
# keys live in Desktop/New folder/.env — pass them in your shell, never commit a .env:
OPENAI_API_KEY=sk-... FIRECRAWL_API_KEY=fc-... PORT=8799 node server/server.js
# open http://localhost:8799  (serves index.html + the widget same-origin)
```

- `GET /api/health` — key presence + which hotels are loaded.
- `POST /api/demo/tool {hotel, name, args}` — exercise a tool without a call (free).
- `POST /api/demo/session {hotel}` — mint a call session (near-zero cost; an actual **call** spends
  realtime minutes, so test those sparingly).
- `POST /api/demo/build {url, language, agentName}` — build a custom hotel from a URL.

## The scraper (self-serve builder)

A layered chain so no single provider is a point of failure (see the build guide for detail):
**Firecrawl** (primary, 5-key pool, multi-page) → **Apify** (independent backup, needs a funded token)
→ **plain fetch** (always-available floor) → **OpenAI** structured extraction. Never uses Anthropic.

## Deploy

Push to `main` — both Render services redeploy. The backend (`sunnydesk-demo`) needs `OPENAI_API_KEY`
(required) and `FIRECRAWL_API_KEY` (for the builder) in its Render env. See
[.claude/skills/deploy-demo](.claude/skills/deploy-demo/SKILL.md).

## The WhatsApp number

Set in the CONFIG block at the top of the `<script>` in `index.html`:

```js
const WHATSAPP_NUMBER = "917973744625";
```

International format, digits only. It powers every green button, the floating bubble, and the contact
form (which opens WhatsApp with the visitor's answers pre-filled — no backend, nothing stored).

## Content honesty notes

- Demo hotels are labelled fictional; availability and rates are illustrative.
- The hero call animation is a scripted "Illustrative conversation"; the demo section below is the real,
  live voice agent.
- The agent may only state numbers a tool returned in that call (grounding) — the same rule that runs in
  production; here the tools return mock data.
- No invented metrics, logos, or testimonials.

## Repeated-work skills (`.claude/skills/`)

- **edit-demo-hotel** — add/edit an example hotel.
- **tune-persona** — change how the agent sounds (it's a prompt file, `server/instructions.js`).
- **deploy-demo** — deploy + verify the demo.
