"use client";

import { useTranslations } from "next-intl";
import { createPosition, seedMap } from "./actions";
import { useAction } from "./useAction";
import { FULL_TEMPLATES, SMALL_TEMPLATES, SUGGESTED_POSITIONS } from "@/lib/seed";

export default function SeedPanel({
  mapId,
  mapName,
}: {
  mapId: string;
  mapName: string;
}) {
  const { pending, error, run } = useAction();
  const t = useTranslations("SeedPanel");
  const tt = useTranslations("Templates");

  function addPosition(name: string, isBad?: boolean) {
    const fd = new FormData();
    fd.set("map_id", mapId);
    fd.set("name", name);
    if (isBad) fd.set("is_bad", "on");
    run(createPosition, fd);
  }

  function loadTemplate(id: string) {
    const fd = new FormData();
    fd.set("map_id", mapId);
    fd.set("template_id", id);
    run(seedMap, fd);
  }

  return (
    <div className="h-full overflow-y-auto bg-white p-8">
      <div className="mx-auto w-full max-w-lg">
        <h2 className="text-lg font-semibold">{t("emptyTitle", { name: mapName })}</h2>
        <p className="mt-1 text-sm text-zinc-500">{t("emptyDesc")}</p>

        {/* Chips: añadir una posición suelta de un clic */}
        <div className="mt-5 flex flex-wrap gap-2">
          {SUGGESTED_POSITIONS.map((p) => (
            <button
              key={p.name}
              disabled={pending}
              onClick={() => addPosition(p.name, p.isBad)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-60 ${
                p.isBad
                  ? "border-red-300 text-red-700 hover:bg-red-50"
                  : "border-black/15 hover:bg-black/5"
              }`}
            >
              + {p.name}
            </button>
          ))}
        </div>

        {/* Plantillas pequeñas y temáticas */}
        <h3 className="mt-8 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("orMiniPlan")}
        </h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {SMALL_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              disabled={pending}
              onClick={() => loadTemplate(tpl.id)}
              className="rounded-lg border border-black/15 p-3 text-left transition-colors hover:border-black/40 disabled:opacity-60"
            >
              <span className="block text-sm font-semibold">{tt(`${tpl.id}.label`)}</span>
              <span className="mt-0.5 block text-xs text-zinc-500">{tt(`${tpl.id}.description`)}</span>
            </button>
          ))}
        </div>

        {/* Plantillas completas */}
        <h3 className="mt-8 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("fullTemplates")}
        </h3>
        <div className="mt-3 flex flex-col gap-2">
          {FULL_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              disabled={pending}
              onClick={() => loadTemplate(tpl.id)}
              className="rounded-lg border border-black/15 p-3 text-left transition-colors hover:border-black/40 disabled:opacity-60"
            >
              <span className="block text-sm font-semibold">{tt(`${tpl.id}.label`)}</span>
              <span className="mt-0.5 block text-xs text-zinc-500">{tt(`${tpl.id}.description`)}</span>
            </button>
          ))}
        </div>

        {pending && <p className="mt-4 text-xs text-zinc-500">{t("saving")}</p>}
        {error && <p className="mt-4 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
