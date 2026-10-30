import {
  applyDraft,
  emptyRelease,
  trackField,
  type AiDraft,
  type DroppedFile,
  type Extra,
  type ExtraStatus,
  type Release,
} from "@/lib/release"

type TextField = "title" | "artist" | "description"

export type ReleaseAction =
  | { type: "applyDraft"; draft: Partial<AiDraft>; files: DroppedFile[] }
  | { type: "reset" }
  | { type: "edit"; field: TextField; value: string }
  | { type: "setReleaseDate"; value: string }
  | { type: "setCover"; file: string }
  | { type: "addPhotos"; files: string[] }
  | { type: "renameTrack"; file: string; title: string }
  | { type: "moveTrack"; from: number; to: number }
  | { type: "toggleBonus"; file: string }
  | { type: "setExtraStatus"; id: string; status: ExtraStatus }
  | {
      type: "editExtra"
      id: string
      patch: Partial<Pick<Extra, "name" | "description">>
    }
  | { type: "setTierPrice"; name: string; price: number }
  | { type: "resolveQuestion"; index: number }

/** The artist touched this field, so it no longer counts as AI-written. */
function unmarkAi(aiFields: string[], field: string) {
  return aiFields.filter((f) => f !== field)
}

export function releaseReducer(state: Release, action: ReleaseAction): Release {
  switch (action.type) {
    case "applyDraft":
      return applyDraft(state, action.draft, action.files)

    case "reset":
      return emptyRelease

    case "edit":
      return {
        ...state,
        [action.field]: action.value,
        aiFields: unmarkAi(state.aiFields, action.field),
      }

    case "setReleaseDate":
      return { ...state, releaseDate: action.value }

    case "setCover":
      return { ...state, cover: action.file }

    case "addPhotos":
      return {
        ...state,
        photos: [
          ...state.photos,
          ...action.files.filter((f) => !state.photos.includes(f)),
        ],
      }

    case "renameTrack":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.file === action.file ? { ...t, title: action.title } : t
        ),
        aiFields: unmarkAi(state.aiFields, trackField(action.file)),
      }

    case "moveTrack": {
      // `to` is an insertion index into the list before the move.
      const tracks = [...state.tracks]
      const [moved] = tracks.splice(action.from, 1)
      const to = action.to > action.from ? action.to - 1 : action.to
      tracks.splice(to, 0, moved)
      return { ...state, tracks }
    }

    case "toggleBonus":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.file === action.file ? { ...t, bonus: !t.bonus } : t
        ),
      }

    case "setExtraStatus":
      return {
        ...state,
        extras: state.extras.map((e) =>
          e.id === action.id ? { ...e, status: action.status } : e
        ),
      }

    case "editExtra": {
      const extra = state.extras.find((e) => e.id === action.id)
      if (!extra) return state
      const renamed = action.patch.name ?? extra.name
      return {
        ...state,
        extras: state.extras.map((e) =>
          e.id === action.id ? { ...e, ...action.patch } : e
        ),
        // Tiers list extras by name, so a rename has to follow through.
        tiers: state.tiers.map((t) => ({
          ...t,
          includes: t.includes.map((i) => (i === extra.name ? renamed : i)),
        })),
      }
    }

    case "setTierPrice":
      return {
        ...state,
        tiers: state.tiers.map((t) =>
          t.name === action.name ? { ...t, price_usd: action.price } : t
        ),
      }

    case "resolveQuestion":
      return {
        ...state,
        questions: state.questions.filter((_, i) => i !== action.index),
      }
  }
}
