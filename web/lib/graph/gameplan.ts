import { CONFIDENCE_LABEL, type Position, type Technique } from "@/lib/types";

// Plan de juego como texto plano: una sección por posición (en el orden del
// mapa), sus técnicas de salida con confianza y destino, y la ruta "si fallas".
export function buildGamePlanText(
  mapName: string,
  positions: Position[],
  techniques: Technique[],
): string {
  const posName = new Map(positions.map((p) => [p.id, p.name]));
  const out: string[] = [];

  out.push(mapName.toUpperCase());
  out.push(`Plan de juego · ${new Date().toISOString().slice(0, 10)}`);
  out.push("");

  for (const p of positions) {
    const outgoing = techniques.filter((t) => t.source_position_id === p.id);
    out.push(p.is_bad ? `[v] ${p.name}  (posicion mala)` : `[o] ${p.name}`);

    if (outgoing.length === 0) {
      out.push("    (sin tecnicas de salida)");
    } else {
      for (const t of outgoing) {
        const dest = t.is_submission
          ? "sumision"
          : t.destination_position_id
            ? `-> ${posName.get(t.destination_position_id) ?? "?"}`
            : "-> (sin salida)";
        out.push(`    - ${t.name}  [${CONFIDENCE_LABEL[t.confidence]}]  ${dest}`);
        if (t.fail_position_id) {
          out.push(`        x si fallas -> ${posName.get(t.fail_position_id) ?? "?"}`);
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
): string {
  const posName = new Map(positions.map((p) => [p.id, p.name]));
  const out: string[] = [];

  out.push(`${mapName.toUpperCase()} · FICHA`);
  out.push(position.is_bad ? `${position.name}  (posicion mala)` : position.name);
  out.push("");

  const outgoing = techniques.filter((t) => t.source_position_id === position.id);
  if (outgoing.length === 0) {
    out.push("(sin tecnicas de salida)");
  } else {
    for (const t of outgoing) {
      const dest = t.is_submission
        ? "sumision"
        : t.destination_position_id
          ? `-> ${posName.get(t.destination_position_id) ?? "?"}`
          : "-> (sin salida)";
      out.push(`- ${t.name}  [${CONFIDENCE_LABEL[t.confidence]}]  ${dest}`);
      if (t.fail_position_id) {
        out.push(`    x si fallas -> ${posName.get(t.fail_position_id) ?? "?"}`);
      }
    }
  }

  return out.join("\n").trimEnd() + "\n";
}
