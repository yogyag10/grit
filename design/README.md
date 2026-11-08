# Grit — design handoff for Claude Code

Everything needed to build the Grit UI so it matches the designs exactly.

## What's inside
| Folder / file | What it is |
| --- | --- |
| `screenshots/*.png` | Pixel-exact images of all 9 screens (390 px wide phone, 2x). Show these to Claude. |
| `screens/*.html` | The same screens as plain HTML with exact colours, sizes and spacing. Open in a browser to inspect. **Reference only — rebuild in Next.js + Tailwind, don't copy-paste.** |
| `DESIGN.md` | Design rules: colours, type, components, copy, accessibility, the photo-card pattern. Paste into the repo's `CLAUDE.md`. |
| `globals.css` | Tailwind v4 theme tokens. Replace `apps/web/app/globals.css`. |
| `brand/GritLogo.tsx` | Ready-made logo component → `apps/web/components/brand/GritLogo.tsx`. |
| `brand/app-icon.svg` | App icon / favicon → `apps/web/app/icon.svg`. |
| `brand/arrow.svg` | The arrow on its own. |
| `fonts/` | Inter (only used so the reference HTML renders correctly offline; in the app use `next/font/google`). |

## Screen order (user flow)
1. Sign in with UBC student email (step 1 of 2)
2. Connect Strava (step 2 of 2)
3. Explore pacts — Upcoming = can join, Live = view only, Ended = view leaderboard
4. Community — campus chat + run clubs (design only; not in the build plan tonight)
5. Pact page (a live pact you're in) — private progress, money panel, your runs
6. Your activity
7. Results (after a pact ends)
8. Leaderboard (ended pact) — opted-in names + % of goal only
9. Pool Receipt — every deposit/payout, fee 0, payouts = pool

## Setup (2 minutes)
1. Copy this whole folder into the repo as `design/` and commit it.
2. Paste `DESIGN.md` into `CLAUDE.md` (after the "UI" section).
3. Copy `globals.css`, `brand/GritLogo.tsx` and `brand/app-icon.svg` to the paths above.
4. Add our own photos of the UBC spots to `apps/web/public/spots/` (the screens use drawn placeholders).

## Prompt to give Claude Code (one screen at a time works best)
> Read CLAUDE.md (especially the Design system section) and `design/README.md`.
> Build screen 5 (`/pacts/[id]`) to match `design/screenshots/05-pact-live.png` exactly.
> Use `design/screens/05-pact-live.html` for exact colours, sizes and spacing, but write it as
> Next.js + Tailwind components using the theme tokens in globals.css and the components in
> `components/ui/`. Use labelled mock data until the API exists. Mobile first, 390 px.
> When done, run the dev server and compare against the screenshot.

Then repeat for the next screen. Build order for the demo: 5 → 7 → 9 → 1 → 2 → 3 → 8 → 6 (→ 4 last, if ever).

## Tips for best results
- Attach the PNG in the chat (drag it into the Claude Code prompt) **and** point to the HTML file — the image gives the look, the HTML gives exact numbers.
- Do one screen per prompt; build shared components (`Button`, `Card`, `Badge`, `PhotoCard`, `BottomNav`, `GritLogo`) first.
- Keep the "Demo data" badge on anything that isn't live data.
