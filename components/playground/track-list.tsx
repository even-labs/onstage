"use client"

import * as React from "react"
import { useAuiState } from "@assistant-ui/react"
import { GripVerticalIcon, LockIcon, PauseIcon, PlayIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EditableText } from "@/components/playground/editable-text"
import { usePlayground } from "@/components/playground/playground-provider"
import { assetUrl } from "@/lib/assets"
import { trackField } from "@/lib/release"
import { cn } from "@/lib/utils"

const TRACK_DRAG_TYPE = "application/x-onstage-track"

export function TrackList() {
  const { release, mode, dispatch } = usePlayground()
  const running = useAuiState((s) => s.thread.isRunning)
  const editing = mode === "edit"
  const [dragFrom, setDragFrom] = React.useState<number | null>(null)
  const [dropAt, setDropAt] = React.useState<number | null>(null)

  // One player for the list: the file playing now, if any. Only real dropped
  // files have audio; the demo names have none.
  const [playing, setPlaying] = React.useState<string | null>(null)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  React.useEffect(() => () => audioRef.current?.pause(), [])

  function togglePlay(file: string) {
    const url = assetUrl(file)
    if (!url) {
      toast("Drop the audio file on the list to play it")
      return
    }
    const audio = (audioRef.current ??= new Audio())
    if (playing === file) {
      audio.pause()
      setPlaying(null)
      return
    }
    audio.src = url
    audio.onended = () => setPlaying(null)
    audio
      .play()
      .then(() => setPlaying(file))
      .catch(() => toast.error("Could not play this file"))
  }

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

  const dropLine = <li aria-hidden className="mx-2 h-0.5 rounded-full bg-ai" />

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
              "group/track grid grid-cols-[24px_1fr_auto] items-center gap-3 rounded-md px-2 py-2.5 text-sm hover:bg-card",
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
                className="grid cursor-grab place-items-center text-muted-foreground active:cursor-grabbing"
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
                ai={release.aiFields.includes(trackField(track.file))}
                onCommit={(title) =>
                  dispatch({ type: "renameTrack", file: track.file, title })
                }
                className="truncate"
              />
              <small className="truncate text-xs text-muted-foreground">
                {editing
                  ? [track.duration, track.file].filter(Boolean).join(" · ")
                  : release.artist}
              </small>
            </div>

            {editing ? (
              <div className="flex items-center gap-1">
                <Badge
                  variant={track.bonus ? "outline" : "ghost"}
                  render={<button type="button" />}
                  onClick={() =>
                    dispatch({ type: "toggleBonus", file: track.file })
                  }
                  className={cn(
                    "rounded-sm text-muted-foreground",
                    !track.bonus &&
                      "opacity-0 group-hover/track:opacity-100 focus-visible:opacity-100"
                  )}
                >
                  {track.bonus ? "Bonus Track" : "+ Bonus"}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`${playing === track.file ? "Pause" : "Play"} ${track.title}`}
                  aria-pressed={playing === track.file}
                  title={
                    assetUrl(track.file)
                      ? undefined
                      : "Drop the audio file on the list to play it"
                  }
                  onClick={() => togglePlay(track.file)}
                  className={cn(
                    "text-muted-foreground",
                    !assetUrl(track.file) && "opacity-40",
                    playing === track.file && "text-foreground"
                  )}
                >
                  {playing === track.file ? <PauseIcon /> : <PlayIcon />}
                </Button>
              </div>
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
