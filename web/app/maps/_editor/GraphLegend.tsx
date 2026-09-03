"use client";

import { CONFIDENCE_COLOR } from "@/lib/types";

// Leyenda del canvas. Colapsada por defecto: solo un chip "❔ Leyenda".
function Swatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ background: color }}
    />
  );
}

function Line({ dash, color }: { dash: string; color: string }) {
  return (
    <svg width="26" height="8" className="shrink-0" aria-hidden>
      <line
        x1="1"
        y1="4"
        x2="25"
        y2="4"
        stroke={color}
        strokeWidth="2"
        strokeDasharray={dash}
      />
    </svg>
  );
}

export default function GraphLegend() {
  return (
    <details className="w-max rounded-md border border-black/10 bg-white/95 text-[11px] shadow-sm">
      <summary className="cursor-pointer select-none px-2 py-1 text-zinc-500">
        ❔ Leyenda
      </summary>
      <div className="flex flex-col gap-1 border-t border-black/10 px-2 py-1.5 text-zinc-600">
        <div className="flex items-center gap-1.5">
          <Swatch color={CONFIDENCE_COLOR.alta} /> alta
          <Swatch color={CONFIDENCE_COLOR.media} /> media
          <Swatch color={CONFIDENCE_COLOR.baja} /> baja
          <span className="text-zinc-400">· confianza de la técnica</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Line dash="0" color="#111111" /> posición → su técnica
        </div>
        <div className="flex items-center gap-1.5">
          <Line dash="6 4" color="#8a8a8a" /> técnica → posición a la que lleva
        </div>
        <div className="flex items-center gap-1.5">
          <Line dash="6 4" color="#C62828" /> lleva a una posición mala (bottom)
        </div>
        <div className="flex items-center gap-1.5">
          <Line dash="1 4" color="#C62828" /> «si fallas» → plan B
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-4 shrink-0 rounded-sm border-2 border-zinc-400" />
          caja = sumisión ·
          <span className="inline-block h-3 w-3 shrink-0 rounded-full border border-zinc-400 bg-zinc-200" />
          bola = posición
        </div>
        <div className="text-zinc-400">–/+N en una bola: plegar / desplegar sus técnicas</div>
      </div>
    </details>
  );
}
