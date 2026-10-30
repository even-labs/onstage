import type { DroppedFile } from "@/lib/release"

// Real files the artist dropped. The release object only holds file names so it
// stays serializable; this map holds what the page needs to show each one.
const urls = new Map<string, string>()

/** Object URL for a dropped image or audio file, if the artist really dropped it. */
export const assetUrl = (name: string) => urls.get(name)

export const isImageFile = (file: File) => file.type.startsWith("image/")

/** Registers a dropped file and describes it the way the agent expects. */
export function registerAsset(file: File): Promise<DroppedFile> {
  const dropped: DroppedFile = { name: file.name, kind: kindOf(file) }
  if (dropped.kind === "text") {
    // Notes go to the agent as text, so the AI can keep the artist's voice.
    if (!file.type.startsWith("text/")) return Promise.resolve(dropped)
    return file
      .text()
      .then((content) => ({ ...dropped, content: content.slice(0, 20_000) }))
  }

  const url = URL.createObjectURL(file)
  urls.set(file.name, url)
  if (dropped.kind === "image") return Promise.resolve({ ...dropped, url })
  return readDuration(url).then((duration) => ({ ...dropped, url, duration }))
}

export const registerAssets = (files: Iterable<File>) =>
  Promise.all(Array.from(files, registerAsset))

function kindOf(file: File): DroppedFile["kind"] {
  if (isImageFile(file)) return "image"
  if (file.type.startsWith("audio/")) return "audio"
  return "text"
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
