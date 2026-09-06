// Lógica pura de la paleta de comandos (⌘K). Sin React: se testea directo.
// La UI vive en app/maps/_editor/CommandPalette.tsx.
import type { Confidence } from "@/lib/types";

export type MapRef = { id: string; name: string };

// Una técnica concreta a crear (un tramo de una cadena, o una técnica suelta).
export type TechSpec = {
  source: string;
  name: string;
  dest: string | null;
  confidence: Confidence;
  isSubmission: boolean;
};

// Motivo de una línea inválida, como código (la UI lo traduce con next-intl).
export type InvalidCode =
  | "no-map"
  | "no-position-name"
  | "empty-segment"
  | "no-technique-name";

export type ParsedLine =
  | { kind: "empty" }
  | { kind: "position"; name: string; isBad: boolean }
  | { kind: "techniques"; specs: TechSpec[] }
  | { kind: "goto"; map: MapRef }
  | { kind: "phrase"; text: string } // texto suelto: en 1 línea abre el formulario
  | { kind: "invalid"; reason: InvalidCode; query?: string };

export const SEP_RE = /\s*(?:->|→|›|>)\s*/;
export const SEP_SPLIT_RE = /(\s*(?:->|→|›|>)\s*)/; // con captura: conserva los separadores
const SEP_G_RE = /\s*(?:->|→|›|>)\s*/g;
// Etiqueta al final de un tramo: ", alta" / ", baja" / ", sub" / ", sumisión".
// Se puede encadenar (", gancho, alta, sub"). No se come una coma normal del
// nombre ("gancho, el corto") porque exige una palabra clave conocida.
const SEG_TAG_RE = /\s*,\s*(alta|media|baja|sub|sumisi[oó]n)\s*$/i;
export const TAG_TAIL_RE =
  /^([\s\S]*?)((?:\s*,\s*(?:alta|media|baja|sub|sumisi[oó]n))+\s*)$/i;

// Quita las etiquetas del final de un tramo y devuelve el texto limpio + qué
// confianza / sumisión declaraban.
export function stripTags(seg: string): {
  text: string;
  conf: Confidence | null;
  sub: boolean;
} {
  let text = seg.trim();
  let conf: Confidence | null = null;
  let sub = false;
  let m: RegExpMatchArray | null;
  while ((m = text.match(SEG_TAG_RE))) {
    const tag = m[1].toLowerCase();
    if (tag === "sub" || tag.startsWith("sumisi")) sub = true;
    else conf = tag as Confidence;
    text = text.replace(SEG_TAG_RE, "").trim();
  }
  return { text, conf, sub };
}

// Parsea UNA línea. El textarea de la paleta procesa cada línea por separado.
export function parseLine(raw: string, maps: MapRef[]): ParsedLine {
  const text = raw.trim();
  if (!text) return { kind: "empty" };

  const goto = text.match(/^(?:ir(?:\s+a)?|go(?:\s+to)?)\s+(.+)$/i);
  if (goto) {
    const q = goto[1].trim().toLowerCase();
    const m = maps.find((x) => x.name.toLowerCase().includes(q));
    return m
      ? { kind: "goto", map: m }
      : { kind: "invalid", reason: "no-map", query: goto[1].trim() };
  }

  const pos = text.match(/^(?:\+?pos|posici[oó]n|position)\s+(.+)$/i);
  if (pos) {
    let name = pos[1].trim();
    let isBad = false;
    if (/\b(?:mala|bad)\b/i.test(name) || name.endsWith("!")) {
      isBad = true;
      name = name.replace(/\b(?:mala|bad)\b/i, "").replace(/!+$/, "").trim();
    }
    return name
      ? { kind: "position", name, isBad }
      : { kind: "invalid", reason: "no-position-name" };
  }

  if (SEP_RE.test(text)) {
    const raw = text.split(SEP_RE);
    raw[0] = raw[0].replace(/^(?:desde|from)\s+/i, "");
    const segs = raw.map(stripTags);

    if (segs.some((s) => !s.text)) {
      return { kind: "invalid", reason: "empty-segment" };
    }
    if (segs.length < 2) {
      return { kind: "invalid", reason: "no-technique-name" };
    }

    // Partes alternas: posición › técnica › posición › técnica …
    //   nº impar (3, 5, 7…): cada técnica lleva a una posición
    //   nº par   (2, 4, 6…): la última técnica no lleva a ninguna (sin salida
    //                        o sumisión si la marcas con ", sub")
    // La confianza es por técnica (", alta" tras su nombre). Una etiqueta en la
    // posición final vale de defecto para las técnicas sin etiqueta propia.
    const evenChain = segs.length % 2 === 0;
    const lineConf: Confidence =
      (!evenChain && segs[segs.length - 1].conf) || "media";

    const specs: TechSpec[] = [];
    const k = Math.floor(segs.length / 2);
    for (let i = 0; i < k; i++) {
      const src = segs[2 * i];
      const tech = segs[2 * i + 1];
      const isLast = i === k - 1;
      const destSeg = evenChain && isLast ? null : segs[2 * i + 2];
      specs.push({
        source: src.text,
        name: tech.text,
        dest: destSeg ? destSeg.text : null,
        confidence: tech.conf ?? lineConf,
        isSubmission: !destSeg && tech.sub,
      });
    }
    return { kind: "techniques", specs };
  }

  return { kind: "phrase", text };
}

// Descripción estructurada de una línea para la vista previa de la paleta.
// La UI la formatea con next-intl (no hay texto de idioma aquí).
export type LineDescription =
  | { kind: "empty"; icon: "" }
  | { kind: "position"; icon: string; name: string; bad: boolean }
  | { kind: "goto"; icon: string; mapName: string }
  | { kind: "phrase"; icon: string; text: string }
  | { kind: "invalid"; icon: string; reason: InvalidCode; query?: string }
  | {
      kind: "tech";
      icon: string;
      source: string;
      name: string;
      confidence: Confidence;
      tail: TechTail;
    }
  | {
      kind: "chain";
      icon: string;
      length: number;
      source: string;
      hops: { name: string; confidence: Confidence; tail: TechTail }[];
    };

export type TechTail =
  | { kind: "submission" }
  | { kind: "dest"; name: string }
  | { kind: "none" };

function tailOf(x: TechSpec): TechTail {
  if (x.isSubmission) return { kind: "submission" };
  return x.dest ? { kind: "dest", name: x.dest } : { kind: "none" };
}

export function describe(p: ParsedLine): LineDescription {
  switch (p.kind) {
    case "position":
      return { kind: "position", icon: "＋", name: p.name, bad: p.isBad };
    case "goto":
      return { kind: "goto", icon: "→", mapName: p.map.name };
    case "phrase":
      return { kind: "phrase", icon: "?", text: p.text };
    case "invalid":
      return { kind: "invalid", icon: "⚠", reason: p.reason, query: p.query };
    case "techniques": {
      const s = p.specs;
      if (s.length === 1) {
        return {
          kind: "tech",
          icon: s[0].isSubmission ? "◻" : "•",
          source: s[0].source,
          name: s[0].name,
          confidence: s[0].confidence,
          tail: tailOf(s[0]),
        };
      }
      return {
        kind: "chain",
        icon: "⛓",
        length: s.length,
        source: s[0].source,
        hops: s.map((x) => ({ name: x.name, confidence: x.confidence, tail: tailOf(x) })),
      };
    }
    default:
      return { kind: "empty", icon: "" };
  }
}

// ---- Resaltado en vivo: posiciones en negrita, técnicas normales ----------

export type Tok = { text: string; bold?: boolean; muted?: boolean };

// "desde X" -> "desde " normal, "X" en negrita. Sin "desde": espacios sueltos
// normales, el resto en negrita (es un nombre de posición).
function posTokens(seg: string): Tok[] {
  const d = seg.match(/^(\s*)((?:desde|from)\s+)(.*)$/i);
  if (d) return [{ text: d[1] + d[2] }, { text: d[3], bold: true }];
  const s = seg.match(/^(\s*)([\s\S]*)$/)!;
  return [{ text: s[1] }, { text: s[2], bold: true }];
}

// Trocea UNA línea en tokens con/ sin negrita, conservando cada carácter
// (espacios y separadores incluidos) para que el overlay calce con el textarea.
export function lineTokens(line: string): Tok[] {
  if (line.trim() === "") return [{ text: line }];

  const pm = line.match(/^(\s*)(\+?pos|posici[oó]n|position)(\s+)([\s\S]*)$/i);
  if (pm) return [{ text: pm[1] + pm[2] + pm[3] }, { text: pm[4], bold: true }];

  if (/^\s*(?:ir(?:\s+a)?|go(?:\s+to)?)\s+/i.test(line)) return [{ text: line }];

  if (SEP_RE.test(line)) {
    const parts = line.split(SEP_SPLIT_RE);
    const toks: Tok[] = [];
    let ci = 0;
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        toks.push({ text: parts[i] }); // separador
        continue;
      }
      let chunk = parts[i];
      let tail = "";
      const cm = chunk.match(TAG_TAIL_RE);
      if (cm) {
        chunk = cm[1];
        tail = cm[2];
      }
      const isPos = ci % 2 === 0; // par = posición, impar = técnica
      if (isPos && ci === 0) toks.push(...posTokens(chunk));
      else if (isPos) toks.push({ text: chunk, bold: true });
      else toks.push({ text: chunk });
      if (tail) toks.push({ text: tail, muted: true });
      ci++;
    }
    return toks;
  }

  return [{ text: line }];
}

// ---- Autocompletado de posiciones dentro del textarea --------------------

// Dado el texto y la posición del cursor, ¿estamos escribiendo el nombre de una
// posición? Si sí, devuelve el rango [nameStart, nameEnd) a reemplazar y el
// fragmento ya escrito. null = no sugerir (línea `pos`/`ir`, tramo de técnica…).
export function activeSlot(
  text: string,
  caret: number,
): { nameStart: number; nameEnd: number; frag: string } | null {
  const lineStart = text.lastIndexOf("\n", Math.max(0, caret - 1)) + 1;
  const nlAfter = text.indexOf("\n", caret);
  const lineEnd = nlAfter === -1 ? text.length : nlAfter;
  const line = text.slice(lineStart, lineEnd);
  const cil = caret - lineStart;

  if (/^\s*(?:\+?pos|posici[oó]n|position|ir|go)\b/i.test(line)) return null;

  const before = line.slice(0, cil);
  const after = line.slice(cil);
  const seps = [...before.matchAll(SEP_G_RE)];
  if (seps.length % 2 === 1) return null; // tramo impar = técnica, no posición

  const fragStart = seps.length
    ? seps[seps.length - 1].index! + seps[seps.length - 1][0].length
    : 0;
  const am = after.match(/\s*(?:->|→|›|>)\s*/);
  const fragEnd = am ? cil + am.index! : line.length;

  const rawSlot = line.slice(fragStart, fragEnd);
  let nameOffset = rawSlot.length - rawSlot.trimStart().length;
  if (seps.length === 0) {
    const dm = rawSlot.slice(nameOffset).match(/^(?:desde|from)\s+/i);
    if (dm) nameOffset += dm[0].length;
  }
  const namePart = rawSlot.slice(nameOffset);
  const tm = namePart.match(TAG_TAIL_RE);
  const nameEndTrim = (tm ? tm[1] : namePart).replace(/\s+$/, "").length;

  return {
    nameStart: lineStart + fragStart + nameOffset,
    nameEnd: lineStart + fragStart + nameOffset + nameEndTrim,
    frag: namePart.slice(0, nameEndTrim).trim(),
  };
}
