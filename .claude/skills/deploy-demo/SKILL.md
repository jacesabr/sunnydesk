---
name: deploy-demo
description: Deploy or redeploy the SunnyDesk demo, and verify it's healthy. Use when the user says "deploy", "push it live", "ship the demo", "redeploy", "is the demo up?", "set the env vars on Render", or after any change to server/ or index.html that needs to go live. Covers the static site + the sunnydesk-demo backend web service on Render, the env vars, and the health check.
---

# Deploy + verify the SunnyDesk demo

Two Render services, same GitHub repo `jacesabr/sunnydesk` (branch `main`, auto-deploy on push):

- **`sunnydesk`** — static site (the marketing page + demo UI). Publish path `.`.
- **`sunnydesk-demo`** — Node web service, start `node server/server.js`, holds the keys. This is what
  the frontend calls at `https://sunnydesk-demo.onrender.com`.

Render account = **jace's workspace** (`tea-d7tkhilckfvc73erc1rg`). The API key is in the user's global
`~/.claude/CLAUDE.md` under "Render — jace's workspace" — read it from there, never hardcode it here.
Auth header: `Authorization: Bearer <key>`.

## Normal deploy (code change)

1. `node --check` every changed `server/*.js` / `demo/*.js`; if `server/` changed, boot locally and hit
   `/api/health` + a `/api/demo/tool` call (see the `deploy-demo`/`edit-demo-hotel` test snippets).
2. Commit + push to `main` (branch first if on a protected setup). Both services redeploy on the push.
3. Verify (poll the API, never ask the user to read a dashboard):
   ```bash
   K=$RENDER_API_KEY   # jace's workspace key — from ~/.claude/CLAUDE.md, never hardcode
   # latest deploy status for the backend:
   curl -s -H "Authorization: Bearer $K" "https://api.render.com/v1/services/<sunnydesk-demo-id>/deploys?limit=1"
   # then the live health check:
   curl -s https://sunnydesk-demo.onrender.com/api/health
   ```
   `/api/health` must show `"openai":true` (and `"firecrawl":true` for the builder).

## First-time setup (if sunnydesk-demo doesn't exist yet)

- List services to get IDs: `curl -s -H "Authorization: Bearer $K" "https://api.render.com/v1/services?limit=50"`.
- Create a **web service** from repo `jacesabr/sunnydesk`, branch `main`, runtime Node,
  build `` (none), start `node server/server.js`, plan `free` (or `starter` to kill cold starts).
- Set env vars (POST to `/v1/services/<id>/env-vars` or the create payload):
  - `OPENAI_API_KEY` (required) — from `Desktop/New folder/.env`.
  - `FIRECRAWL_API_KEY` (for the builder) — from `Desktop/New folder/.env`.
  - optional: `OPENAI_REALTIME_VOICE`, `OPENAI_REALTIME_MODEL`, `DEMO_EXTRACT_MODEL`,
    `DEMO_DAILY_CALL_CAP`, `DEMO_DAILY_BUILD_CAP`.
- The service name must resolve to `sunnydesk-demo.onrender.com` — if Render appends a suffix, update
  the `API` constant at the top of `demo/demo-call.js` (and the CORS/`ALLOWED_ORIGINS` regex in
  `server/server.js` already allows a `-suffix`).

## Cold-start note

Free tier sleeps after inactivity. The page pre-wakes the backend when the demo section scrolls into
view, and buttons show a "waking up…" state. If cold starts hurt the demo, move `sunnydesk-demo` to the
`starter` plan (always-on, ~$7/mo).

## Rules

- Never commit `.env` (it's gitignored). Keys go into Render env vars only.
- Verify by polling the Render API + the live `/api/health` — never ask the user to paste a dashboard log.
- Global rule: never delete/archive the GitHub repo through any API; if asked, tell the user to use the GitHub UI.
