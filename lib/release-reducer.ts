import {
  applyDraft,
  emptyRelease,
  resolveQuestionsFor,
  trackField,
  type AiDraft,
  type DroppedFile,
  type Extra,
  type ExtraStatus,
  type QuestionField,
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
  | { type: "toggleQuestion"; index: number }

/** The artist touched this field, so it no longer counts as AI-written. */
function unmarkAi(aiFields: string[], field: string) {
  return aiFields.filter((f) => f !== field)
}

/** The page field an artist's action fills in, for resolving draft questions. */
function answeredField(action: ReleaseAction): QuestionField | null {
  switch (action.type) {
    case "edit":
      return action.value.trim() ? action.field : null
    case "setReleaseDate":
      return action.value ? "release_date" : null
    case "setCover":
      return "cover"
    case "addPhotos":
      return "photos"
    case "renameTrack":
    case "moveTrack":
    case "toggleBonus":
      return "tracks"
    case "setExtraStatus":
    case "editExtra":
      return "extras"
    case "setTierPrice":
      return "tiers"
    default:
      return null
  }
}

export function releaseReducer(state: Release, action: ReleaseAction): Release {
  const next = applyAction(state, action)
  const field = answeredField(action)
  if (!field) return next
  return { ...next, questions: resolveQuestionsFor(next.questions, field) }
}

function applyAction(state: Release, action: ReleaseAction): Release {
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

    case "toggleQuestion":
      return {
        ...state,
        questions: state.questions.map((q, i) =>
          i === action.index ? { ...q, resolved: !q.resolved } : q
        ),
      }
  }
}
