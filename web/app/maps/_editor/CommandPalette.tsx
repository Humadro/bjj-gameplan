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
};

type ParsedLine =
  | { kind: "empty" }
  | { kind: "position"; name: string; isBad: boolean }
  | { kind: "techniques"; specs: TechSpec[] }
  | { kind: "goto"; map: MapRef }
  | { kind: "phrase"; text: string } // texto suelto: en 1 línea abre el formulario
  | { kind: "invalid"; reason: string };

const CONF_RE = /,\s*(alta|media|baja)\s*$/i;
const SEP_RE = /\s*(?:->|→|›|>)\s*/;
const cls = "rounded-md border border-black/15 px-2 py-1 text-sm";

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
    let body = text;
    let confidence: Confidence = "media";
    const cm = body.match(CONF_RE);
    if (cm) {
      confidence = cm[1].toLowerCase() as Confidence;
      body = body.replace(CONF_RE, "");
    }
    const segs = body.split(SEP_RE).map((s) => s.trim());
    if (segs.length) segs[0] = segs[0].replace(/^desde\s+/i, "").trim();

    if (segs.some((s) => !s)) {
      return { kind: "invalid", reason: "Hay un tramo vacío en la cadena" };
    }

    // 2 partes: A › técnica            (técnica sin destino)
    // 3 partes: A › técnica › B        (una técnica)
    // impar ≥ 5: A › t1 › B › t2 › C…  (cadena: N técnicas encadenadas)
    if (segs.length === 2) {
      return {
        kind: "techniques",
        specs: [{ source: segs[0], name: segs[1], dest: null, confidence }],
      };
    }
    if (segs.length === 3) {
      return {
        kind: "techniques",
        specs: [{ source: segs[0], name: segs[1], dest: segs[2], confidence }],
      };
    }
    if (segs.length >= 5 && segs.length % 2 === 1) {
      const specs: TechSpec[] = [];
      for (let i = 0; i + 2 < segs.length; i += 2) {
        specs.push({ source: segs[i], name: segs[i + 1], dest: segs[i + 2], confidence });
      }
      return { kind: "techniques", specs };
    }
    return {
      kind: "invalid",
      reason: "Una cadena alterna posición › técnica › posición… (nº impar de partes: 3, 5, 7…)",
    };
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
      if (s.length === 1) {
        return {
          icon: "•",
          text: `${s[0].source} → ${s[0].name} → ${s[0].dest ?? "(sin destino)"} · ${s[0].confidence}`,
        };
      }
      const chain = [s[0].source, ...s.flatMap((x) => [x.name, x.dest ?? "—"])].join(" → ");
      return { icon: "⛓", text: `cadena (${s.length}): ${chain} · ${s[0].confidence}` };
    }
    default:
      return { icon: "", text: "" };
  }
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
  const taRef = useRef<HTMLTextAreaElement>(null);

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
          setPos(fd, "source", spec.source);
          if (spec.dest) setPos(fd, "destination", spec.dest);
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
            <textarea
              ref={taRef}
              value={text}
              rows={rows}
              onChange={(e) => {
                setText(e.currentTarget.value);
                setFlash(null);
                setErrMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  runAll();
                }
              }}
              placeholder={
                "desde media guardia > gancho > x-guard > single leg > side control top, alta\npos rubber guard mala"
              }
              className="w-full resize-y rounded-md border border-black/15 px-3 py-2 font-mono text-[13px] leading-relaxed"
            />

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
                técnica: <code>desde X &gt; nombre &gt; Y, alta</code> · cadena:{" "}
                <code>A &gt; t1 &gt; B &gt; t2 &gt; C</code> · posición:{" "}
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
