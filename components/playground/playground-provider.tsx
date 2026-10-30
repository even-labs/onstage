"use client"

import * as React from "react"

import { detectIntent, runMockAgent, type AgentIntent } from "@/lib/mock-agent"
import { emptyRelease, type DroppedFile, type Release } from "@/lib/release"
import { releaseReducer, type ReleaseAction } from "@/lib/release-reducer"

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
    setMessages([])
    setMode("edit")
  }

  return (
    <PlaygroundContext.Provider
      value={{
        release,
        dispatch,
        messages,
        pending,
        sendToAgent,
        startOver,
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
