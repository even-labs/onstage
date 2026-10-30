"use client"

import {
  EyeIcon,
  LoaderCircleIcon,
  MonitorIcon,
  PanelRightIcon,
  PencilIcon,
  SaveIcon,
  SmartphoneIcon,
} from "lucide-react"
import { useAuiState } from "@assistant-ui/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { AiTag, Wordmark } from "@/components/playground/brand"
import {
  usePlayground,
  type Viewport,
} from "@/components/playground/playground-provider"
import { missingBeforePublish, slugify } from "@/lib/release"

export function BuilderToolbar() {
  const {
    release,
    mode,
    setMode,
    viewport,
    setViewport,
    zoom,
    reviewOpen,
    setReviewOpen,
  } = usePlayground()
  const running = useAuiState((s) => s.thread.isRunning)
  const missing = missingBeforePublish(release)
  const openQuestions = release.questions.filter((q) => !q.resolved).length
  const toReview =
    openQuestions +
    release.extras.filter((e) => e.status === "suggested").length
  const isDraft =
    release.aiFields.length > 0 ||
    release.extras.some((e) => e.status === "suggested")

  function publish() {
    setMode("publish")
    toast.success(`Published · even.biz/r/${slugify(release.title)}`)
    if (openQuestions) {
      toast.warning(
        `${openQuestions} question${openQuestions === 1 ? " is" : "s are"} still open from the draft`
      )
    }
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-sidebar px-3">
      <SidebarTrigger />
      <Wordmark />
      <span className="hidden truncate text-sm text-muted-foreground sm:inline">
        {mode === "publish" ? "Published" : "Backstage"} ·{" "}
        {release.title || "New release"}
      </span>
      {running ? (
        <AiTag>
          <LoaderCircleIcon className="size-3 animate-spin" />
          Claude is working
        </AiTag>
      ) : (
        mode !== "publish" &&
        isDraft && (
          <AiTag className="hidden md:inline-flex">AI draft · review it</AiTag>
        )
      )}

      <div className="ml-auto flex items-center gap-2">
        {mode !== "publish" && (
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            value={[mode]}
            onValueChange={(value) => {
              if (value[0]) setMode(value[0] as "edit" | "fan")
            }}
          >
            <ToggleGroupItem value="edit" aria-label="Edit">
              <PencilIcon />
              <span className="hidden lg:inline">Edit</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="fan" aria-label="Fan view">
              <EyeIcon />
              <span className="hidden lg:inline">Fan view</span>
            </ToggleGroupItem>
          </ToggleGroup>
        )}

        <ToggleGroup
          variant="outline"
          size="sm"
          spacing={0}
          value={[viewport]}
          onValueChange={(value) => {
            const next = value[0] as Viewport | undefined
            if (!next) return
            setViewport(next)
            // Checking the phone layout is a fan-eye check, so start there.
            if (next === "phone" && mode === "edit") setMode("fan")
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
        {viewport === "phone" && (
          <span
            className="text-xs text-muted-foreground tabular-nums"
            title="The phone preview is scaled to fit the window"
          >
            {zoom}%
          </span>
        )}

        {mode !== "publish" ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => toast("Draft saved")}
            >
              Save draft
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              className="sm:hidden"
              aria-label="Save draft"
              onClick={() => toast("Draft saved")}
            >
              <SaveIcon />
            </Button>
            <span
              title={
                missing.length
                  ? `Missing before publish: ${missing.join(", ")}`
                  : undefined
              }
            >
              <Button size="sm" disabled={missing.length > 0} onClick={publish}>
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

        {mode !== "publish" && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative"
            aria-label={reviewOpen ? "Hide draft review" : "Show draft review"}
            aria-pressed={reviewOpen}
            title={reviewOpen ? "Hide draft review" : "Show draft review"}
            onClick={() => setReviewOpen(!reviewOpen)}
          >
            <PanelRightIcon />
            {!reviewOpen && toReview > 0 && (
              <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-ai text-[10px] font-bold text-background tabular-nums">
                {toReview}
              </span>
            )}
          </Button>
        )}
      </div>
    </header>
  )
}
