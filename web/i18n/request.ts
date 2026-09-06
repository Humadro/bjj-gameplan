import { getRequestConfig } from "next-intl/server";
import { getUserLocale } from "./locale";

// next-intl carga aquí el idioma + los mensajes en cada request (lo llama el
// plugin de next.config.ts). Idioma = cookie NEXT_LOCALE, con fallback a "es".
export default getRequestConfig(async () => {
  const locale = await getUserLocale();
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
