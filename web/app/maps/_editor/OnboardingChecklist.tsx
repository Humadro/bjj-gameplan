"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const KEY = "bjj_onboarding_dismissed";

type Step = { label: string; done: boolean };

export default function OnboardingChecklist({
  hasPositions,
  hasTechniques,
  hasRoutedTechnique,
}: {
  hasPositions: boolean;
  hasTechniques: boolean;
  hasRoutedTechnique: boolean;
}) {
  const t = useTranslations("Onboarding");
  // Empieza oculto para no parpadear en SSR; tras montar lee la preferencia real.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let stored = false;
    try {
      stored = localStorage.getItem(KEY) === "1";
    } catch {
      stored = false;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(stored);
  }, []);

  const steps: Step[] = [
    { label: t("step1"), done: hasPositions },
    { label: t("step2"), done: hasTechniques },
    { label: t("step3"), done: hasRoutedTechnique },
  ];
  const allDone = steps.every((s) => s.done);

  if (dismissed || allDone) return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* sin persistencia: se ocultará solo esta sesión */
    }
    setDismissed(true);
  }

  return (
    <div className="rounded-lg border border-black/10 bg-zinc-50 p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("title")}
        </span>
        <button onClick={dismiss} className="text-xs text-zinc-400 hover:text-zinc-700">
          {t("hide")}
        </button>
      </div>
      <ol className="mt-2 flex flex-col gap-1.5">
        {steps.map((s, i) => (
          <li
            key={i}
            className={`flex items-start gap-2 text-xs ${
              s.done ? "text-zinc-400 line-through" : "text-zinc-700"
            }`}
          >
            <span
              className={`mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                s.done ? "border-green-600 bg-green-600 text-white" : "border-zinc-400"
              }`}
            >
              {s.done ? "✓" : i + 1}
            </span>
            {s.label}
          </li>
        ))}
      </ol>
    </div>
  );
}
