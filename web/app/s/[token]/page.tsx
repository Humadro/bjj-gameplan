import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import GraphCanvas from "@/app/maps/_editor/GraphCanvas";
import SetupNotice from "@/app/SetupNotice";
import CloneButton from "./CloneButton";
import type { Position, Technique } from "@/lib/types";

export const metadata = { robots: { index: false } };

export default async function SharedMapPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  if (!hasSupabaseEnv) return <SetupNotice />;

  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("shared_map", { p_token: token });
  if (!data) notFound();

  const { map, positions, techniques } = data as {
    map: { id: string; name: string };
    positions: Position[];
    techniques: Technique[];
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-black/10 bg-white px-4 py-2">
        <span className="min-w-0 truncate text-sm font-semibold">{map.name}</span>
        <div className="flex shrink-0 items-center gap-3">
          <CloneButton token={token} />
          <span className="text-xs text-zinc-500">Solo lectura · BJJ Game Plan</span>
        </div>
      </header>
      <main className="relative flex-1">
        <GraphCanvas
          positions={positions ?? []}
          techniques={techniques ?? []}
          mapName={map.name}
        />
      </main>
    </div>
  );
}
