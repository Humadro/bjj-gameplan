"use client";

import { useState } from "react";
import { getNodesBounds, getViewportForBounds, useReactFlow } from "@xyflow/react";

const MAX = 5000;
const MARGIN = 1.15; // 15% de aire alrededor del árbol

function filename(ext: string) {
  return `bjj-gameplan-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

function download(dataUrl: string, name: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = name;
  a.click();
}

export default function ExportButton() {
  const { getNodes } = useReactFlow();
  const [busy, setBusy] = useState<null | "png" | "pdf">(null);

  async function render() {
    const nodes = getNodes();
    if (nodes.length === 0) return null;

    const bounds = getNodesBounds(nodes);
    const w = Math.min(Math.ceil(bounds.width * MARGIN), MAX);
    const h = Math.min(Math.ceil(bounds.height * MARGIN), MAX);
    const vp = getViewportForBounds(bounds, w, h, 0.5, 2, 0.1);

    const viewport = document.querySelector<HTMLElement>(".react-flow__viewport");
    if (!viewport) return null;

    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(viewport, {
      backgroundColor: "#ffffff",
      width: w,
      height: h,
      pixelRatio: 2,
      style: {
        width: `${w}px`,
        height: `${h}px`,
        transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
      },
    });
    return { dataUrl, w, h };
  }

  async function exportPng() {
    setBusy("png");
    try {
      const r = await render();
      if (r) download(r.dataUrl, filename("png"));
    } finally {
      setBusy(null);
    }
  }

  async function exportPdf() {
    setBusy("pdf");
    try {
      const r = await render();
      if (!r) return;
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: r.w >= r.h ? "landscape" : "portrait",
        unit: "px",
        format: [r.w, r.h],
      });
      pdf.addImage(r.dataUrl, "PNG", 0, 0, r.w, r.h);
      pdf.save(filename("pdf"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex gap-1">
      <button
        onClick={exportPng}
        disabled={busy !== null}
        className="rounded-md border border-black/15 bg-white px-2 py-1 text-xs shadow-sm hover:bg-black/5 disabled:opacity-60"
      >
        {busy === "png" ? "…" : "PNG"}
      </button>
      <button
        onClick={exportPdf}
        disabled={busy !== null}
        className="rounded-md border border-black/15 bg-white px-2 py-1 text-xs shadow-sm hover:bg-black/5 disabled:opacity-60"
      >
        {busy === "pdf" ? "…" : "PDF"}
      </button>
    </div>
  );
}
