import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";

// PWA installable: el navegador ofrece "Añadir a pantalla de inicio" y la app
// abre en modo `standalone` (sin barra del navegador). Next enlaza este archivo
// automáticamente con <link rel="manifest">.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("Metadata");
  return {
    name: t("title"),
    short_name: "BJJ",
    description: t("description"),
    start_url: "/maps",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f7f7f8",
    theme_color: "#18181b",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
