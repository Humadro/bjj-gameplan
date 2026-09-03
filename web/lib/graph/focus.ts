import type { Edge } from "@xyflow/react";
import type { Confidence, Position, Technique } from "@/lib/types";

export type FocusDirection = "up" | "down" | "principal";

const CONF_RANK: Record<Confidence, number> = { alta: 3, media: 2, baja: 1 };

// "Vía principal": desde `startPositionId`, en cada posición sigue la técnica de
// mayor confianza (empate -> la creada antes) hasta llegar a una sumisión, a un
// callejón sin salida, o a una posición ya visitada. Devuelve el mismo formato
// que `computeFocusSet` (ids `pos:<id>` / `tech:<id>` / `src:` / `dst:`).
export function computeMainLine(
  positions: Position[],
  techniques: Technique[],
  startPositionId: string,
): { nodeIds: Set<string>; edgeIds: Set<string> } {
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  const byId = new Map(positions.map((p) => [p.id, p]));
  if (!byId.has(startPositionId)) return { nodeIds, edgeIds };

  let current: string | null = startPositionId;
  const seen = new Set<string>();
  while (current && byId.has(current) && !seen.has(current)) {
    seen.add(current);
    nodeIds.add(`pos:${current}`);

    const outgoing = techniques
      .filter((t) => t.source_position_id === current)
      .sort((a, b) => CONF_RANK[b.confidence] - CONF_RANK[a.confidence]);
    const best = outgoing[0];
    if (!best) break;

    nodeIds.add(`tech:${best.id}`);
    edgeIds.add(`src:${best.id}`);

    if (best.is_submission || !best.destination_position_id) break;
    edgeIds.add(`dst:${best.id}`);
    current = best.destination_position_id;
  }
  if (current && byId.has(current)) nodeIds.add(`pos:${current}`);

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
