export default {
  id: "hotel-lindenhof",
  name: "Hotel Lindenhof",
  city: "Bernkastel-Kues, Rhineland-Palatinate",
  country: "Germany",
  currency: "EUR",
  currencySymbol: "€",
  primaryLanguage: "de",
  languageName: "German",
  agentName: "Greta",
  voice: "coral",
  timezone: "Europe/Berlin",
  phone: "+49 6531 94 27 30",
  email: "frontdesk@hotel-lindenhof-mosel.example.com",
  address: "Am Weinbrunnen 12, 54470 Bernkastel-Kues",
  checkin: "15:00",
  checkout: "11:00",
  greeting: "Guten Tag, herzlich willkommen im Hotel Lindenhof an der Mosel — mein Name ist Greta. Wie kann ich Ihnen helfen? … You're very welcome to speak English too.",
  vibe: "A small family-run house on the Mosel where three generations have poured wine for guests, with creaking wooden stairs, fresh flowers from the garden, and vineyard views from most windows. Everything feels unhurried and personal — guests are greeted by name and sent off with a bottle from the family's own slope.",
  facts: {
    overview: "Hotel Lindenhof is a family-run hotel with 21 rooms in the old town of Bernkastel-Kues, a few steps from the Mosel riverside promenade. The house has been in the Lindenhof family for three generations and keeps its own small vineyard on the Kues side of the river.",
    rooms: "We have four room types: Standard Doppelzimmer, Komfort Doppelzimmer with Mosel view, a spacious Familienzimmer, and our Winzer-Suite under the roof with a private balcony. All rooms have free Wi-Fi, a kettle, and a complimentary bottle of water; most look over the vineyards or the river.",
    breakfast: "A generous breakfast buffet is served daily from 7:30 to 10:30 in the Weinstube, with fresh bread from the bakery next door, regional cheese and ham, eggs cooked to order, and homemade jams. Breakfast is included in all room rates.",
    checkin_checkout: "Check-in is from 15:00 and check-out is until 11:00. Early arrival luggage storage is always possible, and late check-out until 13:00 can usually be arranged for a small fee if the room is free.",
    parking: "We have a small private car park behind the house with 12 spaces at 8 euros per night, first come first served. The public riverside car park is a 3-minute walk away, and we lend secure garage space for motorcycles and bicycles free of charge.",
    amenities: "The house has a cosy Weinstube serving our own wines each evening, a sunny garden terrace, a small sauna bookable by the hour, free bicycle storage with a repair corner, and free Wi-Fi throughout. We also arrange vineyard tours and wine tastings with the family.",
    policies: "Free cancellation until 48 hours before arrival; later cancellations are charged the first night. We are a non-smoking house, and well-behaved dogs are welcome for 12 euros per night. Quiet hours are from 22:00.",
    location: "We are in the heart of Bernkastel-Kues on the Mosel, two minutes on foot from the medieval market square and the riverside promenade. Vineyards start directly behind the house, and the Mosel cycle path passes our door.",
    contact: "You can reach the front desk daily from 7:00 to 22:00 at +49 6531 94 27 30 or frontdesk@hotel-lindenhof-mosel.example.com. Outside these hours an emergency number is posted at the entrance for house guests.",
    family: "Families are very welcome — our Familienzimmer sleeps two adults and two children, cots and high chairs are free, and children under six eat breakfast free. The garden has a small play corner, and we happily recommend easy riverside walks for little legs.",
    payment: "We accept Visa, Mastercard, girocard, and cash; payment is taken at check-out. A credit card guarantees the booking, and no deposit is needed for stays of up to five nights."
  },
  rooms: [
    {
      id: "standard-doppelzimmer",
      name: "Standard Doppelzimmer",
      flavor: "A snug, quiet double over the courtyard with warm wood tones and the smell of the bakery drifting up in the morning.",
      sizeSqm: 18,
      beds: "1 double bed (180 cm)",
      maxAdults: 2,
      maxChildren: 0,
      baseRate: 95,
      count: 8,
      features: ["Courtyard view", "Rain shower", "Free Wi-Fi", "Desk"]
    },
    {
      id: "komfort-doppelzimmer-moselblick",
      name: "Komfort Doppelzimmer mit Moselblick",
      flavor: "Wake up to the river glinting below and vineyard rows climbing the far bank — the view most guests come back for.",
      sizeSqm: 24,
      beds: "1 double bed (180 cm)",
      maxAdults: 2,
      maxChildren: 1,
      baseRate: 135,
      count: 6,
      features: ["Mosel river view", "Small balcony", "Seating corner", "Bathtub", "Free Wi-Fi"]
    },
    {
      id: "familienzimmer",
      name: "Familienzimmer",
      flavor: "Two connected rooms under one door, so parents get their evening quiet while the children whisper next door.",
      sizeSqm: 32,
      beds: "1 double bed + 2 single beds in separate alcove",
      maxAdults: 2,
      maxChildren: 2,
      baseRate: 165,
      count: 4,
      features: ["Separate children's alcove", "Vineyard view", "Two washbasins", "Cot on request", "Free Wi-Fi"]
    },
    {
      id: "winzer-suite",
      name: "Winzer-Suite",
      flavor: "Our rooftop suite with exposed beams, a private balcony over the vines, and a welcome bottle from the family's own slope.",
      sizeSqm: 42,
      beds: "1 king bed (200 cm) + sofa bed",
      maxAdults: 3,
      maxChildren: 1,
      baseRate: 205,
      count: 3,
      features: ["Private balcony with vineyard view", "Exposed oak beams", "Espresso machine", "Welcome wine bottle", "Bathtub and rain shower"]
    }
  ],
  seasons: [
    { from: "05-01", to: "10-31", mult: 1.2, label: "wine season" },
    { from: "11-25", to: "12-23", mult: 1.15, label: "Christmas market" }
  ],
  weekendMult: 1.15,
  demandSeed: 35,
  refPrefix: "LIN",
  localTips: [
    {
      name: "Vineyard panorama walk",
      type: "nature",
      line: "A gentle marked path climbs from behind the old town through the steep vineyards to a panorama bench over the Mosel loop.",
      hours: "Open all day; loveliest in late afternoon light"
    },
    {
      name: "Mosel river cruise",
      type: "activity",
      line: "Small excursion boats leave from the riverside promenade for one- to two-hour cruises past vineyards and villages.",
      hours: "Apr-Oct, roughly 10:00-17:00 departures"
    },
    {
      name: "Medieval market square",
      type: "sight",
      line: "The half-timbered market square with its Renaissance fountain is two minutes from our door and prettiest before the day-trip buses arrive.",
      hours: "Always open; shops mostly 10:00-18:00"
    },
    {
      name: "Traditional Weinstube evening",
      type: "food",
      line: "The old wine taverns in the lanes pour local Riesling by the glass alongside hearty plates like Winzersteak and Flammkuchen.",
      hours: "Most open 17:00-23:00, some from lunch"
    },
    {
      name: "Castle ruin viewpoint",
      type: "culture",
      line: "The hilltop castle ruin above the town rewards a 30-minute climb with the classic postcard view over the river bend, plus a terrace cafe.",
      hours: "Grounds open daily; cafe about 10:00-18:00 in season"
    },
    {
      name: "Mosel cycle path",
      type: "activity",
      line: "The flat riverside cycle path runs for many kilometres in both directions through wine villages — we lend maps and store bikes for free.",
      hours: "Open all day; bike rental in town 9:00-18:00"
    }
  ]
}
