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
3. Apply [web/supabase/migrations/0001_init.sql](web/supabase/migrations/0001_init.sql) in the Supabase SQL editor (or `supabase db push`).
4. `npm run dev`.

## Architecture

- **Auth / session:** `@supabase/ssr`. Browser client in [web/lib/supabase/client.ts](web/lib/supabase/client.ts), server client (Server Components / Actions / Route Handlers) in [web/lib/supabase/server.ts](web/lib/supabase/server.ts). [web/proxy.ts](web/proxy.ts) → `updateSession` refreshes the session cookie on every request and redirects `/map` → `/login` when signed out (and `/login` → `/map` when signed in). [web/lib/dal.ts](web/lib/dal.ts) (`requireUser`) is the single auth gate inside server code.
- **Data flow:** `/map` (server component, [web/app/map/page.tsx](web/app/map/page.tsx)) fetches `positions` + `techniques` and passes them to client panels. All mutations are Server Actions in [web/app/map/actions.ts](web/app/map/actions.ts) — each re-checks the user, writes via the RLS-scoped Supabase client, and calls `revalidatePath("/map")`. Client components invoke them through the `useAction` hook ([web/app/map/useAction.ts](web/app/map/useAction.ts)); no client-side Supabase writes.
- **Graph:** [web/lib/graph/layout.ts](web/lib/graph/layout.ts) `buildGraph()` is a pure function: data → React Flow nodes/edges → dagre `rankdir: "TB"` layout → positioned nodes. Positions are keyed `pos:<id>` so a hub position is one node no matter how many techniques point at it. Rendered by [web/app/map/GraphCanvas.tsx](web/app/map/GraphCanvas.tsx) with `nodesDraggable={false}` — the no-manual-layout rule is enforced here.
- **DB schema:** two tables, `positions` and `techniques`, both with `user_id default auth.uid()` and a single `for all` RLS policy scoping every row to its owner (the techniques policy also verifies referenced positions belong to the caller). `positions.is_bad` marks a "bottom" position (drives red edges); `techniques.is_submission` marks a box node with no outgoing edge. `confidence` is `'alta' | 'media' | 'baja'`.

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

- **Position:** name + `is_bad` (bottom position).
- **Technique:** name, source position, `confidence`, optional destination position (null when `is_submission` or a dead end).
- **Hub positions** (reached by techniques from several different places, e.g. Side Control Top) resolve to a single shared node — never duplicated per incoming technique (`pos:<id>` keying in `buildGraph`).
- Every user sees only their own map. Enforced by Supabase RLS, not client-side filtering.

## Out of MVP scope

PNG/PDF export, read-only sharing of a teammate's map, confidence history over time, and gap suggestions (positions with no outgoing technique) are explicitly deferred — see [PROYECTO.md](PROYECTO.md).
