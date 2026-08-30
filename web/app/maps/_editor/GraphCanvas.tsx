"use client";

import { useMemo, type ReactNode } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Panel,
  Position as HandlePosition,
  ReactFlow,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { buildGraph, type PositionNodeData, type TechniqueNodeData } from "@/lib/graph/layout";
import type { Position, Technique } from "@/lib/types";
import ExportButton from "./ExportButton";

const HANDLE_STYLE = { opacity: 0, width: 1, height: 1, border: "none" } as const;

function PositionNode({ data }: NodeProps) {
  const d = data as PositionNodeData;
  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-full p-2 text-center text-[12px] font-semibold leading-[1.15] text-zinc-900"
      style={{
        // aspecto de "bola" gris, como shape=circle del .dot
        background: "radial-gradient(circle at 34% 30%, #ffffff 0%, #e6e6e9 45%, #cfcfd6 100%)",
        border: d.isBad ? "3px solid #C62828" : "1px solid #a5a5ad",
        boxShadow: "0 2px 5px rgba(0,0,0,0.18)",
      }}
    >
      <Handle type="target" position={HandlePosition.Top} style={HANDLE_STYLE} />
      <span className="line-clamp-4 px-1">{d.label}</span>
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
      className="flex h-full w-full items-center justify-center rounded-md bg-white px-2 text-center text-[13px] font-semibold leading-tight"
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
  toolbar,
}: {
  positions: Position[];
  techniques: Technique[];
  toolbar?: ReactNode;
}) {
  const { nodes, edges } = useMemo(
    () => buildGraph(positions, techniques),
    [positions, techniques],
  );

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-white text-sm text-zinc-500">
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
      style={{ background: "#ffffff" }}
    >
      <Background color="#d4d4d8" gap={22} />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable />
      <Panel position="top-right" className="flex items-start gap-2">
        {toolbar}
        <ExportButton />
      </Panel>
    </ReactFlow>
  );
}
