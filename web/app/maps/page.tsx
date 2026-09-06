import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import SetupNotice from "../SetupNotice";
import LocaleSwitcher from "../LocaleSwitcher";
import MapsList, { type MapRow } from "./MapsList";

export default async function MapsPage() {
  if (!hasSupabaseEnv) return <SetupNotice />;

  const t = await getTranslations("MapsList");
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("maps")
    .select("id, name, created_at, positions(count), techniques(count)")
    .order("created_at", { ascending: true });

  const maps: MapRow[] = (data ?? []).map((m) => ({
    id: m.id as string,
    name: m.name as string,
    positions: (m.positions as { count: number }[] | null)?.[0]?.count ?? 0,
    techniques: (m.techniques as { count: number }[] | null)?.[0]?.count ?? 0,
  }));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">{t("heading")}</h1>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <form action="/auth/signout" method="post">
            <button className="text-xs text-zinc-500 hover:underline" title={user.email}>
              {t("signOut")}
            </button>
          </form>
        </div>
      </header>

      <MapsList maps={maps} />
    </main>
  );
}
