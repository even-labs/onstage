import { cn } from "@/lib/utils"

/** Text stand-in for the EVEN logo. */
export function Wordmark({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "text-sm font-extrabold tracking-[0.18em] text-primary",
        className
      )}
      {...props}
    >
      EVEN
    </span>
  )
}

/** Violet marks everything the AI did. Red stays reserved for fan actions. */
export function AiTag({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-ai-muted px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-ai",
        className
      )}
      {...props}
    />
  )
}
