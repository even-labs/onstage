import {
  ALT_EXTRAS,
  DEMO_FILES,
  DEMO_RELEASE_DATE,
  LUMA_VALE_DRAFT,
  SHORT_DESCRIPTION,
} from "@/lib/mock-data"
import {
  isEmpty,
  minPrice,
  releaseFromDraft,
  type DroppedFile,
  type Release,
} from "@/lib/release"
import type { ReleaseAction } from "@/lib/release-reducer"

// Stand-in for the real Claude call. It matches a few keywords and returns
// canned answers so the page and chat can be built before the API is wired.

export type AgentIntent =
  "draft" | "extras" | "description" | "price" | "reset" | "help"

/** What the chat shows when the artist sends files without typing anything. */
export const DROP_PROMPT = "Lay out the release from these files"

export type AgentTurn = {
  reply: string
  action?: ReleaseAction
}

export const INTENT_STATUS: Record<AgentIntent, string> = {
  draft: "Laying out your release",
  extras: "Looking for extras that fit",
  description: "Rewriting the description",
  price: "Reworking the tiers",
  reset: "Clearing the page",
  help: "Thinking",
}

export function detectIntent(
  text: string,
  files: DroppedFile[],
  release: Release
): AgentIntent {
  const t = text.toLowerCase()
  if (/start over|reset|clear|empezar|de nuevo|borra/.test(t)) return "reset"
  if (files.length || isEmpty(release)) return "draft"
  if (/extra/.test(t)) return "extras"
  if (/descri|shorter|corta|rewrite|reescrib/.test(t)) return "description"
  if (/price|precio|cheap|barat|\$/.test(t)) return "price"
  if (/lay ?out|draft|arma|crea|build/.test(t)) return "draft"
  return "help"
}

const DELAY: Record<AgentIntent, number> = {
  draft: 1800,
  extras: 1200,
  description: 900,
  price: 900,
  reset: 300,
  help: 600,
}

export async function runMockAgent(
  intent: AgentIntent,
  release: Release,
  files: DroppedFile[]
): Promise<AgentTurn> {
  await new Promise((resolve) => setTimeout(resolve, DELAY[intent]))

  switch (intent) {
    case "draft": {
      const draft = LUMA_VALE_DRAFT
      const usedOwnFiles =
        files.length > 0 && files.some((f) => !DEMO_FILES.includes(f))
      return {
        action: {
          type: "load",
          release: releaseFromDraft(draft, DEMO_FILES, DEMO_RELEASE_DATE),
        },
        reply: [
          `Laid out “${draft.title}” by ${draft.artist}: ${draft.tracks.length} tracks with clean titles, the cover, ${draft.photos.length} photos and a description in your voice.`,
          `I also suggested ${draft.extras.length} extras in ${draft.tiers.length} tiers, from $${minPrice(draft.tiers)}. ${draft.questions?.length ?? 0} questions are waiting on the page.`,
          usedOwnFiles
            ? "(Mock agent: I used the demo files, not the ones you dropped.)"
            : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
      }
    }

    case "extras":
      return {
        action: { type: "replaceExtras", ...ALT_EXTRAS },
        reply: `Swapped in ${ALT_EXTRAS.extras.length} new extras: ${ALT_EXTRAS.extras
          .map((e) => e.name)
          .join(
            ", "
          )}. Tiers now go from $${minPrice(ALT_EXTRAS.tiers)} to $${Math.max(
          ...ALT_EXTRAS.tiers.map((t) => t.price_usd)
        )}.`,
      }

    case "description":
      return {
        action: {
          type: "edit",
          field: "description",
          value: SHORT_DESCRIPTION,
          by: "ai",
        },
        reply:
          "Shortened the description to one line. Click it on the page to tweak it.",
      }

    case "price": {
      const base = [...release.tiers].sort(
        (a, b) => a.price_usd - b.price_usd
      )[0]
      if (!base) {
        return {
          reply: "There are no tiers yet. Ask me to lay out the release first.",
        }
      }
      const price = Math.max(1, base.price_usd - 2)
      return {
        action: { type: "setTierPrice", name: base.name, price },
        reply: `Lowered the base tier “${base.name}” from $${base.price_usd} to $${price}. Fans can still pay more: the list price is the minimum.`,
      }
    }

    case "reset":
      return {
        action: { type: "reset" },
        reply:
          "Cleared the page. Drop files on it or describe the release here.",
      }

    case "help":
      return {
        reply:
          "I'm a mock agent for now, so I only know a few moves: lay out a release, suggest other extras, shorten the description, lower the base price, or start over.",
      }
  }
}
