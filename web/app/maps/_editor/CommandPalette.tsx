"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPosition, createTechnique } from "./actions";
import { CANONICAL_POSITIONS } from "@/lib/seed";
import type { Confidence, Position } from "@/lib/types";

type MapRef = { id: string; name: string };

type Parsed =
  | { kind: "empty" }
  | { kind: "technique"; source: string; name: string; dest: string | null; confidence: Confidence }
  | { kind: "position"; name: string; isBad: boolean }
  | { kind: "goto"; map: MapRef }
  | { kind: "unknown" };

const CONF_RE = /,\s*(alta|media|baja)\s*$/i;
const SEP_RE = /\s*(?:->|→|>)\s*/;
const cls = "rounded-md border border-black/15 px-2 py-1 text-sm";

// Parseo de texto libre de la paleta. Si no encaja en nada, "unknown" -> el
// Enter abre el formulario rápido con lo que se haya entendido.
function parseCommand(raw: string, maps: MapRef[]): Parsed {
  const text = raw.trim();
  if (!text) return { kind: "empty" };

  const goto = text.match(/^ir(?:\s+a)?\s+(.+)$/i);
  if (goto) {
    const q = goto[1].trim().toLowerCase();
    const m = maps.find((x) => x.name.toLowerCase().includes(q));
    return m ? { kind: "goto", map: m } : { kind: "unknown" };
  }

  const pos = text.match(/^(?:\+?pos|posici[oó]n)\s+(.+)$/i);
  if (pos) {
    let name = pos[1].trim();
    let isBad = false;
    if (/\bmala\b/i.test(name) || name.endsWith("!")) {
      isBad = true;
      name = name.replace(/\bmala\b/i, "").replace(/!+$/, "").trim();
    }
    return name ? { kind: "position", name, isBad } : { kind: "unknown" };
  }

  if (SEP_RE.test(text)) {
    let body = text;
    let confidence: Confidence = "media";
    const cm = body.match(CONF_RE);
    if (cm) {
      confidence = cm[1].toLowerCase() as Confidence;
      body = body.replace(CONF_RE, "");
    }
    const segs = body.split(SEP_RE).map((s) => s.trim()).filter(Boolean);
    const source = segs[0]?.replace(/^desde\s+/i, "").trim();
    if (source && segs[1]) {
      return { kind: "technique", source, name: segs[1], dest: segs[2] ?? null, confidence };
    }
  }

  return { kind: "unknown" };
}

function hint(p: Parsed, hasText: boolean): string {
  switch (p.kind) {
    case "empty":
      return "Escribe una técnica, una posición o «ir <mapa>». Esc para cerrar.";
    case "technique":
      return `Técnica «${p.name}»: ${p.source} → ${p.dest ?? "(sin destino)"} · ${p.confidence}`;
    case "position":
      return `Posición «${p.name}»${p.isBad ? " (mala)" : ""}`;
    case "goto":
      return `Ir al mapa «${p.map.name}»`;
    default:
      return hasText ? "Enter abre el formulario con lo escrito" : "";
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
  const inputRef = useRef<HTMLInputElement>(null);

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
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const parsed = useMemo(() => parseCommand(text, maps), [text, maps]);
  const posByName = useMemo(
    () => new Map(positions.map((p) => [p.name.toLowerCase(), p.id])),
    [positions],
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

  function addTechnique(
    source: string,
    name: string,
    dest: string | null,
    confidence: Confidence,
  ) {
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
        inputRef.current?.focus();
      }
    });
  }

  function addPosition(name: string, isBad: boolean) {
    const fd = new FormData();
    fd.set("map_id", mapId);
    fd.set("name", name);
    if (isBad) fd.set("is_bad", "on");
    startTransition(async () => {
      setErrMsg(null);
      const res = await createPosition(fd);
      if (res?.error) {
        setErrMsg(res.error);
      } else {
        setFlash(`✓ ${name}`);
        setText("");
        inputRef.current?.focus();
      }
    });
  }

  function onEnter() {
    if (parsed.kind === "technique") {
      addTechnique(parsed.source, parsed.name, parsed.dest, parsed.confidence);
    } else if (parsed.kind === "position") {
      addPosition(parsed.name, parsed.isBad);
    } else if (parsed.kind === "goto") {
      setOpen(false);
      router.push(`/maps/${parsed.map.id}`);
    } else if (text.trim()) {
      setMode("form");
    }
  }

  if (!open) return null;

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
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => {
                setText(e.currentTarget.value);
                setFlash(null);
                setErrMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onEnter();
                }
              }}
              placeholder="desde media guardia > gancho > x-guard, alta"
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm"
            />
            <p className="mt-2 text-xs text-zinc-500">{hint(parsed, Boolean(text.trim()))}</p>
            {errMsg && <p className="mt-1 text-xs text-red-600">{errMsg}</p>}
            {flash && <p className="mt-1 text-xs text-green-700">{flash}</p>}
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
              técnica: <code>desde X &gt; nombre &gt; Y, alta</code> · posición:{" "}
              <code>pos nombre</code> / <code>pos nombre mala</code> · otro mapa:{" "}
              <code>ir nombre</code>
            </p>
          </>
        ) : (
          <QuickForm
            positions={positions}
            initialName={parsed.kind === "technique" ? parsed.name : text.trim()}
            initialSource={parsed.kind === "technique" ? parsed.source : ""}
            initialDest={parsed.kind === "technique" ? (parsed.dest ?? "") : ""}
            initialConfidence={parsed.kind === "technique" ? parsed.confidence : "media"}
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
