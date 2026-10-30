import type { Release } from "@/lib/release"

// "Save draft" keeps the release in this browser only. Real dropped files are
// object URLs and do not survive a reload, so a restored draft shows the mock
// art for them until the artist drops the files again.

const KEY = "onstage:draft"

export type SavedDraft = { release: Release; savedAt: string }

export function saveDraft(release: Release): SavedDraft | null {
  const draft = { release, savedAt: new Date().toISOString() }
  try {
    localStorage.setItem(KEY, JSON.stringify(draft))
    return draft
  } catch {
    return null
  }
}

export function loadDraft(): SavedDraft | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as Partial<SavedDraft>
    return draft.release && draft.savedAt ? (draft as SavedDraft) : null
  } catch {
    return null
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
