// Phone channel — a Telnyx (or Twilio) number bridges the PSTN call into OpenAI
// SIP, and a SunnyDesk agent answers with the PHONE persona (no screen). Pattern
// proven in the production hotel deployment (Desktop/New folder/server/telephony.js).
//   POST /api/tel/openai → OpenAI's realtime.call.incoming webhook: verify the
//     standard-webhooks signature (OPENAI_WEBHOOK_SECRET — fails CLOSED without it),
//     /accept as a GREETER, then run the tool loop over a WebSocket. The greeter
//     lets the caller pick which demo hotel; a `switch_hotel` tool session.updates
//     the call into that hotel's config (this is the dynamic per-call routing).
//   POST /api/tel/twilio → TwiML <Dial><Sip> alternative for a Twilio number.
// DORMANT until OPENAI_WEBHOOK_SECRET + OPENAI_PROJECT_ID are set — a public,
// unverified accept endpoint would let anyone spend our OpenAI budget.
import { createHmac, timingSafeEqual } from "node:crypto";
import { buildInstructions } from "./instructions.js";
import { runTool, toolSchemas } from "./engine.js";
import { REALTIME_MODEL, REALTIME_VOICE } from "./realtime.js";

const OPENAI_BASE = "https://api.openai.com/v1";

// ---- TwiML for the Twilio path (pure) ----
export function twimlForOpenAiSip(projectId = process.env.OPENAI_PROJECT_ID) {
  if (!projectId) return null;
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Response><Dial answerOnBridge="true">` +
    `<Sip>sip:${projectId}@sip.api.openai.com;transport=tls</Sip>` +
    `</Dial></Response>`
  );
}

// ---- OpenAI webhook signature, standard-webhooks style (pure — testable) ----
// header holds space-separated "v1,<base64>" entries; MAC = HMAC-SHA256 over
// "<id>.<timestamp>.<rawBody>" keyed with the base64-decoded secret.
export function verifyOpenAiWebhook({ id, timestamp, signature }, rawBody, secret) {
  if (!id || !timestamp || !signature || !secret) return false;
  const key = Buffer.from(String(secret).replace(/^whsec_/, ""), "base64");
  const mac = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();
  for (const part of String(signature).split(" ")) {
    const b64 = part.startsWith("v1,") ? part.slice(3) : part;
    let candidate;
    try { candidate = Buffer.from(b64, "base64"); } catch { continue; }
    if (candidate.length === mac.length && timingSafeEqual(candidate, mac)) return true;
  }
  return false;
}

// ---- hotel registry (injected by the server so we don't import hotel data twice) ----
let HOTELS = {};
export function setPhoneHotels(map) { HOTELS = map || {}; }

// generic hospitality words that appear in many hotel names — never distinctive
// enough to route on (e.g. "hotel" is literally in "Hotel Lindenhof").
const ROUTE_STOP = new Set(["hotel", "hotels", "the", "and", "haus", "house", "inn", "resort", "room", "rooms", "please", "speak", "talk", "want", "agent", "desk", "front", "harbour", "harbor"]);

// ---- caller picks a hotel by name/agent/city/language (pure — testable) ----
export function resolveHotelChoice(said, hotels) {
  const s = String(said || "").toLowerCase();
  const list = Object.values(hotels || {});
  // most-specific distinctive token wins (longest matched token)
  let best = null, bestLen = 0;
  for (const h of list) {
    const hay = [h.name, h.agentName, h.city, h.languageName].join(" ").toLowerCase();
    for (const tok of hay.split(/[^a-z]+/)) {
      if (tok.length > 3 && !ROUTE_STOP.has(tok) && s.includes(tok) && tok.length > bestLen) { best = h; bestLen = tok.length; }
    }
  }
  if (best) return best;
  // ordinal fallback — "first/second/third" only (cardinals like "one" collide
  // inside "second one", so they're deliberately excluded)
  const ord = [/\b(first|1st)\b/, /\b(second|2nd)\b/, /\b(third|3rd)\b/];
  for (let i = 0; i < Math.min(3, list.length); i++) if (ord[i].test(s)) return list[i];
  return null;
}

// ---- the greeter persona: offers the demo hotels, then switches ----
function greeterInstructions(hotels) {
  const menu = Object.values(hotels)
    .map((h) => `- ${h.name} in ${h.city} — the agent ${h.agentName} speaks ${h.languageName}`)
    .join("\n");
  return `# Role
- You are SunnyDesk's demo phone line. This is a PHONE call — there is NO screen.
- Disclose in your first line that this is SunnyDesk's AI demo line (EU AI Act), warmly.
- Your ONLY job right now is to find out which demo hotel the caller wants, then hand them over.

# The demo hotels
${menu}

# What to do
- Greet, disclose you're an AI demo, then ask which of these hotels they'd like to speak to (name them briefly, warm and quick).
- The MOMENT the caller indicates one (by hotel name, the agent's name, the city, the language, or "the first/second/third one"), call the tool switch_hotel with their words in "choice". Do not chat further — just switch.
- If you truly can't tell which they mean, ask once more, briefly.
- Speak the caller's language if they clearly use one you can; otherwise English.
- Keep every turn to one short sentence. Never invent hotel facts — you don't have them yet; the hotel's own agent takes over after the switch.`;
}

const SWITCH_TOOL = {
  type: "function",
  name: "switch_hotel",
  description: "Hand the call over to a specific demo hotel's AI agent once the caller has chosen one.",
  parameters: {
    type: "object",
    properties: { choice: { type: "string", description: "the caller's words indicating which hotel (name, agent, city, language, or ordinal)" } },
    required: ["choice"],
  },
};

async function openaiCall(path, body) {
  const res = await fetch(`${OPENAI_BASE}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res;
}

function greeterAccept(callId, hotels) {
  return openaiCall(`/realtime/calls/${encodeURIComponent(callId)}/accept`, {
    type: "realtime",
    model: REALTIME_MODEL,
    instructions: greeterInstructions(hotels),
    tools: [SWITCH_TOOL],
    tool_choice: "auto",
    audio: {
      input: { transcription: { model: "gpt-4o-mini-transcribe" }, noise_reduction: { type: "near_field" }, turn_detection: { type: "semantic_vad", eagerness: "low" } },
      output: { voice: REALTIME_VOICE },
    },
  });
}

// ---- endpoint: OpenAI call webhook → accept as greeter + tool loop ----
export async function handleOpenAiCallWebhook(req, res, rawBody) {
  const secret = process.env.OPENAI_WEBHOOK_SECRET;
  if (!secret) { res.writeHead(503, { "content-type": "text/plain" }); return res.end("phone not configured (OPENAI_WEBHOOK_SECRET unset)"); }
  const ok = verifyOpenAiWebhook(
    { id: req.headers["webhook-id"], timestamp: req.headers["webhook-timestamp"], signature: req.headers["webhook-signature"] },
    rawBody.toString("utf8"),
    secret
  );
  if (!ok) { console.warn("[tel] openai webhook signature mismatch — rejected"); res.writeHead(400); return res.end("bad signature"); }
  let event = {};
  try { event = JSON.parse(rawBody.toString("utf8")); } catch {}
  if (event.type !== "realtime.call.incoming") { res.writeHead(200); return res.end("ignored"); }
  const callId = event?.data?.call_id;
  res.writeHead(200); res.end("accepting");
  try {
    await greeterAccept(callId, HOTELS);
    runPhoneToolLoop(callId, HOTELS);
  } catch (e) {
    console.error(`[tel] accept failed for ${callId}: ${e.message}`);
  }
}

// ---- endpoint: Twilio voice webhook → TwiML (alt carrier path) ----
export function handleTwilioVoice(req, res) {
  const twiml = twimlForOpenAiSip();
  if (!twiml) { res.writeHead(503, { "content-type": "text/plain" }); return res.end("OPENAI_PROJECT_ID not configured"); }
  res.writeHead(200, { "content-type": "text/xml; charset=utf-8" });
  res.end(twiml);
}

// The browser widget runs the tool loop over WebRTC; the phone has no browser, so
// the server holds a WebSocket to the same event stream and does the same:
// function_call → runTool → function_call_output → response.create. On the
// greeter's switch_hotel it session.updates into the chosen hotel's config.
function runPhoneToolLoop(callId, hotels) {
  const ws = new WebSocket(`wss://api.openai.com/v1/realtime?call_id=${encodeURIComponent(callId)}`, {
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
  });
  const send = (obj) => ws.readyState === 1 && ws.send(JSON.stringify(obj));
  let hotel = null; // null until the greeter switches; then this call is that hotel

  ws.onopen = () => send({ type: "response.create" }); // triggers the greeter's opening line
  ws.onmessage = async (m) => {
    let ev = {};
    try { ev = JSON.parse(m.data); } catch { return; }
    if (ev.type === "error") return console.warn(`[tel] ${callId} event error:`, ev.error?.message);
    if (ev.type !== "response.done") return;
    const calls = (ev.response?.output || []).filter((it) => it.type === "function_call");
    if (!calls.length) return;

    for (const c of calls) {
      let args = {};
      try { args = JSON.parse(c.arguments || "{}"); } catch {}

      if (c.name === "switch_hotel") {
        const chosen = resolveHotelChoice(args.choice, hotels);
        if (!chosen) {
          send({ type: "conversation.item.create", item: { type: "function_call_output", call_id: c.call_id, output: JSON.stringify({ ok: false, note: "Could not tell which hotel — ask the caller to say the hotel or city name once more." }) } });
          continue;
        }
        hotel = chosen;
        // morph the live call into the chosen hotel's agent (per-call reconfig)
        send({
          type: "session.update",
          session: {
            type: "realtime",
            instructions: buildInstructions(hotel, { channel: "phone" }),
            tools: toolSchemas(hotel),
            tool_choice: "auto",
          },
        });
        send({ type: "conversation.item.create", item: { type: "function_call_output", call_id: c.call_id, output: JSON.stringify({ ok: true, switched_to: hotel.name, note: `You are now ${hotel.agentName} at ${hotel.name}. Greet the caller warmly in ${hotel.languageName} as that hotel's front desk and help them.` }) } });
        continue;
      }

      // a hotel tool — only valid once switched
      if (!hotel) {
        send({ type: "conversation.item.create", item: { type: "function_call_output", call_id: c.call_id, output: JSON.stringify({ ok: false, error: "no hotel selected yet — call switch_hotel first" }) } });
        continue;
      }
      const out = runTool(hotel, c.name, args);
      console.log(`[tel] ${callId} ${hotel.id} ${c.name} → ${out.result?.error ? "error" : "ok"}`);
      send({ type: "conversation.item.create", item: { type: "function_call_output", call_id: c.call_id, output: JSON.stringify(out.result) } });
    }
    send({ type: "response.create" });
  };
  ws.onclose = () => console.log(`[tel] call ${callId} socket closed`);
  ws.onerror = (e) => console.warn(`[tel] call ${callId} socket error: ${e?.message || "unknown"}`);
  setTimeout(() => ws.readyState === 1 && ws.close(), 30 * 60_000).unref?.();
}
