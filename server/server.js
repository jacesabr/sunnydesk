// SunnyDesk demo backend — zero-dependency Node HTTP server (Node 22+).
//   GET  /                  → the site (index.html)
//   GET  /demo/demo-call.js → the demo call widget
//   POST /api/demo/session  → { hotel } → short-lived client secret for the WebRTC call
//   POST /api/demo/tool     → { hotel, name, args } → mock tool result + ui cards
//   GET  /api/health        → key presence + hotels loaded (also the free-tier pre-wake ping)
// Everything hotel-side is mock and in-memory — no real database or system is touched.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { runTool } from "./engine.js";
import { mintDemoSession, REALTIME_MODEL, REALTIME_VOICE } from "./realtime.js";
import { buildHotelFromUrl, VOICES } from "./scrape.js";
import { LANGUAGES } from "./languages.js";
import { handleOpenAiCallWebhook, handleTwilioVoice, setPhoneHotels } from "./telephony.js";
import amberHaveli from "./hotels/amber-haveli.js";
import lindenhof from "./hotels/lindenhof.js";
import driftwood from "./hotels/driftwood.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---- .env loader (local dev; Render injects real env vars) ----
try {
  const env = await readFile(join(ROOT, ".env"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch { /* no .env — fine on Render */ }

const HOTELS = Object.fromEntries([amberHaveli, lindenhof, driftwood].map((h) => [h.id, h]));
setPhoneHotels(HOTELS); // the phone greeter offers these
const PORT = Number(process.env.PORT || 8787);

// custom hotels built from a visitor's own URL — in-memory, TTL 30 min, capped.
const CUSTOM_TTL = 30 * 60_000;
const CUSTOM_MAX = 200;
const custom = new Map(); // demoId → { hotel, created }
function pruneCustom() {
  const now = Date.now();
  for (const [id, v] of custom) if (now - v.created > CUSTOM_TTL) custom.delete(id);
  while (custom.size > CUSTOM_MAX) custom.delete(custom.keys().next().value);
}
function resolveHotel(id) {
  if (HOTELS[id]) return HOTELS[id];
  const c = custom.get(id);
  if (c && Date.now() - c.created <= CUSTOM_TTL) return c.hotel;
  return null;
}

const ALLOWED_ORIGINS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/sunnydesk(-[a-z0-9]+)?\.onrender\.com$/,
  /^https:\/\/sunnydesk-demo(-[a-z0-9]+)?\.onrender\.com$/,
];

// ---- naive in-memory rate limits (public endpoint on our OpenAI bill) ----
const hits = new Map(); // key → [timestamps]
function allow(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(key, arr); return false; }
  arr.push(now);
  hits.set(key, arr);
  return true;
}
setInterval(() => { for (const [k, arr] of hits) if (!arr.length || Date.now() - arr[arr.length - 1] > 36e5) hits.delete(k); }, 6e5).unref();
let dayCount = { day: "", n: 0 };
function underDailyCap() {
  const day = new Date().toISOString().slice(0, 10);
  if (dayCount.day !== day) dayCount = { day, n: 0 };
  if (dayCount.n >= Number(process.env.DEMO_DAILY_CALL_CAP || 60)) return false;
  dayCount.n++;
  return true;
}
function ip(req) {
  // rightmost X-Forwarded-For entry = the hop added by the trusted proxy (Render);
  // harder to spoof than the client-controlled leftmost value used for rate limits.
  const xff = (req.headers["x-forwarded-for"] || "").split(",").map((s) => s.trim()).filter(Boolean);
  return xff.length ? xff[xff.length - 1] : req.socket.remoteAddress || "?";
}

// block SSRF targets for the server-side scrape (esp. the plain-fetch fallback,
// which fetches from OUR host): loopback, private ranges, link-local, metadata.
function isBlockedHost(rawUrl) {
  let h;
  try { h = new URL(rawUrl).hostname.toLowerCase().replace(/^\[|\]$/g, ""); } catch { return true; }
  if (!h.includes(".") && h !== "::1") return true; // no TLD → not a public site
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) return true;
  if (h === "metadata.google.internal" || h === "metadata") return true;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.)/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (h === "::1" || /^(fc|fd|fe80|::ffff:)/.test(h)) return true; // ipv6 loopback/ULA/link-local/mapped
  return false;
}

const MIME = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon" };

function sendJson(res, code, obj) {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

async function readBody(req, maxBytes = 64 * 1024) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw new Error("body too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function serveStatic(res, absPath) {
  try {
    const data = await readFile(absPath);
    res.writeHead(200, { "content-type": MIME[extname(absPath).toLowerCase()] || "application/octet-stream", "cache-control": "public, max-age=300" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.some((re) => re.test(origin))) {
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("access-control-allow-headers", "content-type");
    res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  }
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  try {
    // inside the try: a malformed request target or empty Host header makes
    // new URL throw — must be caught, not crash the process.
    let url;
    try { url = new URL(req.url, `http://${req.headers.host || "localhost"}`); }
    catch { res.writeHead(400); return res.end("bad request"); }
    const path = url.pathname;

    if (path === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        openai: !!process.env.OPENAI_API_KEY,
        scrapers: {
          firecrawl: !!(process.env.FIRECRAWL_API_KEY || process.env.FIRECRAWL_API_KEY_POOL),
          apify: !!(process.env.APIFY_TOKEN || process.env.APIFY_TOKEN_POOL),
          plainFetch: true,
        },
        call: `${REALTIME_MODEL} · ${REALTIME_VOICE} (WebRTC direct)`,
        phone: !!(process.env.OPENAI_WEBHOOK_SECRET && process.env.OPENAI_PROJECT_ID) ? "configured" : "dormant (set OPENAI_WEBHOOK_SECRET + OPENAI_PROJECT_ID)",
        hotels: Object.keys(HOTELS),
        customLive: custom.size,
        callsToday: dayCount.n,
      });
    }

    // ---- phone channel (dormant until OPENAI_WEBHOOK_SECRET + OPENAI_PROJECT_ID set) ----
    // the OpenAI webhook needs the RAW body for signature verification — do not JSON-parse it here.
    if (path === "/api/tel/openai" && req.method === "POST") {
      if (!allow("tel:" + ip(req), 60, 60_000)) return sendJson(res, 429, { error: "rate limited" });
      return handleOpenAiCallWebhook(req, res, await readBody(req));
    }
    if (path === "/api/tel/twilio" && req.method === "POST") {
      if (!allow("tel:" + ip(req), 60, 60_000)) return sendJson(res, 429, { error: "rate limited" });
      return handleTwilioVoice(req, res);
    }

    // list the languages + voices the builder offers
    if (path === "/api/demo/languages") return sendJson(res, 200, { languages: LANGUAGES, voices: VOICES });

    // self-serve: build a demo agent from the visitor's own hotel URL
    if (path === "/api/demo/build" && req.method === "POST") {
      if (!allow("b:" + ip(req), 3, 30 * 60_000)) return sendJson(res, 429, { error: "You've built a few demos already — take a short break, or message us on WhatsApp to go deeper." });
      if (!allow("bday:global", Number(process.env.DEMO_DAILY_BUILD_CAP || 120), 24 * 60 * 60_000))
        return sendJson(res, 503, { error: "The demo builder is busy today — message us on WhatsApp and we'll set one up with you." });
      let body = {};
      try { body = JSON.parse((await readBody(req, 4 * 1024)).toString("utf8") || "{}"); } catch { return sendJson(res, 400, { error: "invalid JSON body" }); }
      let url = String(body.url || "").trim();
      if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
      if (!/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(url)) return sendJson(res, 400, { error: "Enter your hotel's website address, e.g. yourhotel.com" });
      if (isBlockedHost(url)) return sendJson(res, 400, { error: "Enter a public hotel website address." });
      const lang = LANGUAGES.find((l) => l.code === body.language) || LANGUAGES.find((l) => l.code === "en");
      const agentName = (String(body.agentName || "").trim().slice(0, 24) || lang.defaultAgent || "Alex").replace(/[^\p{L}\s'-]/gu, "");
      const voice = VOICES.some((v) => v.id === body.voice) ? body.voice : "marin";
      console.log(`[demo] build: ${url} · ${lang.code} · ${agentName} · ${voice} (${ip(req)})`);
      let built;
      try {
        built = await buildHotelFromUrl({ url, primaryLanguage: lang.code, languageName: lang.name, agentName, voice });
      } catch (e) {
        console.error(`[demo] build failed: ${e.message}`);
        return sendJson(res, 502, { error: "We couldn't read that site just now — check the address, or message us on WhatsApp and we'll build it with you." });
      }
      pruneCustom();
      const demoId = "custom-" + randomBytes(6).toString("hex");
      built.hotel.id = demoId;
      custom.set(demoId, { hotel: built.hotel, created: Date.now() });
      return sendJson(res, 200, {
        demoId,
        source: built.source,
        hotel: { id: demoId, name: built.hotel.name, agentName: built.hotel.agentName, city: built.hotel.city, country: built.hotel.country, language: lang.name },
        rooms: built.hotel.rooms.map((r) => ({ name: r.name, from: `${built.hotel.currencySymbol}${r.baseRate.toLocaleString("en-US")}` })),
      });
    }

    if (path === "/api/demo/session" && req.method === "POST") {
      if (!allow("s:" + ip(req), 5, 30 * 60_000)) return sendJson(res, 429, { error: "That's a lot of demo calls from one place — take a short break, or message us on WhatsApp." });
      if (!underDailyCap()) return sendJson(res, 503, { error: "The demo line is busy today — message us on WhatsApp and we'll call you instead." });
      let body = {};
      try { body = JSON.parse((await readBody(req, 4 * 1024)).toString("utf8") || "{}"); } catch { /* bodyless */ }
      const hotel = resolveHotel(body.hotel);
      if (!hotel) return sendJson(res, 400, { error: "That demo has expired — build it again or pick one of our example hotels." });
      console.log(`[demo] session mint: ${hotel.id} (${ip(req)})`);
      const out = await mintDemoSession(hotel);
      if (!out.error) out.hotel = { id: hotel.id, name: hotel.name, agentName: hotel.agentName, city: hotel.city };
      return sendJson(res, out.error ? 503 : 200, out);
    }

    if (path === "/api/demo/tool" && req.method === "POST") {
      if (!allow("t:" + ip(req), 120, 60 * 60_000)) return sendJson(res, 429, { error: "rate limited" });
      let body;
      try { body = JSON.parse((await readBody(req)).toString("utf8") || "{}"); }
      catch { return sendJson(res, 400, { error: "invalid JSON body" }); }
      const hotel = resolveHotel(body.hotel);
      if (!hotel) return sendJson(res, 400, { error: "unknown or expired hotel" });
      if (!body.name) return sendJson(res, 400, { error: "tool name required" });
      console.log(`[demo] tool ${hotel.id}: ${body.name}(${JSON.stringify(body.args || {})})`);
      const out = runTool(hotel, body.name, body.args || {});
      return sendJson(res, 200, out);
    }

    // ---- static: the site itself (same-origin demo when served from here) ----
    if (path === "/" || path === "/index.html") return serveStatic(res, join(ROOT, "index.html"));
    if (path === "/demo/demo-call.js") return serveStatic(res, join(ROOT, "demo", "demo-call.js"));

    res.writeHead(404);
    res.end("not found");
  } catch (e) {
    console.error(`[server] ${req.method} ${req.url} →`, e.message);
    try { sendJson(res, 500, { error: "server error" }); } catch { /* headers already sent */ }
  }
});

// keep a malformed HTTP request (bad target, oversized header) from killing the
// process, and never let a stray rejection take the server down.
server.on("clientError", (err, socket) => { try { socket.destroy(); } catch { /* already closed */ } });
process.on("unhandledRejection", (e) => console.error("[unhandledRejection]", e?.message || e));
process.on("uncaughtException", (e) => console.error("[uncaughtException]", e?.message || e));

server.listen(PORT, () => {
  console.log(`SunnyDesk demo · http://localhost:${PORT}`);
  console.log(`  hotels: ${Object.keys(HOTELS).join(", ")}`);
  console.log(`  call:   ${REALTIME_MODEL} · ${REALTIME_VOICE} · openai key ${process.env.OPENAI_API_KEY ? "present" : "MISSING"}`);
});
