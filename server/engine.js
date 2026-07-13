// Mock hotel engine — everything in-memory, everything fictional.
// Deterministic availability per (hotel, room, date) so a demo conversation is
// plausible AND repeatable within a server run; mock reservations subtract from
// inventory for the rest of the run. No database, no external system.

// ---- deterministic hash → [0,1) ----
function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

// ---- dates ----
const DAY = 86400000;
function parseDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T00:00:00Z");
  return Number.isNaN(d.getTime()) ? null : d;
}
function fmt(d) {
  return d.toISOString().slice(0, 10);
}
function today(tz) {
  // "today" at the hotel's local timezone, not UTC — so same-day booking logic is
  // correct near the UTC day boundary (a hotel in Vancouver vs the server clock).
  const s = tz ? new Date().toLocaleDateString("en-CA", { timeZone: tz }) : new Date().toISOString().slice(0, 10);
  return parseDate(s) || parseDate(new Date().toISOString().slice(0, 10));
}
function* nightsOf(inD, outD) {
  for (let t = inD.getTime(); t < outD.getTime(); t += DAY) yield new Date(t);
}
function inSeason(dateStr, season) {
  const md = dateStr.slice(5); // MM-DD
  if (season.from <= season.to) return md >= season.from && md <= season.to;
  return md >= season.from || md <= season.to; // wraps year-end
}

// ---- pricing + availability ----
function nightlyRate(hotel, room, date) {
  const ds = fmt(date);
  let mult = 1;
  for (const s of hotel.seasons) if (inSeason(ds, s)) mult *= s.mult;
  const dow = date.getUTCDay();
  if (dow === 5 || dow === 6) mult *= hotel.weekendMult;
  const raw = room.baseRate * mult;
  if (hotel.currency === "INR") return Math.round(raw / 50) * 50;
  return Math.round(raw);
}

const bookings = new Map(); // hotelId → [{ roomId, nights:Set<dateStr>, ref, guestName }]

function bookedCount(hotelId, roomId, dateStr) {
  let n = 0;
  for (const b of bookings.get(hotelId) || [])
    if (b.roomId === roomId && b.nights.has(dateStr)) n++;
  return n;
}

function freeCount(hotel, room, date) {
  const ds = fmt(date);
  const r1 = hash01(`${hotel.demandSeed}:${room.id}:${ds}:sellout`);
  const dow = date.getUTCDay();
  const selloutP = dow === 5 || dow === 6 ? 0.2 : 0.12; // ~1 in 7 nights gone
  let free;
  if (r1 < selloutP) free = 0;
  else {
    const r2 = hash01(`${hotel.demandSeed}:${room.id}:${ds}:load`);
    free = 1 + Math.floor(r2 * room.count);
  }
  return Math.max(0, Math.min(room.count, free) - bookedCount(hotel.id, room.id, ds));
}

function stay(hotel, room, inD, outD) {
  let minFree = Infinity, total = 0, nights = 0;
  for (const d of nightsOf(inD, outD)) {
    minFree = Math.min(minFree, freeCount(hotel, room, d));
    total += nightlyRate(hotel, room, d);
    nights++;
  }
  return { minFree, total, nights, avgNightly: Math.round(total / nights) };
}

function money(hotel, amount) {
  return `${hotel.currencySymbol}${amount.toLocaleString("en-US")} ${hotel.currency}`;
}

function roomCard(hotel, room, extra = {}) {
  return {
    kind: "room",
    title: room.name,
    lines: [room.flavor, `${room.sizeSqm} m² · ${room.beds} · up to ${room.maxAdults} adults${room.maxChildren ? ` + ${room.maxChildren} child${room.maxChildren > 1 ? "ren" : ""}` : ""}`],
    ...extra,
  };
}

function findRoom(hotel, roomId) {
  if (!roomId) return null;
  const q = String(roomId).toLowerCase().trim();
  if (!q) return null;
  const byId = hotel.rooms.find((r) => r.id === q);
  if (byId) return byId;
  const byName = hotel.rooms.find((r) => r.name.toLowerCase() === q);
  if (byName) return byName;
  // fuzzy fallback, but ONLY when it resolves to exactly one room — an ambiguous
  // partial must NOT silently pick the wrong room (wrong price/inventory).
  const matches = hotel.rooms.filter((r) => {
    const name = r.name.toLowerCase();
    return r.id.startsWith(q) || name.startsWith(q) || name.includes(q) || r.id.replace(/-/g, " ").includes(q);
  });
  return matches.length === 1 ? matches[0] : null;
}

function validStay(args, tz) {
  const inD = parseDate(args.check_in);
  const outD = parseDate(args.check_out);
  if (!inD || !outD) return { error: "check_in and check_out must be YYYY-MM-DD — ask the guest for their dates first." };
  const t0 = today(tz);
  if (inD.getTime() < t0.getTime()) return { error: "check_in is in the past — confirm the dates with the guest." };
  if (outD.getTime() <= inD.getTime()) return { error: "check_out must be after check_in." };
  if ((outD - inD) / DAY > 14) return { error: "demo bookings are limited to 14 nights — ask for a shorter stay." };
  if ((inD - t0) / DAY > 365) return { error: "dates beyond one year ahead aren't open for sale yet." };
  const adults = Number(args.adults);
  if (!Number.isInteger(adults) || adults < 1 || adults > 8)
    return { error: "adults (1-8) is required — ask how many people are staying before checking." };
  const children = args.children == null ? 0 : Number(args.children);
  if (!Number.isInteger(children) || children < 0 || children > 6)
    return { error: "children must be a number from 0 to 6." };
  return { inD, outD, adults, children };
}

// ---- the six tools ----
export function runTool(hotel, name, args = {}) {
  const cards = [];
  let result;

  if (name === "get_hotel_info") {
    const topic = String(args.topic || "overview").toLowerCase().replace(/[^a-z_]/g, "");
    if (topic === "rooms") {
      result = {
        topic,
        answer: `${hotel.name} has ${hotel.rooms.length} room types: ` + hotel.rooms.map((r) => `${r.name} (from ${money(hotel, r.baseRate)}/night)`).join(", ") + ".",
        rooms: hotel.rooms.map((r) => ({ room_id: r.id, name: r.name, flavor: r.flavor, from_rate: money(hotel, r.baseRate) })),
      };
      for (const r of hotel.rooms) cards.push(roomCard(hotel, r, { price: `from ${money(hotel, r.baseRate)}/night` }));
    } else {
      const answer = hotel.facts[topic] || hotel.facts.overview;
      result = { topic: hotel.facts[topic] ? topic : "overview", answer };
    }
  }

  else if (name === "get_room_details") {
    const room = findRoom(hotel, args.room_id);
    if (!room) result = { error: `no room "${args.room_id}" — valid room_ids: ${hotel.rooms.map((r) => r.id).join(", ")}` };
    else {
      result = { ...room, from_rate: `${money(hotel, room.baseRate)}/night before seasonal pricing` };
      cards.push(roomCard(hotel, room, { price: `from ${money(hotel, room.baseRate)}/night` }));
    }
  }

  else if (name === "check_availability") {
    const v = validStay(args, hotel.timezone);
    if (v.error) result = { error: v.error };
    else {
      const list = hotel.rooms.map((room) => {
        const fits = v.adults <= room.maxAdults && v.children <= room.maxChildren;
        const s = stay(hotel, room, v.inD, v.outD);
        return {
          room_id: room.id,
          name: room.name,
          fits_party: fits,
          available: fits && s.minFree > 0,
          rooms_left: Math.max(0, s.minFree),
          nightly_rate: money(hotel, s.avgNightly),
          total_for_stay: money(hotel, s.total),
          nights: s.nights,
        };
      });
      // best-fitting available rooms first, cheapest first
      list.sort((a, b) => (b.available - a.available) || (parseInt(a.total_for_stay.replace(/[^\d]/g, "")) - parseInt(b.total_for_stay.replace(/[^\d]/g, ""))));
      result = {
        check_in: args.check_in, check_out: args.check_out,
        party: { adults: v.adults, children: v.children },
        rooms: list,
        note: list.some((r) => r.available)
          ? "Quote ONLY these numbers. Prices are per stay unless the guest asks nightly."
          : "Nothing fits online for those dates — offer nearby dates or a different party split.",
      };
      for (const r of list.filter((x) => x.available).slice(0, 3)) {
        const room = findRoom(hotel, r.room_id);
        cards.push(roomCard(hotel, room, { price: `${r.total_for_stay} · ${r.nights} night${r.nights > 1 ? "s" : ""}`, badge: `${r.rooms_left} left` }));
      }
    }
  }

  else if (name === "make_reservation") {
    const v = validStay(args, hotel.timezone);
    const room = findRoom(hotel, args.room_id);
    const guest = String(args.guest_name || "").trim();
    const contact = String(args.contact || "").trim();
    if (v.error) result = { error: v.error };
    else if (!room) result = { error: `no room "${args.room_id}" — valid room_ids: ${hotel.rooms.map((r) => r.id).join(", ")}` };
    else if (guest.length < 2) result = { error: "guest_name is required — collect the guest's full name first." };
    else if (contact.length < 5) result = { error: "contact (a phone number or email) is required — collect it first." };
    else if (v.adults > room.maxAdults || v.children > room.maxChildren)
      result = { error: `${room.name} takes up to ${room.maxAdults} adults + ${room.maxChildren} children — this party doesn't fit; offer a larger room.` };
    else {
      const s = stay(hotel, room, v.inD, v.outD);
      if (s.minFree < 1) result = { error: `${room.name} is no longer available for those nights — re-check availability and offer an alternative.` };
      else {
        const ref = `${hotel.refPrefix}-` + Array.from({ length: 4 }, () => "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 31)]).join("");
        const nights = new Set([...nightsOf(v.inD, v.outD)].map(fmt));
        if (!bookings.has(hotel.id)) bookings.set(hotel.id, []);
        bookings.get(hotel.id).push({ roomId: room.id, nights, ref, guestName: guest });
        result = {
          ok: true, booking_ref: ref, room: room.name,
          check_in: args.check_in, check_out: args.check_out,
          party: { adults: v.adults, children: v.children },
          guest_name: guest, total: money(hotel, s.total), nights: s.nights,
          note: "DEMO reservation — nothing real was booked. Read the booking reference to the guest slowly, character by character.",
        };
        cards.push({
          kind: "confirm",
          title: `Reserved — ${ref}`,
          lines: [`${room.name} · ${args.check_in} → ${args.check_out}`, `${guest} · ${v.adults} adult${v.adults > 1 ? "s" : ""}${v.children ? ` + ${v.children} child${v.children > 1 ? "ren" : ""}` : ""}`, `Demo booking — nothing real was reserved.`],
          price: money(hotel, s.total),
        });
      }
    }
  }

  else if (name === "get_local_recommendations") {
    const q = String(args.interest || "").toLowerCase();
    let tips = hotel.localTips;
    if (q) {
      const filtered = tips.filter((t) => t.type.includes(q) || t.name.toLowerCase().includes(q) || t.line.toLowerCase().includes(q));
      if (filtered.length) tips = filtered;
    }
    tips = tips.slice(0, 4);
    result = { tips, note: "Recommend ONLY from this list; opening notes are part of the answer." };
    for (const t of tips) cards.push({ kind: "tip", title: t.name, lines: [t.line, t.hours], badge: t.type });
  }

  else if (name === "escalate_to_staff") {
    result = {
      handed_over: true,
      front_desk_phone: hotel.phone,
      front_desk_email: hotel.email,
      note: "Tell the guest the front desk team will take over from here and their contact details are on screen. (In a real deployment the team receives the full conversation context — this is a fictional demo hotel.)",
    };
    cards.push({ kind: "contact", title: `${hotel.name} — front desk`, lines: [hotel.phone, hotel.email, "Fictional demo hotel — this number doesn't ring."] });
  }

  else result = { error: `unknown tool "${name}"` };

  return { result, cards };
}

// ---- tool schemas for the realtime session ----
export function toolSchemas(hotel) {
  const str = (description) => ({ type: "string", description });
  const int = (description) => ({ type: "integer", description });
  return [
    {
      type: "function", name: "get_hotel_info",
      description: `Facts about ${hotel.name} by topic. Use topic "rooms" for the room overview (the guest then sees room cards on screen).`,
      parameters: { type: "object", properties: { topic: str('one of: overview, rooms, breakfast, checkin_checkout, parking, amenities, policies, location, contact, family, payment') }, required: ["topic"] },
    },
    {
      type: "function", name: "get_room_details",
      description: "Full details of one room type.",
      parameters: { type: "object", properties: { room_id: str(`one of: ${hotel.rooms.map((r) => r.id).join(", ")}`) }, required: ["room_id"] },
    },
    {
      type: "function", name: "check_availability",
      description: "Live availability and exact prices for a stay. NEVER call before the guest has given dates AND how many adults/children — ask first.",
      parameters: {
        type: "object",
        properties: { check_in: str("YYYY-MM-DD"), check_out: str("YYYY-MM-DD"), adults: int("number of adults, guest-stated"), children: int("number of children, 0 if none") },
        required: ["check_in", "check_out", "adults", "children"],
      },
    },
    {
      type: "function", name: "make_reservation",
      description: "Reserve a room (demo — no payment taken). Only after the guest confirmed room, dates, party, and gave their full name plus a phone number or email, and you read the whole booking back and got a clear yes.",
      parameters: {
        type: "object",
        properties: {
          room_id: str(`one of: ${hotel.rooms.map((r) => r.id).join(", ")}`),
          check_in: str("YYYY-MM-DD"), check_out: str("YYYY-MM-DD"),
          adults: int("adults"), children: int("children, 0 if none"),
          guest_name: str("guest's full name, as they stated it"),
          contact: str("guest's phone number or email, as they stated it"),
        },
        required: ["room_id", "check_in", "check_out", "adults", "children", "guest_name", "contact"],
      },
    },
    {
      type: "function", name: "get_local_recommendations",
      description: `Things to do around ${hotel.city}. Optional interest filter.`,
      parameters: { type: "object", properties: { interest: str("optional: food, culture, nature, market, activity, or a keyword") }, required: [] },
    },
    {
      type: "function", name: "escalate_to_staff",
      description: "When you cannot help, the guest asks for a human, or something goes wrong — hands the conversation to the front desk team.",
      parameters: { type: "object", properties: { reason: str("one line: why this is being escalated") }, required: ["reason"] },
    },
  ];
}
