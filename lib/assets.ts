import type { AudioTags, DroppedFile } from "@/lib/release"

// Real files the artist dropped. The release object only holds file names so it
// stays serializable; this map holds what the page needs to show each one.
const urls = new Map<string, string>()

/** Object URL for a dropped image or audio file, if the artist really dropped it. */
export const assetUrl = (name: string) => urls.get(name)

export const isImageFile = (file: File) => file.type.startsWith("image/")
export const isAudioFile = (file: File) => file.type.startsWith("audio/")
const isPdfFile = (file: File) =>
  file.type === "application/pdf" || /\.pdf$/i.test(file.name)

/** Registers a dropped file and describes it the way the agent expects. */
export function registerAsset(file: File): Promise<DroppedFile> {
  const dropped: DroppedFile = { name: file.name, kind: kindOf(file) }
  if (dropped.kind === "text") {
    // Notes and briefs go to the agent as text, so the AI can keep the
    // artist's voice and details.
    if (isPdfFile(file)) {
      return readPdfText(file).then((content) =>
        content ? { ...dropped, content } : dropped
      )
    }
    if (!file.type.startsWith("text/")) return Promise.resolve(dropped)
    return file
      .text()
      .then((content) => ({ ...dropped, content: content.slice(0, 20_000) }))
  }

  const url = URL.createObjectURL(file)
  urls.set(file.name, url)
  if (dropped.kind === "image") return Promise.resolve({ ...dropped, url })
  return readAudio(file, url).then((audio) => ({ ...dropped, url, ...audio }))
}

/**
 * Registers dropped files. Cover art embedded in an audio file comes back as
 * one more image, so the AI can pick it and the page can show it.
 */
export async function registerAssets(files: Iterable<File>) {
  const dropped = await Promise.all(Array.from(files, registerAsset))
  const covers = new Set<string>()
  return dropped.flatMap((f): DroppedFile[] => {
    if (!f.embeddedCover || covers.has(f.embeddedCover)) return [f]
    covers.add(f.embeddedCover)
    const cover: DroppedFile = {
      name: f.embeddedCover,
      kind: "image",
      url: assetUrl(f.embeddedCover),
    }
    return [f, cover]
  })
}

function kindOf(file: File): DroppedFile["kind"] {
  if (isImageFile(file)) return "image"
  if (isAudioFile(file)) return "audio"
  return "text"
}

/** The text of a PDF (a release brief, a press kit), read in the browser. */
async function readPdfText(file: File) {
  try {
    // Loaded on the first PDF drop, so it stays out of the initial bundle.
    const { extractText } = await import("unpdf")
    const { text } = await extractText(
      new Uint8Array(await file.arrayBuffer()),
      {
        mergePages: true,
      }
    )
    return text.trim().slice(0, 20_000)
  } catch {
    // A scanned or broken PDF still reaches the agent by name.
    return undefined
  }
}

// Tracks from one album usually carry the same artwork, so one copy is kept
// per image, keyed by its type and size.
const embeddedCovers = new Map<string, string>()

/**
 * Reads what an audio file says about itself: its duration, its tags (title,
 * track number, artist, album, year, ISRC, genre) and any embedded cover art.
 * Only metadata is read; the audio never leaves the browser.
 */
async function readAudio(
  file: File,
  url: string
): Promise<Pick<DroppedFile, "duration" | "tags" | "embeddedCover">> {
  try {
    // Loaded on the first audio drop, so it stays out of the initial bundle.
    const { parseBlob } = await import("music-metadata")
    const { common, format } = await parseBlob(file)
    const picture = common.picture?.[0]
    let embeddedCover: string | undefined
    if (picture) {
      const key = `${picture.format}:${picture.data.length}`
      embeddedCover = embeddedCovers.get(key)
      if (!embeddedCover) {
        embeddedCover = `${file.name}.cover.${picture.format.split("/")[1] ?? "jpg"}`
        embeddedCovers.set(key, embeddedCover)
        const blob = new Blob([new Uint8Array(picture.data)], {
          type: picture.format,
        })
        urls.set(embeddedCover, URL.createObjectURL(blob))
      }
    }
    return {
      duration: format.duration
        ? formatDuration(format.duration)
        : await readDuration(url),
      tags: compactTags({
        title: common.title,
        artist: common.artist,
        album: common.album,
        track: common.track.no ?? undefined,
        year: common.year,
        isrc: common.isrc?.[0],
        genre: common.genre?.[0],
      }),
      embeddedCover,
    }
  } catch {
    // A format the parser doesn't know still gets a duration from the browser.
    return { duration: await readDuration(url) }
  }
}

function compactTags(tags: AudioTags): AudioTags | undefined {
  const entries = Object.entries(tags).filter(
    ([, value]) => value !== undefined && value !== ""
  )
  return entries.length ? Object.fromEntries(entries) : undefined
}

/** Reads the duration from the audio metadata; gives up after 4 s. */
function readDuration(url: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const audio = new Audio()
    let settled = false
    const done = (seconds?: number) => {
      if (settled) return
      settled = true
      audio.removeAttribute("src")
      resolve(
        seconds && Number.isFinite(seconds)
          ? formatDuration(seconds)
          : undefined
      )
    }
    audio.preload = "metadata"
    audio.onloadedmetadata = () => done(audio.duration)
    audio.onerror = () => done()
    setTimeout(() => done(), 4000)
    audio.src = url
  })
}

export function formatDuration(seconds: number) {
  const total = Math.round(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}
