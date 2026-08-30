"use client";

import { useMemo, useRef, useState } from "react";
import { createTechnique, deleteTechnique, updateTechnique } from "./actions";
import { useAction } from "./useAction";
import { CONFIDENCE_COLOR, CONFIDENCE_LABEL, type Position, type Technique } from "@/lib/types";

const inputCls =
  "rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15 dark:bg-zinc-800";

function TechniqueFields({
  positions,
  technique,
}: {
  positions: Position[];
  technique?: Technique;
}) {
  const [isSubmission, setIsSubmission] = useState(technique?.is_submission ?? false);

  return (
    <>
      <input
        name="name"
        placeholder="Nombre de la técnica"
        defaultValue={technique?.name}
        required
        className={inputCls}
      />
      <label className="flex flex-col gap-1 text-xs text-zinc-500">
        Desde
        <select
          name="source_position_id"
          defaultValue={technique?.source_position_id ?? ""}
          required
          className={inputCls}
        >
          <option value="" disabled>
            Elige posición de origen
          </option>
          {positions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-xs text-zinc-500">
        <input
          type="checkbox"
          name="is_submission"
          defaultChecked={technique?.is_submission ?? false}
          onChange={(e) => setIsSubmission(e.currentTarget.checked)}
        />
        Es una sumisión (caja, no lleva a otra posición)
      </label>

      {!isSubmission && (
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Lleva a
          <select
            name="destination_position_id"
            defaultValue={technique?.destination_position_id ?? ""}
            className={inputCls}
          >
            <option value="">(ninguna / callejón sin salida)</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1 text-xs text-zinc-500">
        Confianza
        <select
          name="confidence"
          defaultValue={technique?.confidence ?? "media"}
          className={inputCls}
        >
          {(["alta", "media", "baja"] as const).map((c) => (
            <option key={c} value={c}>
              {CONFIDENCE_LABEL[c]}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

export default function TechniquePanel({
  positions,
  techniques,
}: {
  positions: Position[];
  techniques: Technique[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const { pending, error, run } = useAction();
  const [editingId, setEditingId] = useState<string | null>(null);
  const posName = useMemo(
    () => new Map(positions.map((p) => [p.id, p.name])),
    [positions],
  );

  const canAdd = positions.length > 0;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Técnicas
      </h2>

      {canAdd ? (
        <form
          ref={formRef}
          className="flex flex-col gap-2 rounded-lg border border-black/10 p-3 dark:border-white/10"
          onSubmit={(e) => {
            e.preventDefault();
            run(createTechnique, new FormData(e.currentTarget), () =>
              formRef.current?.reset(),
            );
          }}
        >
          <TechniqueFields positions={positions} />
          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-md bg-zinc-900 px-3 py-1 text-sm text-white disabled:opacity-60 dark:bg-white dark:text-zinc-900"
          >
            Añadir técnica
          </button>
        </form>
      ) : (
        <p className="text-xs text-zinc-500">Crea al menos una posición primero.</p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <ul className="flex flex-col gap-1">
        {techniques.map((t) =>
          editingId === t.id ? (
            <li key={t.id} className="rounded-md border border-black/10 p-2 dark:border-white/10">
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  fd.set("id", t.id);
                  run(updateTechnique, fd, () => setEditingId(null));
                }}
              >
                <TechniqueFields positions={positions} technique={t} />
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
              key={t.id}
              className="flex items-center justify-between gap-2 rounded-md border border-black/10 px-2 py-1 text-sm dark:border-white/10"
            >
              <span className="min-w-0">
                <span style={{ color: CONFIDENCE_COLOR[t.confidence] }}>{t.name}</span>
                <span className="block truncate text-xs text-zinc-500">
                  {posName.get(t.source_position_id) ?? "?"}
                  {" → "}
                  {t.is_submission
                    ? "sumisión"
                    : t.destination_position_id
                      ? (posName.get(t.destination_position_id) ?? "?")
                      : "—"}
                </span>
              </span>
              <span className="flex shrink-0 gap-2 text-xs">
                <button onClick={() => setEditingId(t.id)} className="text-zinc-500 hover:underline">
                  editar
                </button>
                <button
                  onClick={() => {
                    if (!confirm(`¿Borrar la técnica "${t.name}"?`)) return;
                    const fd = new FormData();
                    fd.set("id", t.id);
                    run(deleteTechnique, fd);
                  }}
                  className="text-red-600 hover:underline"
                >
                  borrar
                </button>
              </span>
            </li>
          ),
        )}
        {techniques.length === 0 && canAdd && (
          <li className="text-xs text-zinc-500">Todavía no hay técnicas.</li>
        )}
      </ul>
    </section>
  );
}
