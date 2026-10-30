import type { AiDraft, DroppedFile, Tier } from "@/lib/release"

// Invented artist and release. No real fan data anywhere in this file.

export const DEMO_RELEASE_DATE = "2026-11-20"

export const DEMO_FILES: DroppedFile[] = [
  { name: "night-bus-cover_FINAL.jpg", kind: "image" },
  { name: "IMG_2041.jpg", kind: "image" },
  { name: "notebook_scan_p3.jpg", kind: "image" },
  { name: "bus_window_live.jpg", kind: "image" },
  { name: "01 last stop (master).wav", kind: "audio", duration: "3:24" },
  { name: "ultima parada_v3_FINAL.wav", kind: "audio", duration: "2:58" },
  { name: "03_window seat MIX v2.wav", kind: "audio", duration: "3:41" },
  {
    name: "night bus home - master 24bit.wav",
    kind: "audio",
    duration: "4:05",
  },
  { name: "voice memo 2am.m4a", kind: "audio", duration: "1:12" },
  { name: "notes.txt", kind: "text" },
]

/** A saved Claude response for the demo files. Also the fallback if a real call fails. */
export const LUMA_VALE_DRAFT: AiDraft = {
  title: "Night Bus Home",
  artist: "Luma Vale",
  description:
    "Four songs written on the night bus after shows, between the last stop and home. For everyone who sang along and then rode home alone with the song still in their head.",
  cover: "night-bus-cover_FINAL.jpg",
  photos: ["IMG_2041.jpg", "notebook_scan_p3.jpg", "bus_window_live.jpg"],
  tracks: [
    { file: "01 last stop (master).wav", title: "Last Stop", position: 1 },
    { file: "ultima parada_v3_FINAL.wav", title: "Última Parada", position: 2 },
    { file: "03_window seat MIX v2.wav", title: "Window Seat", position: 3 },
    {
      file: "night bus home - master 24bit.wav",
      title: "Night Bus Home",
      position: 4,
    },
    {
      file: "voice memo 2am.m4a",
      title: "Night Bus Home (2 AM voice memo)",
      position: 5,
    },
  ],
  extras: [
    {
      name: "The lyric notebook",
      description: "Notebook scans behind every song, plus the 2 AM memo.",
      why_it_fits: "You already have the notebook photo and the memo.",
      tier: "Notebook",
    },
    {
      name: "Ride early",
      description: "“Window Seat” today, the full EP on November 20.",
      why_it_fits: "Three weeks out: money in now.",
      tier: "Notebook",
    },
    {
      name: "Last-stop listening party",
      description: "Live online party on release night, 50 fans.",
      why_it_fits: "A close fanbase pays to be in the room.",
      tier: "Front row",
    },
  ],
  tiers: [
    { name: "Listen", price_usd: 7, includes: ["the record"] },
    {
      name: "Notebook",
      price_usd: 12,
      includes: ["the record", "The lyric notebook", "Ride early"],
    },
    {
      name: "Front row",
      price_usd: 25,
      includes: [
        "the record",
        "The lyric notebook",
        "Ride early",
        "Last-stop listening party",
      ],
    },
  ],
  questions: [
    "Is “Última Parada” spelled with an accent on the release? The file name has none.",
    "Should the voice memo be free for everyone, or only inside the lyric notebook extra?",
  ],
}

export const ALT_EXTRAS: { extras: AiDraft["extras"]; tiers: Tier[] } = {
  extras: [
    {
      name: "Window Seat (acoustic)",
      description: "A one-take acoustic version recorded on the actual bus.",
      why_it_fits: "Fans keep asking for stripped-down versions.",
      tier: "Collector",
    },
    {
      name: "Tour bus postcard set",
      description:
        "Five postcards from the photos, mailed with a handwritten line.",
      why_it_fits:
        "You have three tour photos that already look like postcards.",
      tier: "Collector",
    },
    {
      name: "Soundcheck Q&A",
      description: "A 30-minute video call before the next show, 20 fans.",
      why_it_fits: "Small rooms sell out first for you.",
      tier: "Front row",
    },
  ],
  tiers: [
    { name: "Listen", price_usd: 7, includes: ["the record"] },
    {
      name: "Collector",
      price_usd: 15,
      includes: [
        "the record",
        "Window Seat (acoustic)",
        "Tour bus postcard set",
      ],
    },
    {
      name: "Front row",
      price_usd: 30,
      includes: [
        "the record",
        "Window Seat (acoustic)",
        "Tour bus postcard set",
        "Soundcheck Q&A",
      ],
    },
  ],
}

export const SHORT_DESCRIPTION =
  "Songs from the night bus, written between the last stop and home."

/** Stand-ins for real images: one gradient per mock file name. */
export const MOCK_ART: Record<string, string> = {
  "night-bus-cover_FINAL.jpg":
    "radial-gradient(circle at 72% 28%, #ffb35c 0 9%, transparent 10%), linear-gradient(160deg, #4a2a3a, #140f16 70%)",
  "IMG_2041.jpg": "linear-gradient(200deg, #2c3e66, #0f1324 75%)",
  "notebook_scan_p3.jpg":
    "repeating-linear-gradient(180deg, #e9e2d0 0 14px, #cfc6b0 14px 15px)",
  "bus_window_live.jpg":
    "radial-gradient(circle at 30% 70%, #ff6b4a55 0 18%, transparent 40%), linear-gradient(140deg, #3a1f2e, #0d0b10 70%)",
}

export const FALLBACK_ART = "linear-gradient(160deg, #3f3f46, #18181b 70%)"

export const SUGGESTED_PROMPTS = {
  start: [
    "A 5-song EP about riding the night bus home after shows, out Nov 20",
  ],
  draft: [
    "Suggest other extras",
    "Make the description shorter",
    "Lower the base price",
    "Start over",
  ],
}
