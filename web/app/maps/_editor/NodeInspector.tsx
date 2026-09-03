"use client";

import { useState } from "react";
import { deletePosition, deleteTechnique, updatePosition, updateTechnique } from "./actions";
import { useAction } from "./useAction";
import { useToast } from "./Toast";
import { TechniqueFields } from "./TechniquePanel";
import ReferenceFieldset from "./ReferenceFieldset";
import { CANONICAL_POS_LIST_ID } from "./CanonicalPositionsDatalist";
import { buildPositionCardText } from "@/lib/graph/gameplan";
import type { Position, Technique } from "@/lib/types";

const inputCls = "rounded-md border border-black/15 px-2 py-1 text-sm";

type Target = { kind: "pos" | "tech"; id: string };

export default function NodeInspector({
  target,
  mapId,
  mapName,
  positions,
  techniques,
  onClose,
}: {
  target: Target;
  mapId: string;
  mapName: string;
  positions: Position[];
  techniques: Technique[];
  onClose: () => void;
}) {
  const { pending, error, run } = useAction();
  const toast = useToast();
  const [cardBusy, setCardBusy] = useState(false);

  const position = target.kind === "pos" ? positions.find((p) => p.id === target.id) : undefined;
  const technique = target.kind === "tech" ? techniques.find((t) => t.id === target.id) : undefined;
  if (!position && !technique) return null;

  async function exportCard(p: Position) {
    setCardBusy(true);
    try {
      const text = buildPositionCardText(mapName, p, positions, techniques);
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "pt", format: "a5" });
      pdf.setFont("courier", "normal");
      pdf.setFontSize(11);
      const margin = 36;
      const maxWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      let y = margin;
      for (const raw of text.split("\n")) {
        for (const line of pdf.splitTextToSize(raw || " ", maxWidth) as string[]) {
          pdf.text(line, margin, y);
          y += 15;
        }
      }
      pdf.save(`ficha-${p.name.toLowerCase().replace(/\s+/g, "-")}.pdf`);
    } finally {
      setCardBusy(false);
    }
  }

  return (
    <div className="absolute right-0 top-0 z-20 flex h-full w-[360px] max-w-[85%] flex-col gap-3 overflow-y-auto border-l border-black/10 bg-white p-3 shadow-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          {position ? "Posición" : "Técnica"}
        </p>
        <button onClick={onClose} className="rounded border border-black/15 px-2 py-0.5 text-xs hover:bg-black/5">
          ✕
        </button>
      </div>

      {position && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("id", position.id);
            fd.set("map_id", mapId);
            run(updatePosition, fd, () => {
              toast("Posición guardada");
              onClose();
            });
          }}
        >
          <input
            name="name"
            defaultValue={position.name}
            required
            list={CANONICAL_POS_LIST_ID}
            className={inputCls}
          />
          <label className="flex items-center gap-2 text-xs text-zinc-500">
            <input type="checkbox" name="is_bad" defaultChecked={position.is_bad} />
            Posición mala / bottom
          </label>
          <ReferenceFieldset reference={position} />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-zinc-900 px-3 py-1 text-xs text-white disabled:opacity-60"
            >
              Guardar
            </button>
            <button
              type="button"
              disabled={cardBusy}
              onClick={() => exportCard(position)}
              className="rounded-md border border-black/15 px-3 py-1 text-xs hover:bg-black/5 disabled:opacity-60"
            >
              {cardBusy ? "…" : "Ficha PDF"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm(`¿Borrar "${position.name}" y sus técnicas de salida?`)) return;
                const fd = new FormData();
                fd.set("id", position.id);
                fd.set("map_id", mapId);
                run(deletePosition, fd, () => {
                  toast("Posición borrada");
                  onClose();
                });
              }}
              className="rounded-md border border-red-300 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
            >
              Borrar
            </button>
          </div>
        </form>
      )}

      {technique && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("id", technique.id);
            fd.set("map_id", mapId);
            run(updateTechnique, fd, () => {
              toast("Técnica guardada");
              onClose();
            });
          }}
        >
          <TechniqueFields positions={positions} technique={technique} />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-zinc-900 px-3 py-1 text-xs text-white disabled:opacity-60"
            >
              Guardar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                const fd = new FormData();
                fd.set("id", technique.id);
                fd.set("map_id", mapId);
                run(deleteTechnique, fd, () => {
                  toast("Técnica borrada");
                  onClose();
                });
              }}
              className="rounded-md border border-red-300 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
            >
              Borrar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
