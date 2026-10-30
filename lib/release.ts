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
  // Not in the CLAUDE.md contract yet: doubts the artist resolves in place.
  questions: z
    .array(z.string())
    .describe("Short doubts for the artist to resolve on the page")
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
    const decided = new Map(release.extras.map((e) => [e.name, e.status]))
    next.extras = toExtras(draft.extras).map((e) => ({
      ...e,
      status: decided.get(e.name) ?? e.status,
    }))
  }
  if (draft.tiers) next.tiers = draft.tiers
  if (draft.questions) next.questions = draft.questions

  next.aiFields = [...aiFields]
  return next
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

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}
