import { z } from "zod"

/** A file the artist dropped (or the mock pretends they did). */
export type DroppedFile = {
  name: string
  kind: "image" | "audio" | "text"
  /** Audio only, read from the file's metadata. */
  duration?: string
  /** Object URL of a real dropped image or audio file (see lib/assets.ts). */
  url?: string
  /** Text files only: what the artist wrote, passed to the AI as notes. */
  content?: string
  /** Audio only: tags read from the file itself (see lib/assets.ts). */
  tags?: AudioTags
  /** Audio only: name of the cover art embedded in the file, registered as an image. */
  embeddedCover?: string
}

/** What an audio file says about itself in its ID3, Vorbis or MP4 tags. */
export type AudioTags = {
  title?: string
  artist?: string
  album?: string
  track?: number
  year?: number
  isrc?: string
  genre?: string
}

/** Page fields a draft question can point at. */
export const QUESTION_FIELDS = [
  "title",
  "artist",
  "description",
  "release_date",
  "cover",
  "photos",
  "tracks",
  "extras",
  "tiers",
] as const

export type QuestionField = (typeof QUESTION_FIELDS)[number]

export type Question = {
  text: string
  field?: QuestionField
  resolved: boolean
}

/** What the Claude first pass returns. Mirrors the contract in CLAUDE.md. */
export const aiDraftSchema = z.object({
  title: z.string().describe("Release title"),
  artist: z.string().describe("Artist name"),
  description: z.string().describe("2-3 sentences in the artist's voice"),
  cover: z.string().describe("Exact file name of the image used as the cover"),
  photos: z
    .array(z.string())
    .describe("Exact file names of the other images, in display order"),
  tracks: z
    .array(
      z.object({
        file: z.string().describe("Exact audio file name"),
        title: z.string().describe("Clean title fans will see"),
        position: z
          .number()
          .int()
          .describe("1-based position in the tracklist"),
      })
    )
    .describe("Every track, in the order fans will hear them"),
  extras: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().describe("One line: what fans get"),
        why_it_fits: z.string().describe("One line tied to this record"),
        tier: z.string().describe("Name of the tier that first includes it"),
      })
    )
    .describe("Two or three extras that fit this specific record"),
  tiers: z
    .array(
      z.object({
        name: z.string(),
        price_usd: z.number().positive(),
        includes: z
          .array(z.string())
          .describe('"the record" plus the names of the extras it unlocks'),
      })
    )
    .describe(
      "Two or three tiers; the base tier is the record alone, cheapest"
    ),
  // Not in the CLAUDE.md contract yet: the date the release comes out, and
  // doubts the artist resolves in place.
  release_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe(
      "Release date as YYYY-MM-DD, when the artist or the files give one"
    )
    .optional(),
  questions: z
    .array(
      z.object({
        text: z.string().describe("A short question for the artist"),
        field: z
          .enum(QUESTION_FIELDS)
          .describe(
            "The page field it's about; filling that field resolves the question"
          )
          .optional(),
      })
    )
    .describe("Doubts for the artist to resolve on the page")
    .optional(),
})

export type AiDraft = z.infer<typeof aiDraftSchema>

export type Tier = AiDraft["tiers"][number]

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
  /** Suggested by the AI, or added by the artist in the Access tab. */
  source: "ai" | "manual"
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
  questions: Question[]
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
    source: "ai",
  }))
}

/**
 * Merges what the AI sent into the release. A first pass sends every field;
 * a later edit sends only the fields it changes, and the rest stay as they are.
 */
export function applyDraft(
  release: Release,
  draft: Partial<AiDraft>,
  files: DroppedFile[]
): Release {
  const next = { ...release }
  const aiFields = new Set(release.aiFields)

  for (const field of ["title", "artist", "description"] as const) {
    const value = draft[field]
    if (value === undefined) continue
    next[field] = value
    aiFields.add(field)
  }
  if (draft.cover !== undefined) next.cover = draft.cover || null
  if (draft.photos) next.photos = draft.photos
  if (draft.tracks) {
    const durations = new Map(files.map((f) => [f.name, f.duration]))
    const previous = new Map(release.tracks.map((t) => [t.file, t]))
    next.tracks = [...draft.tracks]
      .sort((a, b) => a.position - b.position)
      .map((t) => ({
        file: t.file,
        title: t.title,
        duration: durations.get(t.file) ?? previous.get(t.file)?.duration ?? "",
        bonus:
          previous.get(t.file)?.bonus ?? /voice memo|demo|bonus/i.test(t.title),
      }))
    for (const t of release.tracks) aiFields.delete(trackField(t.file))
    for (const t of next.tracks) aiFields.add(trackField(t.file))
  }
  if (draft.extras) {
    // Keep the artist's Keep/Remove decisions on extras the AI sends again.
    // Extras the artist added by hand stay as they are.
    const decided = new Map(release.extras.map((e) => [e.name, e.status]))
    next.extras = [
      ...toExtras(draft.extras).map((e) => ({
        ...e,
        status: decided.get(e.name) ?? e.status,
      })),
      ...release.extras.filter((e) => e.source === "manual"),
    ]
  }
  if (draft.tiers) next.tiers = draft.tiers
  if (draft.release_date) next.releaseDate = draft.release_date
  if (draft.questions) {
    next.questions = draft.questions.map((q) => ({ ...q, resolved: false }))
  }

  next.aiFields = [...aiFields]
  return next
}

export const trackField = (file: string) => `track:${file}`

export function isEmpty(release: Release) {
  return !release.title && !release.cover && release.tracks.length === 0
}

/** Fields Publish needs; each one is a place in the editor the artist can jump to. */
export type RequiredField =
  "cover" | "title" | "artist" | "release_date" | "tracks" | "tiers"

/** What a release needs before it can be published, in page order. */
export function missingBeforePublish(release: Release) {
  const checks: [boolean, RequiredField, string][] = [
    [!release.cover, "cover", "cover"],
    [!release.title.trim(), "title", "title"],
    [!release.artist.trim(), "artist", "artist name"],
    [!release.releaseDate, "release_date", "release date"],
    [!release.tracks.length, "tracks", "at least one track"],
    [!release.tiers.length, "tiers", "a price"],
  ]
  return checks
    .filter(([isMissing]) => isMissing)
    .map(([, field, label]) => ({ field, label }))
}

export function canPublish(release: Release) {
  return missingBeforePublish(release).length === 0
}

/** Marks the questions about `field` as resolved once the artist fills it in. */
export function resolveQuestionsFor(
  questions: Question[],
  field: QuestionField
) {
  return questions.some((q) => q.field === field && !q.resolved)
    ? questions.map((q) => (q.field === field ? { ...q, resolved: true } : q))
    : questions
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

/** Tracks added by hand without a file get an id in place of a file name. */
export const MANUAL_TRACK_PREFIX = "manual:"

export const isManualTrack = (track: Track) =>
  track.file.startsWith(MANUAL_TRACK_PREFIX)

/**
 * A track title from a messy file name: "03_window seat MIX v2.wav" becomes
 * "Window Seat". The AI pass does this better; this is the by-hand version.
 */
export function cleanTitle(fileName: string) {
  const noise = /^(master|mix|final|v\d+|\d+bit|\d{1,2})$/i
  return fileName
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[()[\]]/g, " ")
    .split(/[\s_-]+/)
    .filter((word) => word && !noise.test(word))
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * Tracks for audio files the artist adds by hand. Titles and order come from
 * the files' own tags when they have them, else from the file names.
 */
export function tracksFromFiles(files: DroppedFile[]): Track[] {
  return files
    .filter((f) => f.kind === "audio")
    .sort(
      (a, b) =>
        (a.tags?.track ?? Number.MAX_SAFE_INTEGER) -
        (b.tags?.track ?? Number.MAX_SAFE_INTEGER)
    )
    .map((f) => ({
      file: f.name,
      title: f.tags?.title || cleanTitle(f.name) || f.name,
      duration: f.duration ?? "",
      bonus: /voice memo|demo|bonus/i.test(f.tags?.title ?? f.name),
    }))
}

/** A new tier for the Access tab: a free name, priced above the current top tier. */
export function newTier(tiers: Tier[]): Tier {
  const names = new Set(tiers.map((t) => t.name))
  let n = tiers.length + 1
  while (names.has(`Tier ${n}`)) n++
  const top = Math.max(0, ...tiers.map((t) => t.price_usd))
  return {
    name: tiers.length ? `Tier ${n}` : "Listen",
    price_usd: tiers.length ? top + 5 : 7,
    includes: ["the record"],
  }
}

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}
