"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("Legend");
  const c = useTranslations("Confidence");
  return (
    <details className="w-max rounded-md border border-black/10 bg-white/95 text-[11px] shadow-sm">
      <summary className="cursor-pointer select-none px-2 py-1 text-zinc-500">
        {t("chip")}
      </summary>
      <div className="flex flex-col gap-1 border-t border-black/10 px-2 py-1.5 text-zinc-600">
        <div className="flex items-center gap-1.5">
          <Swatch color={CONFIDENCE_COLOR.alta} /> {c("alta")}
          <Swatch color={CONFIDENCE_COLOR.media} /> {c("media")}
          <Swatch color={CONFIDENCE_COLOR.baja} /> {c("baja")}
          <span className="text-zinc-400">{t("confidence")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Line dash="0" color="#111111" /> {t("posToTech")}
        </div>
        <div className="flex items-center gap-1.5">
          <Line dash="6 4" color="#8a8a8a" /> {t("techToPos")}
        </div>
        <div className="flex items-center gap-1.5">
          <Line dash="6 4" color="#C62828" /> {t("toBadPosition")}
        </div>
        <div className="flex items-center gap-1.5">
          <Line dash="1 4" color="#C62828" /> {t("planB")}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-4 shrink-0 rounded-sm border-2 border-zinc-400" />
          {t("boxIsSubmission")} ·
          <span className="inline-block h-3 w-3 shrink-0 rounded-full border border-zinc-400 bg-zinc-200" />
          {t("ballIsPosition")}
        </div>
        <div className="text-zinc-400">{t("collapseHint")}</div>
      </div>
    </details>
  );
}
