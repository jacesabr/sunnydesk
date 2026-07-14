export default {
  id: "amber-haveli",
  name: "The Amber Haveli",
  city: "Jaipur, Rajasthan",
  country: "India",
  currency: "INR",
  currencySymbol: "₹",
  primaryLanguage: "hi",
  languageName: "Hindi",
  agentName: "Kavya",
  voice: "marin",
  timezone: "Asia/Kolkata",
  phone: "+91 141 298 4460",
  email: "frontdesk@amberhaveli.example.com",
  address: "14 Chandni Chowk Gali, near Tripolia Bazaar, Pink City, Jaipur 302002, Rajasthan",
  checkin: "14:00",
  checkout: "11:00",
  greeting: "Namaste, Amber Haveli mein aapka hardik swagat hai — main Kavya bol rahi hoon. Main aapki kaise madad kar sakti hoon? … You're most welcome to speak English as well.",
  vibe: "A restored 19th-century merchant haveli where frescoed archways, a quiet marble courtyard, and the evening call of pigeons off the rooftop make the old Pink City feel close enough to touch. Service is unhurried and personal, more like staying with a well-connected Jaipur family than at a hotel.",
  facts: {
    overview: "The Amber Haveli is a restored 19th-century haveli boutique hotel with 24 rooms in the heart of Jaipur's old Pink City. It is built around a central marble courtyard and has a rooftop restaurant overlooking the old city walls.",
    rooms: "We have 24 rooms across four types: Courtyard Rooms, Heritage Doubles, Jharokha Suites, and our Rooftop Haveli Suites. Every room keeps original haveli details like lime-plastered walls, arched niches, and hand-painted frescoes, alongside modern air conditioning and bathrooms.",
    breakfast: "A traditional Rajasthani and continental breakfast is served on the rooftop from 7:30 to 10:30 each morning, and it is included in every room rate. Expect fresh parathas, poha, seasonal fruit, filter coffee, and proper masala chai.",
    checkin_checkout: "Check-in is from 2:00 PM and check-out is by 11:00 AM. Early check-in and late check-out are offered when rooms allow, and we are happy to store luggage and let you use the courtyard either side of your stay.",
    parking: "We have a small gated parking court for six cars just beside the haveli, free for guests, though the old-city lanes are narrow so larger vehicles should use the public lot near the bazaar gate two minutes away. Our doorman will guide your driver in.",
    amenities: "Amenities include the rooftop restaurant, a courtyard cafe with all-day chai, free Wi-Fi throughout, a small heritage library lounge, same-day laundry, and evening folk music in the courtyard on weekends. We can arrange guides, drivers, and block-printing or cooking experiences on request.",
    policies: "Free cancellation up to 48 hours before arrival; later cancellations are charged one night. The haveli is entirely non-smoking indoors, though smoking is permitted on the rooftop terrace, and we ask guests to keep courtyard noise low after 10:30 PM.",
    location: "We are tucked into a quiet lane off Tripolia Bazaar inside the walled Pink City, about a 10-minute walk from the City Palace area and 25 minutes by car from Jaipur International Airport. Amber Fort is roughly a 30-minute drive north.",
    contact: "You can reach the front desk any time at +91 141 298 4460 or frontdesk@amberhaveli.example.com. The desk is staffed 24 hours a day.",
    family: "Families are very welcome; children under 6 stay free in their parents' room and cots are available at no charge. The Jharokha and Rooftop Haveli Suites comfortably fit a family of four, and the kitchen happily prepares mild dishes for young children.",
    payment: "We accept all major credit and debit cards, UPI, and cash in Indian rupees. A card guarantee is taken at booking and payment is settled at check-out; foreign currency cannot be accepted directly."
  },
  rooms: [
    {
      id: "courtyard-room",
      name: "Courtyard Room",
      flavor: "A calm, cool room opening straight onto the marble courtyard, where morning chai arrives with the sound of the fountain.",
      sizeSqm: 22,
      beds: "1 queen bed",
      maxAdults: 2,
      maxChildren: 1,
      baseRate: 6500,
      count: 8,
      features: ["Courtyard-facing seating nook", "Hand-painted fresco wall", "Rain shower", "Air conditioning"]
    },
    {
      id: "heritage-double",
      name: "Heritage Double",
      flavor: "A generous first-floor room with original arched windows and a swing seat, made for slow afternoons.",
      sizeSqm: 30,
      beds: "1 king bed or 2 twin beds",
      maxAdults: 2,
      maxChildren: 2,
      baseRate: 8900,
      count: 8,
      features: ["Traditional jhoola swing seat", "Arched bazaar-side windows", "Writing desk", "Marble bathroom", "Tea and coffee tray"]
    },
    {
      id: "jharokha-suite",
      name: "Jharokha Suite",
      flavor: "A romantic suite built around its own carved jharokha balcony, perfect for watching the lane below come alive at dusk.",
      sizeSqm: 42,
      beds: "1 king bed plus daybed",
      maxAdults: 3,
      maxChildren: 1,
      baseRate: 12500,
      count: 5,
      features: ["Private carved jharokha balcony", "Separate sitting area", "Soaking tub", "Antique Rajasthani furnishings", "Evening turndown with chai"]
    },
    {
      id: "rooftop-haveli-suite",
      name: "Rooftop Haveli Suite",
      flavor: "Our crowning suite on the rooftop level, with a private terrace that looks clear across the old city to the hills.",
      sizeSqm: 55,
      beds: "1 king bed plus sofa bed",
      maxAdults: 3,
      maxChildren: 2,
      baseRate: 16000,
      count: 3,
      features: ["Private old-city-view terrace", "Outdoor daybed", "Dining nook for four", "Twin-vanity bathroom", "Priority rooftop dinner seating"]
    }
  ],
  seasons: [
    { from: "10-01", to: "03-31", mult: 1.3, label: "winter peak" },
    { from: "07-01", to: "09-15", mult: 0.8, label: "monsoon low" }
  ],
  weekendMult: 1.15,
  demandSeed: 17,
  refPrefix: "AMB",
  localTips: [
    {
      name: "Amber Fort",
      type: "sight",
      line: "The great hilltop fort north of the city rewards an early start, when the mirrored halls and ramparts are quiet and the light is soft.",
      hours: "Daily 8:00-17:30"
    },
    {
      name: "Johari Bazaar",
      type: "market",
      line: "Jaipur's famous jewellery bazaar glitters with gemstones, silver, and lac bangles, and it is a short walk from our door.",
      hours: "Most shops 11:00-20:00, many closed Sunday"
    },
    {
      name: "Panna Meena stepwell",
      type: "sight",
      line: "A photogenic old stepwell near the Amber road, its criss-crossing stairs are best seen in mid-morning light.",
      hours: "Daylight hours, free entry"
    },
    {
      name: "Old-city thali and chai crawl",
      type: "food",
      line: "Ask us to mark a walking route for a proper Rajasthani thali, kachori at a bazaar counter, and cutting chai from a lane-side stall.",
      hours: "Best 12:00-15:00 or after 18:00"
    },
    {
      name: "City Palace quarter",
      type: "culture",
      line: "The royal palace complex and the honeycomb facade of the famous wind palace nearby make an easy half-day on foot from the haveli.",
      hours: "Daily 9:30-17:00"
    },
    {
      name: "Block-printing workshop in Sanganer",
      type: "activity",
      line: "Spend an afternoon hand-printing your own fabric with a printing family in Sanganer; we arrange the visit and the driver.",
      hours: "By arrangement, usually 10:00-16:00"
    }
  ]
}
