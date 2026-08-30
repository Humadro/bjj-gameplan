import type { Edge } from "@xyflow/react";

export type FocusDirection = "up" | "down";

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
