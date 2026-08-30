"use client";

import { useMemo } from "react";
import { analyzeMap } from "@/lib/graph/analysis";
import type { Position, Technique } from "@/lib/types";

// Aviso de "huecos en el plan". Solo aparece cuando el mapa ya tiene fondo
// suficiente (más de 10 técnicas) para que las sugerencias sean señal y no ruido.
const MIN_TECHNIQUES = 10;

export default function MapAnalysis({
  positions,
  techniques,
}: {
  positions: Position[];
  techniques: Technique[];
}) {
  const gaps = useMemo(
    () => analyzeMap(positions, techniques),
    [positions, techniques],
  );

  if (techniques.length <= MIN_TECHNIQUES) return null;

  const total =
    gaps.deadEndBad.length + gaps.deadEndGood.length + gaps.noPlanB.length;
  if (total === 0) return null;

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-700">
        Huecos en tu plan
      </h2>

      {gaps.deadEndBad.length > 0 && (
        <div>
          <p className="font-medium text-red-700">
            Sin escape ({gaps.deadEndBad.length})
          </p>
          <p className="text-zinc-600">
            Posiciones malas sin ninguna técnica de salida:{" "}
            {gaps.deadEndBad.map((p) => p.name).join(", ")}.
          </p>
        </div>
      )}

      {gaps.deadEndGood.length > 0 && (
        <div>
          <p className="font-medium text-amber-700">
            Posiciones muertas ({gaps.deadEndGood.length})
          </p>
          <p className="text-zinc-600">
            Llegas aquí pero no sales a ningún sitio:{" "}
            {gaps.deadEndGood.map((p) => p.name).join(", ")}.
          </p>
        </div>
      )}

      {gaps.noPlanB.length > 0 && (
        <div>
          <p className="font-medium text-amber-700">
            Sin plan B ({gaps.noPlanB.length})
          </p>
          <p className="text-zinc-600">
            Técnicas sin definir a dónde vas si fallan:{" "}
            {gaps.noPlanB.slice(0, 6).map((t) => t.name).join(", ")}
            {gaps.noPlanB.length > 6 ? "…" : ""}.
          </p>
        </div>
      )}
    </section>
  );
}
