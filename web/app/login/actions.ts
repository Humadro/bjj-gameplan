"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { isLocale } from "@/i18n/config";
import { setLocaleCookie } from "@/i18n/locale";

export type AuthResult = { error?: string; message?: string };

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

// El idioma elegido en el formulario se guarda en la cookie NEXT_LOCALE.
async function applyLocale(formData: FormData) {
  const locale = String(formData.get("locale") ?? "");
  if (isLocale(locale)) await setLocaleCookie(locale);
}

// Solo se permite volver a una ruta interna ("/algo"), nunca a otra web.
function safeNext(formData: FormData) {
  const next = String(formData.get("next") ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/maps";
}

export async function login(formData: FormData): Promise<AuthResult> {
  const t = await getTranslations("Auth.errors");
  await applyLocale(formData);
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: t("credentialsRequired") };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(safeNext(formData));
}

export async function signup(formData: FormData): Promise<AuthResult> {
  const t = await getTranslations("Auth");
  await applyLocale(formData);
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: t("errors.credentialsRequired") };
  if (password.length < 6) return { error: t("errors.passwordTooShort") };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  // Si el proyecto tiene "Confirm email" activado, no hay sesión todavía.
  if (!data.session) {
    return { message: t("signupConfirmEmail") };
  }

  revalidatePath("/", "layout");
  redirect(safeNext(formData));
}
