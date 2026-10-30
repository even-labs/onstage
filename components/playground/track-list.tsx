"use client"

import * as React from "react"
import { useAuiState } from "@assistant-ui/react"
import { GripVerticalIcon, LockIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { EditableText } from "@/components/playground/editable-text"
import { usePlayground } from "@/components/playground/playground-provider"
import { cn } from "@/lib/utils"

const TRACK_DRAG_TYPE = "application/x-onstage-track"

export function TrackList() {
  const { release, mode, dispatch } = usePlayground()
  const running = useAuiState((s) => s.thread.isRunning)
  const editing = mode === "edit"
  const [dragFrom, setDragFrom] = React.useState<number | null>(null)
  const [dropAt, setDropAt] = React.useState<number | null>(null)

  if (!release.tracks.length) {
    return editing ? (
      <Slot pending={running}>
        Tracks appear here in the order fans will see them
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
              "group/track grid grid-cols-[28px_1fr_auto] items-center gap-3 rounded-md px-2 py-2.5 text-sm hover:bg-card",
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
                {editing ? track.duration : release.artist}
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
                {track.bonus ? "Bonus Track" : <LockIcon aria-label="Locked" />}
              </Badge>
            )}
          </li>
        </React.Fragment>
      ))}
      {dragFrom !== null && dropAt === release.tracks.length && dropLine}
    </ol>
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
