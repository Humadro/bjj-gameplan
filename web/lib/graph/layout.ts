import dagre from "dagre";
import type { Edge, Node } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import { CONFIDENCE_COLOR, type Position, type Technique } from "@/lib/types";

export type PositionNodeData = { label: string; isBad: boolean };
export type TechniqueNodeData = { label: string; color: string };

export type GraphNode = Node<PositionNodeData | TechniqueNodeData>;

const NODE_SIZE: Record<string, { width: number; height: number }> = {
  position: { width: 124, height: 124 }, // círculo (como shape=circle en el .dot)
  technique: { width: 190, height: 48 },
  submission: { width: 180, height: 52 },
};

const BLACK = "#111111";
const GREY = "#8a8a8a";
const RED = CONFIDENCE_COLOR.baja;

// Construye nodos y aristas a partir de los datos y calcula el layout con dagre
// (equivalente en JS al `dot` de Graphviz: el usuario nunca coloca nodos).
export function buildGraph(
  positions: Position[],
  techniques: Technique[],
): { nodes: GraphNode[]; edges: Edge[] } {
  const nodes: GraphNode[] = [];
  const edges: Edge[] = [];
  const positionById = new Map(positions.map((p) => [p.id, p]));

  for (const p of positions) {
    nodes.push({
      id: `pos:${p.id}`,
      type: "position",
      data: { label: p.name, isBad: p.is_bad },
      position: { x: 0, y: 0 },
      style: { ...NODE_SIZE.position },
    });
  }

  for (const t of techniques) {
    const color = CONFIDENCE_COLOR[t.confidence];
    const kind = t.is_submission ? "submission" : "technique";
    nodes.push({
      id: `tech:${t.id}`,
      type: kind,
      data: { label: t.name, color },
      position: { x: 0, y: 0 },
      style: { ...NODE_SIZE[kind] },
    });

    // posición de origen -> técnica: flecha sólida negra
    if (positionById.has(t.source_position_id)) {
      edges.push({
        id: `src:${t.id}`,
        source: `pos:${t.source_position_id}`,
        target: `tech:${t.id}`,
        style: { stroke: BLACK, strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: BLACK },
      });
    }

    // técnica -> posición de destino: discontinua gris (buena) o roja (bottom mala)
    if (
      !t.is_submission &&
      t.destination_position_id &&
      positionById.has(t.destination_position_id)
    ) {
      const dest = positionById.get(t.destination_position_id)!;
      const stroke = dest.is_bad ? RED : GREY;
      edges.push({
        id: `dst:${t.id}`,
        source: `tech:${t.id}`,
        target: `pos:${t.destination_position_id}`,
        style: { stroke, strokeWidth: 1.5, strokeDasharray: "6 4" },
        markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
      });
    }
  }

  return layout(nodes, edges);
}

function layout(
  nodes: GraphNode[],
  edges: Edge[],
): { nodes: GraphNode[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 55, ranksep: 80, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) {
    const size = NODE_SIZE[n.type ?? "technique"] ?? NODE_SIZE.technique;
    g.setNode(n.id, { ...size });
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  const laidOut = nodes.map((n) => {
    const { x, y, width, height } = g.node(n.id);
    return {
      ...n,
      position: { x: x - width / 2, y: y - height / 2 },
    };
  });

  return { nodes: laidOut, edges };
}
