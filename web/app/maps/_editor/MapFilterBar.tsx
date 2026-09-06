"use client";

import { useTranslations } from "next-intl";
import { CONFIDENCE_COLOR, type Confidence } from "@/lib/types";

export type MapFilter = {
  q: string;
  conf: Set<Confidence>;
  withRef: boolean;
  subsOnly: boolean;
};

export const emptyFilter: MapFilter = {
  q: "",
  conf: new Set(),
  withRef: false,
  subsOnly: false,
};

export function filterActive(f: MapFilter): boolean {
  return f.q.trim() !== "" || f.conf.size > 0 || f.withRef || f.subsOnly;
}

const CONFS: Confidence[] = ["alta", "media", "baja"];

// Filtro del mapa: atenúa el canvas y recorta las listas laterales a lo que
// encaja. Una sola fila para no recargar la barra lateral.
export default function MapFilterBar({
  value,
  onChange,
}: {
  value: MapFilter;
  onChange: (f: MapFilter) => void;
}) {
  const t = useTranslations("Filter");
  const cf = useTranslations("Confidence");
  const active = filterActive(value);

  function toggleConf(c: Confidence) {
    const conf = new Set(value.conf);
    if (conf.has(c)) conf.delete(c);
    else conf.add(c);
    onChange({ ...value, conf });
  }

  const chip = (on: boolean) =>
    `rounded border px-1.5 py-0.5 text-[11px] leading-none ${
      on ? "border-zinc-900 bg-zinc-900 text-white" : "border-black/15 hover:bg-black/5"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-1">
      <input
        value={value.q}
        onChange={(e) => onChange({ ...value, q: e.currentTarget.value })}
        placeholder={t("placeholder")}
        className="min-w-0 flex-1 rounded-md border border-black/15 px-2 py-1 text-xs"
      />
      {CONFS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => toggleConf(c)}
          title={t("confTitle", { conf: cf(c) })}
          className={chip(value.conf.has(c))}
          style={value.conf.has(c) ? undefined : { color: CONFIDENCE_COLOR[c] }}
        >
          {cf(c)}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...value, withRef: !value.withRef })}
        title={t("withRefTitle")}
        className={chip(value.withRef)}
      >
        🔗
      </button>
      <button
        type="button"
        onClick={() => onChange({ ...value, subsOnly: !value.subsOnly })}
        title={t("subsOnlyTitle")}
        className={chip(value.subsOnly)}
      >
        ◻
      </button>
      {active && (
        <button
          type="button"
          onClick={() => onChange(emptyFilter)}
          className="rounded border border-black/15 px-1.5 py-0.5 text-[11px] leading-none hover:bg-black/5"
        >
          {t("clear")}
        </button>
      )}
    </div>
  );
}
