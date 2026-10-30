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
      }}
    >
      {children}
    </PlaygroundContext.Provider>
  )
}
