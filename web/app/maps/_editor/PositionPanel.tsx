"use client";

import { useRef, useState } from "react";
import {
  addStandardPositions,
  createPosition,
  deletePosition,
  updatePosition,
} from "./actions";
import { useAction } from "./useAction";
import { CANONICAL_POS_LIST_ID } from "./CanonicalPositionsDatalist";
import ReferenceFieldset from "./ReferenceFieldset";
import type { Position } from "@/lib/types";

const inputCls =
  "rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15 dark:bg-zinc-800";

export default function PositionPanel({
  mapId,
  positions,
}: {
  mapId: string;
  positions: Position[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const { pending, error, run } = useAction();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stdDone, setStdDone] = useState(false);

  function addStandard() {
    const fd = new FormData();
    fd.set("map_id", mapId);
    setStdDone(false);
    run(addStandardPositions, fd, () => {
      setStdDone(true);
      window.setTimeout(() => setStdDone(false), 2500);
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Posiciones
      </h2>

      <form
        ref={formRef}
        className="flex flex-col gap-2 rounded-lg border border-black/10 p-3 dark:border-white/10"
        onSubmit={(e) => {
          e.preventDefault();
          run(createPosition, new FormData(e.currentTarget), () => formRef.current?.reset());
        }}
      >
        <input type="hidden" name="map_id" value={mapId} />
        <input
          name="name"
          placeholder="Nueva posición"
          required
          list={CANONICAL_POS_LIST_ID}
          className={inputCls}
        />
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          <input type="checkbox" name="is_bad" />
          Posición mala / bottom (flechas en rojo)
        </label>
        <ReferenceFieldset />
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-md bg-zinc-900 px-3 py-1 text-sm text-white disabled:opacity-60 dark:bg-white dark:text-zinc-900"
        >
          Añadir posición
        </button>
      </form>

      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={addStandard}
          disabled={pending}
          className="self-start rounded-md border border-black/15 px-2 py-1 text-xs hover:bg-black/5 disabled:opacity-60 dark:border-white/20"
        >
          + Añadir posiciones estándar (No-Gi)
        </button>
        <p className="text-[11px] leading-snug text-zinc-400">
          Carga el vocabulario canónico. Las que ya tengas se omiten y ninguna
          aparece en el mapa hasta que le cuelgues una técnica.
        </p>
        {stdDone && <p className="text-[11px] text-green-700">Vocabulario cargado.</p>}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <ul className="flex flex-col gap-1">
        {positions.map((p) =>
          editingId === p.id ? (
            <li key={p.id} className="rounded-md border border-black/10 p-2 dark:border-white/10">
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  fd.set("id", p.id);
                  fd.set("map_id", mapId);
                  run(updatePosition, fd, () => setEditingId(null));
                }}
              >
                <input
                  name="name"
                  defaultValue={p.name}
                  required
                  list={CANONICAL_POS_LIST_ID}
                  className={inputCls}
                />
                <label className="flex items-center gap-2 text-xs text-zinc-500">
                  <input type="checkbox" name="is_bad" defaultChecked={p.is_bad} />
                  Posición mala / bottom
                </label>
                <ReferenceFieldset reference={p} />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-md bg-zinc-900 px-2 py-1 text-xs text-white dark:bg-white dark:text-zinc-900"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-md border border-black/15 px-2 py-1 text-xs dark:border-white/20"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </li>
          ) : (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-md border border-black/10 px-2 py-1 text-sm dark:border-white/10"
            >
              <span className={p.is_bad ? "text-red-600" : undefined}>{p.name}</span>
              <span className="flex gap-2 text-xs">
                <button onClick={() => setEditingId(p.id)} className="text-zinc-500 hover:underline">
                  editar
                </button>
                <button
                  onClick={() => {
                    if (!confirm(`¿Borrar "${p.name}" y sus técnicas de salida?`)) return;
                    const fd = new FormData();
                    fd.set("id", p.id);
                    fd.set("map_id", mapId);
                    run(deletePosition, fd);
                  }}
                  className="text-red-600 hover:underline"
                >
                  borrar
                </button>
              </span>
            </li>
          ),
        )}
        {positions.length === 0 && (
          <li className="text-xs text-zinc-500">Todavía no hay posiciones.</li>
        )}
      </ul>
    </section>
  );
}
