import { ImageResponse } from "next/og";

// Glifo de marca: una posición con dos técnicas colgando (mini árbol), en
// blanco sobre fondo oscuro. Compartido por app/icon.tsx y app/apple-icon.tsx.
const GLYPH =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<g stroke="#fff" stroke-width="5" stroke-linecap="round">' +
      '<line x1="50" y1="40" x2="30" y2="68"/>' +
      '<line x1="50" y1="40" x2="70" y2="68"/>' +
      "</g>" +
      '<circle cx="50" cy="30" r="14" fill="#fff"/>' +
      '<circle cx="30" cy="72" r="9" fill="#fff"/>' +
      '<circle cx="70" cy="72" r="9" fill="#fff"/>' +
      "</svg>",
  );

// Fondo opaco de borde a borde (sin esquinas transparentes) para que sirva
// también como icono `maskable`; el sistema operativo aplica su propia forma.
export function brandIcon(px: number) {
  const glyph = Math.round(px * 0.66);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#18181b",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={GLYPH} width={glyph} height={glyph} alt="" />
      </div>
    ),
    { width: px, height: px },
  );
}
