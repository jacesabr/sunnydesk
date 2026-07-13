export default {
  id: "driftwood-harbour",
  name: "Driftwood Harbour Hotel",
  city: "Vancouver, British Columbia",
  country: "Canada",
  currency: "CAD",
  currencySymbol: "$",
  primaryLanguage: "en",
  languageName: "English",
  agentName: "Maddie",
  timezone: "America/Vancouver",
  phone: "+1 (604) 555-0148",
  email: "frontdesk@driftwoodharbour.example.com",
  address: "1188 Harbourlight Mews, Coal Harbour, Vancouver, BC V6C 0K4",
  checkin: "15:00",
  checkout: "11:00",
  greeting: "Hi there, thanks for calling the Driftwood Harbour Hotel in Vancouver — this is Maddie. How can I help you today?",
  vibe: "A calm, modern boutique perch between the seaplanes of Coal Harbour and the cedar edge of Stanley Park, all warm wood, wool throws, and windows full of mountains and water. Staff are easygoing West Coast hosts who will lend you an umbrella, mark up a seawall map, and remember how you take your coffee.",
  facts: {
    overview: "Driftwood Harbour Hotel is a 42-room boutique hotel in Vancouver's Coal Harbour neighbourhood, a short stroll from Stanley Park and the downtown seawall. The style is modern West Coast: local wood, quiet rooms, and big views of the harbour and North Shore mountains.",
    rooms: "We have four room types: the City Queen, the Harbour View King, the Corner Suite, and the Seawall Family Suite. Every room has a rain shower, a Nespresso machine, blackout blinds, and fast wifi; upper floors face the water and mountains.",
    breakfast: "Breakfast is served in the Driftwood Room from 7:00 to 10:30 daily, with sourdough, BC smoked salmon, seasonal fruit, and proper espresso. It costs 28 dollars per adult and 14 dollars per child, or can be bundled with your room when you book.",
    checkin_checkout: "Check-in starts at 3:00 pm and checkout is by 11:00 am. Early check-in and late checkout until 1:00 pm are free when we have space, so just ask on the day.",
    parking: "Valet parking is 55 dollars per night with unlimited in-and-out, and there is a public underground lot next door for about 35 dollars overnight. We also have secure bike storage at no charge.",
    amenities: "The hotel has a small gym, a rooftop terrace with harbour views, complimentary loaner bikes and umbrellas, and a lobby cafe serving local coffee. Room service runs from 7:00 am to 10:00 pm.",
    policies: "Free cancellation until 4:00 pm local time the day before arrival, after which one night is charged. The hotel is non-smoking, and dogs under 20 kilograms are welcome for 40 dollars per stay.",
    location: "We are in Coal Harbour on the downtown waterfront, about a 10-minute walk to Stanley Park and 5 minutes to the seawall. The SkyTrain at Burrard Station is 8 minutes on foot, and the airport is roughly 30 minutes by taxi or 40 minutes by train.",
    contact: "You can reach the front desk any time at +1 (604) 555-0148 or by email at frontdesk@driftwoodharbour.example.com. The desk is staffed 24 hours a day.",
    family: "Kids are very welcome: cribs and rollaway beds are free, the Seawall Family Suite sleeps up to five, and we keep a shelf of board games and kids' books at the front desk. The aquarium and the Stanley Park playgrounds are both an easy walk away.",
    payment: "We accept all major credit and debit cards, Apple Pay, and Google Pay; a card is required to hold every booking. Payment is taken at checkout, and a 200-dollar pre-authorization is placed at check-in for incidentals."
  },
  rooms: [
    {
      id: "city-queen",
      name: "City Queen",
      flavor: "A snug, quiet room over the city side with everything you need after a long day on the seawall.",
      sizeSqm: 24,
      beds: "1 queen bed",
      maxAdults: 2,
      maxChildren: 1,
      baseRate: 240,
      count: 8,
      features: ["Queen bed", "Rain shower", "Nespresso machine", "City view", "Work desk"]
    },
    {
      id: "harbour-view-king",
      name: "Harbour View King",
      flavor: "Wake up to seaplanes landing on the water and the North Shore mountains filling your window.",
      sizeSqm: 30,
      beds: "1 king bed",
      maxAdults: 2,
      maxChildren: 1,
      baseRate: 320,
      count: 7,
      features: ["King bed", "Harbour and mountain view", "Window seat", "Rain shower", "Nespresso machine"]
    },
    {
      id: "corner-suite",
      name: "Corner Suite",
      flavor: "A bright corner of glass with a separate sitting area, made for slow mornings and long sunsets.",
      sizeSqm: 44,
      beds: "1 king bed plus a sofa bed",
      maxAdults: 3,
      maxChildren: 1,
      baseRate: 430,
      count: 4,
      features: ["Wraparound corner windows", "Separate sitting area", "Soaker tub", "Espresso bar", "Harbour view"]
    },
    {
      id: "seawall-family-suite",
      name: "Seawall Family Suite",
      flavor: "Two proper sleeping spaces and a big view, so the whole crew rests easy before a park day.",
      sizeSqm: 55,
      beds: "1 king bed and 2 twin beds in a separate alcove",
      maxAdults: 2,
      maxChildren: 3,
      baseRate: 520,
      count: 3,
      features: ["Separate kids' alcove", "Two bathrooms", "Kitchenette", "Board games", "Mountain view"]
    }
  ],
  seasons: [
    { from: "06-01", to: "09-15", mult: 1.35, label: "summer peak" },
    { from: "12-15", to: "02-28", mult: 1.1, label: "ski shoulder" }
  ],
  weekendMult: 1.15,
  demandSeed: 11,
  refPrefix: "DRF",
  localTips: [
    {
      name: "Stanley Park seawall",
      type: "nature",
      line: "Walk or cycle the flat waterfront path around the park for ocean, forest, and mountain views in one loop.",
      hours: "Open all day, year-round"
    },
    {
      name: "Granville Island Public Market",
      type: "market",
      line: "A covered market across False Creek packed with local produce, bakeries, and artisan stalls, best reached by the tiny harbour ferries.",
      hours: "Daily 9:00-18:00"
    },
    {
      name: "Gastown food crawl",
      type: "food",
      line: "Vancouver's oldest neighbourhood mixes cobblestones and the steam clock with some of the city's best small restaurants and cafes.",
      hours: "Most kitchens 11:30-22:00"
    },
    {
      name: "Grouse Mountain day trip",
      type: "activity",
      line: "Take the gondola up the North Shore for skiing in winter or alpine hikes and city panoramas in summer, about 30 minutes from downtown.",
      hours: "Roughly 9:00-21:00, seasonal"
    },
    {
      name: "Vancouver Aquarium",
      type: "sight",
      line: "An easy walk into Stanley Park, great for a rainy morning with kids, from sea otters to jellyfish galleries.",
      hours: "Daily 10:00-17:00"
    },
    {
      name: "Coal Harbour kayaking",
      type: "activity",
      line: "Rent a kayak or paddleboard steps from the hotel and paddle calm water with float planes and mountains for company.",
      hours: "Rentals 9:00-19:00 in season"
    }
  ]
}
