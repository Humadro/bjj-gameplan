"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { changeLocale } from "@/i18n/actions";
import { LOCALES, LOCALE_LABELS } from "@/i18n/config";

/** Selector de idioma. Escribe la cookie NEXT_LOCALE y refresca la vista. */
export default function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("LocaleSwitcher");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label={t("label")}
      value={locale}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          await changeLocale(next);
          router.refresh();
        });
      }}
      className={
        className ??
        "rounded-md border border-black/15 bg-transparent px-2 py-1 text-xs text-zinc-600 disabled:opacity-60 dark:border-white/20 dark:text-zinc-300"
      }
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {LOCALE_LABELS[l]}
        </option>
      ))}
    </select>
  );
}
