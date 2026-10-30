"use client"

import { toast } from "sonner"

import { usePlayground } from "@/components/playground/playground-provider"
import type { ReleaseAction } from "@/lib/release-reducer"

/**
 * Removes something from the release and offers Undo, which puts the release
 * back exactly as it was before the removal.
 */
export function useRemoveWithUndo() {
  const { release, dispatch } = usePlayground()
  return (action: ReleaseAction, label: string) => {
    const before = release
    dispatch(action)
    toast(`Removed ${label}`, {
      action: {
        label: "Undo",
        onClick: () => dispatch({ type: "restore", release: before }),
      },
    })
  }
}
