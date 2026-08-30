"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Confidence } from "@/lib/types";

export type ActionResult = { error?: string };

const CONFIDENCES: Confidence[] = ["alta", "media", "baja"];

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function bool(formData: FormData, key: string) {
  const v = formData.get(key);
  return v === "on" || v === "true" || v === "1";
}

// ----------------------------- Posiciones -----------------------------

export async function createPosition(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await authed();
  if (!user) return { error: "No autenticado." };

  const name = str(formData, "name");
  if (!name) return { error: "El nombre de la posición es obligatorio." };

  const { error } = await supabase
    .from("positions")
    .insert({ name, is_bad: bool(formData, "is_bad"), user_id: user.id });

  if (error) {
    return {
      error: error.code === "23505" ? "Ya tienes una posición con ese nombre." : error.message,
    };
  }
  revalidatePath("/map");
  return {};
}

export async function updatePosition(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await authed();
  if (!user) return { error: "No autenticado." };

  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!id) return { error: "Falta el id de la posición." };
  if (!name) return { error: "El nombre de la posición es obligatorio." };

  const { error } = await supabase
    .from("positions")
    .update({ name, is_bad: bool(formData, "is_bad") })
    .eq("id", id);

  if (error) {
    return {
      error: error.code === "23505" ? "Ya tienes una posición con ese nombre." : error.message,
    };
  }
  revalidatePath("/map");
  return {};
}

export async function deletePosition(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await authed();
  if (!user) return { error: "No autenticado." };

  const id = str(formData, "id");
  if (!id) return { error: "Falta el id de la posición." };

  // Las técnicas que salían de aquí caen por ON DELETE CASCADE;
  // las que desembocaban aquí quedan con destino NULL (ON DELETE SET NULL).
  const { error } = await supabase.from("positions").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/map");
  return {};
}

// ----------------------------- Técnicas -----------------------------

function parseTechnique(formData: FormData) {
  const name = str(formData, "name");
  const source_position_id = str(formData, "source_position_id");
  const rawDest = str(formData, "destination_position_id");
  const confidence = str(formData, "confidence") as Confidence;
  const is_submission = bool(formData, "is_submission");

  if (!name) return { error: "El nombre de la técnica es obligatorio." as const };
  if (!source_position_id) return { error: "Elige la posición de origen." as const };
  if (!CONFIDENCES.includes(confidence)) return { error: "Confianza no válida." as const };

  const destination_position_id =
    is_submission || !rawDest || rawDest === source_position_id ? null : rawDest;

  return {
    values: {
      name,
      source_position_id,
      destination_position_id,
      confidence,
      is_submission,
    },
  };
}

export async function createTechnique(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await authed();
  if (!user) return { error: "No autenticado." };

  const parsed = parseTechnique(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await supabase
    .from("techniques")
    .insert({ ...parsed.values, user_id: user.id });
  if (error) return { error: error.message };

  revalidatePath("/map");
  return {};
}

export async function updateTechnique(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await authed();
  if (!user) return { error: "No autenticado." };

  const id = str(formData, "id");
  if (!id) return { error: "Falta el id de la técnica." };

  const parsed = parseTechnique(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await supabase.from("techniques").update(parsed.values).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/map");
  return {};
}

export async function deleteTechnique(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await authed();
  if (!user) return { error: "No autenticado." };

  const id = str(formData, "id");
  if (!id) return { error: "Falta el id de la técnica." };

  const { error } = await supabase.from("techniques").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/map");
  return {};
}
