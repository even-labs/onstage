"use client"

import { DraftReview } from "@/components/playground/draft-review"
import { FanPage } from "@/components/playground/fan-page"
import { PhoneFrame } from "@/components/playground/phone-frame"
import { usePlayground } from "@/components/playground/playground-provider"
import { ReleasePage } from "@/components/playground/release-page"
import { isEmpty } from "@/lib/release"
import { cn } from "@/lib/utils"

/**
 * The preview frame (a desktop page or a phone) and, beside it, the draft
 * review: everything the artist acts on that fans never see.
 */
export function ReleaseCanvas() {
  const { viewport, mode, release } = usePlayground()
  const page = mode === "edit" ? <ReleasePage /> : <FanPage />
  const showReview = mode !== "publish" && !isEmpty(release)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-card/30 lg:flex-row lg:overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col items-center p-4 md:p-6 lg:min-h-0 lg:overflow-y-auto">
        {viewport === "phone" ? (
          <PhoneFrame>{page}</PhoneFrame>
        ) : (
          // Two fixed layouts, no animated width: text never reflows mid-switch.
          // shrink-0 keeps the page at its full height so the column scrolls;
          // overflow-clip (not hidden) rounds the corners without becoming a
          // scroll container, so the fan page's sticky header and bar still pin.
          <div
            className={cn(
              "@container w-full max-w-[1000px] shrink-0 overflow-clip rounded-xl border",
              mode === "edit" ? "bg-background" : "bg-fan-bg"
            )}
          >
            {page}
          </div>
        )}
      </div>
      {showReview && (
        <DraftReview className="shrink-0 border-t p-4 md:p-6 lg:w-80 lg:overflow-y-auto lg:border-t-0 lg:border-l" />
      )}
    </div>
  )
}
