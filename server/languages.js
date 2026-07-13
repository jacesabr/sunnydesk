// The languages the self-serve builder offers — a curated set that gpt-realtime
// handles fluently for a spoken receptionist. `code` drives the persona's
// language pinning; `defaultAgent` is a fitting receptionist name for that
// language (the visitor can override).
export const LANGUAGES = [
  { code: "en", name: "English", defaultAgent: "Maddie" },
  { code: "es", name: "Spanish", defaultAgent: "Lucía" },
  { code: "fr", name: "French", defaultAgent: "Camille" },
  { code: "de", name: "German", defaultAgent: "Greta" },
  { code: "it", name: "Italian", defaultAgent: "Giulia" },
  { code: "pt", name: "Portuguese", defaultAgent: "Beatriz" },
  { code: "nl", name: "Dutch", defaultAgent: "Sanne" },
  { code: "hi", name: "Hindi", defaultAgent: "Kavya" },
  { code: "ar", name: "Arabic", defaultAgent: "Layla" },
  { code: "zh", name: "Mandarin Chinese", defaultAgent: "Mei" },
  { code: "ja", name: "Japanese", defaultAgent: "Aoi" },
  { code: "ko", name: "Korean", defaultAgent: "Jiwoo" },
  { code: "ru", name: "Russian", defaultAgent: "Anya" },
  { code: "tr", name: "Turkish", defaultAgent: "Elif" },
  { code: "pl", name: "Polish", defaultAgent: "Zofia" },
  { code: "sv", name: "Swedish", defaultAgent: "Elin" },
  { code: "id", name: "Indonesian", defaultAgent: "Putri" },
  { code: "th", name: "Thai", defaultAgent: "Ploy" },
];
