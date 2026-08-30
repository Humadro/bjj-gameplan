import type { ReferenceFields } from "@/lib/types";

export type RefInfo = {
  url: string;
  label: string | null;
  startSeconds: number | null;
};

// Normaliza los campos reference_* de una fila. Devuelve null si no hay un enlace
// http(s) válido.
export function getRef(row: ReferenceFields): RefInfo | null {
  const url = row.reference_url?.trim();
  if (!url || !/^https?:\/\//i.test(url)) return null;
  const start =
    typeof row.reference_start_seconds === "number" && row.reference_start_seconds > 0
      ? Math.floor(row.reference_start_seconds)
      : null;
  return { url, label: row.reference_label?.trim() || null, startSeconds: start };
}

// Si la URL es de YouTube devuelve una URL de embed (youtube-nocookie); si no, null.
export function youtubeEmbedUrl(url: string, startSeconds: number | null): string | null {
  let id: string | null = null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
    if (host === "youtu.be") {
      id = u.pathname.slice(1);
    } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else if (u.pathname.startsWith("/embed/")) id = u.pathname.slice("/embed/".length);
      else if (u.pathname.startsWith("/shorts/")) id = u.pathname.slice("/shorts/".length);
    }
  } catch {
    return null;
  }
  if (!id || !/^[A-Za-z0-9_-]{6,}$/.test(id)) return null;
  const q = startSeconds && startSeconds > 0 ? `?start=${startSeconds}` : "";
  return `https://www.youtube-nocookie.com/embed/${id}${q}`;
}
