// The live EVEN fan release page, as a logged-out visitor sees it on a phone
// (measured by Product Design on 30 Oct 2026, www.even.biz/r/...). Keep every
// fan-facing value here so the preview can't drift from the real page.
// Colors and the font are also Tailwind tokens in app/globals.css:
// bg-fan-bg (#000), bg-fan-cta (#E03026) and font-fan (Lato).

/** The phone screen the preview renders at. */
export const PHONE = { width: 390, height: 844 }

/** Bezel drawn outside the phone screen, in px. */
export const PHONE_BEZEL = 12

export const fan = {
  page: "bg-fan-bg font-fan text-white",
  /** Sticky EVEN header, 56 px. */
  header: "h-14",
  /** Title: Lato 24 / 800 on the fan page; Lato ships 900 as the nearest weight. */
  title: "text-2xl leading-tight font-black",
  artist: "text-lg",
  /** Description: 16 px, clamped to two lines. */
  description: "line-clamp-2 text-base text-zinc-300",
  /** Primary CTA: full width, 48 px, Lato 16 / 700, radius 4. */
  cta: "h-12 w-full rounded-[4px] bg-fan-cta text-base font-bold text-white",
  /** Release type pill (Album, EP, Single). */
  pill: "rounded-[4px] bg-zinc-800 px-2 py-0.5 text-xs font-bold text-white",
  /** Cover: 269 px, centered. */
  cover: "size-[269px]",
} as const
