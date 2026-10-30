"use client"

import * as React from "react"
import { useAuiState } from "@assistant-ui/react"
import {
  AudioLinesIcon,
  CheckIcon,
  FileTextIcon,
  ImageIcon,
  LockIcon,
  PlusIcon,
  SparklesIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAgent } from "@/components/playground/agent-runtime"
import { EditableText } from "@/components/playground/editable-text"
import {
  usePlayground,
  type PageTab,
} from "@/components/playground/playground-provider"
import { Slot, TrackList } from "@/components/playground/track-list"
import { useRemoveWithUndo } from "@/components/playground/use-remove-with-undo"
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
  type Tier,
} from "@/lib/release"
import { extraNameAvailable } from "@/lib/release-reducer"
import { cn } from "@/lib/utils"

/** A real dropped image when there is one, otherwise the mock gradient for that name. */
export function art(file: string): React.CSSProperties {
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

/** The release page in Edit mode: every slot is editable in place. */
export function ReleasePage() {
  const { release, mode, pageTab, setPageTab } = usePlayground()
  const { stageFiles, staged } = useAgent()
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
      className={cn(
        "relative p-4 @xl:p-7",
        draggingFiles &&
          !isEmpty(release) &&
          "outline-2 -outline-offset-8 outline-zinc-500 outline-dashed"
      )}
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
        // Files pile up until the artist says go, so they can keep adding.
        stageFiles(await registerAssets(e.dataTransfer.files))
      }}
    >
      {release.cover && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[360px] [mask-image:linear-gradient(to_bottom,black,transparent)] opacity-35 blur-[40px]"
          style={art(release.cover)}
        />
      )}

      <div className="relative grid gap-6">
        <Hero />
        <Tabs
          value={pageTab}
          onValueChange={(value) => setPageTab(value as PageTab)}
          className="gap-3"
        >
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

      {editing && !isEmpty(release) && staged.length > 0 && <StagedTray />}

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
          field="title"
          editable={editing}
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
            field="artist"
            editable={editing}
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
              data-field="release_date"
              value={release.releaseDate}
              onChange={(e) =>
                dispatch({ type: "setReleaseDate", value: e.target.value })
              }
              className={cn(
                "h-7 rounded-sm bg-transparent [color-scheme:dark] outline-1 outline-offset-2 outline-transparent outline-dashed hover:outline-zinc-500 focus-visible:outline-2 focus-visible:outline-zinc-200 focus-visible:outline-solid",
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
  const removeWithUndo = useRemoveWithUndo()

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
          data-field="cover"
          onClick={picker.open}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") picker.open()
          }}
          className={cn(
            "grid aspect-square w-full max-w-[240px] cursor-pointer place-items-center @xl:max-w-none",
            drop.over && "border-zinc-300 bg-muted/40"
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
    <div className="group/cover relative w-full max-w-[240px] @xl:max-w-none">
      <div
        role="img"
        aria-label={`Cover art: ${release.cover}`}
        title={
          editing ? "Click or drop an image to replace the cover" : undefined
        }
        className={cn(
          "grid aspect-square w-full content-end justify-items-start rounded-md p-3 text-[13px] font-extrabold tracking-[0.08em] text-[#ffd9a8] uppercase shadow-lg",
          editing &&
            "cursor-pointer outline-2 outline-offset-4 outline-transparent transition-[outline-color] hover:outline-zinc-500",
          drop.over && "outline-zinc-300"
        )}
        onClick={editing ? picker.open : undefined}
        style={art(release.cover)}
        {...dropProps}
      >
        {!realImage && release.title}
      </div>
      {editing && (
        <>
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label="Remove the cover"
            className="absolute top-2 right-2 opacity-0 group-hover/cover:opacity-100 focus-visible:opacity-100"
            onClick={() => removeWithUndo({ type: "removeCover" }, "the cover")}
          >
            <XIcon />
          </Button>
          {picker.input}
        </>
      )}
    </div>
  )
}

function Photos() {
  const { release, mode, dispatch } = usePlayground()
  const editing = mode === "edit"
  const removeWithUndo = useRemoveWithUndo()

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
            drop.over && "border-zinc-300 bg-muted/40"
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
        drop.over && "outline-2 outline-offset-4 outline-zinc-300"
      )}
      {...dropProps}
    >
      {release.photos.map((photo) => (
        <div key={photo} className="group/photo relative">
          <div
            role="img"
            aria-label={photo}
            title={photo}
            className="size-14 rounded-md border"
            style={art(photo)}
          />
          {editing && (
            <button
              type="button"
              aria-label={`Remove ${photo}`}
              className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full border bg-background text-muted-foreground opacity-0 group-hover/photo:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-zinc-200"
              onClick={() =>
                removeWithUndo(
                  { type: "removePhoto", file: photo },
                  "the photo"
                )
              }
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
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

export function AccessTiers() {
  const { release, mode } = usePlayground()
  const editing = mode === "edit"

  if (editing) return <AccessEditor />
  if (!release.tiers.length) return null

  // Fans only see the extras the artist kept or added.
  const hidden = new Set(
    release.extras
      .filter((e) => e.status === "removed" || e.status === "suggested")
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
            <span className="font-semibold tabular-nums">
              ${tier.price_usd}
            </span>
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

/** The Access tab in Edit mode: tiers and the extras they unlock, all editable by hand. */
function AccessEditor() {
  const { release, dispatch } = usePlayground()
  const running = useAuiState((s) => s.thread.isRunning)
  const tiers = [...release.tiers].sort((a, b) => a.price_usd - b.price_usd)
  const extras = release.extras.filter((e) => e.status !== "removed")

  return (
    <div className="grid gap-6">
      <section className="grid gap-3">
        <h3 className="text-sm font-semibold">Tiers</h3>
        {tiers.length === 0 && (
          <Slot pending={running}>
            Tiers appear here: what each price unlocks
          </Slot>
        )}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2.5">
          {tiers.map((tier) => (
            <TierEditor key={tier.name} tier={tier} extras={extras} />
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="justify-self-start"
          data-field="tiers"
          onClick={() => dispatch({ type: "addTier" })}
        >
          <PlusIcon />
          Add tier
        </Button>
      </section>
      <ExtrasEditor />
    </div>
  )
}

function TierEditor({ tier, extras }: { tier: Tier; extras: Extra[] }) {
  const { release, dispatch } = usePlayground()
  const removeWithUndo = useRemoveWithUndo()

  return (
    <div className="grid content-start gap-2 rounded-lg border bg-card/80 p-3.5">
      <div className="flex items-center gap-2 text-sm">
        <EditableText
          value={tier.name}
          placeholder="Tier name"
          editable
          onCommit={(to) => {
            if (release.tiers.some((t) => t.name === to.trim())) {
              toast("Another tier already has that name")
            }
            dispatch({ type: "renameTier", name: tier.name, to })
          }}
          className="min-w-0 flex-1 font-bold"
        />
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
            className="h-7 w-12 [appearance:textfield] rounded-sm bg-transparent outline-1 outline-offset-2 outline-transparent outline-dashed hover:outline-zinc-500 focus-visible:outline-2 focus-visible:outline-zinc-200 focus-visible:outline-solid [&::-webkit-inner-spin-button]:appearance-none"
          />
        </label>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove the ${tier.name} tier`}
          className="text-muted-foreground"
          onClick={() =>
            removeWithUndo(
              { type: "removeTier", name: tier.name },
              `the “${tier.name}” tier`
            )
          }
        >
          <XIcon />
        </Button>
      </div>
      <ul className="grid gap-1 text-[13px] text-zinc-300">
        <li className="flex min-h-6 items-center gap-2">
          <CheckIcon className="size-3.5 shrink-0 text-success" />
          The record
        </li>
        {extras.map((extra) => (
          <li key={extra.id}>
            <label className="flex min-h-6 cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={tier.includes.includes(extra.name)}
                onChange={() =>
                  dispatch({
                    type: "toggleTierItem",
                    tier: tier.name,
                    item: extra.name,
                  })
                }
                className="size-3.5 shrink-0 accent-zinc-200"
              />
              <span className="min-w-0 truncate">{extra.name}</span>
              {extra.status === "suggested" && (
                <span className="shrink-0 text-muted-foreground">
                  · suggested
                </span>
              )}
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Extras on the page: the ones the artist added by hand or kept from the AI's
 * suggestions. Suggestions still to decide on wait in the review column.
 */
function ExtrasEditor() {
  const { release, dispatch } = usePlayground()
  const removeWithUndo = useRemoveWithUndo()
  const onPage = release.extras.filter(
    (e) => e.source === "manual" || e.status === "kept"
  )
  const tiers = [...release.tiers].sort((a, b) => a.price_usd - b.price_usd)

  return (
    <section className="grid gap-3">
      <h3 className="text-sm font-semibold">Extras</h3>
      {onPage.length === 0 && (
        <p className="text-sm text-muted-foreground">
          What a tier unlocks beyond the record: a lyric book, an early listen,
          a listening party.
        </p>
      )}
      <div className="grid gap-2.5">
        {onPage.map((extra) => (
          <div
            key={extra.id}
            className="grid gap-1.5 rounded-lg border bg-card/80 p-3 text-sm"
          >
            <div className="flex items-center gap-2">
              <EditableText
                value={extra.name}
                placeholder="Extra name"
                editable
                onCommit={(name) => {
                  if (!extraNameAvailable(release, name, extra.id)) {
                    toast("Extras need a name no other extra uses")
                  }
                  dispatch({ type: "editExtra", id: extra.id, patch: { name } })
                }}
                className="min-w-0 flex-1 font-bold"
              />
              <select
                value={extra.tier}
                aria-label={`Tier that unlocks ${extra.name}`}
                onChange={(e) =>
                  dispatch({
                    type: "setExtraTier",
                    id: extra.id,
                    tier: e.target.value,
                  })
                }
                className="h-7 max-w-40 rounded-md border bg-background px-2 text-xs"
              >
                {tiers.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} · ${t.price_usd}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${extra.name}`}
                className="text-muted-foreground"
                onClick={() =>
                  removeWithUndo(
                    extra.source === "manual"
                      ? { type: "removeExtra", id: extra.id }
                      : {
                          type: "setExtraStatus",
                          id: extra.id,
                          status: "removed",
                        },
                    `“${extra.name}”`
                  )
                }
              >
                <XIcon />
              </Button>
            </div>
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
              className="text-zinc-300"
            />
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="justify-self-start"
        disabled={!release.tiers.length}
        title={release.tiers.length ? undefined : "Add a tier first"}
        onClick={() =>
          dispatch({ type: "addExtra", id: `manual-${crypto.randomUUID()}` })
        }
      >
        <PlusIcon />
        Add extra
      </Button>
    </section>
  )
}

export function Includes() {
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

const KIND_ICON = {
  audio: AudioLinesIcon,
  image: ImageIcon,
  text: FileTextIcon,
} as const

/** Files waiting to go to the agent, with what was read from them. */
function StagedFileList() {
  const { staged, unstageFile } = useAgent()

  return (
    <ul className="grid max-h-56 w-full gap-1 overflow-y-auto text-left text-sm">
      {staged.map((f) => {
        const Icon = KIND_ICON[f.kind]
        return (
          <li
            key={f.name}
            className="flex items-center gap-2 rounded-md bg-muted/40 py-1 pr-1 pl-2.5"
          >
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate" title={f.name}>
              {f.tags?.title ? (
                <>
                  {f.tags.title}{" "}
                  <span className="text-muted-foreground">· {f.name}</span>
                </>
              ) : (
                f.name
              )}
            </span>
            {f.duration && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {f.duration}
              </span>
            )}
            <button
              type="button"
              aria-label={`Remove ${f.name}`}
              className="grid size-6 shrink-0 place-items-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-zinc-200"
              onClick={() => unstageFile(f.name)}
            >
              <XIcon className="size-3.5" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** Files dropped on a page that already has content, waiting to be sent. */
function StagedTray() {
  const { staged, sendStaged, clearStaged } = useAgent()

  return (
    <div className="sticky bottom-4 z-10 mx-auto mt-6 grid w-full max-w-md gap-3 rounded-xl border bg-background/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between text-sm">
        <b>
          {staged.length} file{staged.length === 1 ? "" : "s"} ready
        </b>
        <Button variant="ghost" size="sm" onClick={clearStaged}>
          Clear
        </Button>
      </div>
      <StagedFileList />
      <Button onClick={sendStaged}>
        <SparklesIcon />
        Send to Claude
      </Button>
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
  const {
    staged,
    stageFiles,
    clearStaged,
    sendStaged,
    sendFiles,
    loadSavedDraft,
  } = useAgent()
  const { isMobile, setOpen, setOpenMobile } = useSidebar()
  const fileInput = React.useRef<HTMLInputElement>(null)
  const hasStaged = staged.length > 0

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
    <div className="absolute inset-0 z-10 grid place-items-center bg-background/50 p-4">
      <div className="grid w-full max-w-[440px] justify-items-center gap-3 rounded-xl border-2 border-dashed border-zinc-600 bg-background/95 px-6 py-7 text-center @xl:px-9">
        <UploadIcon className="size-6 text-muted-foreground" />
        <b className="text-lg">
          {hasStaged ? "Add anything else" : "Drop everything here"}
        </b>
        <p className="text-sm text-muted-foreground">
          {hasStaged
            ? "Keep dropping files. When you're ready, Claude lays out the page the way fans will see it."
            : "Cover, photos, tracks, voice notes. Claude lays out the page the way fans will see it."}
        </p>
        {hasStaged && <StagedFileList />}
        {!dragging && (
          <>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {hasStaged ? (
                <>
                  <Button onClick={sendStaged}>
                    <SparklesIcon />
                    Lay out the release
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => fileInput.current?.click()}
                  >
                    <PlusIcon />
                    Add more files
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => fileInput.current?.click()}>
                    Choose files
                  </Button>
                  <Button variant="outline" onClick={describeInstead}>
                    Describe it instead
                  </Button>
                </>
              )}
              <input
                ref={fileInput}
                type="file"
                multiple
                hidden
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? [])
                  e.target.value = ""
                  if (files.length) stageFiles(await registerAssets(files))
                }}
              />
            </div>
            {hasStaged ? (
              <Button
                variant="link"
                size="sm"
                className="text-muted-foreground"
                onClick={clearStaged}
              >
                Clear the list
              </Button>
            ) : (
              <details className="text-sm text-muted-foreground">
                <summary className="cursor-pointer py-1">
                  More ways to start
                </summary>
                <div className="flex flex-wrap justify-center">
                  <Button
                    variant="link"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => sendFiles(DEMO_FILES)}
                  >
                    Use demo files
                  </Button>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-muted-foreground"
                    title="Fills the page with a saved first pass, without calling Claude"
                    onClick={loadSavedDraft}
                  >
                    Load the saved draft
                  </Button>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={onDismiss}
                  >
                    Fill it in by hand
                  </Button>
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  )
}
