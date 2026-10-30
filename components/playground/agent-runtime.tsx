"use client"

import * as React from "react"
import { useChatRuntime } from "@assistant-ui/ai-sdk"
import {
  AssistantRuntimeProvider,
  AuiConfig,
  Tools,
  useAssistantContext,
  type AttachmentAdapter,
  type Toolkit,
} from "@assistant-ui/react"
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai"
import { z } from "zod"

import { useSidebar } from "@/components/ui/sidebar"
import { usePlayground } from "@/components/playground/playground-provider"
import { registerAssets } from "@/lib/assets"
import { DEMO_FILES, LUMA_VALE_DRAFT, SUGGESTED_PROMPTS } from "@/lib/mock-data"
import {
  aiDraftSchema,
  isEmpty,
  type DroppedFile,
  type Release,
} from "@/lib/release"

/** What the chat shows when the artist sends files without typing anything. */
const DROP_PROMPT = "Lay out the release from these files"
const ADD_PROMPT = "Add these files to the release"

const partialDraftSchema = aiDraftSchema.partial()

/** The model-facing half of update_release; AgentRuntime adds `execute`. */
const UPDATE_RELEASE_TOOL = {
  type: "frontend",
  description:
    "Lay out or change the release page fans will see. A first pass sends every field; later edits send only the fields they change.",
  parameters: partialDraftSchema,
  renderText: {
    running: "Laying out the page…",
    complete: ({ result }: { result: { ok: boolean } | undefined }) =>
      result?.ok ? "Updated the page" : "Couldn't update the page",
  },
} as const

/** Adds files to the ones the agent already knows about; a newer file with the same name wins. */
function mergeFiles(current: DroppedFile[], added: DroppedFile[]) {
  const names = new Set(added.map((f) => f.name))
  return [...current.filter((f) => !names.has(f.name)), ...added]
}

/** One line per file for the model: name, type, duration and any audio tags. */
function describeFile(f: DroppedFile) {
  const details = [f.kind, f.duration].filter(Boolean).join(", ")
  const tags = f.tags
    ? Object.entries(f.tags)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(", ")
    : ""
  return [
    `${f.name} (${details})`,
    tags && `tags {${tags}}`,
    f.embeddedCover && `embedded cover: ${f.embeddedCover}`,
  ]
    .filter(Boolean)
    .join(" · ")
}

type AgentContextValue = {
  /** Hand files to the agent and ask it to lay them out on the page. */
  sendFiles: (files: DroppedFile[]) => void
  /** Files dropped or picked but not sent yet: the artist can keep adding. */
  staged: DroppedFile[]
  stageFiles: (files: DroppedFile[]) => void
  unstageFile: (name: string) => void
  clearStaged: () => void
  /** Send the staged files to the agent. */
  sendStaged: () => void
  /** Let the agent know about files the artist added by hand, without asking it anything. */
  rememberFiles: (files: DroppedFile[]) => void
  /** Fill the page with the saved first pass, without calling Claude. */
  loadSavedDraft: () => void
  /** Clear the page and the conversation. */
  startOver: () => void
}

const AgentContext = React.createContext<AgentContextValue | null>(null)

export function useAgent() {
  const context = React.useContext(AgentContext)
  if (!context) {
    throw new Error("useAgent must be used within an AgentRuntime.")
  }
  return context
}

/**
 * Connects the chat to Claude (via /api/chat) and gives Claude one tool,
 * update_release, that writes the AI first pass into the page.
 */
export function AgentRuntime({ children }: { children: React.ReactNode }) {
  const { release, dispatch, setReviewOpen } = usePlayground()
  const { isMobile, setOpen, setOpenMobile } = useSidebar()
  const [files, setFiles] = React.useState<DroppedFile[]>([])
  const [staged, setStaged] = React.useState<DroppedFile[]>([])
  // Mirrors of release and files for the model context, which is read when a
  // message is sent, possibly before React re-renders with the new values.
  const releaseRef = React.useRef(release)
  const filesRef = React.useRef(files)

  React.useEffect(() => {
    releaseRef.current = release
  }, [release])

  const changeFiles = React.useCallback(
    (update: (current: DroppedFile[]) => DroppedFile[]) => {
      const next = update(filesRef.current)
      filesRef.current = next
      setFiles(next)
    },
    []
  )

  // Files attached in the chat are handled like files dropped on the page:
  // registered locally for the page to show, with only their names, types,
  // durations and tags sent to Claude. Uploading them would hit Vercel's
  // 4.5 MB request limit, and Claude can't read audio anyway.
  const attachments = React.useMemo<AttachmentAdapter>(
    () => ({
      accept: "*",
      async add({ file }) {
        return {
          id: crypto.randomUUID(),
          type: file.type.startsWith("image/") ? "image" : "file",
          name: file.name,
          contentType: file.type,
          file,
          status: { type: "requires-action", reason: "composer-send" },
        }
      },
      async send(attachment) {
        // An audio file can bring its embedded cover along as a second file.
        const [dropped, ...extras] = await registerAssets([attachment.file])
        changeFiles((current) => mergeFiles(current, [dropped, ...extras]))
        return {
          ...attachment,
          status: { type: "complete" },
          content: [
            { type: "text", text: `Attached file: ${describeFile(dropped)}` },
          ],
        }
      },
      async remove() {},
    }),
    [changeFiles]
  )

  const runtime = useChatRuntime({
    // Send the tool result back so Claude can say what it changed.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    suggestions: SUGGESTED_PROMPTS,
    adapters: { attachments },
  })

  const toolkit = React.useMemo<Toolkit>(
    () => ({
      update_release: {
        ...UPDATE_RELEASE_TOOL,
        execute: async (args: unknown) => {
          // The model's input isn't guaranteed to match the schema; check it
          // and hand the errors back so the model can retry.
          const parsed = partialDraftSchema.safeParse(args)
          if (!parsed.success) {
            return { ok: false, error: z.prettifyError(parsed.error) }
          }
          dispatch({ type: "applyDraft", draft: parsed.data, files })
          // New suggestions or questions: open the review column beside the page.
          if (parsed.data.extras?.length || parsed.data.questions?.length) {
            setReviewOpen(true)
          }
          return { ok: true, updated: Object.keys(parsed.data) }
        },
      },
    }),
    [dispatch, files, setReviewOpen]
  )
  const config = AuiConfig({ tools: Tools({ toolkit }) })

  const agent = React.useMemo<AgentContextValue>(() => {
    // The chat opens as soon as the agent starts, so the artist sees it work.
    const openChat = () => (isMobile ? setOpenMobile(true) : setOpen(true))
    const sendFiles = (added: DroppedFile[]) => {
      const firstPass = isEmpty(releaseRef.current)
      changeFiles((current) => mergeFiles(current, added))
      openChat()
      runtime.thread.append(firstPass ? DROP_PROMPT : ADD_PROMPT)
    }
    return {
      sendFiles,
      staged,
      stageFiles(added) {
        setStaged((current) => mergeFiles(current, added))
      },
      unstageFile(name) {
        setStaged((current) => current.filter((f) => f.name !== name))
      },
      clearStaged() {
        setStaged([])
      },
      sendStaged() {
        if (!staged.length) return
        sendFiles(staged)
        setStaged([])
      },
      rememberFiles(added) {
        changeFiles((current) => mergeFiles(current, added))
      },
      loadSavedDraft() {
        changeFiles(() => DEMO_FILES)
        dispatch({
          type: "applyDraft",
          draft: LUMA_VALE_DRAFT,
          files: DEMO_FILES,
        })
        setReviewOpen(true)
      },
      startOver() {
        // Back to the first screen: empty page, both side panels closed.
        changeFiles(() => [])
        setStaged([])
        dispatch({ type: "reset" })
        runtime.thread.reset()
        setReviewOpen(false)
        if (isMobile) setOpenMobile(false)
        else setOpen(false)
      },
    }
  }, [
    changeFiles,
    dispatch,
    isMobile,
    runtime,
    setOpen,
    setOpenMobile,
    setReviewOpen,
    staged,
  ])

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <PageContext releaseRef={releaseRef} filesRef={filesRef} />
      <AgentContext.Provider value={agent}>{children}</AgentContext.Provider>
    </AssistantRuntimeProvider>
  )
}

/**
 * Tells the model what's on the page and which files it has to work with.
 * Read at send time, so a drop followed straight away by a message is seen.
 */
function PageContext({
  releaseRef,
  filesRef,
}: {
  releaseRef: React.RefObject<Release>
  filesRef: React.RefObject<DroppedFile[]>
}) {
  const context = React.useMemo(
    () => ({
      getContext: () => describePage(releaseRef.current, filesRef.current),
    }),
    [releaseRef, filesRef]
  )
  useAssistantContext(context)
  return null
}

function describePage(release: Release, files: DroppedFile[]) {
  const fileList = files.length
    ? files.map((f) => `- ${describeFile(f)}`).join("\n")
    : "None yet."
  const notes = files
    .filter((f) => f.content)
    .map((f) => `${f.name}:\n${f.content}`)
    .join("\n\n")

  const page = {
    title: release.title,
    artist: release.artist,
    description: release.description,
    releaseDate: release.releaseDate,
    cover: release.cover,
    photos: release.photos,
    tracks: release.tracks,
    extras: release.extras.map((e) => ({
      name: e.name,
      description: e.description,
      why_it_fits: e.why_it_fits,
      tier: e.tier,
      status: e.status,
    })),
    tiers: release.tiers,
    questions: release.questions,
  }

  return [
    // Without this the model guesses the year of a date like "out nov 20".
    `Today is ${new Date().toISOString().slice(0, 10)}.`,
    "## Files the artist dropped",
    fileList,
    notes && `## Artist notes and briefs\n${notes}`,
    "## The page right now",
    "Extras marked kept or removed were decided by the artist; leave them unless asked.",
    JSON.stringify(page, null, 2),
  ]
    .filter(Boolean)
    .join("\n\n")
}
