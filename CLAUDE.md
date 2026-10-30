# Onstage

Team 07's build for EVEN's Open Mic hackathon (Friday, Oct 30, 2026). One-day prototype.
Source of truth for context and decisions: the "Onstage: Context and Scope for Build Day" doc
in the ONSTAGE claude.ai Project. If this file and that doc disagree, the doc wins.

## What we're building

A release creator that *is* the fan's view of the release. When an artist clicks
"Create Release" in Backstage, they land on an empty release page laid out exactly as fans
will see it, and they type, drop and arrange everything in place, on phone or desktop.

AI does the first pass: the artist drops in every file at once (or types a prompt), and one
Claude call lays out the page and proposes 2–3 extras that fit the record, grouped into
priced tiers. Releases with extras convert at ~30% vs ~7% without; most artists stop at the
record because building extras is a separate job.

## Hard rules

- Nothing touches EVEN production or Backstage. Build next to production, never in it.
  If unsure whether something touches production, stop and ask.
- Made-up data only. No real fan data, exports, emails or screenshots of real fans.
  Public info (real artist names, public stats) is fine.
- The core flow must really work in the demo. Fake only the boring parts.
- Save a copy of anything that works before changing it (commit often).

## Build-day scope

Must-haves (the core that has to work):
1. Create Release opens an empty page laid out like the fan view, with a placeholder in every slot.
2. Edit in place: click to type title/description; drop cover, photos and audio into their slots; reorder tracks.
3. AI first pass, live: drop everything at once or type a prompt, and a real Claude call fills the page.
4. AI extras: the same call proposes 2–3 extras in priced tiers, each editable or deletable on the page.
5. Phone (~390 px) and desktop toggle on the same page.
6. Publish hides the editing controls and shows the finished fan page.

Nice-to-haves (only after must-haves work end to end): deployed link; fan's-eye check
(AI flags empty description, title cut off on phone, etc.); genre/language guessed in the
background; undo for an AI suggestion.

Fake it: login, real uploads, payments, UPC/ISRC, copyright checks, emails.
Out of scope: Backstage/production, real fan data, real audio processing.

## Architecture

One web app whose only screen is the fan release page. Edit and Publish are two modes of the
same component, rendered from a single release object.

| Piece | What it does |
| --- | --- |
| Release page | Renders the fan view from one release object; same component in edit and publish modes |
| Editable slots | Cover, title, artist, description, tracklist, photos, extras and tiers, price and buy button. Click to type; each slot is a drop target |
| Drop zone | Accepts many files at once and sorts by type: images → cover/photos, audio → tracks, text → notes for the AI |
| Viewport toggle | One state, two frames: phone (~390 px) and desktop |
| AI first pass | Sends file names, types, notes and the prompt to Claude; gets JSON back; fills the slots. One call returns layout + extras |
| Publish | Hides editing controls and shows the final page |

Page slots:

| Slot | By hand | By the AI pass |
| --- | --- | --- |
| Cover | Drop an image | Picks the cover from the dropped images |
| Title and artist | Click and type | Reads them from notes or prompt |
| Description | Click and type | Writes 2–3 sentences in the artist's voice |
| Tracklist | Drop audio, drag to reorder | Cleans titles from file names and sets order |
| Photos | Drop images | Places the remaining images |
| Extras and tiers | Add, edit, delete | Proposes 2–3 extras that fit the record; drafts tiers with prices |
| Price and buy button | Type the price | Base tier price = minimum price |

Stack: not decided yet. Check package.json / the repo before assuming one, and ask if it's
still empty. Also undecided: whether the AI call runs from a claude.ai artifact (no API key)
or a local app with a server route and an API key. Never put an API key in client code or
commit it; use an env var and keep .env out of git.

## AI first-pass contract

The Claude call returns ONLY JSON in this shape, and the page renders it directly:

```json
{
  "title": "string",
  "artist": "string",
  "description": "2-3 sentences in the artist's voice",
  "cover": "file name of the chosen cover",
  "photos": ["file names"],
  "tracks": [{"file": "file name", "title": "clean title", "position": 1}],
  "extras": [{"name": "string", "description": "one line", "why_it_fits": "one line tied to this record", "tier": "tier name"}],
  "tiers": [{"name": "string", "price_usd": 0, "includes": ["the record", "extra names"]}]
}
```

Prompt rules: return JSON only; keep the artist's voice from the notes; propose two or three
extras that fit this specific record and say why; two or three tiers, base tier is the lowest
price. Validate/parse defensively; on bad JSON, show an error and keep the page editable.

## Fake data (build first)

One invented artist and release; 6–8 audio files with messy names (e.g. `03_final_MIX_v2.wav`)
so the AI visibly cleans titles and order; one cover image; 3–4 photos; a short notes file in
the artist's voice.

## EVEN product facts (for realistic copy)

- Pricing is pay-what-you-want; the release's list price is the minimum.
- Artists keep 80% of each sale.
- Extras/access items are what a purchase unlocks, shown on the public release page; tiers bundle them.
- Today's release flow asks for cover, tracks, title, plus UPC, ISRC, genre, language, extra images.

## Team

- Christopher Barboza (pitched, breaks ties): fake data, copy, design direction, demo script.
- Heriberto Magaña: the editor (page, in-place editing, drag and drop, viewport toggle, Publish).
- Max Aqquepucho: the AI first pass (Claude call, JSON contract, extras and tiers, wiring into the page, deploy if time).

## Checkpoints (CST)

- 10:30 AM: empty page renders with fake data; editing in place works.
- 11:30 AM: AI call returns JSON and fills the page (screenshot to #hackathon-oct-2026).
- 12:45 PM: full flow works: extras, phone/desktop, Publish.
- 1:15 PM: stop building; record backup video. Demo is 7th, at 2:00 PM CST, 5 min hard stop.

## Working style

- Prefer the simplest thing that makes the demo flow work end to end.
- Keep the release object the single source of truth for both modes.
- If stuck ~10 minutes, propose a simpler approach instead of going in circles.
