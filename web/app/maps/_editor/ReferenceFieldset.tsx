"use client";

import { useTranslations } from "next-intl";
import type { ReferenceFields } from "@/lib/types";

const inputCls =
  "rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15 dark:bg-zinc-800";

// Bloque colapsable "Enlace de estudio" reutilizado por el form de técnica y el
// de posición. Los names coinciden con lo que lee refValues() en actions.ts.
export default function ReferenceFieldset({
  reference,
}: {
  reference?: Partial<ReferenceFields>;
}) {
  const t = useTranslations("Reference");
  const hasRef = Boolean(reference?.reference_url);

  return (
    <details open={hasRef} className="rounded-md border border-black/10 px-2 py-1 dark:border-white/10">
      <summary className="cursor-pointer text-xs text-zinc-500">{t("summary")}</summary>
      <div className="mt-2 flex flex-col gap-2">
        <input
          name="reference_url"
          type="url"
          inputMode="url"
          placeholder={t("urlPlaceholder")}
          defaultValue={reference?.reference_url ?? ""}
          className={inputCls}
        />
        <div className="flex gap-2">
          <input
            name="reference_label"
            placeholder={t("labelPlaceholder")}
            defaultValue={reference?.reference_label ?? ""}
            className={`${inputCls} min-w-0 flex-1`}
          />
          <input
            name="reference_start_seconds"
            type="number"
            min={0}
            placeholder={t("secondsPlaceholder")}
            defaultValue={reference?.reference_start_seconds ?? ""}
            className={`${inputCls} w-20`}
            title={t("secondsTitle")}
          />
        </div>
      </div>
    </details>
  );
}
