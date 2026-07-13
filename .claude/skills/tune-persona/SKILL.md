---
name: tune-persona
description: Change how the SunnyDesk demo agent talks — its voice, warmth, language behaviour, booking flow, or any wording it says. Use when the user says "it sounds robotic", "make it warmer", "it reads prices aloud when it shouldn't", "it switched to English with a German guest", "change the greeting", "it should offer breakfast differently", or any complaint/tweak about what the agent SAYS. Almost always a prompt edit in server/instructions.js, not a code change.
---

# Tune the agent's persona

The agent's entire personality is one file: `server/instructions.js` → `buildInstructions(hotel)`.
It's structured per OpenAI's Realtime Prompting Guide. **A behaviour complaint is almost always a
wording fix here, not a code change.**

## Where each behaviour lives (sections in the returned prompt)

- **greeting / first line** → the hotel object's `greeting` field (per-hotel), referenced under
  `# Role & Objective`. Change the greeting by editing the hotel file, not this one.
- **sounds robotic / not human** → `# Speech & Delivery` (the `TEXTURE` blocks + `genericTexture`):
  affirmations, thinking pauses, a light laugh, "at most one or two touches per reply".
- **reads prices/numbers awkwardly** → `# Values (clean speech)`: the clean-speech rule and the
  money/date/phone formatting lines.
- **wrong language / switches too easily** → `# Language` (the `LANGUAGE` blocks + `genericLanguage`):
  mirror-the-guest and "switch only on a substantive utterance".
- **books too fast / doesn't confirm / invents a price** → `# Booking flow` and `# Values` ("NEVER
  invent a number; only state what a tool returned this call").
- **claims to be human / won't admit it's a demo** → `# Honesty`.
- **talks over background noise / acts on a stray "ok"** → `# Unclear audio`.

Hindi/German/English have hand-tuned `TEXTURE`/`LANGUAGE` blocks; every other language uses the
generic builders (`genericTexture(name)` / `genericLanguage(name)`) — edit those to lift quality for
all non-tuned languages at once, or add a new hand-tuned block keyed by language code.

## The fix ladder (do NOT skip to the bottom)

1. **Tool-level truth** — if the agent says something wrong about rooms/prices, first check
   `engine.js` returns the right data; a persona rule can't fix bad tool output.
2. **Prompt hardening** — tighten/clarify the relevant section's wording. Be concrete and short;
   CAPITALISE the hard rule.
3. **Hard code rail** — only if the model keeps ignoring the prompt (rare), add a guard in
   `engine.js` (e.g. the party-size validation pattern).

## Test the change (spend no call minutes to iterate)

- **Read the built prompt** for a hotel to eyeball your edit:
  ```bash
  node -e "import('./server/instructions.js').then(async m=>{const h=(await import('./server/hotels/lindenhof.js')).default;console.log(m.buildInstructions(h))})"
  ```
- **Validate it still mints** (the realtime API accepts the config — near-zero cost, no call):
  ```bash
  OPENAI_API_KEY=sk-... node server/server.js &
  curl -s -X POST localhost:8787/api/demo/session -H 'content-type: application/json' -d '{"hotel":"hotel-lindenhof"}'
  ```
- **Only a real spoken call** truly confirms tone — do ONE, in the language you changed, and listen.
  Keep it short (the 3-min cap is your friend). Don't run many.

## Rules

- Never loosen a grounding/honesty rule to make the agent chattier — those are the trust of the whole product.
- Keep web output byte-identical for the built-in hotels unless you intend to change them (the design
  parity with production persona is deliberate).
- After a real behaviour bug is found + fixed, note it in `human_response/` so it's not re-broken.