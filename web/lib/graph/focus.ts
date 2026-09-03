import type { Edge } from "@xyflow/react";
import type { Confidence, Position, Technique } from "@/lib/types";

export type FocusDirection = "up" | "down" | "principal";

const CONF_RANK: Record<Confidence, number> = { alta: 3, media: 2, baja: 1 };

// "Vía principal": el árbol de máxima confianza que ENTRA y SALE de
// `startPositionId`. Umbral = "alta"; si ninguna técnica que toca la posición de
// partida es alta, se usa la confianza máxima presente entre esas técnicas.
// Después se recorre el grafo en ambos sentidos siguiendo solo las técnicas de
// confianza >= umbral. Devuelve el mismo formato que `computeFocusSet`
// (ids `pos:<id>` / `tech:<id>` / `src:` / `dst:`).
export function computeMainLine(
  positions: Position[],
  techniques: Technique[],
  startPositionId: string,
): { nodeIds: Set<string>; edgeIds: Set<string> } {
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  const byId = new Map(positions.map((p) => [p.id, p]));
  if (!byId.has(startPositionId)) return { nodeIds, edgeIds };

  nodeIds.add(`pos:${startPositionId}`);

  // Umbral de confianza a partir de las técnicas que tocan la posición de partida.
  const incident = techniques.filter(
    (t) =>
      t.source_position_id === startPositionId ||
      t.destination_position_id === startPositionId,
  );
  const maxIncident = incident.reduce((m, t) => Math.max(m, CONF_RANK[t.confidence]), 0);
  if (maxIncident === 0) return { nodeIds, edgeIds };
  const threshold = Math.min(maxIncident, CONF_RANK.alta);

  const strong = techniques.filter((t) => CONF_RANK[t.confidence] >= threshold);

  // BFS bidireccional: desde cada posición del árbol, sigue las técnicas fuertes
  // hacia su destino y también las técnicas fuertes cuyo destino es esta posición.
  const visited = new Set<string>([startPositionId]);
  const queue: string[] = [startPositionId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const t of strong) {
      const goesOut = t.source_position_id === current;
      const comesIn = !t.is_submission && t.destination_position_id === current;
      if (!goesOut && !comesIn) continue;

      nodeIds.add(`tech:${t.id}`);
      edgeIds.add(`src:${t.id}`);
      if (!t.is_submission && t.destination_position_id) edgeIds.add(`dst:${t.id}`);

      const other = goesOut ? t.destination_position_id : t.source_position_id;
      if (t.is_submission || !other) continue;
      if (byId.has(other)) nodeIds.add(`pos:${other}`);
      if (byId.has(other) && !visited.has(other)) {
        visited.add(other);
        queue.push(other);
      }
    }
  }

  return { nodeIds, edgeIds };
}

// Recorre el grafo desde `rootId` y devuelve los nodos y aristas que están en
// algún camino que LLEGA a la posición (direction "up") o que SALE de ella
// (direction "down"). Puro: solo usa source/target/id de las aristas.
export function computeFocusSet(
  edges: Edge[],
  rootId: string,
  direction: FocusDirection,
): { nodeIds: Set<string>; edgeIds: Set<string> } {
  const nodeIds = new Set<string>([rootId]);
  const edgeIds = new Set<string>();

  const adjacency = new Map<string, { edgeId: string; next: string }[]>();
  for (const e of edges) {
    const from = direction === "up" ? e.target : e.source;
    const to = direction === "up" ? e.source : e.target;
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from)!.push({ edgeId: e.id, next: to });
  }

  const queue: string[] = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const { edgeId, next } of adjacency.get(current) ?? []) {
      edgeIds.add(edgeId);
      if (!nodeIds.has(next)) {
        nodeIds.add(next);
        queue.push(next);
      }
    }
  }

  return { nodeIds, edgeIds };
}
