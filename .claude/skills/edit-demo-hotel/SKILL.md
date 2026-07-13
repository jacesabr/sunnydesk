---
name: edit-demo-hotel
description: Add a new example demo hotel to the SunnyDesk site, or edit an existing one's rooms/rates/facts/language. Use when the user says "add a hotel", "add a demo for X", "change the Jaipur hotel's rooms/prices", "make a Spanish example hotel", or wants to edit anything under server/hotels/. Handles the data shape, wiring it into the server + the site card, and a smoke test.
---

# Edit / add a demo hotel

A demo "hotel" is a **pure data object** — no logic. `engine.js` (tools + availability) and
`instructions.js` (persona) read it; they don't need changes to add a hotel.

## The shape (copy an existing file)

Start from `server/hotels/amber-haveli.js` (India/Hindi), `lindenhof.js` (Germany/German), or
`driftwood.js` (Canada/English) — pick the closest and edit. Every field matters:

- `id` (kebab, unique), `name`, `city`, `country`, `currency` (ISO), `currencySymbol`.
- `primaryLanguage` (`hi`/`de`/`en` get hand-tuned persona blocks; any other code from
  `server/languages.js` uses the generic block), `languageName`, `agentName`, `timezone` (IANA).
- `phone`, `email` (keep fictional — use `example.com`), `address`, `checkin`, `checkout`.
- `greeting` — the EXACT first line the agent speaks, in the hotel's language, naming the hotel +
  agent, with a short English offer if the language isn't English.
- `vibe` — 2 English sentences (prompt scaffolding, not spoken).
- `facts` — every key present: `overview, rooms, breakfast, checkin_checkout, parking, amenities,
  policies, location, contact, family, payment` (1–3 sentences each, English, warm + factual).
- `rooms` — 3–4 rooms, each: `id, name, flavor, sizeSqm, beds, maxAdults, maxChildren, baseRate
  (integer, local currency), count (3–8), features (3–5 short items)`.
- `seasons` — 1–3 `{ from:"MM-DD", to:"MM-DD", mult, label }` (may wrap year-end); `weekendMult`
  (~1.15); `demandSeed` (small unique integer); `refPrefix` (3 uppercase letters).
- `localTips` — 6 `{ name, type, line, hours }` (type ∈ sight/food/nature/culture/market/activity).

Fictional but plausible for the real city. Rates, seasons, and tips should reflect the actual place.

## Wire it in (3 spots)

1. **Load it** in `server/server.js`: add `import myHotel from "./hotels/my-hotel.js";` and add
   `myHotel` to the `[amberHaveli, lindenhof, driftwood]` array that builds `HOTELS`.
2. **Add a card** in `index.html` inside `<div class="demo-grid">`: copy a `.dhotel` block, set the
   flag emoji, the `lang` chip, name, `.where`, blurb, `.meta`, and the button's
   `data-demo-hotel="<id>" data-hotel-name="<name>" data-agent="<agentName>"`.
3. Nothing else — `engine.js`/`instructions.js` pick it up automatically.

## Smoke test (no call minutes spent)

```bash
OPENAI_API_KEY=sk-... PORT=8799 node server/server.js &   # keys from Desktop/New folder/.env
curl -s localhost:8799/api/health                          # your id should appear in "hotels"
# rooms + a future-dated availability check + a reservation:
curl -s -X POST localhost:8799/api/demo/tool -H 'content-type: application/json' \
  -d '{"hotel":"<id>","name":"get_hotel_info","args":{"topic":"rooms"}}'
curl -s -X POST localhost:8799/api/demo/tool -H 'content-type: application/json' \
  -d '{"hotel":"<id>","name":"check_availability","args":{"check_in":"YYYY-MM-DD","check_out":"YYYY-MM-DD","adults":2,"children":0}}'
# optional: one session mint validates the persona+tools are accepted (near-zero cost, no call):
curl -s -X POST localhost:8799/api/demo/session -H 'content-type: application/json' -d '{"hotel":"<id>"}'
```

Then `node --check server/hotels/my-hotel.js`, commit, push (static site auto-deploys; the demo
backend redeploys on the same push). Don't spend real call minutes unless the user asks.

## Rules

- Keep phone/email fictional; the page and persona both state the hotels are demonstrations.
- Never add real rates as if verified — the whole demo is illustrative by design.
- Currency symbols/rate rounding: INR/JPY round to 50, others to whole/5 (see `engine.js`).
