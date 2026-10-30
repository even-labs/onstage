"use client"

import * as React from "react"
import { toast } from "sonner"

const hasFiles = (e: React.DragEvent) => e.dataTransfer.types.includes("Files")

/**
 * Makes an element accept files dropped straight onto it, without going
 * through the agent. The drop stops there so the page-level handler never
 * sees it. `accept` picks the files the slot wants; the rest are ignored with
 * a short hint.
 */
export function useFileDrop({
  accept,
  onFiles,
  hint,
}: {
  accept: (file: File) => boolean
  onFiles: (files: File[]) => void
  hint: string
}) {
  const [over, setOver] = React.useState(false)
  return {
    over,
    handlers: {
      onDragEnter: (e: React.DragEvent) => {
        if (hasFiles(e)) setOver(true)
      },
      onDragOver: (e: React.DragEvent) => {
        if (!hasFiles(e)) return
        e.preventDefault()
        e.stopPropagation()
      },
      onDragLeave: (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOver(false)
        }
      },
      onDrop: (e: React.DragEvent) => {
        if (!hasFiles(e)) return
        e.preventDefault()
        e.stopPropagation()
        setOver(false)
        const wanted = Array.from(e.dataTransfer.files).filter(accept)
        if (wanted.length) onFiles(wanted)
        else toast(hint)
      },
    },
  }
}
