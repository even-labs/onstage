"use client"

import * as React from "react"
import { toast } from "sonner"

import { clearDraft, loadDraft, saveDraft as persistDraft } from "@/lib/draft"
import { detectIntent, runMockAgent, type AgentIntent } from "@/lib/mock-agent"
import { emptyRelease, type DroppedFile, type Release } from "@/lib/release"
import { releaseReducer, type ReleaseAction } from "@/lib/release-reducer"

const formatSavedAt = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  text: string
  files?: DroppedFile[]
}

export type Mode = "edit" | "publish"
export type Viewport = "desktop" | "phone"

type PlaygroundContextValue = {
  release: Release
  dispatch: React.Dispatch<ReleaseAction>
  messages: ChatMessage[]
  /** What the agent is working on right now, if anything. */
  pending: AgentIntent | null
  sendToAgent: (text: string, files?: DroppedFile[]) => Promise<void>
  startOver: () => void
  /** Keeps the release in this browser's storage; comes back on the next load. */
  saveDraft: () => void
  mode: Mode
  setMode: (mode: Mode) => void
  viewport: Viewport
  setViewport: (viewport: Viewport) => void
  composerRef: React.RefObject<HTMLTextAreaElement | null>
}

const PlaygroundContext = React.createContext<PlaygroundContextValue | null>(
  null
)

export function usePlayground() {
  const context = React.useContext(PlaygroundContext)
  if (!context) {
    throw new Error("usePlayground must be used within a PlaygroundProvider.")
  }
  return context
}

export function PlaygroundProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [release, dispatch] = React.useReducer(releaseReducer, emptyRelease)
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [pending, setPending] = React.useState<AgentIntent | null>(null)
  const [mode, setMode] = React.useState<Mode>("edit")
  const [viewport, setViewport] = React.useState<Viewport>("desktop")
  const composerRef = React.useRef<HTMLTextAreaElement>(null)

  async function sendToAgent(text: string, files: DroppedFile[] = []) {
    if (pending) return
    const intent = detectIntent(text, files, release)
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "user", text, files },
    ])
    setMode("edit")
    setPending(intent)

    const turn = await runMockAgent(intent, release, files)
    if (turn.action) dispatch(turn.action)
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "assistant", text: turn.reply },
    ])
    setPending(null)
  }

  function startOver() {
    dispatch({ type: "reset" })
    clearDraft()
    setMessages([])
    setMode("edit")
  }

  function saveDraft() {
    const saved = persistDraft(release)
    if (saved) toast.success("Draft saved in this browser")
    else toast.error("Could not save the draft in this browser")
  }

  // A draft saved earlier in this browser comes back on load. The ref keeps
  // Strict Mode's second effect run from restoring (and toasting) twice.
  const restored = React.useRef(false)
  React.useEffect(() => {
    if (restored.current) return
    restored.current = true
    const draft = loadDraft()
    if (!draft) return
    dispatch({ type: "load", release: draft.release })
    toast(`Draft restored (saved ${formatSavedAt(draft.savedAt)})`)
  }, [])

  return (
    <PlaygroundContext.Provider
      value={{
        release,
        dispatch,
        messages,
        pending,
        sendToAgent,
        startOver,
        saveDraft,
        mode,
        setMode,
        viewport,
        setViewport,
        composerRef,
      }}
    >
      {children}
    </PlaygroundContext.Provider>
  )
}
