"use client"

import * as React from "react"
import { useAuiState } from "@assistant-ui/react"
import {
  CheckIcon,
  LibraryIcon,
  LockIcon,
  MessageCircleIcon,
  SearchIcon,
  Undo2Icon,
  UploadIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AiTag, Wordmark } from "@/components/playground/brand"
import { useAgent } from "@/components/playground/agent-runtime"
import { EditableText } from "@/components/playground/editable-text"
import { usePlayground } from "@/components/playground/playground-provider"
import { Slot, TrackList } from "@/components/playground/track-list"
import { assetUrl, isImageFile, registerAssets } from "@/lib/assets"
import { DEMO_FILES, FALLBACK_ART, MOCK_ART } from "@/lib/mock-data"
import {
  FAN_BENEFITS,
  formatDate,
  isEmpty,
  minPrice,
  releaseType,
  tierPrice,
  type Extra,
} from "@/lib/release"
import { cn } from "@/lib/utils"

/** A real dropped image when there is one, otherwise the mock gradient for that name. */
function art(file: string): React.CSSProperties {
  const url = assetUrl(file)
  if (url) {
    return {
      backgroundImage: `url("${url}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }
  }
  return { background: MOCK_ART[file] ?? FALLBACK_ART }
}

const hasFiles = (e: React.DragEvent) => e.dataTransfer.types.includes("Files")

/**
 * Makes a slot accept image files dropped straight onto it, without going
 * through the agent. The drop stops there so the page-level handler never sees it.
 */
function useImageDrop(onImages: (files: File[]) => void) {
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
        const images = Array.from(e.dataTransfer.files).filter(isImageFile)
        if (images.length) onImages(images)
        else toast("Drop an image here, or drop everything on the page")
      },
    },
  }
}

/** A hidden file input opened from a click on a slot. */
function useImagePicker(onImages: (files: File[]) => void) {
  const ref = React.useRef<HTMLInputElement>(null)
  const input = (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      multiple
      hidden
      onChange={(e) => {
        const images = Array.from(e.target.files ?? []).filter(isImageFile)
        if (images.length) onImages(images)
        e.target.value = ""
      }}
    />
  )
  return { input, open: () => ref.current?.click() }
}

/** The frame around the page: desktop width or a ~390 px phone. */
export function ReleaseCanvas() {
  const { viewport, mode } = usePlayground()
  const phone = viewport === "phone"

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-card/30 px-4 py-6 md:px-8 md:py-10">
      <div
        className={cn(
          "@container mx-auto overflow-hidden border bg-background transition-[max-width] duration-300",
          phone
            ? "max-w-[390px] rounded-[2rem] border-[6px] border-zinc-800"
            : "max-w-[1000px] rounded-xl"
        )}
      >
        {mode === "publish" && <FanNav />}
        <ReleasePage />
      </div>
    </div>
  )
}

function FanNav() {
  return (
    <nav className="flex items-center gap-3 border-b px-4 py-2.5">
      <Wordmark />
      <div className="hidden max-w-[300px] flex-1 items-center gap-2 rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground @xl:flex">
        <SearchIcon className="size-3.5" />
        Search for releases or artists
      </div>
      <div className="ml-auto flex gap-2">
        <Button variant="outline" size="sm" aria-label="My Library">
          <LibraryIcon />
          <span className="hidden @xl:inline">My Library</span>
        </Button>
        <Button variant="outline" size="sm" aria-label="Chat">
          <MessageCircleIcon />
          <span className="hidden @xl:inline">Chat</span>
        </Button>
      </div>
    </nav>
  )
}

function ReleasePage() {
  const { release, mode } = usePlayground()
  const { sendFiles } = useAgent()
  const running = useAuiState((s) => s.thread.isRunning)
  const editing = mode === "edit"
  const [overlayDismissed, setOverlayDismissed] = React.useState(false)
  const [draggingFiles, setDraggingFiles] = React.useState(false)
  // Once the page has content, a file drag no longer raises the overlay, so
  // the cover and photo slots can take drops of their own.
  const showOverlay =
    editing && !running && isEmpty(release) && !overlayDismissed

  // Track reordering is also a drag, so only react to drags that carry files.
  const fileDrag = (e: React.DragEvent) => editing && hasFiles(e)

  return (
    <div
      className="relative p-4 @xl:p-7"
      onDragEnter={(e) => {
        if (fileDrag(e)) setDraggingFiles(true)
      }}
      onDragOver={(e) => {
        if (fileDrag(e)) e.preventDefault()
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setDraggingFiles(false)
        }
      }}
      onDrop={async (e) => {
        if (!fileDrag(e)) return
        e.preventDefault()
        setDraggingFiles(false)
        sendFiles(await registerAssets(e.dataTransfer.files))
      }}
    >
      {release.cover && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-35 blur-[40px]"
          style={art(release.cover)}
        />
      )}

      <div className="relative grid gap-6">
        <Hero />
        {editing && <SuggestedExtras />}
        {editing && <Questions />}
        <Tabs defaultValue="tracks" className="gap-3">
          <TabsList
            variant="line"
            className="h-auto w-full justify-start gap-5 rounded-none border-b p-0"
          >
            <TabsTrigger
              value="tracks"
              className="flex-none px-0 pb-2 after:bg-primary group-data-horizontal/tabs:after:-bottom-px"
            >
              Tracks
            </TabsTrigger>
            <TabsTrigger
              value="access"
              className="flex-none px-0 pb-2 after:bg-primary group-data-horizontal/tabs:after:-bottom-px"
            >
              Access
              {!editing && <LockIcon />}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tracks">
            <TrackList />
          </TabsContent>
          <TabsContent value="access">
            <AccessTiers />
          </TabsContent>
        </Tabs>
        <Includes />
      </div>

      {showOverlay && (
        <DropOverlay
          dragging={draggingFiles}
          onDismiss={() => setOverlayDismissed(true)}
        />
      )}
    </div>
  )
}

function Hero() {
  const { release, mode, dispatch } = usePlayground()
  const editing = mode === "edit"
  const running = useAuiState((s) => s.thread.isRunning)
  const price = minPrice(release.tiers)
  const trackCount = release.tracks.length

  return (
    <div className="grid items-start gap-5 @xl:grid-cols-[200px_1fr] @xl:gap-7">
      <CoverArt />

      <div className="grid min-w-0 gap-2.5">
        <span className="justify-self-start rounded-sm bg-card px-2 py-0.5 text-[11px] text-muted-foreground">
          Get Access To Listen
        </span>

        <EditableText
          value={release.title}
          placeholder="Release title"
          editable={editing}
          ai={release.aiFields.includes("title")}
          pending={running}
          onCommit={(value) =>
            dispatch({ type: "edit", field: "title", value })
          }
          className="text-3xl leading-tight font-bold tracking-tight"
        />

        <div className="flex items-center gap-2 text-sm">
          <span className="size-6 shrink-0 rounded-full bg-[#5b3d4d]" />
          <EditableText
            value={release.artist}
            placeholder="Artist name"
            editable={editing}
            ai={release.aiFields.includes("artist")}
            pending={running}
            onCommit={(value) =>
              dispatch({ type: "edit", field: "artist", value })
            }
            className="min-w-0"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {trackCount > 0 && <span>{releaseType(trackCount)} ·</span>}
          {editing ? (
            <input
              type="date"
              aria-label="Release date"
              value={release.releaseDate}
              onChange={(e) =>
                dispatch({ type: "setReleaseDate", value: e.target.value })
              }
              className={cn(
                "rounded-sm bg-transparent [color-scheme:dark] outline-1 outline-offset-2 outline-transparent outline-dashed hover:outline-ai/60 focus:outline-ai",
                !release.releaseDate &&
                  "rounded-md border-[1.5px] border-dashed px-2 py-1"
              )}
            />
          ) : (
            <span>{formatDate(release.releaseDate)}</span>
          )}
          {trackCount > 0 && (
            <span>
              · {trackCount} song{trackCount === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <EditableText
          value={release.description}
          placeholder="Describe the release in two lines"
          editable={editing}
          multiline
          ai={release.aiFields.includes("description")}
          pending={running}
          onCommit={(value) =>
            dispatch({ type: "edit", field: "description", value })
          }
          className="max-w-[60ch] text-sm text-zinc-300"
        />

        <Photos />

        <Button
          className={cn(
            "mt-1 justify-self-start",
            price === null && "opacity-40"
          )}
          onClick={() => {
            if (!editing) toast("Checkout is faked in the playground")
          }}
        >
          Get Access · {price === null ? "set a price" : `from $${price}`}
        </Button>
      </div>
    </div>
  )
}

function CoverArt() {
  const { release, mode, dispatch } = usePlayground()
  const running = useAuiState((s) => s.thread.isRunning)
  const editing = mode === "edit"

  async function setCover(images: File[]) {
    const [cover, ...rest] = await registerAssets(images)
    dispatch({ type: "setCover", file: cover.name })
    if (rest.length) {
      dispatch({ type: "addPhotos", files: rest.map((f) => f.name) })
    }
  }
  const drop = useImageDrop(setCover)
  const picker = useImagePicker(setCover)
  const dropProps = editing ? drop.handlers : {}

  if (!release.cover) {
    return editing ? (
      <>
        <Slot
          pending={running}
          role="button"
          tabIndex={0}
          aria-label="Add cover art"
          onClick={picker.open}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") picker.open()
          }}
          className={cn(
            "grid aspect-square w-full max-w-[240px] cursor-pointer place-items-center @xl:max-w-none",
            drop.over && "border-ai bg-ai-muted/30"
          )}
          {...dropProps}
        >
          <span>
            Cover art
            <br />
            3000 × 3000
            <br />
            <span className="text-xs">drop or click</span>
          </span>
        </Slot>
        {picker.input}
      </>
    ) : null
  }

  const realImage = Boolean(assetUrl(release.cover))

  return (
    <>
      <div
        role="img"
        aria-label={`Cover art: ${release.cover}`}
        title={editing ? "Drop a new image to replace the cover" : undefined}
        className={cn(
          "grid aspect-square w-full max-w-[240px] content-end justify-items-start rounded-md p-3 text-[13px] font-extrabold tracking-[0.08em] text-[#ffd9a8] uppercase shadow-lg @xl:max-w-none",
          editing &&
            "cursor-pointer outline-2 outline-offset-4 outline-transparent transition-[outline-color] hover:outline-ai/60",
          drop.over && "outline-ai"
        )}
        onClick={editing ? picker.open : undefined}
        style={art(release.cover)}
        {...dropProps}
      >
        {!realImage && release.title}
      </div>
      {editing && picker.input}
    </>
  )
}

function Photos() {
  const { release, mode, dispatch } = usePlayground()
  const editing = mode === "edit"

  async function addPhotos(images: File[]) {
    const files = await registerAssets(images)
    dispatch({ type: "addPhotos", files: files.map((f) => f.name) })
  }
  const drop = useImageDrop(addPhotos)
  const picker = useImagePicker(addPhotos)
  const dropProps = editing ? drop.handlers : {}

  if (!release.photos.length) {
    return editing ? (
      <>
        <Slot
          role="button"
          tabIndex={0}
          aria-label="Add photos"
          onClick={picker.open}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") picker.open()
          }}
          className={cn(
            "w-fit cursor-pointer px-3 py-2 text-xs",
            drop.over && "border-ai bg-ai-muted/30"
          )}
          {...dropProps}
        >
          Photos · drop or click
        </Slot>
        {picker.input}
      </>
    ) : null
  }

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2 rounded-md",
        drop.over && "outline-2 outline-offset-4 outline-ai"
      )}
      {...dropProps}
    >
      {release.photos.map((photo) => (
        <div
          key={photo}
          role="img"
          aria-label={photo}
          title={photo}
          className="size-14 rounded-md border"
          style={art(photo)}
        />
      ))}
      {editing && (
        <>
          <Slot
            role="button"
            tabIndex={0}
            aria-label="Add photos"
            onClick={picker.open}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") picker.open()
            }}
            className="grid size-14 cursor-pointer place-items-center p-0 text-lg leading-none"
          >
            +
          </Slot>
          {picker.input}
        </>
      )}
    </div>
  )
}

function SuggestedExtras() {
  const { release } = usePlayground()
  if (!release.extras.length) return null

  return (
    <section className="grid gap-2.5">
      <h3 className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">
        <AiTag>Suggested extras</AiTag>
        <span className="font-normal text-muted-foreground">
          Releases with extras sell about 4× more. Keep what fits.
        </span>
      </h3>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2.5">
        {release.extras.map((extra) => (
          <ExtraCard key={extra.id} extra={extra} />
        ))}
      </div>
    </section>
  )
}

function ExtraCard({ extra }: { extra: Extra }) {
  const { release, dispatch } = usePlayground()
  const price = tierPrice(release.tiers, extra.tier)
  const setStatus = (status: Extra["status"]) =>
    dispatch({ type: "setExtraStatus", id: extra.id, status })

  function remove() {
    setStatus("removed")
    toast(`Removed “${extra.name}”`, {
      action: { label: "Undo", onClick: () => setStatus("suggested") },
    })
  }

  return (
    <div
      className={cn(
        "grid content-start gap-1.5 rounded-lg border p-3 text-[13px] transition-opacity",
        extra.status === "suggested" && "border-ai bg-ai-muted/35",
        extra.status === "kept" && "border-success bg-success-muted/40",
        extra.status === "removed" &&
          "border-dashed opacity-40 hover:opacity-80"
      )}
    >
      <EditableText
        value={extra.name}
        placeholder="Extra name"
        editable={extra.status !== "removed"}
        onCommit={(name) =>
          dispatch({ type: "editExtra", id: extra.id, patch: { name } })
        }
        className="text-sm font-bold"
      />
      <span className="font-semibold tabular-nums">
        {price === null ? "No price" : `$${price}`} · {extra.tier} tier
      </span>

      {extra.status === "suggested" ? (
        <>
          <EditableText
            value={extra.description}
            placeholder="What fans get"
            editable
            multiline
            onCommit={(description) =>
              dispatch({
                type: "editExtra",
                id: extra.id,
                patch: { description },
              })
            }
          />
          <span className="text-xs text-muted-foreground italic">
            {extra.why_it_fits}
          </span>
          <div className="mt-1 flex gap-1.5">
            <Button
              size="xs"
              className="bg-success-muted text-success hover:bg-success-muted/70"
              onClick={() => setStatus("kept")}
            >
              <CheckIcon />
              Keep
            </Button>
            <Button size="xs" variant="outline" onClick={remove}>
              Remove
            </Button>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {extra.status === "kept" ? "Kept · in the Access tab" : "Removed"}
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setStatus("suggested")}
          >
            <Undo2Icon />
            Undo
          </Button>
        </div>
      )}
    </div>
  )
}

const COUNT_WORDS = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE"]

function Questions() {
  const { release, dispatch } = usePlayground()
  const n = release.questions.length
  if (!n) return null

  return (
    <section className="grid gap-1.5 rounded-r-md border-l-[3px] border-warning bg-warning-muted/35 px-3.5 py-2.5 text-[13px]">
      <b className="text-xs tracking-[0.06em] text-warning">
        {COUNT_WORDS[n] ?? n} QUESTION{n === 1 ? "" : "S"} FROM THE DRAFT
      </b>
      {release.questions.map((question, i) => (
        <div key={question} className="flex items-start justify-between gap-3">
          <span>{question}</span>
          <Button
            size="xs"
            variant="ghost"
            className="text-warning hover:text-warning"
            onClick={() => dispatch({ type: "resolveQuestion", index: i })}
          >
            Resolved
          </Button>
        </div>
      ))}
    </section>
  )
}

function AccessTiers() {
  const { release, mode, dispatch } = usePlayground()
  const editing = mode === "edit"
  const running = useAuiState((s) => s.thread.isRunning)

  if (!release.tiers.length) {
    return editing ? (
      <Slot pending={running}>Tiers appear here: what each price unlocks</Slot>
    ) : null
  }

  // Fans only see what the artist kept; while editing, suggestions still show.
  const hidden = new Set(
    release.extras
      .filter(
        (e) => e.status === "removed" || (!editing && e.status === "suggested")
      )
      .map((e) => e.name)
  )
  const tiers = [...release.tiers].sort((a, b) => a.price_usd - b.price_usd)

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
      {tiers.map((tier) => (
        <div
          key={tier.name}
          className="grid content-start gap-2 rounded-lg border bg-card/80 p-3.5"
        >
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <b>{tier.name}</b>
            {editing ? (
              <label className="flex items-baseline font-semibold tabular-nums">
                $
                <input
                  key={tier.price_usd}
                  type="number"
                  min={1}
                  defaultValue={tier.price_usd}
                  aria-label={`${tier.name} price`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur()
                  }}
                  onBlur={(e) => {
                    const price = Number(e.currentTarget.value)
                    if (price > 0 && price !== tier.price_usd) {
                      dispatch({ type: "setTierPrice", name: tier.name, price })
                    } else {
                      e.currentTarget.value = String(tier.price_usd)
                    }
                  }}
                  className="w-12 [appearance:textfield] rounded-sm bg-transparent outline-1 outline-offset-2 outline-transparent outline-dashed hover:outline-ai/60 focus:outline-ai [&::-webkit-inner-spin-button]:appearance-none"
                />
              </label>
            ) : (
              <span className="font-semibold tabular-nums">
                ${tier.price_usd}
              </span>
            )}
          </div>
          <ul className="grid gap-1 text-[13px] text-zinc-300">
            {tier.includes
              .filter((item) => !hidden.has(item))
              .map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckIcon className="size-3.5 shrink-0 text-success" />
                  {item === "the record" ? "The record" : item}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function Includes() {
  const { release, mode } = usePlayground()
  const running = useAuiState((s) => s.thread.isRunning)

  if (isEmpty(release)) {
    return mode === "edit" ? (
      <Slot pending={running}>What fans get: streaming, offline, download</Slot>
    ) : null
  }

  const kept = release.extras
    .filter((e) => e.status === "kept")
    .map((e) => {
      const price = tierPrice(release.tiers, e.tier)
      return price === null ? e.name : `${e.name} · $${price}`
    })

  return (
    <div className="grid rounded-lg border bg-card/80 px-3.5 py-1.5">
      {[...FAN_BENEFITS, ...kept].map((line) => (
        <div
          key={line}
          className="flex items-center gap-2.5 border-b py-2.5 text-[13px] text-zinc-300 last:border-b-0"
        >
          <CheckIcon className="size-4 shrink-0 text-success" />
          {line}
        </div>
      ))}
    </div>
  )
}

function DropOverlay({
  dragging,
  onDismiss,
}: {
  dragging: boolean
  onDismiss: () => void
}) {
  const { sendFiles, loadSavedDraft } = useAgent()
  const { isMobile, setOpen, setOpenMobile } = useSidebar()

  function describeInstead() {
    if (isMobile) setOpenMobile(true)
    else setOpen(true)
    // Give the sidebar a moment to slide in before focusing the composer.
    setTimeout(() => {
      document
        .querySelector<HTMLTextAreaElement>('[aria-label="Message input"]')
        ?.focus()
    }, 250)
  }

  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-background/75 p-4 backdrop-blur-[2px]">
      <div className="grid max-w-[420px] justify-items-center gap-2 rounded-xl border-2 border-dashed border-ai px-6 py-7 text-center @xl:px-9">
        <UploadIcon className="size-6 text-ai" />
        <b className="text-lg">Drop everything here</b>
        <p className="text-[13px] text-muted-foreground">
          Cover, photos, tracks, voice notes. Or describe the release and we lay
          it out for you.
        </p>
        {!dragging && (
          <>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={describeInstead}>
                Describe it instead
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => sendFiles(DEMO_FILES)}
              >
                Use demo files
              </Button>
            </div>
            <div className="flex flex-wrap justify-center">
              <Button
                variant="link"
                size="xs"
                className="text-muted-foreground"
                onClick={onDismiss}
              >
                Fill it in by hand
              </Button>
              <Button
                variant="link"
                size="xs"
                className="text-muted-foreground"
                title="Fills the page with a saved first pass, without calling Claude"
                onClick={loadSavedDraft}
              >
                Load the saved draft
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
