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
3. Apply migrations in order ([0001_init.sql](web/supabase/migrations/0001_init.sql), [0002_maps.sql](web/supabase/migrations/0002_maps.sql)) in the Supabase SQL editor (or `supabase db push`).
4. `npm run dev`.

## Architecture

- **Auth / session:** `@supabase/ssr`. Browser client in [web/lib/supabase/client.ts](web/lib/supabase/client.ts), server client (Server Components / Actions / Route Handlers) in [web/lib/supabase/server.ts](web/lib/supabase/server.ts). [web/proxy.ts](web/proxy.ts) → `updateSession` refreshes the session cookie on every request and redirects `/maps*` → `/login` when signed out (and `/login` → `/maps` when signed in). [web/lib/dal.ts](web/lib/dal.ts) (`requireUser`) is the single auth gate inside server code.
- **Routes:** `/` redirects to `/maps`. [web/app/maps/page.tsx](web/app/maps/page.tsx) lists the user's maps (create / rename / delete via [web/app/maps/actions.ts](web/app/maps/actions.ts)). [web/app/maps/[id]/page.tsx](web/app/maps/%5Bid%5D/page.tsx) is the editor for one map — fetches that map's `positions` + `techniques` (filtered `map_id = id`) plus the map list for the switcher, and renders `MapView`. [web/app/s/[token]/page.tsx](web/app/s/%5Btoken%5D/page.tsx) is the public read-only view (no auth) — calls the `shared_map(uuid)` RPC and renders `GraphCanvas` alone.
- **Export & share:** `ExportButton` (in the canvas `<Panel>` toolbar) uses lazy-loaded `html-to-image` + `jspdf` to save the whole tree as PNG or PDF, sizing to `getNodesBounds`. `ShareButton` calls `setMapSharing` to set/clear `maps.public_slug` (a uuid); the link is `<origin>/s/<slug>`. Anonymous read goes through the `security definer` `shared_map(p_token uuid)` function ([0003_share.sql](web/supabase/migrations/0003_share.sql)), which only ever returns the one map whose slug matches — no service-role key, no broad anon RLS.
- **Editor:** lives in [web/app/maps/_editor/](web/app/maps/_editor/) (`_` = non-routable). `MapView` composes the sidebar (`MapSwitcher`, `OnboardingChecklist`, `TechniquePanel`, `PositionPanel`) and the canvas (`GraphCanvas`, or `SeedPanel` when the map has no positions). Mutations are Server Actions in [web/app/maps/_editor/actions.ts](web/app/maps/_editor/actions.ts): each re-checks the user, calls `ownsMap()`, writes via the RLS-scoped client, and `revalidatePath("/maps/<id>")`. Every client form carries a hidden `map_id`. Client components call actions through the `useAction` hook; no client-side Supabase writes.
- **Onboarding:** [web/lib/seed.ts](web/lib/seed.ts) holds `SMALL_TEMPLATES` (4 themed 3-6 position starters), `FULL_TEMPLATES` (`posiciones-base`, `mapa-ejemplo` = port of `Peso/Mapa_Juego_BJJ.dot`), and `SUGGESTED_POSITIONS` (chips). `seedMap` only runs on an empty map. `OnboardingChecklist` is a 3-step card dismissed via `localStorage`.
- **Graph:** [web/lib/graph/layout.ts](web/lib/graph/layout.ts) `buildGraph()` is a pure function: data → React Flow nodes/edges → dagre `rankdir: "TB"` layout → positioned nodes. Positions are keyed `pos:<id>` so a hub position is one node no matter how many techniques point at it. Rendered by `GraphCanvas` with `nodesDraggable={false}` — the no-manual-layout rule is enforced here.
- **DB schema:** `maps`, `positions`, `techniques` — all with `user_id default auth.uid()` and a `for all` RLS policy scoping rows to the owner. `positions`/`techniques` also carry `map_id` (FK → `maps`, `on delete cascade`); their RLS policies additionally require the referenced map (and, for techniques, the referenced positions) to belong to the caller. Position name is unique per **map** (`positions_map_name_key`). `positions.is_bad` marks a "bottom" position (red edges); `techniques.is_submission` marks a box node with no outgoing edge. `confidence` is `'alta' | 'media' | 'baja'`. Migrations: [0001_init.sql](web/supabase/migrations/0001_init.sql) then [0002_maps.sql](web/supabase/migrations/0002_maps.sql).

## What the app is

A per-user BJJ "game plan" web app. Each user builds a directed graph of their jiu-jitsu game: **positions** they play, **techniques** from each position, ranked by confidence, each technique declaring which position it leads to. The graph is rendered with an automatic hierarchical layout — a JS equivalent of Graphviz `dot`.

## Central design constraint

**The user never places or drags nodes. Ever.** They only declare data (positions, techniques, source → destination, confidence) and the layout is recomputed automatically by dagre. This is the defining decision of the project, not a detail — it is what separates this from a generic diagram editor (Miro, Excalidraw, tldraw). Do not add free-canvas dragging, manual positioning, or persisted node coordinates.

## Visual encoding (must match `Mapa_Juego_BJJ.dot`)

The app must reproduce the visual language of the reference Graphviz file at `C:\Users\mdrhu\all\Peso\Mapa_Juego_BJJ.dot` (rendered as `Mapa_Juego_BJJ_dot.png` / `.pdf` in the same folder):

- **Confidence colors:** high = green `#2E7D32`, medium = amber `#F9A825`, low = red `#C62828`. On techniques this is the text/label color.
- **Node types:** position = filled grey circle (`gray92`); technique = plain colored text (no border/fill); submission = box. A submission technique has no destination position.
- **Edge types:** solid black = position → its own technique; dashed grey = technique → the good position it leads to; dashed red = technique → a bad "bottom" position (e.g. front headlock bottom, mount bottom, side control bottom).
- Layout is top-to-bottom (`rankdir=TB` equivalent).

## Data model notes

- **Map:** a user has many; positions/techniques belong to exactly one map.
- **Position:** name (unique per map) + `is_bad` (bottom position).
- **Technique:** name, source position, `confidence`, optional destination position (null when `is_submission` or a dead end).
- **Hub positions** (reached by techniques from several different places, e.g. Side Control Top) resolve to a single shared node — never duplicated per incoming technique (`pos:<id>` keying in `buildGraph`).
- Every user sees only their own maps. Enforced by Supabase RLS, not client-side filtering.

## Out of MVP scope

Confidence history over time and gap suggestions (positions with no outgoing technique) are still deferred — see [PROYECTO.md](PROYECTO.md). (PNG/PDF export and read-only sharing are now built.)
