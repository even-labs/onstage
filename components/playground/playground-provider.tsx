"use client"

import * as React from "react"

import { emptyRelease, type Release } from "@/lib/release"
import { releaseReducer, type ReleaseAction } from "@/lib/release-reducer"

export type Mode = "edit" | "publish"
export type Viewport = "desktop" | "phone"

type PlaygroundContextValue = {
  release: Release
  dispatch: React.Dispatch<ReleaseAction>
  mode: Mode
  setMode: (mode: Mode) => void
  viewport: Viewport
  setViewport: (viewport: Viewport) => void
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

  return (
    <PlaygroundContext.Provider
      value={{ release, dispatch, mode, setMode, viewport, setViewport }}
    >
      {children}
    </PlaygroundContext.Provider>
  )
}
