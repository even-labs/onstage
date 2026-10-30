import {
  emptyRelease,
  toExtras,
  trackField,
  tracksFromFiles,
  type AiDraft,
  type DroppedFile,
  type Extra,
  type ExtraStatus,
  type Release,
  type Tier,
} from "@/lib/release"

type TextField = "title" | "artist" | "description"

export type ReleaseAction =
  | { type: "load"; release: Release }
  | { type: "reset" }
  | { type: "edit"; field: TextField; value: string; by?: "ai" }
  | { type: "setReleaseDate"; value: string }
  | { type: "setCover"; file: string }
  | { type: "addPhotos"; files: string[] }
  | { type: "addTracks"; files: DroppedFile[] }
  | { type: "renameTrack"; file: string; title: string }
  | { type: "moveTrack"; from: number; to: number }
  | { type: "toggleBonus"; file: string }
  | { type: "setExtraStatus"; id: string; status: ExtraStatus }
  | {
      type: "editExtra"
      id: string
      patch: Partial<Pick<Extra, "name" | "description">>
    }
  | { type: "replaceExtras"; extras: AiDraft["extras"]; tiers: Tier[] }
  | { type: "setTierPrice"; name: string; price: number }
  | { type: "resolveQuestion"; index: number }

function markAi(aiFields: string[], field: string, by?: "ai") {
  const rest = aiFields.filter((f) => f !== field)
  return by === "ai" ? [...rest, field] : rest
}

export function releaseReducer(state: Release, action: ReleaseAction): Release {
  switch (action.type) {
    case "load":
      return action.release

    case "reset":
      return emptyRelease

    case "edit":
      return {
        ...state,
        [action.field]: action.value,
        aiFields: markAi(state.aiFields, action.field, action.by),
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

    case "addTracks": {
      const known = new Set(state.tracks.map((t) => t.file))
      const added = tracksFromFiles(action.files).filter(
        (t) => !known.has(t.file)
      )
      return added.length
        ? { ...state, tracks: [...state.tracks, ...added] }
        : state
    }

    case "renameTrack":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.file === action.file ? { ...t, title: action.title } : t
        ),
        aiFields: markAi(state.aiFields, trackField(action.file)),
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

    case "replaceExtras":
      return {
        ...state,
        extras: toExtras(action.extras),
        tiers: action.tiers,
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
