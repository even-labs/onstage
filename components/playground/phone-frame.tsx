"use client"

import * as React from "react"

import { usePlayground } from "@/components/playground/playground-provider"
import { PHONE, PHONE_BEZEL } from "@/lib/fan-tokens"
import { cn } from "@/lib/utils"

const OUTER = {
  width: PHONE.width + PHONE_BEZEL * 2,
  height: PHONE.height + PHONE_BEZEL * 2,
}

/**
 * A 390×844 phone screen with the bezel drawn outside it. The screen scrolls
 * on its own and is the containing block for the fan page's pinned UI, and the
 * whole phone scales down to fit the space it's given. When there isn't room
 * for a bezel (the tool itself is on a phone), the screen fills the space.
 */
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const { setZoom } = usePlayground()
  const slotRef = React.useRef<HTMLDivElement>(null)
  const [fit, setFit] = React.useState({ scale: 1, bare: false })

  React.useEffect(() => {
    const slot = slotRef.current
    if (!slot) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const bare = width < OUTER.width
      const scale = bare
        ? 1
        : Math.min(1, height / OUTER.height, width / OUTER.width)
      setFit({ scale, bare })
      setZoom(Math.round(scale * 100))
    })
    observer.observe(slot)
    return () => observer.disconnect()
  }, [setZoom])

  const screen = (
    <div
      className={cn(
        "@container relative overflow-y-auto overscroll-contain bg-fan-bg [contain:paint]",
        fit.bare ? "size-full" : "rounded-[2.25rem]"
      )}
      style={fit.bare ? undefined : PHONE}
    >
      {children}
    </div>
  )

  return (
    <div ref={slotRef} className="flex min-h-0 w-full flex-1 justify-center">
      {fit.bare ? (
        screen
      ) : (
        <div
          style={{
            width: OUTER.width * fit.scale,
            height: OUTER.height * fit.scale,
          }}
        >
          <div
            className="rounded-[3rem] bg-zinc-900 shadow-2xl ring-1 ring-zinc-700"
            style={{
              ...OUTER,
              padding: PHONE_BEZEL,
              transform: `scale(${fit.scale})`,
              transformOrigin: "top left",
            }}
          >
            {screen}
          </div>
        </div>
      )}
    </div>
  )
}
