"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type MapActionResult = { error?: string };

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
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
  if (!user) return { error: "No autenticado." };

  const name = str(formData, "name") || "Mapa sin nombre";

  const { data, error } = await supabase
    .from("maps")
    .insert({ name, user_id: user.id })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "No se pudo crear el mapa." };

  revalidatePath("/maps");
  redirect(`/maps/${data.id}`);
}

export async function renameMap(formData: FormData): Promise<MapActionResult> {
  const { supabase, user } = await authed();
  if (!user) return { error: "No autenticado." };

  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!id) return { error: "Falta el id del mapa." };
  if (!name) return { error: "El nombre no puede estar vacío." };

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
  if (!user) return { error: "No autenticado." };

  const id = str(formData, "id");
  const enabled = str(formData, "enabled") === "1";
  if (!id) return { error: "Falta el id del mapa." };

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

export async function deleteMap(formData: FormData): Promise<MapActionResult> {
  const { supabase, user } = await authed();
  if (!user) return { error: "No autenticado." };

  const id = str(formData, "id");
  if (!id) return { error: "Falta el id del mapa." };

  // Posiciones y técnicas caen por ON DELETE CASCADE.
  const { error } = await supabase.from("maps").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/maps");
  redirect("/maps");
}
