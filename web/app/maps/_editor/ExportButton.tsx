"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { getNodesBounds, useReactFlow } from "@xyflow/react";
import { buildGamePlanText } from "@/lib/graph/gameplan";
import type { Position, Technique } from "@/lib/types";

const MAX = 8000; // lado máximo de la imagen en px
const PAD = 64; // aire alrededor del árbol, en px de imagen (deja sitio a etiquetas y 🔗)

function filename(ext: string) {
  return `bjj-gameplan-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

function download(dataUrl: string, name: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = name;
  a.click();
}

export default function ExportButton({
  mapName = "Mapa",
  positions = [],
  techniques = [],
}: {
  mapName?: string;
  positions?: Position[];
  techniques?: Technique[];
}) {
  const { getNodes } = useReactFlow();
  const t = useTranslations("Export");
  const gp = useTranslations("GamePlan");
  const cf = useTranslations("Confidence");
  const [busy, setBusy] = useState<null | "png" | "pdf" | "lista">(null);

  async function render() {
    const nodes = getNodes();
    if (nodes.length === 0) return null;

    const bounds = getNodesBounds(nodes);

    // Zoom para que el árbol ENTERO quepa dentro de MAX, con hueco para PAD.
    // Sin mínimo agresivo (el clamp a 0.5 de getViewportForBounds es lo que
    // recortaba los mapas grandes): un mapa enorme simplemente sale más pequeño.
    const zoom = Math.max(
      0.05,
      Math.min(2, (MAX - PAD * 2) / bounds.width, (MAX - PAD * 2) / bounds.height),
    );

    const w = Math.ceil(bounds.width * zoom + PAD * 2);
    const h = Math.ceil(bounds.height * zoom + PAD * 2);
    // Coloca la esquina (bounds.x, bounds.y) del árbol en (PAD, PAD) de la imagen.
    const tx = PAD - bounds.x * zoom;
    const ty = PAD - bounds.y * zoom;

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
        transform: `translate(${tx}px, ${ty}px) scale(${zoom})`,
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

  // Plan de juego como texto (lista por posición) en un PDF A4 monoespaciado.
  async function exportLista() {
    setBusy("lista");
    try {
      const text = buildGamePlanText(mapName, positions, techniques, {
        planTitle: gp("planTitle"),
        card: gp("card"),
        badPosition: gp("badPosition"),
        noOutgoing: gp("noOutgoing"),
        submission: gp("submission"),
        noExit: gp("noExit"),
        onFail: gp("onFail"),
        confidence: { alta: cf("alta"), media: cf("media"), baja: cf("baja") },
      });
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      pdf.setFont("courier", "normal");
      pdf.setFontSize(10);
      const margin = 40;
      const lineH = 13;
      const maxWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      const bottom = pdf.internal.pageSize.getHeight() - margin;
      let y = margin;
      for (const raw of text.split("\n")) {
        for (const line of pdf.splitTextToSize(raw || " ", maxWidth) as string[]) {
          if (y > bottom) {
            pdf.addPage();
            y = margin;
          }
          pdf.text(line, margin, y);
          y += lineH;
        }
      }
      pdf.save(`bjj-gameplan-${new Date().toISOString().slice(0, 10)}-lista.pdf`);
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
        {busy === "png" ? "…" : t("png")}
      </button>
      <button
        onClick={exportPdf}
        disabled={busy !== null}
        className="rounded-md border border-black/15 bg-white px-2 py-1 text-xs shadow-sm hover:bg-black/5 disabled:opacity-60"
      >
        {busy === "pdf" ? "…" : t("pdf")}
      </button>
      <button
        onClick={exportLista}
        disabled={busy !== null}
        title={t("listTitle")}
        className="rounded-md border border-black/15 bg-white px-2 py-1 text-xs shadow-sm hover:bg-black/5 disabled:opacity-60"
      >
        {busy === "lista" ? "…" : t("list")}
      </button>
    </div>
  );
}
