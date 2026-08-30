"use client";

import { useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position as HandlePosition,
  ReactFlow,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { buildGraph, type PositionNodeData, type TechniqueNodeData } from "@/lib/graph/layout";
import type { Position, Technique } from "@/lib/types";

const HANDLE_STYLE = { opacity: 0, width: 1, height: 1, border: "none" } as const;

function PositionNode({ data }: NodeProps) {
  const d = data as PositionNodeData;
  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-full px-3 text-center text-[13px] font-semibold leading-tight"
      style={{
        background: "#ececec",
        color: "#111",
        border: d.isBad ? "2px solid #C62828" : "1px solid #b8b8b8",
      }}
    >
      <Handle type="target" position={HandlePosition.Top} style={HANDLE_STYLE} />
      {d.label}
      <Handle type="source" position={HandlePosition.Bottom} style={HANDLE_STYLE} />
    </div>
  );
}

function TechniqueNode({ data }: NodeProps) {
  const d = data as TechniqueNodeData;
  return (
    <div
      className="flex h-full w-full items-center justify-center px-2 text-center text-[13px] font-medium leading-tight"
      style={{ color: d.color }}
    >
      <Handle type="target" position={HandlePosition.Top} style={HANDLE_STYLE} />
      {d.label}
      <Handle type="source" position={HandlePosition.Bottom} style={HANDLE_STYLE} />
    </div>
  );
}

function SubmissionNode({ data }: NodeProps) {
  const d = data as TechniqueNodeData;
  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-md bg-white px-2 text-center text-[13px] font-semibold leading-tight dark:bg-zinc-900"
      style={{ color: d.color, border: `2px solid ${d.color}` }}
    >
      <Handle type="target" position={HandlePosition.Top} style={HANDLE_STYLE} />
      {d.label}
      <Handle type="source" position={HandlePosition.Bottom} style={HANDLE_STYLE} />
    </div>
  );
}

const nodeTypes = {
  position: PositionNode,
  technique: TechniqueNode,
  submission: SubmissionNode,
};

export default function GraphCanvas({
  positions,
  techniques,
}: {
  positions: Position[];
  techniques: Technique[];
}) {
  const { nodes, edges } = useMemo(
    () => buildGraph(positions, techniques),
    [positions, techniques],
  );

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Añade tu primera posición para empezar a construir el mapa.
      </div>
    );
  }

  return (
    <ReactFlow
      // `key` fuerza un re-fit cuando cambian los datos y el layout se recalcula.
      key={`${nodes.length}-${edges.length}`}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable />
    </ReactFlow>
  );
}
