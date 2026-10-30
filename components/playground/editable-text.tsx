"use client"

import { cn } from "@/lib/utils"

type EditableTextProps = {
  value: string
  onCommit: (value: string) => void
  placeholder: string
  editable: boolean
  multiline?: boolean
  /** The agent is working: empty slots shimmer until it fills them. */
  pending?: boolean
  className?: string
}

/**
 * Text the artist clicks and types into, in place. Commits on blur or Enter;
 * Escape reverts. Empty values render as a dashed slot with the placeholder.
 */
export function EditableText({
  value,
  onCommit,
  placeholder,
  editable,
  multiline,
  pending,
  className,
}: EditableTextProps) {
  if (!editable) {
    return value ? <div className={className}>{value}</div> : null
  }

  return (
    <div
      // Remount when the value changes from outside (e.g. the agent), so the
      // browser-owned DOM inside contentEditable never drifts from state.
      key={value}
      role="textbox"
      aria-label={placeholder}
      aria-multiline={multiline}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !multiline && !e.nativeEvent.isComposing) {
          e.preventDefault()
          e.currentTarget.blur()
        }
        if (e.key === "Escape") {
          e.currentTarget.textContent = value
          e.currentTarget.blur()
        }
      }}
      onBlur={(e) => {
        const next = (e.currentTarget.textContent ?? "").trim()
        if (next !== value) onCommit(next)
      }}
      className={cn(
        // Editability shows on hover only, in a neutral color; focus gets a
        // solid ring that reads differently from hover. Violet is kept for
        // things the AI did.
        "cursor-text rounded-sm outline-1 outline-offset-4 outline-transparent transition-[outline-color] outline-dashed hover:outline-zinc-500 focus-visible:outline-2 focus-visible:outline-zinc-200 focus-visible:outline-solid",
        "empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
        className,
        !value &&
          "rounded-md border-[1.5px] border-dashed px-3 py-2 text-sm leading-normal font-normal tracking-normal",
        pending && !value && "animate-pulse border-ai/60"
      )}
    >
      {value}
    </div>
  )
}
