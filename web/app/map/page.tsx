import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import type { Position, Technique } from "@/lib/types";
import SetupNotice from "../SetupNotice";
import MapView from "./MapView";

export default async function MapPage() {
  if (!hasSupabaseEnv) return <SetupNotice />;

  const user = await requireUser();
  const supabase = await createClient();

  const [positionsRes, techniquesRes] = await Promise.all([
    supabase.from("positions").select("*").order("created_at", { ascending: true }),
    supabase.from("techniques").select("*").order("created_at", { ascending: true }),
  ]);

  return (
    <MapView
      email={user.email}
      positions={(positionsRes.data as Position[] | null) ?? []}
      techniques={(techniquesRes.data as Technique[] | null) ?? []}
    />
  );
}
