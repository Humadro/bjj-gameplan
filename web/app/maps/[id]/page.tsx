import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import type { Position, Technique } from "@/lib/types";
import SetupNotice from "../../SetupNotice";
import MapView from "../_editor/MapView";

export default async function MapEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasSupabaseEnv) return <SetupNotice />;

  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: map } = await supabase
    .from("maps")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (!map) notFound();

  const [maps, positionsRes, techniquesRes] = await Promise.all([
    supabase.from("maps").select("id, name").order("created_at", { ascending: true }),
    supabase
      .from("positions")
      .select("*")
      .eq("map_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("techniques")
      .select("*")
      .eq("map_id", id)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <MapView
      email={user.email}
      mapId={map.id as string}
      mapName={map.name as string}
      maps={(maps.data as { id: string; name: string }[] | null) ?? []}
      positions={(positionsRes.data as Position[] | null) ?? []}
      techniques={(techniquesRes.data as Technique[] | null) ?? []}
    />
  );
}
