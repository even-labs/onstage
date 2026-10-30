"use client"

import { CheckIcon, Undo2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { AiTag } from "@/components/playground/brand"
import { EditableText } from "@/components/playground/editable-text"
import { usePlayground } from "@/components/playground/playground-provider"
import { missingBeforePublish, tierPrice, type Extra } from "@/lib/release"
import { cn } from "@/lib/utils"

/**
 * Everything about the draft that fans never see: what's missing, the AI's
 * open questions and its suggested extras. Lives beside the preview frame so
 * the frame shows only the fan page.
 */
export function DraftReview({ className }: { className?: string }) {
  const { release } = usePlayground()
  const missing = missingBeforePublish(release)

  return (
    <aside
      aria-label="Review the draft"
      className={cn("grid content-start gap-6 text-sm", className)}
    >
      {missing.length > 0 && (
        <section className="grid gap-1">
          <h2 className="font-semibold">Missing before publish</h2>
          <p className="text-muted-foreground first-letter:uppercase">
            {missing.join(", ")}
          </p>
        </section>
      )}
      <Questions />
      <SuggestedExtras />
    </aside>
  )
}

function Questions() {
  const { release, dispatch } = usePlayground()
  if (!release.questions.length) return null
  const open = release.questions.filter((q) => !q.resolved).length

  return (
    <section className="grid gap-2">
      <h2 className="font-semibold">
        Questions from the draft{" "}
        <span className="font-normal text-muted-foreground">
          · {open ? `${open} open` : "all resolved"}
        </span>
      </h2>
      <ul className="grid gap-1">
        {release.questions.map((q, i) => (
          <li key={q.text}>
            <label
              className={cn(
                "flex min-h-11 cursor-pointer items-start gap-2.5 rounded-md p-2 hover:bg-muted/50",
                q.resolved && "text-muted-foreground"
              )}
            >
              <input
                type="checkbox"
                checked={q.resolved}
                onChange={() => dispatch({ type: "toggleQuestion", index: i })}
                title="Mark resolved"
                className="mt-0.5 size-4 shrink-0 accent-zinc-200"
              />
              <span className={cn(q.resolved && "line-through")}>{q.text}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}

function SuggestedExtras() {
  const { release } = usePlayground()
  if (!release.extras.length) return null

  return (
    <section className="grid gap-2.5">
      <h2 className="flex flex-wrap items-center gap-2 font-semibold">
        <AiTag>Suggested extras</AiTag>
      </h2>
      <p className="text-muted-foreground">
        Releases with extras tend to sell better. Keep what fits.
      </p>
      <div className="grid gap-2.5">
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
        "grid content-start gap-1.5 rounded-lg border p-3 transition-opacity",
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
        className="font-bold"
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
          <span className="text-muted-foreground italic">
            {extra.why_it_fits}
          </span>
          <div className="mt-1 flex gap-1.5">
            <Button
              size="sm"
              className="bg-success-muted text-success hover:bg-success-muted/70"
              onClick={() => setStatus("kept")}
            >
              <CheckIcon />
              Keep
            </Button>
            <Button size="sm" variant="outline" onClick={remove}>
              Remove
            </Button>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground">
          {extra.status === "kept" ? "Kept · in the Access tab" : "Removed"}
          <Button
            size="sm"
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
