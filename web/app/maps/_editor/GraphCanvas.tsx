"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Panel,
  Position as HandlePosition,
  ReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { buildGraph, type PositionNodeData, type TechniqueNodeData } from "@/lib/graph/layout";
import { computeFocusSet, type FocusDirection } from "@/lib/graph/focus";
import { getRef, youtubeEmbedUrl, type RefInfo } from "@/lib/graph/refs";
import type { Position, Technique } from "@/lib/types";
import ExportButton from "./ExportButton";

const HANDLE_STYLE = { opacity: 0, width: 1, height: 1, border: "none" } as const;

function RefBadge() {
  return (
    <span
      className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] shadow ring-1 ring-black/10"
      title="Tiene enlace de estudio"
    >
      🔗
    </span>
  );
}

function PositionNode({ data }: NodeProps) {
  const d = data as PositionNodeData;
  return (
    <div
      className={`relative flex h-full w-full items-center justify-center rounded-full p-2 text-center text-[12px] font-semibold leading-[1.15] text-zinc-900 ${
        d.hasRef ? "cursor-pointer" : ""
      }`}
      style={{
        // aspecto de "bola" gris, como shape=circle del .dot
        background: "radial-gradient(circle at 34% 30%, #ffffff 0%, #e6e6e9 45%, #cfcfd6 100%)",
        border: d.isBad ? "3px solid #C62828" : "1px solid #a5a5ad",
        boxShadow: "0 2px 5px rgba(0,0,0,0.18)",
      }}
    >
      <Handle type="target" position={HandlePosition.Top} style={HANDLE_STYLE} />
      <span className="line-clamp-4 px-1">{d.label}</span>
      {d.hasRef && <RefBadge />}
      <Handle type="source" position={HandlePosition.Bottom} style={HANDLE_STYLE} />
    </div>
  );
}

function TechniqueNode({ data }: NodeProps) {
  const d = data as TechniqueNodeData;
  return (
    <div
      className={`relative flex h-full w-full items-center justify-center px-2 text-center text-[13px] font-medium leading-tight ${
        d.hasRef ? "cursor-pointer" : ""
      }`}
      style={{ color: d.color }}
    >
      <Handle type="target" position={HandlePosition.Top} style={HANDLE_STYLE} />
      {d.label}
      {d.hasRef && <RefBadge />}
      <Handle type="source" position={HandlePosition.Bottom} style={HANDLE_STYLE} />
    </div>
  );
}

function SubmissionNode({ data }: NodeProps) {
  const d = data as TechniqueNodeData;
  return (
    <div
      className={`relative flex h-full w-full items-center justify-center rounded-md bg-white px-2 text-center text-[13px] font-semibold leading-tight ${
        d.hasRef ? "cursor-pointer" : ""
      }`}
      style={{ color: d.color, border: `2px solid ${d.color}` }}
    >
      <Handle type="target" position={HandlePosition.Top} style={HANDLE_STYLE} />
      {d.label}
      {d.hasRef && <RefBadge />}
      <Handle type="source" position={HandlePosition.Bottom} style={HANDLE_STYLE} />
    </div>
  );
}

const nodeTypes = {
  position: PositionNode,
  technique: TechniqueNode,
  submission: SubmissionNode,
};

type SelectedRef = { title: string; ref: RefInfo };

function RefDrawer({ selected, onClose }: { selected: SelectedRef; onClose: () => void }) {
  const embed = youtubeEmbedUrl(selected.ref.url, selected.ref.startSeconds);
  return (
    <div className="absolute right-0 top-0 z-20 flex h-full w-[360px] max-w-[85%] flex-col gap-3 border-l border-black/10 bg-white p-3 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{selected.title}</p>
          {selected.ref.label && (
            <p className="truncate text-xs text-zinc-500">{selected.ref.label}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded border border-black/15 px-2 py-0.5 text-xs hover:bg-black/5"
        >
          ✕
        </button>
      </div>

      {embed ? (
        <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
          <iframe
            src={embed}
            title={selected.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <p className="text-xs text-zinc-500">Enlace externo (no es un vídeo de YouTube embebible).</p>
      )}

      <a
        href={selected.ref.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="self-start rounded-md border border-black/15 px-2 py-1 text-xs hover:bg-black/5"
      >
        Abrir enlace ↗
      </a>
    </div>
  );
}

export default function GraphCanvas({
  positions,
  techniques,
  toolbar,
  mapName = "Mapa",
}: {
  positions: Position[];
  techniques: Technique[];
  toolbar?: ReactNode;
  mapName?: string;
}) {
  const { nodes, edges } = useMemo(
    () => buildGraph(positions, techniques),
    [positions, techniques],
  );

  // Enfoque: resaltar los caminos que llegan a (o salen de) una posición.
  const [focusId, setFocusId] = useState("");
  const [dir, setDir] = useState<FocusDirection>("up");

  // Enlace de estudio abierto en el panel lateral.
  const [selectedRef, setSelectedRef] = useState<SelectedRef | null>(null);

  // Solo las posiciones que están en el mapa (las aparcadas no se pueden enfocar).
  const focusablePositions = useMemo(() => {
    const drawn = new Set(nodes.map((n) => n.id));
    return positions.filter((p) => drawn.has(`pos:${p.id}`));
  }, [nodes, positions]);

  const view = useMemo(() => {
    const root = `pos:${focusId}`;
    if (!focusId || !nodes.some((n) => n.id === root)) return { nodes, edges };
    const { nodeIds, edgeIds } = computeFocusSet(edges, root, dir);
    return {
      nodes: nodes.map((n) =>
        nodeIds.has(n.id) ? n : { ...n, style: { ...n.style, opacity: 0.12 } },
      ),
      edges: edges.map((e) =>
        edgeIds.has(e.id)
          ? { ...e, style: { ...e.style, opacity: 1, strokeWidth: 2.5 } }
          : { ...e, style: { ...e.style, opacity: 0.07 } },
      ),
    };
  }, [nodes, edges, focusId, dir]);

  function openRefFor(node: Node) {
    const [kind, id] = node.id.split(":");
    if (kind === "pos") {
      const p = positions.find((x) => x.id === id);
      const ref = p && getRef(p);
      if (p && ref) setSelectedRef({ title: p.name, ref });
    } else {
      const t = techniques.find((x) => x.id === id);
      const ref = t && getRef(t);
      if (t && ref) setSelectedRef({ title: t.name, ref });
    }
  }

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-white px-6 text-center text-sm text-zinc-500">
        {positions.length === 0
          ? "Añade tu primera posición para empezar a construir el mapa."
          : "Ninguna posición está vinculada todavía. Crea una técnica que salga de una posición para que aparezca en el mapa."}
      </div>
    );
  }

  return (
    <ReactFlow
      // `key` fuerza un re-fit cuando cambian los datos y el layout se recalcula.
      // (el enfoque solo cambia opacidad, no la longitud, así que no re-monta.)
      key={`${nodes.length}-${edges.length}`}
      nodes={view.nodes}
      edges={view.edges}
      nodeTypes={nodeTypes}
      fitView
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      onNodeClick={(_, node) => openRefFor(node)}
      proOptions={{ hideAttribution: true }}
      style={{ background: "#ffffff" }}
    >
      <Background color="#d4d4d8" gap={22} />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable />
      <Panel
        position="top-left"
        className="flex items-center gap-1 rounded-md border border-black/10 bg-white/95 px-2 py-1 text-xs shadow-sm"
      >
        <span className="text-zinc-500">Enfocar</span>
        <select
          value={focusId}
          onChange={(e) => setFocusId(e.currentTarget.value)}
          className="max-w-[10rem] rounded border border-black/15 px-1 py-0.5"
        >
          <option value="">(todo)</option>
          {focusablePositions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {focusId && (
          <>
            <button
              onClick={() => setDir((d) => (d === "up" ? "down" : "up"))}
              className="rounded border border-black/15 px-1 py-0.5 hover:bg-black/5"
              title="Cambiar dirección"
            >
              {dir === "up" ? "llegan aquí ↑" : "salen de aquí ↓"}
            </button>
            <button
              onClick={() => setFocusId("")}
              className="rounded border border-black/15 px-1 py-0.5 hover:bg-black/5"
              title="Quitar enfoque"
            >
              ✕
            </button>
          </>
        )}
      </Panel>
      <Panel position="top-right" className="flex items-start gap-2">
        {toolbar}
        <ExportButton mapName={mapName} positions={positions} techniques={techniques} />
      </Panel>
      {selectedRef && (
        <RefDrawer selected={selectedRef} onClose={() => setSelectedRef(null)} />
      )}
    </ReactFlow>
  );
}
