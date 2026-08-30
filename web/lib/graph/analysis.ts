import type { Position, Technique } from "@/lib/types";

export type MapGaps = {
  // Posiciones malas (bottom) sin ninguna técnica de salida: no tienes escape.
  deadEndBad: Position[];
  // Posiciones buenas sin ninguna técnica de salida: llegas pero no atacas.
  deadEndGood: Position[];
  // Técnicas que llevan a una posición pero no declaran a dónde vas si fallan.
  noPlanB: Technique[];
};

// Análisis puro del mapa para detectar huecos en el plan.
export function analyzeMap(
  positions: Position[],
  techniques: Technique[],
): MapGaps {
  const hasOutgoing = new Set(techniques.map((t) => t.source_position_id));

  const deadEndBad: Position[] = [];
  const deadEndGood: Position[] = [];
  for (const p of positions) {
    if (hasOutgoing.has(p.id)) continue;
    (p.is_bad ? deadEndBad : deadEndGood).push(p);
  }

  const noPlanB = techniques.filter(
    (t) => !t.is_submission && t.destination_position_id && !t.fail_position_id,
  );

  return { deadEndBad, deadEndGood, noPlanB };
}
