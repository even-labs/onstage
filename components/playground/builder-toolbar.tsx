"use client"

import {
  LoaderCircleIcon,
  MonitorIcon,
  PencilIcon,
  SmartphoneIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { AiTag, Wordmark } from "@/components/playground/brand"
import {
  usePlayground,
  type Viewport,
} from "@/components/playground/playground-provider"
import { INTENT_STATUS } from "@/lib/mock-agent"
import { canPublish, slugify } from "@/lib/release"

export function BuilderToolbar() {
  const { release, mode, setMode, viewport, setViewport, pending } =
    usePlayground()
  const publishable = canPublish(release)
  const isDraft =
    release.aiFields.length > 0 ||
    release.extras.some((e) => e.status === "suggested")

  function publish() {
    setMode("publish")
    toast.success(`Published · even.biz/r/${slugify(release.title)}`)
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-sidebar px-3">
      <SidebarTrigger />
      <Wordmark />
      <span className="hidden truncate text-sm text-muted-foreground sm:inline">
        {mode === "publish" ? "Fan view" : "Backstage"} ·{" "}
        {release.title || "New release"}
      </span>
      {pending ? (
        <AiTag>
          <LoaderCircleIcon className="size-3 animate-spin" />
          {INTENT_STATUS[pending]}
        </AiTag>
      ) : (
        mode === "edit" &&
        isDraft && (
          <AiTag className="hidden md:inline-flex">AI draft · review it</AiTag>
        )
      )}

      <div className="ml-auto flex items-center gap-2">
        <ToggleGroup
          variant="outline"
          size="sm"
          spacing={0}
          value={[viewport]}
          onValueChange={(value) => {
            if (value[0]) setViewport(value[0] as Viewport)
          }}
        >
          <ToggleGroupItem value="desktop" aria-label="Desktop view">
            <MonitorIcon />
            <span className="hidden lg:inline">Desktop</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="phone" aria-label="Phone view">
            <SmartphoneIcon />
            <span className="hidden lg:inline">Phone</span>
          </ToggleGroupItem>
        </ToggleGroup>

        {mode === "edit" ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => toast("Draft saved")}
            >
              Save draft
            </Button>
            <span
              title={
                publishable ? undefined : "Needs a cover, a title and one track"
              }
            >
              <Button size="sm" disabled={!publishable} onClick={publish}>
                Publish
              </Button>
            </span>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setMode("edit")}>
            <PencilIcon />
            Back to editing
          </Button>
        )}
      </div>
    </header>
  )
}
