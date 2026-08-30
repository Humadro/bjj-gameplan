"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTemplate } from "@/lib/seed";
import type { Confidence } from "@/lib/types";

export type ActionResult = { error?: string };

const CONFIDENCES: Confidence[] = ["alta", "media", "baja"];

type Supa = Awaited<ReturnType<typeof createClient>>;

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

// Campos de enlace de estudio (comunes a posiciones y técnicas). Si no hay URL,
// se limpian también la etiqueta y el segundo de inicio.
function refValues(formData: FormData) {
  const url = str(formData, "reference_url");
  if (!url || !/^https?:\/\//i.test(url)) {
    return { reference_url: null, reference_label: null, reference_start_seconds: null };
  }
  const label = str(formData, "reference_label");
  const rawStart = str(formData, "reference_start_seconds");
  const start = rawStart ? Math.trunc(Number(rawStart)) : NaN;
  return {
    reference_url: url,
    reference_label: label || null,
    reference_start_seconds: Number.isFinite(start) && start > 0 ? start : null,
  };
}

// RLS ya restringe `maps` al dueño: si el select devuelve fila, el mapa es suyo.
async function ownsMap(supabase: Supa, mapId: string) {
  if (!mapId) return false;
  const { data } = await supabase.from("maps").select("id").eq("id", mapId).maybeSingle();
  return Boolean(data);
}

function done(mapId: string): ActionResult {
  revalidatePath(`/maps/${mapId}`);
  return {};
}

// ----------------------------- Posiciones -----------------------------

export async function createPosition(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await authed();
  if (!user) return { error: "No autenticado." };

  const mapId = str(formData, "map_id");
  if (!(await ownsMap(supabase, mapId))) return { error: "Mapa no válido." };

  const name = str(formData, "name");
  if (!name) return { error: "El nombre de la posición es obligatorio." };

  const { error } = await supabase
    .from("positions")
    .insert({
      name,
      is_bad: bool(formData, "is_bad"),
      ...refValues(formData),
      user_id: user.id,
      map_id: mapId,
    });

  if (error) {
    return {
      error: error.code === "23505" ? "Ya hay una posición con ese nombre en este mapa." : error.message,
    };
  }
  return done(mapId);
}

export async function updatePosition(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await authed();
  if (!user) return { error: "No autenticado." };

  const mapId = str(formData, "map_id");
  if (!(await ownsMap(supabase, mapId))) return { error: "Mapa no válido." };

  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!id) return { error: "Falta el id de la posición." };
  if (!name) return { error: "El nombre de la posición es obligatorio." };

  const { error } = await supabase
    .from("positions")
    .update({ name, is_bad: bool(formData, "is_bad"), ...refValues(formData) })
    .eq("id", id)
    .eq("map_id", mapId);

  if (error) {
    return {
      error: error.code === "23505" ? "Ya hay una posición con ese nombre en este mapa." : error.message,
    };
  }
  return done(mapId);
}

export async function deletePosition(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await authed();
  if (!user) return { error: "No autenticado." };

  const mapId = str(formData, "map_id");
  if (!(await ownsMap(supabase, mapId))) return { error: "Mapa no válido." };

  const id = str(formData, "id");
  if (!id) return { error: "Falta el id de la posición." };

  // Las técnicas que salían de aquí caen por ON DELETE CASCADE;
  // las que desembocaban aquí quedan con destino NULL (ON DELETE SET NULL).
  const { error } = await supabase.from("positions").delete().eq("id", id).eq("map_id", mapId);
  if (error) return { error: error.message };

  return done(mapId);
}

// ----------------------------- Técnicas -----------------------------

// El <select> puede traer un id existente, "" (nada) o "__new__" (crear al vuelo
// con el nombre del campo de texto que la acompaña).
async function resolvePositionId(
  supabase: Supa,
  userId: string,
  mapId: string,
  idValue: string,
  newName: string,
): Promise<{ id: string | null } | { error: string }> {
  if (idValue && idValue !== "__new__") return { id: idValue };

  const name = newName.trim();
  if (!name) return { id: null };

  const { data: existing } = await supabase
    .from("positions")
    .select("id")
    .eq("map_id", mapId)
    .ilike("name", name)
    .limit(1)
    .maybeSingle();
  if (existing) return { id: existing.id };

  const { data: created, error } = await supabase
    .from("positions")
    .insert({ name, user_id: userId, map_id: mapId })
    .select("id")
    .single();
  if (error || !created) {
    return { error: error?.message ?? "No se pudo crear la posición nueva." };
  }
  return { id: created.id };
}

async function buildTechniqueValues(
  supabase: Supa,
  userId: string,
  mapId: string,
  formData: FormData,
) {
  const name = str(formData, "name");
  const confidence = str(formData, "confidence") as Confidence;
  const is_submission = bool(formData, "is_submission");

  if (!name) return { error: "El nombre de la técnica es obligatorio." as const };
  if (!CONFIDENCES.includes(confidence)) return { error: "Confianza no válida." as const };

  const source = await resolvePositionId(
    supabase,
    userId,
    mapId,
    str(formData, "source_position_id"),
    str(formData, "source_position_new"),
  );
  if ("error" in source) return { error: source.error };
  if (!source.id) return { error: "Elige o crea la posición de origen." as const };

  let destinationId: string | null = null;
  if (!is_submission) {
    const dest = await resolvePositionId(
      supabase,
      userId,
      mapId,
      str(formData, "destination_position_id"),
      str(formData, "destination_position_new"),
    );
    if ("error" in dest) return { error: dest.error };
    destinationId = dest.id === source.id ? null : dest.id;
  }

  // Plan B: a dónde vas si la técnica falla. Vale también para sumisiones.
  // Si coincide con el origen lo guardamos como null ("te quedas donde estabas").
  const fail = await resolvePositionId(
    supabase,
    userId,
    mapId,
    str(formData, "fail_position_id"),
    str(formData, "fail_position_new"),
  );
  if ("error" in fail) return { error: fail.error };
  const failId = fail.id === source.id ? null : fail.id;

  return {
    values: {
      name,
      source_position_id: source.id,
      destination_position_id: destinationId,
      fail_position_id: failId,
      confidence,
      is_submission,
      ...refValues(formData),
    },
  };
}

export async function createTechnique(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await authed();
  if (!user) return { error: "No autenticado." };

  const mapId = str(formData, "map_id");
  if (!(await ownsMap(supabase, mapId))) return { error: "Mapa no válido." };

  const parsed = await buildTechniqueValues(supabase, user.id, mapId, formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await supabase
    .from("techniques")
    .insert({ ...parsed.values, user_id: user.id, map_id: mapId });
  if (error) return { error: error.message };

  return done(mapId);
}

export async function updateTechnique(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await authed();
  if (!user) return { error: "No autenticado." };

  const mapId = str(formData, "map_id");
  if (!(await ownsMap(supabase, mapId))) return { error: "Mapa no válido." };

  const id = str(formData, "id");
  if (!id) return { error: "Falta el id de la técnica." };

  const parsed = await buildTechniqueValues(supabase, user.id, mapId, formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await supabase
    .from("techniques")
    .update(parsed.values)
    .eq("id", id)
    .eq("map_id", mapId);
  if (error) return { error: error.message };

  return done(mapId);
}

export async function deleteTechnique(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await authed();
  if (!user) return { error: "No autenticado." };

  const mapId = str(formData, "map_id");
  if (!(await ownsMap(supabase, mapId))) return { error: "Mapa no válido." };

  const id = str(formData, "id");
  if (!id) return { error: "Falta el id de la técnica." };

  const { error } = await supabase.from("techniques").delete().eq("id", id).eq("map_id", mapId);
  if (error) return { error: error.message };

  return done(mapId);
}

// ----------------------------- Plantillas -----------------------------

export async function seedMap(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await authed();
  if (!user) return { error: "No autenticado." };

  const mapId = str(formData, "map_id");
  if (!(await ownsMap(supabase, mapId))) return { error: "Mapa no válido." };

  const template = getTemplate(str(formData, "template_id"));
  if (!template) return { error: "Plantilla desconocida." };

  // Idempotente: solo si este mapa está vacío.
  const { count, error: countError } = await supabase
    .from("positions")
    .select("id", { count: "exact", head: true })
    .eq("map_id", mapId);
  if (countError) return { error: countError.message };
  if ((count ?? 0) > 0) {
    return { error: "Este mapa ya tiene posiciones; una plantilla solo se carga sobre un mapa vacío." };
  }

  const { data: insertedPositions, error: posError } = await supabase
    .from("positions")
    .insert(
      template.positions.map((p) => ({
        name: p.name,
        is_bad: Boolean(p.isBad),
        user_id: user.id,
        map_id: mapId,
      })),
    )
    .select("id, name");
  if (posError || !insertedPositions) {
    return { error: posError?.message ?? "No se pudieron crear las posiciones." };
  }

  if (template.techniques.length > 0) {
    const keyToName = new Map(template.positions.map((p) => [p.key, p.name]));
    const nameToId = new Map(insertedPositions.map((p) => [p.name, p.id]));
    const resolve = (key: string | undefined) => {
      if (!key) return null;
      const name = keyToName.get(key);
      return name ? (nameToId.get(name) ?? null) : null;
    };

    const rows = template.techniques.flatMap((t) => {
      const source = resolve(t.from);
      if (!source) return [];
      return [
        {
          name: t.name,
          source_position_id: source,
          destination_position_id: t.submission ? null : resolve(t.to),
          confidence: t.confidence,
          is_submission: Boolean(t.submission),
          user_id: user.id,
          map_id: mapId,
        },
      ];
    });

    const { error: techError } = await supabase.from("techniques").insert(rows);
    if (techError) {
      revalidatePath(`/maps/${mapId}`);
      return { error: `Posiciones creadas, pero fallaron las técnicas: ${techError.message}` };
    }
  }

  return done(mapId);
}
