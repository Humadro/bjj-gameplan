import { getTranslations } from "next-intl/server";

export default async function SetupNotice() {
  const t = await getTranslations("Setup");
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-zinc-50 p-6 dark:bg-black">
      <div className="max-w-md rounded-xl border border-amber-400/50 bg-amber-50 p-6 text-sm dark:bg-amber-950/30">
        <h1 className="mb-2 text-base font-semibold">{t("title")}</h1>
        <p className="mb-3 text-zinc-600 dark:text-zinc-300">
          {t.rich("body", {
            code: (chunks) => (
              <code className="rounded bg-black/10 px-1">{chunks}</code>
            ),
          })}
        </p>
        <pre className="overflow-x-auto rounded bg-black/80 p-3 text-xs text-zinc-100">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...`}
        </pre>
      </div>
    </main>
  );
}
