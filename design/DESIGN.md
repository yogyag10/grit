## Design system (frontend owner: Ziyan; keep in sync with the Figma)

Every screen uses these rules. Reuse `apps/web/components/ui/*` before making anything new.
If the Figma and this section disagree, ask the frontend owner; don't invent a third style.

### Feel
Dark, outdoorsy and trustworthy: near-black background, lime accent, big photos of real UBC run spots with a small route map in the corner, rounded cards. Our own design, not a copy of any trail app. It handles people's money, so it should look like a clean finance app
that happens to be about running, not a betting app. No confetti-casino styling, no neon gradients.

### Brand: Grit
- Name: **Grit** (display name everywhere in the UI; package names can stay as they are).
- Logo = the wordmark: lowercase "grit", Inter ExtraBold (800), letter-spacing -0.05em. The dot on the i is replaced by a solid
  arrowhead pointing up (forward + your money coming back up). Build it as `components/brand/GritLogo.tsx`: render "gr", a
  dotless ı (U+0131) with the arrow absolutely positioned above it, then "t". Wrap it with `role="img" aria-label="Grit"`.
- Arrow SVG (viewBox 0 0 100 100): `<path d="M50 8 L96 90 L50 62 L4 90 Z" stroke-width="6" stroke-linejoin="round"/>`, fill and
  stroke the same colour. Arrow width ≈ 0.34 × font size, sitting about 0.2 × font size above the i.
- Colours: on dark, letters `ink` (#F4F5F2) + arrow `oath` lime (#B6EA8C). On light, letters #0E0F0E + arrow #2F8F2A. On lime, all #0E0F0E.
- App icon / favicon: the arrow alone, lime on a near-black rounded square (`app/icon.svg`):
  `<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="#0E0F0E"/><path d="M50 22 L76 70 L50 54 L24 70 Z" fill="#B6EA8C" stroke="#B6EA8C" stroke-width="4" stroke-linejoin="round"/></svg>`
- Tagline: "Show up. Get paid back."

### Tokens (dark theme, defined in `apps/web/app/globals.css` with Tailwind v4 `@theme`)
| Token | Tailwind class | Use |
| --- | --- | --- |
| `canvas` #0E0F0E | `bg-canvas` | page background |
| `card` #1A1C1A | `bg-card` | cards, inputs, chips, list rows |
| `line` #2C2F2C | `border-line` | borders, dividers, progress track |
| `ink` #F4F5F2 | `text-ink` | main text |
| `muted` #A3A8A3 | `text-muted` | secondary text, labels |
| `oath` #B6EA8C | `bg-oath`, `text-oath` | lime accent: primary buttons (with `text-oath-ink`), progress fill, links, "Counted" badge |
| `oath-ink` #0E0F0E | `text-oath-ink` | text on lime |
| `oath-soft` #1F2E17 | `bg-oath-soft` | lime-tinted panels ("Payouts equal the pool") |
| `missed` #FCA5A5 / `missed-soft` #3A1A1A | | "Not counted" badge |
| `demo` #FCD34D / `demo-soft` #3A2F10 | | "Demo data" badge |

- Font: Inter via `next/font/google`, variable `--font-inter`. Numbers use `tabular-nums`.
- Type: page title `text-[28px] font-bold tracking-tight`, card title `text-xl font-bold`, body `text-base`, meta `text-sm text-muted`. Big stats `text-4xl font-extrabold tabular-nums`.
- Radius: photo cards `rounded-[20px]`, cards `rounded-[18px]`, buttons, chips, search and nav `rounded-full`.
- Layout: mobile first at 390 px, `mx-auto w-full max-w-md`, page padding `px-4`. Floating bottom nav (pill, `bg-[#202220]/95`, `border-[#383B38]`), 5 items: Explore, My pacts, Create (lime round button), Activity, Me. Leave `pb-28` so content clears it.

### Signature pattern: photo card with map inset
Every pact (Explore list, pact page hero, results) shows a big photo of the run spot (`h-[220px]`, hero `h-[300px]`) with:
- a small route map in the bottom-right corner (80–96 px square, `rounded-2xl`, 3 px white border), drawn with Leaflet or a static SVG of the pact area
- round dark icon buttons top-right (`bg-[#0E0F0E]/80`, 44 px): share, save
- a status pill top-left ("● Live" in lime, "Starts Mon" in amber)
- on hero images, a bottom gradient to `canvas` with the title on top
Photos: our own photos of UBC spots in `apps/web/public/spots/` (wreck-beach.jpg, pacific-spirit.jpg, thunderbird-track.jpg). Never use photos from other apps or the web.

### Components (`apps/web/components/ui/`)
- `Button`: variants `primary` (bg-oath text-oath-ink), `secondary` (bg-card border-line text-ink),
  `ghost`. Sizes `md` (h-12) and `sm` (h-10). Full width by default on mobile. Shows a spinner + disabled when loading.
- `Card`: bg-card, rounded-[18px], no shadow, p-4 or p-5.
- `Badge`: `counted` (bg-oath text-oath-ink) / `missed` (bg-missed-soft text-missed) / `demo` / `neutral`. Always icon + word, never colour alone
  (e.g. ✓ Accepted, ✕ Rejected, ⟳ Syncing).
- `ProgressRing` (or bar): shows km done / goal and %; uses `oath`, stays lime at 100% and shows a check.
- `StatTile`: label (text-sm text-muted) over a big number.
- `ExplorerLink`: truncated signature (first 4…last 4) + external-link icon, opens Solana Explorer (devnet) in a new tab.
- `ReasonNote`: shows `REASON_MESSAGES[code]` from `@oathmile/core` under a rejected activity. Neutral tone.
- `DevnetBanner`: thin top banner "Devnet only · no real money" on every page.
- `EmptyState`: icon, one line, one action.
Icons: `lucide-react` only.

### Copy rules
- Words: "pact", "commitment deposit", "clear the goal", "get your deposit back", "pool". Never "bet",
  "gamble", "win money", "jackpot".
- Show money as SOL with 2–3 decimals plus "devnet", e.g. `0.10 SOL (devnet)`.
- Sentence case everywhere. Buttons start with a verb: "Join pact", "Connect Strava", "Sync runs".
- Every mock or fixture on screen carries a small "Demo data" badge.

### Accessibility (non-negotiable)
- Text contrast ≥ 4.5:1 (all token pairs above pass on white/canvas).
- Every interactive element is a real `<button>` or `<a>`, has a visible label or `aria-label`, and a
  visible focus ring (`focus-visible:ring-2 ring-oath ring-offset-2`).
- Tap targets ≥ 44 px tall.
- Status is never colour-only: icon + word.
- Progress has text too ("12.4 of 20 km · 62%") and `role="progressbar"` with aria values.
- Animations respect `motion-reduce:` (no movement when the user prefers reduced motion).
- Images and icons that carry meaning have `alt` / `aria-label`; decorative ones `aria-hidden`.
- Forms: every input has a `<label>`; errors appear as text next to the field.

### Signature moments (polish these first)
1. **Pact page hero**: photo + map inset, then a big progress bar, "X of N have cleared", pool size, days left.
2. **"Where the money goes" panel**: a simple 3-row breakdown with this pact's real numbers and "Fee: 0".
3. **Results state**: cleared → lime card "That’s grit. +0.166 SOL sent to your wallet" with Explorer link;
   missed → calm, kind message, no shaming.
4. **Pool Receipt**: clean ledger table, totals row, and a ✓ "Payouts equal the pool" check.
