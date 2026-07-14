/* SunnyDesk live demo — call a fictional hotel's AI front desk.
   Same call architecture as our production deployment: this page asks the demo
   backend to mint a short-lived session, then opens a WebRTC call STRAIGHT to
   OpenAI (no audio through our server); mock hotel tools run server-side.
   Demo calls are capped at 3 minutes. */
(function () {
  "use strict";

  const REMOTE_API = "https://sunnydesk-demo.onrender.com";
  let API = null;         // resolved on first use — see ensureApi()
  const CALL_CAP_S = 180;

  let call = null;        // { pc, dc, mic, audioEl, timer, hotelId }
  let awake = false;      // demo backend reachable (free tier sleeps)
  let attemptSeq = 0;     // generation token: bumped on every start/end so an
                          // in-flight connect can detect it was superseded/cancelled

  // ---- panel DOM (styles live in index.html) ----
  const overlay = document.createElement("div");
  overlay.className = "dc-overlay";
  overlay.innerHTML =
    '<div class="dc-panel" role="dialog" aria-label="Demo call">' +
    '  <div class="dc-head">' +
    '    <div><div class="dc-hotel"></div><div class="dc-agent"></div></div>' +
    '    <div class="dc-clock">3:00</div>' +
    "  </div>" +
    '  <div class="dc-state">connecting…</div>' +
    '  <div class="dc-stage"></div>' +
    '  <div class="dc-cards"></div>' +
    '  <div class="dc-foot">' +
    '    <button type="button" class="dc-end">End call</button>' +
    '    <span class="dc-note">Fictional demo hotel · mock availability · nothing real is booked</span>' +
    "  </div>" +
    "</div>";
  document.body.appendChild(overlay);
  const el = (c) => overlay.querySelector(c);
  const stage = el(".dc-stage"), cardsEl = el(".dc-cards"), stateEl = el(".dc-state"), clockEl = el(".dc-clock");
  el(".dc-end").addEventListener("click", () => endCall("ended"));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) endCall("ended"); });

  function setState(t) { stateEl.textContent = t; }
  function scroll() { stage.scrollTop = stage.scrollHeight; }

  function bubble(who, text) {
    const d = document.createElement("div");
    d.className = "dc-cap " + who;
    d.innerHTML = '<span class="who"></span><span class="txt"></span>';
    d.querySelector(".who").textContent = who === "you" ? "you" : (el(".dc-agent").textContent || "agent").split(" ·")[0];
    d.querySelector(".txt").textContent = text;
    stage.appendChild(d);
    scroll();
    return d;
  }

  function renderCards(cards) {
    if (!cards || !cards.length) return;
    for (const c of cards) {
      const d = document.createElement("div");
      d.className = "dc-card k-" + (c.kind || "info");
      d.innerHTML = '<div class="t"></div><div class="l"></div>' + (c.price ? '<div class="p"></div>' : "") + (c.badge ? '<span class="b"></span>' : "");
      d.querySelector(".t").textContent = c.title || "";
      d.querySelector(".l").innerHTML = (c.lines || []).map(() => "<div></div>").join("");
      [...d.querySelectorAll(".l div")].forEach((n, i) => (n.textContent = c.lines[i]));
      if (c.price) d.querySelector(".p").textContent = c.price;
      if (c.badge) d.querySelector(".b").textContent = c.badge;
      cardsEl.appendChild(d);
    }
    cardsEl.scrollLeft = cardsEl.scrollWidth;
  }

  // ---- captions (event names proven in production) ----
  let herLive = null, herLiveText = "";
  const youPending = {};

  function herStream(delta) {
    if (!herLive) { herLive = bubble("her", ""); herLiveText = ""; }
    herLiveText += delta;
    herLive.querySelector(".txt").textContent = herLiveText;
    scroll();
  }

  function onEvent(ev, hotelId) {
    const t = ev.type;
    if (t === "input_audio_buffer.speech_started") { setState("listening…"); return; }
    if (t === "input_audio_buffer.committed") {
      if (ev.item_id && !youPending[ev.item_id]) youPending[ev.item_id] = bubble("you", "…");
      return;
    }
    if (t === "conversation.item.input_audio_transcription.completed") {
      const txt = (ev.transcript || "").trim();
      const slot = ev.item_id && youPending[ev.item_id];
      if (slot) { slot.querySelector(".txt").textContent = txt || "…"; delete youPending[ev.item_id]; }
      else if (txt) bubble("you", txt);
      return;
    }
    if (t === "response.output_audio_transcript.delta" || t === "response.audio_transcript.delta") { herStream(ev.delta); return; }
    if (t === "output_audio_buffer.started") { setState("she's speaking…"); return; }
    if (t === "output_audio_buffer.stopped" || t === "output_audio_buffer.cleared") { if (call) setState("in call — just talk"); return; }
    if (t === "response.done") {
      herLive = null; herLiveText = "";
      const calls = ((ev.response || {}).output || []).filter((it) => it.type === "function_call");
      if (!calls.length) return;
      setState("checking…");
      let chain = Promise.resolve();
      for (const c of calls) {
        chain = chain.then(() => {
          let args = {};
          try { args = JSON.parse(c.arguments || "{}"); } catch {}
          return fetch(API + "/api/demo/tool", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ hotel: hotelId, name: c.name, args }),
          })
            .then((r) => r.json())
            .then((out) => {
              renderCards(out.cards);
              if (call) call.dc.send(JSON.stringify({ type: "conversation.item.create", item: { type: "function_call_output", call_id: c.call_id, output: JSON.stringify(out.result) } }));
            })
            .catch((e) => {
              if (call) call.dc.send(JSON.stringify({ type: "conversation.item.create", item: { type: "function_call_output", call_id: c.call_id, output: JSON.stringify({ ok: false, error: "tool endpoint unreachable: " + e.message }) } }));
            });
        });
      }
      chain.then(() => {
        if (call) { call.dc.send(JSON.stringify({ type: "response.create" })); setState("in call — just talk"); }
      });
    }
  }

  // ---- call lifecycle ----
  function startClock() {
    let left = CALL_CAP_S;
    clockEl.textContent = "3:00";
    call.timer = setInterval(() => {
      left--;
      clockEl.textContent = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
      if (left <= 0) endCall("time");
    }, 1000);
  }

  function teardownCall() {
    if (!call) return;
    clearInterval(call.timer);
    try { call.dc && call.dc.close(); } catch {}
    try { call.pc.close(); } catch {}
    try { call.mic && call.mic.getTracks().forEach((t) => t.stop()); } catch {}
    call = null;
  }

  function closeOverlay() {
    overlay.classList.remove("open");
    stage.innerHTML = ""; cardsEl.innerHTML = "";
    for (const k in youPending) delete youPending[k];
    herLive = null; herLiveText = "";
  }

  // every end/switch bumps attemptSeq, so any in-flight connect chain (which
  // captured an older token) aborts before it can go live or start a timer.
  function endCall(why) {
    attemptSeq++;
    teardownCall();
    if (why === "time") {
      setState("demo time's up — that was 3 minutes of your AI front desk");
      bubble("her", "…and that's the 3-minute demo cap. Imagine this answering your hotel's phone and website all night.");
    } else if (why === "ended") {
      closeOverlay();
    } else if (why === "dropped") {
      setState("call dropped — connection lost · tap End to close");
    }
    // "switch" / undefined → silent teardown (a new call is taking over)
  }

  // Resolve the backend base URL, memoized. Same-origin ("") ONLY when our Node
  // backend is actually serving this page — i.e. the deployed backend host, or a
  // local `node server/server.js` whose /api/health answers. Otherwise (VSCode
  // Live Preview, file://, the static marketing site) use the deployed backend.
  function ensureApi() {
    if (API !== null) return Promise.resolve(API);
    if (/sunnydesk-demo/.test(location.hostname)) { API = ""; return Promise.resolve(API); }
    if (location.protocol === "file:") { API = REMOTE_API; return Promise.resolve(API); }
    return fetch("/api/health")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { API = j && j.ok && Array.isArray(j.hotels) ? "" : REMOTE_API; return API; })
      .catch(() => { API = REMOTE_API; return API; });
  }

  function wake() {
    return ensureApi().then((base) => {
      if (awake) return true;
      return fetch(base + "/api/health").then((r) => r.ok && r.json()).then((j) => (awake = !!(j && j.ok))).catch(() => false);
    });
  }

  function startCall(hotelId, btn) {
    endCall("switch");                 // tear down any existing/connecting call
    const myAttempt = ++attemptSeq;    // this attempt's token (now the latest)
    const live = () => myAttempt === attemptSeq;
    let acquiredMic = null;            // so we can stop it if cancelled after getUserMedia

    overlay.classList.add("open");
    stage.innerHTML = ""; cardsEl.innerHTML = "";
    el(".dc-hotel").textContent = btn.dataset.hotelName || "Demo hotel";
    el(".dc-agent").textContent = (btn.dataset.agent || "") + " · AI front desk";
    clockEl.textContent = "3:00";
    setState(awake ? "connecting…" : "waking the demo server (free tier — up to ~50s)…");

    const retryWake = (tries) =>
      wake().then((ok) => {
        if (!live()) throw new Error("cancelled");
        if (ok) return true;
        if (tries <= 0) throw new Error("demo server unreachable");
        return new Promise((r) => setTimeout(r, 5000)).then(() => retryWake(tries - 1));
      });

    retryWake(12)
      .then(() => {
        if (!live()) throw new Error("cancelled");
        setState("connecting…");
        return fetch(API + "/api/demo/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ hotel: hotelId }) });
      })
      .then((r) => r.json())
      .then((sess) => {
        if (!live()) throw new Error("cancelled");
        if (!sess.value) throw new Error(sess.error || "no session");
        return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then((mic) => {
          acquiredMic = mic;
          if (!live()) throw new Error("cancelled");   // user bailed during the mic prompt
          const pc = new RTCPeerConnection();
          const audioEl = document.createElement("audio");
          audioEl.autoplay = true;
          audioEl.style.display = "none";
          overlay.appendChild(audioEl);
          pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };
          pc.addTrack(mic.getAudioTracks()[0], mic);
          const dc = pc.createDataChannel("oai-events");
          dc.onmessage = (m) => { try { onEvent(JSON.parse(m.data), hotelId); } catch {} };
          // only treat a close/fail as a drop if THIS pc is still the active call
          // (a normal endCall sets call=null first, so its close is a no-op here)
          pc.onconnectionstatechange = () => {
            if ((pc.connectionState === "failed" || pc.connectionState === "closed") && call && call.pc === pc) endCall("dropped");
          };
          return pc
            .createOffer()
            .then((offer) => pc.setLocalDescription(offer))
            .then(() =>
              fetch("https://api.openai.com/v1/realtime/calls?model=" + encodeURIComponent(sess.model), {
                method: "POST",
                headers: { Authorization: "Bearer " + sess.value, "Content-Type": "application/sdp" },
                body: pc.localDescription.sdp,
              })
            )
            .then((resp) => {
              if (!resp.ok) throw new Error("call setup failed (" + resp.status + ")");
              return resp.text();
            })
            .then((answer) => pc.setRemoteDescription({ type: "answer", sdp: answer }))
            .then(() => {
              if (!live()) throw new Error("cancelled");  // final gate before going live
              call = { pc, dc, mic, audioEl, timer: null, hotelId };
              startClock();
              setState("ringing… she'll greet you first");
              const go = () => dc.send(JSON.stringify({ type: "response.create" }));
              dc.onopen = go;
              if (dc.readyState === "open") go();
            })
            .catch((e) => {
              try { pc.close(); } catch {}
              try { mic.getTracks().forEach((t) => t.stop()); } catch {}
              throw e;
            });
        });
      })
      .catch((e) => {
        // stop a mic acquired before cancellation that never became the live call
        if (acquiredMic && (!call || call.mic !== acquiredMic)) { try { acquiredMic.getTracks().forEach((t) => t.stop()); } catch {} }
        if (e && e.message === "cancelled") return;   // user superseded/ended it — silent
        if (!live()) return;                          // a newer attempt owns the UI now
        setState(
          /Permission|NotAllowed/i.test(String(e && e.name) + String(e && e.message))
            ? "microphone blocked — allow mic access and try again"
            : "couldn't start the demo: " + (e.message || e)
        );
      });
  }

  // ---- self-serve builder: scrape the visitor's site → custom demo agent ----
  function bindBuilder() {
    const form = document.getElementById("buildForm");
    if (!form) return;
    const statusEl = document.getElementById("buildStatus");
    const resultEl = document.getElementById("buildResult");
    const goBtn = form.querySelector(".bf-go");
    const callBtn = resultEl.querySelector(".br-call");

    // the built agent's call button reuses the same overlay flow
    callBtn.addEventListener("click", () => startCall(callBtn.dataset.demoHotel, callBtn));

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const url = document.getElementById("bUrl").value.trim();
      const language = document.getElementById("bLang").value;
      const agentName = document.getElementById("bAgent").value.trim();
      const voiceEl = document.getElementById("bVoice");
      const voice = voiceEl ? voiceEl.value : "marin";
      if (!url) { document.getElementById("bUrl").focus(); return; }

      resultEl.hidden = true;
      statusEl.hidden = false;
      statusEl.className = "build-status";
      statusEl.innerHTML = '<span class="spin"></span> Reading your website and building your agent… (this can take 10–20 seconds)';
      goBtn.disabled = true;

      const doBuild = () =>
        fetch(API + "/api/demo/build", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url, language, agentName, voice }),
        }).then((r) => r.json().then((j) => ({ ok: r.ok, j })));

      // wake the free-tier server first, then build
      (awake ? Promise.resolve(true) : wakeRetry(12))
        .then((up) => { if (!up) throw new Error("wake"); return doBuild(); })
        .then(({ ok, j }) => {
          goBtn.disabled = false;
          if (!ok || !j.demoId) throw new Error(j && j.error ? j.error : "build failed");
          statusEl.hidden = true;
          resultEl.hidden = false;
          resultEl.querySelector(".br-name").textContent = j.hotel.name;
          resultEl.querySelector(".br-meta").textContent =
            [j.hotel.city, j.hotel.country].filter(Boolean).join(", ") + " · " + j.hotel.agentName + " speaks " + j.hotel.language +
            (j.source === "scraped" ? "" : " · light demo (site was thin — details are generic)");
          const roomsEl = resultEl.querySelector(".br-rooms");
          roomsEl.innerHTML = "";
          (j.rooms || []).forEach((rm) => {
            const s = document.createElement("span");
            s.className = "br-room";
            s.textContent = rm.name + " · from " + rm.from;
            roomsEl.appendChild(s);
          });
          callBtn.dataset.demoHotel = j.demoId;
          callBtn.dataset.hotelName = j.hotel.name;
          callBtn.dataset.agent = j.hotel.agentName;
          callBtn.querySelector(".br-call-label").textContent = "Call " + j.hotel.agentName;
          resultEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
        })
        .catch((err) => {
          goBtn.disabled = false;
          statusEl.hidden = false;
          statusEl.className = "build-status err";
          statusEl.textContent =
            err.message === "wake"
              ? "The demo server is waking up — give it a moment and try again."
              : "Couldn't build that one: " + (err.message || err) + ". Try another page of your site, or message us on WhatsApp.";
        });
    });
  }

  function wakeRetry(tries) {
    return wake().then((ok) => {
      if (ok) return true;
      if (tries <= 0) return false;
      return new Promise((r) => setTimeout(r, 5000)).then(() => wakeRetry(tries - 1));
    });
  }

  // ---- bind buttons + pre-wake the free-tier server when demo scrolls into view ----
  function init() {
    document.querySelectorAll("[data-demo-hotel]").forEach((btn) => {
      if (btn.classList.contains("br-call")) return; // builder result button binds itself
      btn.addEventListener("click", () => startCall(btn.dataset.demoHotel, btn));
    });
    bindBuilder();
    const demoSec = document.getElementById("demo");
    if (demoSec && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => {
        if (es.some((x) => x.isIntersecting)) { wake(); io.disconnect(); }
      }, { rootMargin: "600px" });
      io.observe(demoSec);
    } else wake();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
