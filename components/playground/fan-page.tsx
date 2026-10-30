"use client"

import {
  BadgeCheckIcon,
  ChevronLeftIcon,
  EllipsisVerticalIcon,
  HouseIcon,
  ListMusicIcon,
  LockIcon,
  SearchIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wordmark } from "@/components/playground/brand"
import { usePlayground } from "@/components/playground/playground-provider"
import {
  AccessTiers,
  Includes,
  art,
} from "@/components/playground/release-page"
import { TrackList } from "@/components/playground/track-list"
import { assetUrl } from "@/lib/assets"
import { fan } from "@/lib/fan-tokens"
import { formatDate, minPrice, releaseType } from "@/lib/release"
import { cn } from "@/lib/utils"

const fakeCheckout = () => toast("Checkout is faked in the playground")

/**
 * The release page as a logged-out fan sees it, rendered from the same
 * release object as the editor. Nothing here is editable, and fields the
 * artist hasn't filled in are left out, as on the live fan page.
 */
export function FanPage() {
  const { release } = usePlayground()
  const price = minPrice(release.tiers)

  return (
    <div className={cn("relative flex min-h-full flex-col", fan.page)}>
      <header
        className={cn(
          "sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-white/10 bg-fan-bg/95 px-4 backdrop-blur",
          fan.header
        )}
      >
        <Wordmark className="text-xl tracking-[0.14em]" />
        <button
          type="button"
          className="h-9 rounded-md bg-zinc-800 px-4 text-sm font-bold"
          onClick={fakeCheckout}
        >
          Login
        </button>
      </header>

      <div className="relative flex-1">
        {release.cover && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[520px] [mask-image:linear-gradient(to_bottom,black_30%,transparent)] opacity-50 blur-2xl"
            style={art(release.cover)}
          />
        )}

        <div className="relative px-4 pb-8 @xl:px-8">
          <div className="flex h-14 items-center justify-between">
            <button type="button" aria-label="Back" className="-ml-1 p-1">
              <ChevronLeftIcon className="size-6" />
            </button>
            <span className="flex items-center gap-1.5 rounded-md bg-black/60 px-3 py-1.5 text-sm">
              <LockIcon className="size-3.5" />
              Get Access To Listen
            </span>
            <button type="button" aria-label="More" className="-mr-1 p-1">
              <EllipsisVerticalIcon className="size-6" />
            </button>
          </div>

          <div className="grid gap-6 @xl:grid-cols-[269px_1fr] @xl:items-start @xl:gap-10">
            {release.cover && (
              <div
                role="img"
                aria-label={`Cover art for ${release.title}`}
                className={cn(
                  fan.cover,
                  "mx-auto mt-2 grid content-end rounded-md p-3 text-[13px] font-black tracking-[0.08em] text-[#ffd9a8] uppercase shadow-2xl"
                )}
                style={art(release.cover)}
              >
                {!assetUrl(release.cover) && release.title}
              </div>
            )}

            <div className="grid min-w-0 gap-3">
              {release.title && (
                <h1 className={cn(fan.title, "break-words")}>
                  {release.title}
                </h1>
              )}
              {release.artist && (
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="size-10 shrink-0 rounded-full bg-[#5b3d4d]" />
                  <span className={cn(fan.artist, "truncate")}>
                    {release.artist}
                  </span>
                  <BadgeCheckIcon
                    aria-label="Verified artist"
                    className="size-5 shrink-0 fill-fan-cta text-fan-bg"
                  />
                </div>
              )}
              <Meta />
              {release.description && (
                <p className={fan.description}>{release.description}</p>
              )}
              <button type="button" className={fan.cta} onClick={fakeCheckout}>
                Get Access
              </button>
            </div>
          </div>

          <Tabs defaultValue="tracks" className="mt-8 gap-3">
            <TabsList
              variant="line"
              className="h-auto w-full justify-start gap-6 rounded-none border-b border-white/10 p-0"
            >
              <TabsTrigger
                value="tracks"
                className="h-10 flex-none px-0 text-base after:bg-fan-cta group-data-horizontal/tabs:after:-bottom-px"
              >
                Tracks
              </TabsTrigger>
              <TabsTrigger
                value="access"
                className="h-10 flex-none px-0 text-base after:bg-fan-cta group-data-horizontal/tabs:after:-bottom-px"
              >
                Access
                <LockIcon />
              </TabsTrigger>
            </TabsList>
            <TabsContent value="tracks">
              <TrackList />
            </TabsContent>
            <TabsContent value="access">
              <AccessTiers />
            </TabsContent>
          </Tabs>
          <div className="mt-6">
            <Includes />
          </div>
        </div>
      </div>

      {/* Pinned to the bottom of the phone, as on the fan page. */}
      <div className="sticky bottom-0 z-20 mt-auto">
        <div className="mx-3 mb-3 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur @xl:mx-auto @xl:max-w-xl">
          <div className="min-w-0">
            <p className="font-bold">Get Exclusive Access</p>
            <p className="text-sm text-zinc-400">
              Minimum Price{" "}
              {price === null ? "not set" : `$${price.toFixed(2)}`}
            </p>
          </div>
          <button
            type="button"
            className="flex h-11 shrink-0 items-center gap-2 rounded-[4px] bg-fan-cta px-4 font-bold"
            onClick={fakeCheckout}
          >
            <LockIcon className="size-4" />
            Get Access
          </button>
        </div>
        <nav
          aria-label="EVEN"
          className="grid h-16 grid-cols-3 border-t border-white/10 bg-fan-bg text-xs text-zinc-300 @xl:hidden"
        >
          {(
            [
              ["Explore", HouseIcon],
              ["Search", SearchIcon],
              ["My Library", ListMusicIcon],
            ] as const
          ).map(([label, Icon]) => (
            <button
              key={label}
              type="button"
              className="grid place-content-center justify-items-center gap-1"
            >
              <Icon className="size-5" />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

/** Type pill · date · song count, skipping whatever isn't set yet. */
function Meta() {
  const { release } = usePlayground()
  const count = release.tracks.length
  const parts = [
    count > 0 && <span className={fan.pill}>{releaseType(count)}</span>,
    release.releaseDate && <span>{formatDate(release.releaseDate)}</span>,
    count > 0 && (
      <span>
        {count} song{count === 1 ? "" : "s"}
      </span>
    ),
  ].filter(Boolean)
  if (!parts.length) return null

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden>•</span>}
          {part}
        </span>
      ))}
    </div>
  )
}
