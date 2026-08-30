"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthResult = { error?: string; message?: string };

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

// Solo se permite volver a una ruta interna ("/algo"), nunca a otra web.
function safeNext(formData: FormData) {
  const next = String(formData.get("next") ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/maps";
}

export async function login(formData: FormData): Promise<AuthResult> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Email y contraseña son obligatorios." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(safeNext(formData));
}

export async function signup(formData: FormData): Promise<AuthResult> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Email y contraseña son obligatorios." };
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  // Si el proyecto tiene "Confirm email" activado, no hay sesión todavía.
  if (!data.session) {
    return { message: "Cuenta creada. Revisa tu email para confirmarla y luego inicia sesión." };
  }

  revalidatePath("/", "layout");
  redirect(safeNext(formData));
}
