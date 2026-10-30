/** A file the artist dropped (or the mock pretends they did). */
export type DroppedFile = {
  name: string
  kind: "image" | "audio" | "text"
  /** Audio only, read from the file's metadata. */
  duration?: string
  /** Object URL of a real dropped image or audio file (see lib/assets.ts). */
  url?: string
}

export type Tier = {
  name: string
  price_usd: number
  includes: string[]
}

/** What the Claude first pass returns. Mirrors the contract in CLAUDE.md. */
export type AiDraft = {
  title: string
  artist: string
  description: string
  cover: string
  photos: string[]
  tracks: { file: string; title: string; position: number }[]
  extras: {
    name: string
    description: string
    why_it_fits: string
    tier: string
  }[]
  tiers: Tier[]
  /** Not in the CLAUDE.md contract yet: doubts the artist resolves in place. */
  questions?: string[]
}

export type Track = {
  file: string
  title: string
  duration: string
  bonus: boolean
}

export type ExtraStatus = "suggested" | "kept" | "removed"

export type Extra = AiDraft["extras"][number] & {
  id: string
  status: ExtraStatus
}

/** The single source of truth both edit and publish modes render from. */
export type Release = {
  title: string
  artist: string
  description: string
  /** ISO date, e.g. 2026-11-20. */
  releaseDate: string
  cover: string | null
  photos: string[]
  tracks: Track[]
  extras: Extra[]
  tiers: Tier[]
  questions: string[]
  /** Fields the AI wrote that the artist hasn't touched yet. */
  aiFields: string[]
}

export const emptyRelease: Release = {
  title: "",
  artist: "",
  description: "",
  releaseDate: "",
  cover: null,
  photos: [],
  tracks: [],
  extras: [],
  tiers: [],
  questions: [],
  aiFields: [],
}

export const FAN_BENEFITS = [
  "Unlimited streaming via EVEN & EVEN App",
  "Offline music player",
  "Download available to device",
]

export function toExtras(draftExtras: AiDraft["extras"]): Extra[] {
  return draftExtras.map((extra, i) => ({
    ...extra,
    id: `${slugify(extra.name)}-${i}`,
    status: "suggested",
  }))
}

export function releaseFromDraft(
  draft: AiDraft,
  files: DroppedFile[],
  releaseDate: string
): Release {
  const durations = new Map(files.map((f) => [f.name, f.duration ?? ""]))
  const tracks = [...draft.tracks]
    .sort((a, b) => a.position - b.position)
    .map((t) => ({
      file: t.file,
      title: t.title,
      duration: durations.get(t.file) ?? "",
      bonus: /voice memo|demo|bonus/i.test(t.title),
    }))

  return {
    title: draft.title,
    artist: draft.artist,
    description: draft.description,
    releaseDate,
    cover: draft.cover,
    photos: draft.photos,
    tracks,
    extras: toExtras(draft.extras),
    tiers: draft.tiers,
    questions: draft.questions ?? [],
    aiFields: [
      "title",
      "artist",
      "description",
      ...tracks.map((t) => trackField(t.file)),
    ],
  }
}

export const trackField = (file: string) => `track:${file}`

export function isEmpty(release: Release) {
  return !release.title && !release.cover && release.tracks.length === 0
}

export function canPublish(release: Release) {
  return Boolean(release.cover && release.title.trim() && release.tracks.length)
}

export function releaseType(trackCount: number) {
  if (trackCount <= 3) return "Single"
  if (trackCount <= 6) return "EP"
  return "Album"
}

export function minPrice(tiers: Tier[]) {
  if (!tiers.length) return null
  return Math.min(...tiers.map((t) => t.price_usd))
}

export function tierPrice(tiers: Tier[], tierName: string) {
  return tiers.find((t) => t.name === tierName)?.price_usd ?? null
}

export function formatDate(iso: string) {
  if (!iso) return ""
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso))
}

/**
 * A track title from a messy file name: "03_window seat MIX v2.wav" becomes
 * "Window Seat". The AI pass does this better; this is the by-hand version.
 */
export function cleanTitle(fileName: string) {
  const noise = /^(master|mix|final|v\d+|\d+bit|\d{1,2})$/i
  const words = fileName
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[()[\]]/g, " ")
    .split(/[\s_-]+/)
    .filter((word) => word && !noise.test(word))
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/** Tracks for audio files the artist dropped on the list, without the AI. */
export function tracksFromFiles(files: DroppedFile[]): Track[] {
  return files
    .filter((f) => f.kind === "audio")
    .map((f) => ({
      file: f.name,
      title: cleanTitle(f.name) || f.name,
      duration: f.duration ?? "",
      bonus: /voice memo|demo|bonus/i.test(f.name),
    }))
}

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}
