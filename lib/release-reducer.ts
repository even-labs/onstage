import {
  applyDraft,
  emptyRelease,
  newTier,
  resolveQuestionsFor,
  trackField,
  type AiDraft,
  type DroppedFile,
  type Extra,
  type ExtraStatus,
  type QuestionField,
  type Release,
  type Track,
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
  /** Puts back a release as it was, to undo a removal. */
  | { type: "restore"; release: Release }
  | { type: "addTracks"; tracks: Track[] }
  | { type: "removeTrack"; file: string }
  | { type: "removeCover" }
  | { type: "removePhoto"; file: string }
  | { type: "addTier" }
  | { type: "renameTier"; name: string; to: string }
  | { type: "removeTier"; name: string }
  | { type: "toggleTierItem"; tier: string; item: string }
  | { type: "addExtra"; id: string }
  | { type: "setExtraTier"; id: string; tier: string }
  | { type: "removeExtra"; id: string }

/** The artist touched this field, so it no longer counts as AI-written. */
function unmarkAi(aiFields: string[], field: string) {
  return aiFields.filter((f) => f !== field)
}

/**
 * The page field an artist's action fills in, for resolving draft questions.
 * Only single-value fields count: filling in the artist name answers "what's
 * the artist name?", but keeping one extra doesn't answer a question about
 * another one, so questions about lists are checked off by hand.
 */
function answeredField(action: ReleaseAction): QuestionField | null {
  switch (action.type) {
    case "edit":
      return action.value.trim() ? action.field : null
    case "setReleaseDate":
      return action.value ? "release_date" : null
    case "setCover":
      return "cover"
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
      // Tiers point at extras by name, so names must stay unique and non-empty.
      if (!extraNameAvailable(state, renamed, extra.id)) return state
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

    case "restore":
      return action.release

    case "addTracks": {
      const known = new Set(state.tracks.map((t) => t.file))
      const added = action.tracks.filter((t) => !known.has(t.file))
      return added.length
        ? { ...state, tracks: [...state.tracks, ...added] }
        : state
    }

    case "removeTrack":
      return {
        ...state,
        tracks: state.tracks.filter((t) => t.file !== action.file),
        aiFields: unmarkAi(state.aiFields, trackField(action.file)),
      }

    case "removeCover":
      return { ...state, cover: null }

    case "removePhoto":
      return { ...state, photos: state.photos.filter((p) => p !== action.file) }

    case "addTier":
      return { ...state, tiers: [...state.tiers, newTier(state.tiers)] }

    case "renameTier": {
      const to = action.to.trim()
      if (!to || state.tiers.some((t) => t.name === to)) return state
      return {
        ...state,
        tiers: state.tiers.map((t) =>
          t.name === action.name ? { ...t, name: to } : t
        ),
        extras: state.extras.map((e) =>
          e.tier === action.name ? { ...e, tier: to } : e
        ),
      }
    }

    case "removeTier": {
      const tiers = state.tiers.filter((t) => t.name !== action.name)
      const fallback = [...tiers].sort((a, b) => a.price_usd - b.price_usd)[0]
      return {
        ...state,
        tiers,
        extras: state.extras.map((e) =>
          e.tier === action.name ? { ...e, tier: fallback?.name ?? "" } : e
        ),
      }
    }

    case "toggleTierItem":
      return {
        ...state,
        tiers: state.tiers.map((t) =>
          t.name !== action.tier
            ? t
            : {
                ...t,
                includes: t.includes.includes(action.item)
                  ? t.includes.filter((i) => i !== action.item)
                  : [...t.includes, action.item],
              }
        ),
      }

    case "addExtra": {
      if (!state.tiers.length) return state
      const names = new Set(state.extras.map((e) => e.name))
      let name = "New extra"
      for (let n = 2; names.has(name); n++) name = `New extra ${n}`
      // Land it in the cheapest tier above the base one, when there is one.
      const byPrice = [...state.tiers].sort((a, b) => a.price_usd - b.price_usd)
      const tier = byPrice[1] ?? byPrice[0]
      const extra: Extra = {
        id: action.id,
        name,
        description: "",
        why_it_fits: "",
        tier: tier.name,
        status: "kept",
        source: "manual",
      }
      return includeFromTier(
        { ...state, extras: [...state.extras, extra] },
        name,
        tier.name
      )
    }

    case "setExtraTier": {
      const extra = state.extras.find((e) => e.id === action.id)
      if (!extra) return state
      return includeFromTier(
        {
          ...state,
          extras: state.extras.map((e) =>
            e.id === action.id ? { ...e, tier: action.tier } : e
          ),
        },
        extra.name,
        action.tier
      )
    }

    case "removeExtra": {
      const extra = state.extras.find((e) => e.id === action.id)
      if (!extra) return state
      return {
        ...state,
        extras: state.extras.filter((e) => e.id !== action.id),
        tiers: state.tiers.map((t) => ({
          ...t,
          includes: t.includes.filter((i) => i !== extra.name),
        })),
      }
    }
  }
}

/** An extra first unlocks in `tierName` and in every pricier tier after it. */
function includeFromTier(state: Release, item: string, tierName: string) {
  const from = state.tiers.find((t) => t.name === tierName)
  if (!from) return state
  return {
    ...state,
    tiers: state.tiers.map((t) => {
      const others = t.includes.filter((i) => i !== item)
      return {
        ...t,
        includes: t.price_usd >= from.price_usd ? [...others, item] : others,
      }
    }),
  }
}

/** Whether an extra can take `name` without clashing with another extra. */
export function extraNameAvailable(state: Release, name: string, id: string) {
  return (
    name.trim() !== "" &&
    !state.extras.some((e) => e.id !== id && e.name === name.trim())
  )
}
