"use client"

import { cn } from "@/lib/utils"

type EditableTextProps = {
  value: string
  onCommit: (value: string) => void
  placeholder: string
  editable: boolean
  multiline?: boolean
  /** Written by the AI and not yet touched by the artist. */
  ai?: boolean
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
  ai,
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
        "cursor-text rounded-sm outline-1 outline-offset-4 outline-transparent transition-[outline-color] outline-dashed hover:outline-ai/60 focus:outline-ai",
        "empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
        ai &&
          "underline decoration-ai/50 decoration-dotted underline-offset-[5px]",
        className,
        !value &&
          "rounded-md border-[1.5px] border-dashed px-3 py-2 text-sm leading-normal font-normal tracking-normal outline-none focus:border-ai",
        pending && !value && "animate-pulse border-ai/60"
      )}
    >
      {value}
    </div>
  )
}
