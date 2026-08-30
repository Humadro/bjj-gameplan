# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Greenfield. The repo currently contains only [PROYECTO.md](PROYECTO.md) (the spec, written in Spanish) — no code, no `package.json`, no git history yet. There are no build/lint/test commands until the app is scaffolded. When scaffolding, follow the stack decided in the spec: **Next.js (React) + React Flow + dagre** on the frontend, **Supabase (Postgres + Auth)** for data and auth (no custom backend).

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

- **Position:** name only (e.g. "Side Control Top", "Front Headlock Bottom").
- **Technique:** name, source position, confidence (high/medium/low), optional destination position (omitted when it's a submission).
- **Hub positions** (reached by techniques from several different places, e.g. Side Control Top) must resolve to a single shared node — never duplicated per incoming technique. Graph building must dedupe positions by identity.
- Every user sees only their own map. Enforce with Supabase row-level security, not just client-side filtering.

## Out of MVP scope

PNG/PDF export, read-only sharing of a teammate's map, confidence history over time, and gap suggestions (positions with no outgoing technique) are explicitly deferred — see [PROYECTO.md](PROYECTO.md).
