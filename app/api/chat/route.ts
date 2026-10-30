import {
  anthropic,
  type AnthropicLanguageModelOptions,
} from "@ai-sdk/anthropic"
import { frontendTools, type FrontendTools } from "@assistant-ui/ai-sdk"
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai"

export const maxDuration = 60

/** Set ANTHROPIC_MODEL in .env.local to try another model. */
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5"

/** Models that accept server-side refusal fallbacks (`fallbacks: "default"`). */
const SUPPORTS_FALLBACKS = new Set([
  "claude-fable-5-1",
  "claude-opus-5-5",
  "claude-opus-5",
  "claude-sonnet-5-5",
])

/** Browser tools the model may call. Anything else the client sends is dropped. */
const ALLOWED_FRONTEND_TOOLS = new Set(["update_release"])

/** How the Onstage agent behaves. Edit freely. */
const SYSTEM_PROMPT = `You are the Onstage agent inside EVEN Backstage. An artist is building the public release page fans will see; the page sits right next to this chat and you edit it with the update_release tool.

Your job is the first pass: from the files the artist dropped (names, types, durations, notes) and whatever they tell you, lay out the whole page in one update_release call. Then keep refining it when they ask.

- Change the page only through update_release. A first pass sends every field; later edits send only the fields you change.
- Use exact file names for the cover, photos and tracks. Pick the cover from the image files; the other images are photos.
- Clean track titles from the file names (drop numbers, "master", "FINAL", "v2", "MIX", extensions) and order them as the numbers or notes suggest. Restore accents and capitalization the notes show.
- Write the description in two or three sentences in the artist's voice, from their notes. Don't invent facts about them.
- Propose two or three extras that fit this specific record, each with a one-line reason tied to it. Group them into two or three tiers; the base tier is the record alone and has the lowest price. Prices are in USD; the price is the minimum fans pay (pay-what-you-want) and the artist keeps 80% of each sale.
- Put a release date the artist or the notes give in release_date (YYYY-MM-DD; today's date is in the context), not in the description.
- When something is ambiguous (a spelling, which image is the cover, whether a bonus track is free), make your best guess and add a short question to questions, linked to the field it's about, instead of asking in the chat. Leave a field empty rather than invent it.
- After the tool runs, reply in one or two sentences: what changed and what the artist should check. Don't repeat the page in the chat.
- Reply in the language the artist writes in. The page copy stays in the release's language.`

type ChatRequest = {
  messages: UIMessage[]
  /** Page state and dropped files, added by the client (see AgentRuntime). */
  system?: string
  tools?: FrontendTools
}

export async function POST(req: Request) {
  const { messages, system, tools = {} }: ChatRequest = await req.json()

  // `system` and `tools` come from the browser, so treat them as untrusted:
  // our prompt goes first and only the tools we expect get through.
  const pageTools = frontendTools(
    Object.fromEntries(
      Object.entries(tools).filter(([name]) => ALLOWED_FRONTEND_TOOLS.has(name))
    )
  )

  const result = streamText({
    abortSignal: req.signal,
    model: anthropic(MODEL),
    system: system ? `${SYSTEM_PROMPT}\n\n${system}` : SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages, { tools: pageTools }),
    tools: pageTools,
    providerOptions: {
      anthropic: {
        effort: "medium",
        thinking: { type: "adaptive", display: "summarized" },
        ...(SUPPORTS_FALLBACKS.has(MODEL) && { fallbacks: "default" }),
      } satisfies AnthropicLanguageModelOptions,
    },
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
}
