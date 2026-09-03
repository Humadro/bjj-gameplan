# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

MVP under construction. The Next.js app lives in [web/](web/). [PROYECTO.md](PROYECTO.md) is the original spec (Spanish). Stack: **Next.js 16 (App Router, TS, Turbopack) + Tailwind v4 + React Flow (`@xyflow/react`) + dagre**, **Supabase (Postgres + Auth, email/password only for now)**. No custom backend.

> **Next.js 16 is newer than the training cutoff.** Read `web/AGENTS.md` and the bundled guides in `web/node_modules/next/dist/docs/` before writing framework code. Notably: `middleware.ts` is now `proxy.ts` (`export function proxy`); `cookies()` is async; auth redirects live in [web/lib/supabase/proxy.ts](web/lib/supabase/proxy.ts). `next lint` was removed — use `npm run lint` (flat-config ESLint).

## Commands

All commands run from `web/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) on :3000 |
| `npm run build` | Production build (also runs `tsc`) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (flat config) |
| `npx tsc --noEmit` | Typecheck only |

There is no test suite yet.

### Local setup

1. `cd web && npm install`
2. Copy `.env.example` to `.env.local` and fill `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase → Settings → API). Until these are set, every route renders `app/SetupNotice.tsx` instead of crashing.
3. Apply migrations in order — [0001_init.sql](web/supabase/migrations/0001_init.sql), [0002_maps.sql](web/supabase/migrations/0002_maps.sql), [0003_share.sql](web/supabase/migrations/0003_share.sql), [0004_fail_route.sql](web/supabase/migrations/0004_fail_route.sql), [0005_reference_links.sql](web/supabase/migrations/0005_reference_links.sql) — in the Supabase SQL editor (or `supabase db push`).
4. `npm run dev`.

## Architecture

- **Auth / session:** `@supabase/ssr`. Browser client in [web/lib/supabase/client.ts](web/lib/supabase/client.ts), server client (Server Components / Actions / Route Handlers) in [web/lib/supabase/server.ts](web/lib/supabase/server.ts). [web/proxy.ts](web/proxy.ts) → `updateSession` refreshes the session cookie on every request and redirects `/maps*` → `/login` when signed out (and `/login` → `/maps` when signed in). [web/lib/dal.ts](web/lib/dal.ts) (`requireUser`) is the single auth gate inside server code.
- **Routes:** `/` redirects to `/maps`. [web/app/maps/page.tsx](web/app/maps/page.tsx) lists the user's maps (create / rename / delete via [web/app/maps/actions.ts](web/app/maps/actions.ts)). [web/app/maps/[id]/page.tsx](web/app/maps/%5Bid%5D/page.tsx) is the editor for one map — fetches that map's `positions` + `techniques` (filtered `map_id = id`) plus the map list for the switcher, and renders `MapView`. [web/app/s/[token]/page.tsx](web/app/s/%5Btoken%5D/page.tsx) is the public read-only view (no auth) — calls the `shared_map(uuid)` RPC and renders `GraphCanvas` alone.
- **Export & share:** `ExportButton` (in the canvas `<Panel>` toolbar) uses lazy-loaded `html-to-image` + `jspdf` for **PNG** / **PDF** (image of the whole tree, sized to `getNodesBounds`) and **Lista** — a plain-text A4 PDF from the pure [web/lib/graph/gameplan.ts](web/lib/graph/gameplan.ts) `buildGamePlanText()` (one section per position: its outgoing techniques, confidence, destination, "si fallas"). `ShareButton` calls `setMapSharing` to set/clear `maps.public_slug` (a uuid); the link is `<origin>/s/<slug>`. Anonymous read goes through the `security definer` `shared_map(p_token uuid)` function ([0003_share.sql](web/supabase/migrations/0003_share.sql)), which only ever returns the one map whose slug matches — no service-role key, no broad anon RLS. The public page also has a **`CloneButton`** → `cloneSharedMap(token)` in [web/app/maps/actions.ts](web/app/maps/actions.ts): reads via the same RPC and deep-copies the map (positions, techniques, fail routes, reference links) into the signed-in user's account as "Copia de …"; if signed out it bounces through `/login?next=…` (`safeNext()` only allows internal paths).
- **Editor:** lives in [web/app/maps/_editor/](web/app/maps/_editor/) (`_` = non-routable). `MapView` composes the sidebar (`MapSwitcher`, `OnboardingChecklist`, `MapAnalysis`, `TechniquePanel`, `PositionPanel`), the canvas (`GraphCanvas`, or `SeedPanel` when the map has no positions), and `CommandPalette`. Mutations are Server Actions in [web/app/maps/_editor/actions.ts](web/app/maps/_editor/actions.ts): each re-checks the user, calls `ownsMap()`, writes via the RLS-scoped client, and `revalidatePath("/maps/<id>")`. Every client form carries a hidden `map_id`. Client components call actions through the `useAction` hook; no client-side Supabase writes.
- **Reference links:** `positions` and `techniques` share `reference_url` / `reference_label` / `reference_start_seconds` ([0005_reference_links.sql](web/supabase/migrations/0005_reference_links.sql)), edited via the collapsible `ReferenceFieldset` in both panels and persisted by `refValues()` in the editor actions. [web/lib/graph/refs.ts](web/lib/graph/refs.ts): `getRef()` normalizes the row, `youtubeEmbedUrl()` turns a YouTube watch/shorts/`youtu.be` URL into a `youtube-nocookie.com/embed` URL (honouring the start second). `buildGraph` sets `data.hasRef`; `GraphCanvas` shows a 🔗 badge and, on node click, opens `RefDrawer` (inline embed or an external link). Works in the shared view too.
- **Command palette:** `CommandPalette` (editor only) opens on **⌘/Ctrl-K**. It's a **multi-line textarea** with a live highlight overlay (a transparent-text `<textarea>` over a backdrop `<div>` that repaints the text with **positions in bold**, techniques normal, `, tag` suffixes muted). One line per item, **Enter** creates all, **Shift+Enter** = newline. `parseLine()` classifies each line — `pos nombre [mala]` → position; `ir nombre` → jump to another map (sole line only); anything with a separator (`>`, `->`, `→`, `›`) → alternating `posición > técnica > posición …`: **odd parts (3,5,7…)** = every technique leads to a position; **even parts (2,4,6…)** = the last technique has no destination (dead end, or **submission if tagged `, sub`/`, sumisión`**). **Confidence is per-technique** — a `, alta|media|baja` suffix right after a technique's name (`stripTags()` peels `, tag` groups off each segment); a tag on the final position is the default for untagged techniques. `runAll()` creates `position` lines first (so `is_bad` lands), then techniques in document order, stopping at the first error (already-created rows stay); a `createPosition` "ya hay una posición" collision is swallowed. Positions resolve case-insensitively against current props or via the `__new__` find-or-create path, so chain-internal and repeated names never duplicate. **Inline autocomplete:** while the caret is in a position slot (`activeSlot()`), a dropdown offers matching map + canonical position names — ↑/↓ to move, **Tab** to complete (canonical casing), Esc to dismiss. A single bare phrase (no separator) drops to the quick-form. Stays open after a successful batch.
- **Gap analysis:** [web/lib/graph/analysis.ts](web/lib/graph/analysis.ts) `analyzeMap()` is pure: flags positions with no outgoing technique (bad = "sin escape", good = "posición muerta") and non-submission techniques with a destination but no `fail_position_id` ("sin plan B"). `MapAnalysis` renders the amber card only once the map has **> 10 techniques** (below that it stays hidden — signal over noise).
- **Focus / paths:** `GraphCanvas` has an "Enfocar" `<Panel position="top-left">`: pick a position and it dims everything except the paths that reach it (`up`) or leave it (`down`), via the pure [web/lib/graph/focus.ts](web/lib/graph/focus.ts) `computeFocusSet()` (BFS over edges). Focus only changes opacity, so it never remounts `<ReactFlow>` / loses the viewport.
- **Onboarding:** [web/lib/seed.ts](web/lib/seed.ts) holds `SMALL_TEMPLATES` (4 themed 3-6 position starters), `FULL_TEMPLATES` (`posiciones-base`, `mapa-ejemplo` = port of `Peso/Mapa_Juego_BJJ.dot`), and `SUGGESTED_POSITIONS` (chips). `seedMap` only runs on an empty map. `OnboardingChecklist` is a 3-step card dismissed via `localStorage`.
- **Canonical positions:** `CANONICAL_POSITIONS` in [web/lib/seed.ts](web/lib/seed.ts) is the "official" No-Gi position vocabulary (also the body of the `posiciones-base` template). `CanonicalPositionsDatalist` (rendered once in `MapView`) exposes it as `<datalist id="canonical-positions">`; every "new position" text input (`PositionPanel` create/edit, `TechniquePanel`'s `__new__` field, `CommandPalette` quick-form) references it for autocomplete — it standardizes spelling for later cross-map analysis without forcing it (free names still allowed). `addStandardPositions` (editor action) bulk-loads the whole vocabulary into a map, skipping names already present. Parked positions with no technique attached never render (see Graph), so pre-seeding the vocabulary doesn't clutter the canvas.
- **Graph:** [web/lib/graph/layout.ts](web/lib/graph/layout.ts) `buildGraph()` is a pure function: data → React Flow nodes/edges → dagre `rankdir: "TB"` layout → positioned nodes. Positions are keyed `pos:<id>` so a hub position is one node no matter how many techniques point at it. **Only positions referenced by at least one technique** (as source, destination, or `fail_position_id`) get a node — "parked" positions with nothing linked stay off the canvas (they exist only to standardize names in the panels/selects), and `analyzeMap` likewise ignores them (a dead end must be *reached*). Rendered by `GraphCanvas` with `nodesDraggable={false}` — the no-manual-layout rule is enforced here.
- **DB schema:** `maps`, `positions`, `techniques` — all with `user_id default auth.uid()` and a `for all` RLS policy scoping rows to the owner. `positions`/`techniques` also carry `map_id` (FK → `maps`, `on delete cascade`); their RLS policies additionally require the referenced map (and, for techniques, the referenced positions — `source_position_id`, `destination_position_id`, `fail_position_id`) to belong to the caller. Position name is unique per **map** (`positions_map_name_key`). `positions.is_bad` marks a "bottom" position (red edges); `techniques.is_submission` marks a box node with no outgoing edge. `techniques.fail_position_id` (nullable, `on delete set null`) is the "plan B" — where you end up if the technique fails; null = you stay put / undefined. `positions` and `techniques` both carry `reference_url` / `reference_label` / `reference_start_seconds` (study link). `confidence` is `'alta' | 'media' | 'baja'`. Migrations: [0001_init.sql](web/supabase/migrations/0001_init.sql) → [0002_maps.sql](web/supabase/migrations/0002_maps.sql) → [0003_share.sql](web/supabase/migrations/0003_share.sql) → [0004_fail_route.sql](web/supabase/migrations/0004_fail_route.sql) → [0005_reference_links.sql](web/supabase/migrations/0005_reference_links.sql).

## What the app is

A per-user BJJ "game plan" web app. Each user builds a directed graph of their jiu-jitsu game: **positions** they play, **techniques** from each position, ranked by confidence, each technique declaring which position it leads to. The graph is rendered with an automatic hierarchical layout — a JS equivalent of Graphviz `dot`.

## Central design constraint

**The user never places or drags nodes. Ever.** They only declare data (positions, techniques, source → destination, confidence) and the layout is recomputed automatically by dagre. This is the defining decision of the project, not a detail — it is what separates this from a generic diagram editor (Miro, Excalidraw, tldraw). Do not add free-canvas dragging, manual positioning, or persisted node coordinates.

## Visual encoding (must match `Mapa_Juego_BJJ.dot`)

The app must reproduce the visual language of the reference Graphviz file at `C:\Users\mdrhu\all\Peso\Mapa_Juego_BJJ.dot` (rendered as `Mapa_Juego_BJJ_dot.png` / `.pdf` in the same folder):

- **Confidence colors:** high = green `#2E7D32`, medium = amber `#F9A825`, low = red `#C62828`. On techniques this is the text/label color.
- **Node types:** position = filled grey circle (`gray92`); technique = plain colored text (no border/fill); submission = box. A submission technique has no destination position.
- **Edge types:** solid black = position → its own technique; dashed grey (`6 4`) = technique → the good position it leads to; dashed red = technique → a bad "bottom" position (e.g. front headlock bottom, mount bottom, side control bottom); **dotted red (`1 4`) with a "si fallas" label = technique → its `fail_position_id`** (plan B if the move fails; app-only, not in the `.dot`).
- Layout is top-to-bottom (`rankdir=TB` equivalent).

## Data model notes

- **Map:** a user has many; positions/techniques belong to exactly one map.
- **Position:** name (unique per map) + `is_bad` (bottom position).
- **Technique:** name, source position, `confidence`, optional destination position (null when `is_submission` or a dead end), optional `fail_position_id` (plan B). Ruleset scope is **No-Gi only** — no gi/no-gi tagging, deliberately (user decision).
- **Hub positions** (reached by techniques from several different places, e.g. Side Control Top) resolve to a single shared node — never duplicated per incoming technique (`pos:<id>` keying in `buildGraph`).
- Every user sees only their own maps. Enforced by Supabase RLS, not client-side filtering.

## Out of MVP scope

See [ideas-mejoras.txt](ideas-mejoras.txt): "HACER YA" = a game-stats panel (with coherence checks) and a "focus of the month" flag; "PENSAR MÁS" = opponent-reaction branching, drill mode, post-roll capture, roll analytics, map snapshots + diff, training log, confidence history. Built so far: multi-map, PNG/PDF/text export, read-only sharing + clone, gap analysis, focus/paths, "plan B" route, reference links + inline player, ⌘K command palette.
