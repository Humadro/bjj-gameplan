"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { Position, Technique } from "@/lib/types";

export type MapActionResult = { error?: string };

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function E(key: string, values?: Record<string, string | number>) {
  return (await getTranslations("Errors"))(key, values);
}

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// Crea un mapa y entra en él.
export async function createMap(formData: FormData): Promise<MapActionResult> {
  const { supabase, user } = await authed();
  if (!user) return { error: await E("notAuthenticated") };

  const name = str(formData, "name") || (await E("untitledMap"));

  const { data, error } = await supabase
    .from("maps")
    .insert({ name, user_id: user.id })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? (await E("mapCreateFailed")) };

  revalidatePath("/maps");
  redirect(`/maps/${data.id}`);
}

export async function renameMap(formData: FormData): Promise<MapActionResult> {
  const { supabase, user } = await authed();
  if (!user) return { error: await E("notAuthenticated") };

  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!id) return { error: await E("missingMapId") };
  if (!name) return { error: await E("emptyName") };

  const { error } = await supabase.from("maps").update({ name }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/maps");
  revalidatePath(`/maps/${id}`);
  return {};
}

// Activa / desactiva el enlace público de solo lectura. Al activar genera un
// slug nuevo si no había; "regenerar" = desactivar y volver a activar.
export async function setMapSharing(formData: FormData): Promise<MapActionResult> {
  const { supabase, user } = await authed();
  if (!user) return { error: await E("notAuthenticated") };

  const id = str(formData, "id");
  const enabled = str(formData, "enabled") === "1";
  if (!id) return { error: await E("missingMapId") };

  if (!enabled) {
    const { error } = await supabase.from("maps").update({ public_slug: null }).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath(`/maps/${id}`);
    return {};
  }

  // ¿ya tiene slug? lo dejamos; si no, generamos uno.
  const { data: current } = await supabase
    .from("maps")
    .select("public_slug")
    .eq("id", id)
    .maybeSingle();
  if (current?.public_slug) return {};

  const { error } = await supabase
    .from("maps")
    .update({ public_slug: crypto.randomUUID() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/maps/${id}`);
  return {};
}

// Clona un mapa compartido (por token) en la cuenta del usuario actual.
// Lee vía la RPC shared_map (security definer), así que no necesita RLS sobre el
// mapa origen. Devuelve { needsAuth: true } si no hay sesión.
export async function cloneSharedMap(
  token: string,
): Promise<{ error?: string; needsAuth?: boolean }> {
  const { supabase, user } = await authed();
  if (!user) return { needsAuth: true };
  if (!token) return { error: await E("missingLink") };

  const { data, error: rpcError } = await supabase.rpc("shared_map", { p_token: token });
  if (rpcError) return { error: rpcError.message };
  if (!data) return { error: await E("linkGone") };

  const shared = data as {
    map: { name: string };
    positions: Position[];
    techniques: Technique[];
  };

  const { data: newMap, error: mapError } = await supabase
    .from("maps")
    .insert({ name: (await E("copyOf", { name: shared.map.name })).slice(0, 80), user_id: user.id })
    .select("id")
    .single();
  if (mapError || !newMap) return { error: mapError?.message ?? (await E("mapCreateFailed")) };

  const oldToNew = new Map<string, string>();
  if (shared.positions.length > 0) {
    const { data: insPos, error: posError } = await supabase
      .from("positions")
      .insert(
        shared.positions.map((p) => ({
          name: p.name,
          is_bad: p.is_bad,
          reference_url: p.reference_url ?? null,
          reference_label: p.reference_label ?? null,
          reference_start_seconds: p.reference_start_seconds ?? null,
          user_id: user.id,
          map_id: newMap.id,
        })),
      )
      .select("id, name");
    if (posError || !insPos) return { error: posError?.message ?? (await E("copyPositionsFailed")) };

    const nameToNew = new Map(insPos.map((p) => [p.name, p.id as string]));
    for (const p of shared.positions) {
      const nid = nameToNew.get(p.name);
      if (nid) oldToNew.set(p.id, nid);
    }
  }

  const rows = shared.techniques
    .map((t) => ({
      name: t.name,
      source_position_id: oldToNew.get(t.source_position_id) ?? null,
      destination_position_id: t.destination_position_id
        ? (oldToNew.get(t.destination_position_id) ?? null)
        : null,
      fail_position_id: t.fail_position_id ? (oldToNew.get(t.fail_position_id) ?? null) : null,
      confidence: t.confidence,
      is_submission: t.is_submission,
      reference_url: t.reference_url ?? null,
      reference_label: t.reference_label ?? null,
      reference_start_seconds: t.reference_start_seconds ?? null,
      user_id: user.id,
      map_id: newMap.id,
    }))
    .filter((r) => r.source_position_id);

  if (rows.length > 0) {
    const { error: techError } = await supabase.from("techniques").insert(rows);
    if (techError) return { error: await E("copyTechniquesFailed", { message: techError.message }) };
  }

  revalidatePath("/maps");
  redirect(`/maps/${newMap.id}`);
}

export async function deleteMap(formData: FormData): Promise<MapActionResult> {
  const { supabase, user } = await authed();
  if (!user) return { error: await E("notAuthenticated") };

  const id = str(formData, "id");
  if (!id) return { error: await E("missingMapId") };

  // Posiciones y técnicas caen por ON DELETE CASCADE.
  const { error } = await supabase.from("maps").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/maps");
  redirect("/maps");
}
