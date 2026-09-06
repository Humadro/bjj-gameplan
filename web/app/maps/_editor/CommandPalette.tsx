"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPosition, createTechnique } from "./actions";
import { CanonicalHint } from "./CanonicalNameInput";
import { CANONICAL_POSITIONS } from "@/lib/seed";
import {
  activeSlot,
  describe,
  lineTokens,
  parseLine,
  type MapRef,
} from "@/lib/graph/palette";
import type { Confidence, Position } from "@/lib/types";

const cls = "rounded-md border border-black/15 px-2 py-1 text-sm";

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
      <CanonicalHint value={source} onUse={setSource} />
      <input
        list="cp-pos"
        value={dest}
        onChange={(e) => setDest(e.currentTarget.value)}
        placeholder="Lleva a… (opcional)"
        className={cls}
      />
      <CanonicalHint value={dest} onUse={setDest} />
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
