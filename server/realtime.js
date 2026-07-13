// gpt-realtime session minting — the same call mode as our production hotel
// deployment: the server mints a short-lived client secret, the browser opens
// a WebRTC call straight to OpenAI (no media through us), and mock tools run
// here via /api/demo/tool.
import { buildInstructions } from "./instructions.js";
import { toolSchemas } from "./engine.js";

export const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1";
export const REALTIME_VOICE = process.env.OPENAI_REALTIME_VOICE || "marin";

async function mint(sessionCfg) {
  return fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ session: sessionCfg }),
    signal: AbortSignal.timeout(15_000),
  });
}

/** → { value, model } | { error } — full config first, minimal fallback
    (mirrors the production mint: if OpenAI rejects an audio option after an
    API change, the demo still connects). */
export async function mintDemoSession(hotel) {
  if (!process.env.OPENAI_API_KEY) return { error: "demo not configured (no key)" };
  const instructions = buildInstructions(hotel);
  const tools = toolSchemas(hotel);
  const full = {
    type: "realtime",
    model: REALTIME_MODEL,
    instructions,
    tools,
    tool_choice: "auto",
    audio: {
      input: {
        noise_reduction: { type: "near_field" },
        transcription: { model: "gpt-4o-mini-transcribe" },
        turn_detection: { type: "semantic_vad", eagerness: "medium" },
      },
      output: { voice: REALTIME_VOICE },
    },
  };
  let res = await mint(full);
  if (!res.ok) {
    const firstErr = (await res.text()).slice(0, 300);
    const minimal = { type: "realtime", model: REALTIME_MODEL, instructions, tools, tool_choice: "auto", audio: { output: { voice: REALTIME_VOICE } } };
    res = await mint(minimal);
    if (!res.ok) return { error: `mint failed: ${firstErr} / ${(await res.text()).slice(0, 300)}` };
    console.warn(`[realtime] full session config rejected, minted minimal: ${firstErr}`);
  }
  const json = await res.json();
  return { value: json.value || json.client_secret?.value, model: REALTIME_MODEL };
}
