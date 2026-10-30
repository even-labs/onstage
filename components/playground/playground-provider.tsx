"use client"

import * as React from "react"

import { emptyRelease, type Release } from "@/lib/release"
import { releaseReducer, type ReleaseAction } from "@/lib/release-reducer"

/**
 * edit: in-place editing. fan: the page exactly as fans see it, nothing
 * editable. publish: the fan view after Publish.
 */
export type Mode = "edit" | "fan" | "publish"
export type Viewport = "desktop" | "phone"
export type PageTab = "tracks" | "access"

type PlaygroundContextValue = {
  release: Release
  dispatch: React.Dispatch<ReleaseAction>
  mode: Mode
  setMode: (mode: Mode) => void
  viewport: Viewport
  setViewport: (viewport: Viewport) => void
  /** How much the phone frame is scaled down to fit, in percent. */
  zoom: number
  setZoom: (zoom: number) => void
  /** The editor's Tracks / Access tab, so other panels can switch it. */
  pageTab: PageTab
  setPageTab: (tab: PageTab) => void
  /** Whether the draft review column beside the preview is open. */
  reviewOpen: boolean
  setReviewOpen: (open: boolean) => void
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
  const [mode, setMode] = React.useState<Mode>("edit")
  const [viewport, setViewport] = React.useState<Viewport>("desktop")
  const [zoom, setZoom] = React.useState(100)
  const [pageTab, setPageTab] = React.useState<PageTab>("tracks")
  // Closed on the first screen; it opens when the AI has something to review.
  const [reviewOpen, setReviewOpen] = React.useState(false)

  return (
    <PlaygroundContext.Provider
      value={{
        release,
        dispatch,
        mode,
        setMode,
        viewport,
        setViewport,
        zoom,
        setZoom,
        pageTab,
        setPageTab,
        reviewOpen,
        setReviewOpen,
      }}
    >
      {children}
    </PlaygroundContext.Provider>
  )
}
