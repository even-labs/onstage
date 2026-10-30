"use client"

import * as React from "react"
import { useAuiState } from "@assistant-ui/react"
import { GripVerticalIcon, LockIcon, PlusIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAgent } from "@/components/playground/agent-runtime"
import { EditableText } from "@/components/playground/editable-text"
import { usePlayground } from "@/components/playground/playground-provider"
import { useRemoveWithUndo } from "@/components/playground/use-remove-with-undo"
import { registerAssets } from "@/lib/assets"
import {
  isManualTrack,
  MANUAL_TRACK_PREFIX,
  tracksFromFiles,
} from "@/lib/release"
import { cn } from "@/lib/utils"

const TRACK_DRAG_TYPE = "application/x-onstage-track"

export function TrackList() {
  const { release, mode, dispatch } = usePlayground()
  const running = useAuiState((s) => s.thread.isRunning)
  const editing = mode === "edit"
  const [dragFrom, setDragFrom] = React.useState<number | null>(null)
  const [dropAt, setDropAt] = React.useState<number | null>(null)
  const removeWithUndo = useRemoveWithUndo()

  if (!release.tracks.length) {
    return editing ? (
      <Slot pending={running} className="grid justify-items-center gap-3">
        Tracks appear here in the order fans will see them
        <AddTracks />
      </Slot>
    ) : null
  }

  function endDrag() {
    setDragFrom(null)
    setDropAt(null)
  }

  const dropLine = (
    <li aria-hidden className="mx-2 h-0.5 rounded-full bg-foreground/70" />
  )

  return (
    <div className="grid gap-3">
      <ol
        className="grid gap-0.5"
        onDragOver={(e) => {
          if (dragFrom !== null) e.preventDefault()
        }}
        onDrop={(e) => {
          if (dragFrom === null || dropAt === null) return
          e.preventDefault()
          dispatch({ type: "moveTrack", from: dragFrom, to: dropAt })
          endDrag()
        }}
      >
        {release.tracks.map((track, i) => (
          <React.Fragment key={track.file}>
            {dragFrom !== null && dropAt === i && dropLine}
            <li
              onDragOver={(e) => {
                if (dragFrom === null) return
                const rect = e.currentTarget.getBoundingClientRect()
                setDropAt(e.clientY < rect.top + rect.height / 2 ? i : i + 1)
              }}
              className={cn(
                "group/track grid items-center gap-3 rounded-md px-2 py-2.5 text-sm hover:bg-card",
                editing
                  ? "grid-cols-[28px_1fr_auto_auto]"
                  : "grid-cols-[28px_1fr_auto]",
                dragFrom === i && "opacity-40"
              )}
            >
              {editing ? (
                <button
                  type="button"
                  draggable
                  aria-label={`Drag to reorder ${track.title}`}
                  onDragStart={(e) => {
                    setDragFrom(i)
                    e.dataTransfer.effectAllowed = "move"
                    e.dataTransfer.setData(TRACK_DRAG_TYPE, String(i))
                    const row = e.currentTarget.closest("li")
                    if (row) e.dataTransfer.setDragImage(row, 16, 20)
                  }}
                  onDragEnd={endDrag}
                  className="grid size-7 cursor-grab place-items-center rounded-sm text-muted-foreground focus-visible:outline-2 focus-visible:outline-zinc-200 active:cursor-grabbing"
                >
                  <span className="text-xs tabular-nums group-hover/track:hidden">
                    {i + 1}
                  </span>
                  <GripVerticalIcon className="hidden size-4 group-hover/track:block" />
                </button>
              ) : (
                <span className="text-center text-xs text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
              )}

              <div className="grid min-w-0 gap-px">
                <EditableText
                  value={track.title}
                  placeholder="Track title"
                  editable={editing}
                  onCommit={(title) =>
                    dispatch({ type: "renameTrack", file: track.file, title })
                  }
                  className="truncate"
                />
                {/* Source file names stay out of the page; hover shows them. */}
                <small
                  className="truncate text-xs text-muted-foreground"
                  title={editing ? track.file : undefined}
                >
                  {editing
                    ? track.duration ||
                      (isManualTrack(track) ? "No audio file" : "")
                    : release.artist}
                </small>
              </div>

              {editing ? (
                <Badge
                  variant={track.bonus ? "outline" : "ghost"}
                  render={<button type="button" />}
                  onClick={() =>
                    dispatch({ type: "toggleBonus", file: track.file })
                  }
                  className={cn(
                    "h-6 rounded-sm text-muted-foreground",
                    !track.bonus &&
                      "opacity-0 group-hover/track:opacity-100 focus-visible:opacity-100"
                  )}
                >
                  {track.bonus ? "Bonus Track" : "+ Bonus"}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="rounded-sm text-muted-foreground"
                >
                  {track.bonus ? (
                    "Bonus Track"
                  ) : (
                    <LockIcon aria-label="Locked" />
                  )}
                </Badge>
              )}

              {editing && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${track.title || "this track"}`}
                  className="text-muted-foreground opacity-0 group-hover/track:opacity-100 focus-visible:opacity-100"
                  onClick={() =>
                    removeWithUndo(
                      { type: "removeTrack", file: track.file },
                      `“${track.title || "Untitled track"}”`
                    )
                  }
                >
                  <XIcon />
                </Button>
              )}
            </li>
          </React.Fragment>
        ))}
        {dragFrom !== null && dropAt === release.tracks.length && dropLine}
      </ol>
      {editing && <AddTracks />}
    </div>
  )
}

/** Adds tracks by hand: from audio files (read locally, never uploaded) or by title only. */
function AddTracks() {
  const { release, dispatch } = usePlayground()
  const { rememberFiles } = useAgent()
  const input = React.useRef<HTMLInputElement>(null)

  async function addFiles(files: File[]) {
    const dropped = await registerAssets(files)
    rememberFiles(dropped)
    dispatch({ type: "addTracks", tracks: tracksFromFiles(dropped) })
    // Artwork embedded in the audio is a good first cover.
    const cover = dropped.find((f) => f.kind === "image")
    if (!release.cover && cover)
      dispatch({ type: "setCover", file: cover.name })
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => input.current?.click()}
      >
        <PlusIcon />
        Add audio files
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          dispatch({
            type: "addTracks",
            tracks: [
              {
                file: `${MANUAL_TRACK_PREFIX}${crypto.randomUUID()}`,
                title: "",
                duration: "",
                bonus: false,
              },
            ],
          })
        }
      >
        <PlusIcon />
        Add a track without a file
      </Button>
      <input
        ref={input}
        type="file"
        accept="audio/*"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ""
          if (files.length) addFiles(files)
        }}
      />
    </div>
  )
}

export function Slot({
  pending,
  className,
  ...props
}: React.ComponentProps<"div"> & { pending?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-md border-[1.5px] border-dashed p-4.5 text-center text-sm text-muted-foreground",
        pending && "animate-pulse border-ai/60",
        className
      )}
      {...props}
    />
  )
}
