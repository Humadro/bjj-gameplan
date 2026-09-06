import type { Confidence, Position, Technique } from "@/lib/types";

// Etiquetas traducibles del texto exportado. Las pasa la UI (ExportButton /
// NodeInspector) desde next-intl para no acoplar el núcleo puro a un idioma.
export type GamePlanLabels = {
  planTitle: string; // "Plan de juego" / "Game plan"
  card: string; // "FICHA" / "CARD"
  badPosition: string; // "posicion mala" / "bad position"
  noOutgoing: string; // "(sin tecnicas de salida)"
  submission: string; // "sumision" / "submission"
  noExit: string; // "(sin salida)" / "(dead end)"
  onFail: string; // "si fallas" / "on fail"
  confidence: Record<Confidence, string>; // Alta/Media/Baja | High/Medium/Low
};

// Plan de juego como texto plano: una sección por posición (en el orden del
// mapa), sus técnicas de salida con confianza y destino, y la ruta "si fallas".
export function buildGamePlanText(
  mapName: string,
  positions: Position[],
  techniques: Technique[],
  labels: GamePlanLabels,
): string {
  const posName = new Map(positions.map((p) => [p.id, p.name]));
  const out: string[] = [];

  out.push(mapName.toUpperCase());
  out.push(`${labels.planTitle} · ${new Date().toISOString().slice(0, 10)}`);
  out.push("");

  for (const p of positions) {
    const outgoing = techniques.filter((t) => t.source_position_id === p.id);
    out.push(p.is_bad ? `[v] ${p.name}  (${labels.badPosition})` : `[o] ${p.name}`);

    if (outgoing.length === 0) {
      out.push(`    ${labels.noOutgoing}`);
    } else {
      for (const t of outgoing) {
        const dest = t.is_submission
          ? labels.submission
          : t.destination_position_id
            ? `-> ${posName.get(t.destination_position_id) ?? "?"}`
            : `-> ${labels.noExit}`;
        out.push(`    - ${t.name}  [${labels.confidence[t.confidence]}]  ${dest}`);
        if (t.fail_position_id) {
          out.push(`        x ${labels.onFail} -> ${posName.get(t.fail_position_id) ?? "?"}`);
        }
      }
    }
    out.push("");
  }

  return out.join("\n").trimEnd() + "\n";
}

// Ficha de estudio de UNA posición: sus técnicas de salida (con confianza,
// destino y "si fallas"). Pensada para imprimir / llevar al gimnasio.
export function buildPositionCardText(
  mapName: string,
  position: Position,
  positions: Position[],
  techniques: Technique[],
  labels: GamePlanLabels,
): string {
  const posName = new Map(positions.map((p) => [p.id, p.name]));
  const out: string[] = [];

  out.push(`${mapName.toUpperCase()} · ${labels.card}`);
  out.push(position.is_bad ? `${position.name}  (${labels.badPosition})` : position.name);
  out.push("");

  const outgoing = techniques.filter((t) => t.source_position_id === position.id);
  if (outgoing.length === 0) {
    out.push(labels.noOutgoing);
  } else {
    for (const t of outgoing) {
      const dest = t.is_submission
        ? labels.submission
        : t.destination_position_id
          ? `-> ${posName.get(t.destination_position_id) ?? "?"}`
          : `-> ${labels.noExit}`;
      out.push(`- ${t.name}  [${labels.confidence[t.confidence]}]  ${dest}`);
      if (t.fail_position_id) {
        out.push(`    x ${labels.onFail} -> ${posName.get(t.fail_position_id) ?? "?"}`);
      }
    }
  }

  return out.join("\n").trimEnd() + "\n";
}
