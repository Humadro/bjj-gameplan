"use server";

import { isLocale } from "./config";
import { setLocaleCookie } from "./locale";

/** Cambia el idioma de la interfaz (lo usa LocaleSwitcher). */
export async function changeLocale(locale: string): Promise<void> {
  if (isLocale(locale)) await setLocaleCookie(locale);
}
