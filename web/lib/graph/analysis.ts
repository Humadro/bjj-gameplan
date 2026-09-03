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

  // Posiciones a las que algo llega (destino o plan B de alguna técnica).
  // Una posición "aparcada" sin nada que llegue ni salga no es un callejón sin
  // salida, es solo un nombre reservado -> no genera aviso.
  const reached = new Set<string>();
  for (const t of techniques) {
    if (!t.is_submission && t.destination_position_id) reached.add(t.destination_position_id);
    if (t.fail_position_id) reached.add(t.fail_position_id);
  }

  const deadEndBad: Position[] = [];
  const deadEndGood: Position[] = [];
  for (const p of positions) {
    if (hasOutgoing.has(p.id) || !reached.has(p.id)) continue;
    (p.is_bad ? deadEndBad : deadEndGood).push(p);
  }

  const noPlanB = techniques.filter(
    (t) => !t.is_submission && t.destination_position_id && !t.fail_position_id,
  );

  return { deadEndBad, deadEndGood, noPlanB };
}
