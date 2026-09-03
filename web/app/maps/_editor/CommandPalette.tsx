"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPosition, createTechnique } from "./actions";
import { CANONICAL_POSITIONS } from "@/lib/seed";
import type { Confidence, Position } from "@/lib/types";

type MapRef = { id: string; name: string };

// Una técnica concreta a crear (un tramo de una cadena, o una técnica suelta).
type TechSpec = {
  source: string;
  name: string;
  dest: string | null;
  confidence: Confidence;
  isSubmission: boolean;
};

type ParsedLine =
  | { kind: "empty" }
  | { kind: "position"; name: string; isBad: boolean }
  | { kind: "techniques"; specs: TechSpec[] }
  | { kind: "goto"; map: MapRef }
  | { kind: "phrase"; text: string } // texto suelto: en 1 línea abre el formulario
  | { kind: "invalid"; reason: string };

const SEP_RE = /\s*(?:->|→|›|>)\s*/;
const SEP_SPLIT_RE = /(\s*(?:->|→|›|>)\s*)/; // con captura: conserva los separadores
// Etiqueta al final de un tramo: ", alta" / ", baja" / ", sub" / ", sumisión".
// Se puede encadenar (", gancho, alta, sub"). No se come una coma normal del
// nombre ("gancho, el corto") porque exige una palabra clave conocida.
const SEG_TAG_RE = /\s*,\s*(alta|media|baja|sub|sumisi[oó]n)\s*$/i;
const TAG_TAIL_RE = /^([\s\S]*?)((?:\s*,\s*(?:alta|media|baja|sub|sumisi[oó]n))+\s*)$/i;
const cls = "rounded-md border border-black/15 px-2 py-1 text-sm";

// Quita las etiquetas del final de un tramo y devuelve el texto limpio + qué
// confianza / sumisión declaraban.
function stripTags(seg: string): { text: string; conf: Confidence | null; sub: boolean } {
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
function parseLine(raw: string, maps: MapRef[]): ParsedLine {
  const text = raw.trim();
  if (!text) return { kind: "empty" };

  const goto = text.match(/^ir(?:\s+a)?\s+(.+)$/i);
  if (goto) {
    const q = goto[1].trim().toLowerCase();
    const m = maps.find((x) => x.name.toLowerCase().includes(q));
    return m
      ? { kind: "goto", map: m }
      : { kind: "invalid", reason: `Ningún mapa contiene «${goto[1].trim()}»` };
  }

  const pos = text.match(/^(?:\+?pos|posici[oó]n)\s+(.+)$/i);
  if (pos) {
    let name = pos[1].trim();
    let isBad = false;
    if (/\bmala\b/i.test(name) || name.endsWith("!")) {
      isBad = true;
      name = name.replace(/\bmala\b/i, "").replace(/!+$/, "").trim();
    }
    return name
      ? { kind: "position", name, isBad }
      : { kind: "invalid", reason: "Falta el nombre de la posición" };
  }

  if (SEP_RE.test(text)) {
    const raw = text.split(SEP_RE);
    raw[0] = raw[0].replace(/^desde\s+/i, "");
    const segs = raw.map(stripTags);

    if (segs.some((s) => !s.text)) {
      return { kind: "invalid", reason: "Hay un tramo vacío en la cadena" };
    }
    if (segs.length < 2) {
      return { kind: "invalid", reason: "Falta el nombre de la técnica" };
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

function describe(p: ParsedLine): { icon: string; text: string; bad?: boolean } {
  switch (p.kind) {
    case "position":
      return { icon: "＋", text: `posición «${p.name}»${p.isBad ? " (mala)" : ""}` };
    case "goto":
      return { icon: "→", text: `ir al mapa «${p.map.name}»` };
    case "phrase":
      return { icon: "?", text: `«${p.text}» · Enter abre el formulario` };
    case "invalid":
      return { icon: "⚠", text: p.reason, bad: true };
    case "techniques": {
      const s = p.specs;
      const tail = (x: TechSpec) =>
        x.isSubmission ? "sumisión" : (x.dest ?? "(sin destino)");
      if (s.length === 1) {
        return {
          icon: s[0].isSubmission ? "◻" : "•",
          text: `${s[0].source} → ${s[0].name} → ${tail(s[0])} · ${s[0].confidence}`,
        };
      }
      const parts = [s[0].source];
      for (const x of s) {
        parts.push(`${x.name}·${x.confidence}`);
        parts.push(tail(x));
      }
      return { icon: "⛓", text: `cadena (${s.length}): ${parts.join(" → ")}` };
    }
    default:
      return { icon: "", text: "" };
  }
}

// ---- Resaltado en vivo: posiciones en negrita, técnicas normales ----------

type Tok = { text: string; bold?: boolean; muted?: boolean };

// "desde X" -> "desde " normal, "X" en negrita. Sin "desde": espacios sueltos
// normales, el resto en negrita (es un nombre de posición).
function posTokens(seg: string): Tok[] {
  const d = seg.match(/^(\s*)(desde\s+)(.*)$/i);
  if (d) return [{ text: d[1] + d[2] }, { text: d[3], bold: true }];
  const s = seg.match(/^(\s*)([\s\S]*)$/)!;
  return [{ text: s[1] }, { text: s[2], bold: true }];
}

// Trocea UNA línea en tokens con/ sin negrita, conservando cada carácter
// (espacios y separadores incluidos) para que el overlay calce con el textarea.
function lineTokens(line: string): Tok[] {
  if (line.trim() === "") return [{ text: line }];

  const pm = line.match(/^(\s*)(\+?pos|posici[oó]n)(\s+)([\s\S]*)$/i);
  if (pm) return [{ text: pm[1] + pm[2] + pm[3] }, { text: pm[4], bold: true }];

  if (/^\s*ir(?:\s+a)?\s+/i.test(line)) return [{ text: line }];

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

function Highlighted({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((ln, i) => (
        <span key={i}>
          {lineTokens(ln).map((t, j) =>
            t.bold ? (
              <strong key={j} className="font-bold text-zinc-900">
                {t.text}
              </strong>
            ) : (
              <span key={j} className={t.muted ? "text-zinc-400" : undefined}>
                {t.text}
              </span>
            ),
          )}
          {i < lines.length - 1 ? "\n" : ""}
        </span>
      ))}
    </>
  );
}

// ---- Autocompletado de posiciones dentro del textarea --------------------

const SEP_G_RE = /\s*(?:->|→|›|>)\s*/g;

// Dado el texto y la posición del cursor, ¿estamos escribiendo el nombre de una
// posición? Si sí, devuelve el rango [nameStart, nameEnd) a reemplazar y el
// fragmento ya escrito. null = no sugerir (línea `pos`/`ir`, tramo de técnica…).
function activeSlot(
  text: string,
  caret: number,
): { nameStart: number; nameEnd: number; frag: string } | null {
  const lineStart = text.lastIndexOf("\n", Math.max(0, caret - 1)) + 1;
  const nlAfter = text.indexOf("\n", caret);
  const lineEnd = nlAfter === -1 ? text.length : nlAfter;
  const line = text.slice(lineStart, lineEnd);
  const cil = caret - lineStart;

  if (/^\s*(?:\+?pos|posici[oó]n|ir)\b/i.test(line)) return null;

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
    const dm = rawSlot.slice(nameOffset).match(/^desde\s+/i);
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

export default function CommandPalette({
  mapId,
  positions,
  maps,
}: {
  mapId: string;
  positions: Position[];
  maps: MapRef[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"text" | "form">("text");
  const [flash, setFlash] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [caret, setCaret] = useState(0);
  const [sugIdx, setSugIdx] = useState(0);
  const [sugDismissed, setSugDismissed] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => taRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const posByName = useMemo(
    () => new Map(positions.map((p) => [p.name.toLowerCase(), p.id])),
    [positions],
  );

  const entries = useMemo(
    () =>
      text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((raw) => ({ raw, parsed: parseLine(raw, maps) })),
    [text, maps],
  );

  // Nombres de posición para autocompletar: las del mapa primero, luego el
  // vocabulario canónico, sin repetir (sin distinguir mayúsculas).
  const posNames = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const add = (name: string) => {
      const k = name.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push(name);
      }
    };
    for (const p of positions) add(p.name);
    for (const c of CANONICAL_POSITIONS) add(c.name);
    return out;
  }, [positions]);

  const slot = useMemo(() => activeSlot(text, caret), [text, caret]);
  const suggestions = useMemo(() => {
    if (!slot || slot.frag.length < 1) return [];
    const f = slot.frag.toLowerCase();
    if (posNames.some((n) => n.toLowerCase() === f)) return [];
    const starts = posNames.filter((n) => n.toLowerCase().startsWith(f));
    const rest = posNames.filter(
      (n) => !n.toLowerCase().startsWith(f) && n.toLowerCase().includes(f),
    );
    return [...starts, ...rest].slice(0, 6);
  }, [slot, posNames]);
  const showSug = suggestions.length > 0 && !sugDismissed;

  function applySuggestion(name: string) {
    if (!slot) return;
    const pos = slot.nameStart + name.length;
    setText(text.slice(0, slot.nameStart) + name + text.slice(slot.nameEnd));
    setSugIdx(0);
    setSugDismissed(false);
    setTimeout(() => {
      const el = taRef.current;
      if (!el) return;
      el.focus();
      el.selectionStart = el.selectionEnd = pos;
      setCaret(pos);
    }, 0);
  }

  function setPos(fd: FormData, field: "source" | "destination", name: string) {
    const id = posByName.get(name.toLowerCase());
    if (id) {
      fd.set(`${field}_position_id`, id);
    } else {
      fd.set(`${field}_position_id`, "__new__");
      fd.set(`${field}_position_new`, name);
    }
  }

  // Alta de una técnica suelta desde el formulario rápido.
  function addTechnique(source: string, name: string, dest: string | null, confidence: Confidence) {
    const fd = new FormData();
    fd.set("map_id", mapId);
    fd.set("name", name);
    fd.set("confidence", confidence);
    setPos(fd, "source", source);
    if (dest) setPos(fd, "destination", dest);
    else fd.set("destination_position_id", "");
    startTransition(async () => {
      setErrMsg(null);
      const res = await createTechnique(fd);
      if (res?.error) {
        setErrMsg(res.error);
      } else {
        setFlash(`✓ ${name}`);
        setText("");
        setMode("text");
        taRef.current?.focus();
      }
    });
  }

  // Procesa TODAS las líneas del textarea: posiciones primero (para respetar el
  // flag "mala"), luego técnicas/cadenas en orden. Para a la primera que falle.
  function runAll() {
    if (entries.length === 0) return;

    if (entries.length === 1 && entries[0].parsed.kind === "goto") {
      setOpen(false);
      router.push(`/maps/${entries[0].parsed.map.id}`);
      return;
    }
    if (entries.length === 1 && entries[0].parsed.kind === "phrase") {
      setMode("form");
      return;
    }

    const problems = entries.filter(
      (e) =>
        e.parsed.kind === "invalid" ||
        e.parsed.kind === "phrase" ||
        (entries.length > 1 && e.parsed.kind === "goto"),
    );
    if (problems.length) {
      setErrMsg(`Revisa: ${problems.map((e) => `«${e.raw}»`).join(" · ")}`);
      return;
    }

    startTransition(async () => {
      setErrMsg(null);
      let techCount = 0;
      let posCount = 0;
      const madePos = new Set<string>();

      for (const e of entries) {
        if (e.parsed.kind !== "position") continue;
        const key = e.parsed.name.toLowerCase();
        if (madePos.has(key) || posByName.has(key)) continue;
        const fd = new FormData();
        fd.set("map_id", mapId);
        fd.set("name", e.parsed.name);
        if (e.parsed.isBad) fd.set("is_bad", "on");
        const res = await createPosition(fd);
        if (res?.error && !/ya hay una posici/i.test(res.error)) {
          setErrMsg(`«${e.raw}»: ${res.error}`);
          return;
        }
        madePos.add(key);
        posCount++;
      }

      for (const e of entries) {
        if (e.parsed.kind !== "techniques") continue;
        for (const spec of e.parsed.specs) {
          const fd = new FormData();
          fd.set("map_id", mapId);
          fd.set("name", spec.name);
          fd.set("confidence", spec.confidence);
          if (spec.isSubmission) fd.set("is_submission", "on");
          setPos(fd, "source", spec.source);
          if (spec.dest && !spec.isSubmission) setPos(fd, "destination", spec.dest);
          else fd.set("destination_position_id", "");
          const res = await createTechnique(fd);
          if (res?.error) {
            setErrMsg(
              `«${spec.name}» (${spec.source} → ${spec.dest ?? "—"}): ${res.error}`,
            );
            return;
          }
          techCount++;
        }
      }

      const parts: string[] = [];
      if (techCount) parts.push(`${techCount} técnica${techCount === 1 ? "" : "s"}`);
      if (posCount) parts.push(`${posCount} posición${posCount === 1 ? "" : "es"}`);
      setFlash(`✓ ${parts.join(" · ") || "nada que crear"}`);
      setText("");
      setMode("text");
      taRef.current?.focus();
    });
  }

  if (!open) return null;

  const rows = Math.min(10, Math.max(3, text.split("\n").length));
  const hasProblem = entries.some((e) => e.parsed.kind === "invalid");

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-[12vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-black/10 bg-white p-3 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {mode === "text" ? (
          <>
            {/* overlay de resaltado: el textarea va con texto transparente
                encima, y este div pinta lo mismo con las posiciones en negrita */}
            <div className="relative">
              <div
                ref={backdropRef}
                aria-hidden
                className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words rounded-md border border-transparent px-3 py-2 font-mono text-[13px] leading-relaxed text-zinc-500"
              >
                <Highlighted text={text} />
              </div>
              <textarea
                ref={taRef}
                value={text}
                rows={rows}
                onScroll={(e) => {
                  if (backdropRef.current) {
                    backdropRef.current.scrollTop = e.currentTarget.scrollTop;
                  }
                }}
                onChange={(e) => {
                  setText(e.currentTarget.value);
                  setCaret(e.currentTarget.selectionStart ?? 0);
                  setSugIdx(0);
                  setSugDismissed(false);
                  setFlash(null);
                  setErrMsg(null);
                }}
                onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
                onKeyDown={(e) => {
                  if (showSug) {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setSugIdx((i) => (i + 1) % suggestions.length);
                      return;
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setSugIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
                      return;
                    }
                    if (e.key === "Tab") {
                      e.preventDefault();
                      applySuggestion(suggestions[sugIdx] ?? suggestions[0]);
                      return;
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      e.stopPropagation();
                      setSugDismissed(true);
                      return;
                    }
                  }
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    runAll();
                  }
                }}
                placeholder={
                  "desde media guardia > gancho, alta > x-guard > single leg, media > side control top\ndesde mount top > armbar, sub, alta\npos rubber guard mala"
                }
                className="relative block w-full resize-y rounded-md border border-black/15 bg-transparent px-3 py-2 font-mono text-[13px] leading-relaxed text-transparent caret-zinc-900 placeholder:text-zinc-400"
              />

              {showSug && (
                <ul className="absolute left-0 top-full z-10 mt-1 w-full max-w-xs overflow-hidden rounded-md border border-black/15 bg-white text-xs shadow-lg">
                  {suggestions.map((s, i) => (
                    <li key={s}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applySuggestion(s);
                        }}
                        className={`block w-full px-2 py-1 text-left ${
                          i === sugIdx ? "bg-zinc-900 text-white" : "hover:bg-black/5"
                        }`}
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                  <li className="border-t border-black/10 px-2 py-1 text-[10px] text-zinc-400">
                    ↹ Tab completa · ↑↓ mueve · Esc oculta
                  </li>
                </ul>
              )}
            </div>

            {entries.length > 0 ? (
              <ul className="mt-2 flex flex-col gap-0.5 text-xs">
                {entries.slice(0, 12).map((e, i) => {
                  const d = describe(e.parsed);
                  return (
                    <li
                      key={i}
                      className={d.bad ? "text-red-600" : "text-zinc-600"}
                    >
                      <span className="mr-1 text-zinc-400">{d.icon}</span>
                      {d.text}
                    </li>
                  );
                })}
                {entries.length > 12 && (
                  <li className="text-zinc-400">+{entries.length - 12} más…</li>
                )}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">
                Una línea por técnica, posición o cadena. Enter crea todo · Shift+Enter salto de línea · Esc cierra.
              </p>
            )}

            {errMsg && <p className="mt-1 text-xs text-red-600">{errMsg}</p>}
            {flash && <p className="mt-1 text-xs text-green-700">{flash}</p>}

            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[11px] leading-relaxed text-zinc-400">
                técnica: <code>desde X &gt; nombre &gt; Y</code> · confianza/sumisión por
                técnica: <code>&gt; nombre, alta</code> / <code>&gt; nombre, sub</code> ·
                cadena: <code>A &gt; t1 &gt; B &gt; t2 &gt; C</code> · posición:{" "}
                <code>pos nombre [mala]</code> · mapa: <code>ir nombre</code>
              </p>
              <button
                type="button"
                onClick={runAll}
                disabled={pending || entries.length === 0 || hasProblem}
                className="shrink-0 rounded-md bg-zinc-900 px-3 py-1 text-xs text-white disabled:opacity-50"
              >
                {pending ? "Creando…" : "Crear"}
              </button>
            </div>
          </>
        ) : (
          <QuickForm
            positions={positions}
            initialName={text.trim()}
            initialSource=""
            initialDest=""
            initialConfidence="media"
            pending={pending}
            error={errMsg}
            onCancel={() => {
              setErrMsg(null);
              setMode("text");
            }}
            onSubmit={(name, source, dest, confidence) =>
              addTechnique(source, name, dest || null, confidence)
            }
          />
        )}
      </div>
    </div>
  );
}

function QuickForm({
  positions,
  initialName,
  initialSource,
  initialDest,
  initialConfidence,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  positions: Position[];
  initialName: string;
  initialSource: string;
  initialDest: string;
  initialConfidence: Confidence;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (name: string, source: string, dest: string, confidence: Confidence) => void;
}) {
  const [name, setName] = useState(initialName);
  const [source, setSource] = useState(initialSource);
  const [dest, setDest] = useState(initialDest);
  const [confidence, setConfidence] = useState<Confidence>(initialConfidence);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim() && source.trim()) {
          onSubmit(name.trim(), source.trim(), dest.trim(), confidence);
        }
      }}
    >
      <datalist id="cp-pos">
        {positions.map((p) => (
          <option key={p.id} value={p.name} />
        ))}
        {CANONICAL_POSITIONS.filter(
          (c) => !positions.some((p) => p.name.toLowerCase() === c.name.toLowerCase()),
        ).map((c) => (
          <option key={c.name} value={c.name} />
        ))}
      </datalist>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        placeholder="Nombre de la técnica"
        className={cls}
      />
      <input
        list="cp-pos"
        value={source}
        onChange={(e) => setSource(e.currentTarget.value)}
        placeholder="Desde…"
        className={cls}
      />
      <input
        list="cp-pos"
        value={dest}
        onChange={(e) => setDest(e.currentTarget.value)}
        placeholder="Lleva a… (opcional)"
        className={cls}
      />
      <select
        value={confidence}
        onChange={(e) => setConfidence(e.currentTarget.value as Confidence)}
        className={cls}
      >
        <option value="alta">Alta</option>
        <option value="media">Media</option>
        <option value="baja">Baja</option>
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-3 py-1 text-sm text-white disabled:opacity-60"
        >
          Añadir
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-black/15 px-3 py-1 text-sm"
        >
          Volver
        </button>
      </div>
    </form>
  );
}
