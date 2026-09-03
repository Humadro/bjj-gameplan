"use client";

import { useMemo, useRef, useState } from "react";
import {
  bulkDeleteTechniques,
  bulkSetConfidence,
  createTechnique,
  deleteTechnique,
  restoreRows,
  updateTechnique,
} from "./actions";
import { useAction } from "./useAction";
import { useToast } from "./Toast";
import { CANONICAL_POS_LIST_ID } from "./CanonicalPositionsDatalist";
import ReferenceFieldset from "./ReferenceFieldset";
import NoteField from "./NoteField";
import { CANONICAL_POSITIONS } from "@/lib/seed";
import {
  CONFIDENCE_COLOR,
  CONFIDENCE_LABEL,
  type Confidence,
  type Position,
  type Technique,
} from "@/lib/types";

const inputCls =
  "rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15 dark:bg-zinc-800";

const NEW = "__new__";

const NEW_FIELD: Record<PositionSelectName, string> = {
  source_position_id: "source_position_new",
  destination_position_id: "destination_position_new",
  fail_position_id: "fail_position_new",
};

type PositionSelectName =
  | "source_position_id"
  | "destination_position_id"
  | "fail_position_id";

function PositionSelect({
  label,
  name,
  positions,
  defaultValue,
  required,
  emptyLabel,
}: {
  label: string;
  name: PositionSelectName;
  positions: Position[];
  defaultValue: string;
  required?: boolean;
  emptyLabel: string;
}) {
  const [isNew, setIsNew] = useState(false);
  const newName = NEW_FIELD[name];

  // Canónicas que aún no están en el mapa: se pueden elegir aquí y se crean al
  // guardar (con su flag bottom si lo llevan). Value "__name__:<nombre>".
  const canonExtra = CANONICAL_POSITIONS.filter(
    (c) => !positions.some((p) => p.name.toLowerCase() === c.name.toLowerCase()),
  );

  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-500">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        required={required}
        className={inputCls}
        onChange={(e) => setIsNew(e.currentTarget.value === NEW)}
      >
        <option value="">{emptyLabel}</option>
        {positions.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
        {canonExtra.length > 0 && (
          <optgroup label="Estándar (No-Gi) · se crea al guardar">
            {canonExtra.map((c) => (
              <option key={c.name} value={`__name__:${c.name}`}>
                {c.name}
                {c.isBad ? " (bottom)" : ""}
              </option>
            ))}
          </optgroup>
        )}
        <option value={NEW}>➕ Crear posición nueva…</option>
      </select>
      {isNew && (
        <input
          name={newName}
          autoFocus
          required
          list={CANONICAL_POS_LIST_ID}
          placeholder="Nombre de la posición nueva"
          className={inputCls}
        />
      )}
    </label>
  );
}

export function TechniqueFields({
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

      <PositionSelect
        label="Desde"
        name="source_position_id"
        positions={positions}
        defaultValue={technique?.source_position_id ?? ""}
        required
        emptyLabel="Elige posición de origen"
      />

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
        <PositionSelect
          label="Lleva a"
          name="destination_position_id"
          positions={positions}
          defaultValue={technique?.destination_position_id ?? ""}
          emptyLabel="(ninguna / callejón sin salida)"
        />
      )}

      <PositionSelect
        label="Si fallas, acabas en… (opcional)"
        name="fail_position_id"
        positions={positions}
        defaultValue={technique?.fail_position_id ?? ""}
        emptyLabel="(sigues en la misma posición)"
      />
      <p className="-mt-1 text-[11px] leading-snug text-zinc-400">
        Plan B: si esta técnica no sale, ¿a qué posición sueles ir a parar?
      </p>

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

      <ReferenceFieldset reference={technique} />
      <NoteField note={technique?.note} />
    </>
  );
}

export default function TechniquePanel({
  mapId,
  positions,
  techniques,
  matchTechIds = null,
}: {
  mapId: string;
  positions: Position[];
  techniques: Technique[];
  matchTechIds?: Set<string> | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const { pending, error, run } = useAction();
  const toast = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const posName = useMemo(
    () => new Map(positions.map((p) => [p.id, p.name])),
    [positions],
  );
  const shown = matchTechIds
    ? techniques.filter((t) => matchTechIds.has(t.id))
    : techniques;

  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function endSelect() {
    setSelecting(false);
    setPicked(new Set());
  }

  function removeTechnique(t: Technique) {
    const fd = new FormData();
    fd.set("id", t.id);
    fd.set("map_id", mapId);
    run(deleteTechnique, fd, () => {
      toast({
        message: `Borrada «${t.name}»`,
        action: {
          label: "Deshacer",
          onClick: () => run(() => restoreRows(mapId, { techniques: [t] }), new FormData()),
        },
      });
    });
  }

  function bulkConf(confidence: Confidence) {
    const ids = [...picked];
    run(() => bulkSetConfidence(mapId, ids, confidence), new FormData(), () => {
      toast(`${ids.length} técnica(s) a confianza ${confidence}`);
      endSelect();
    });
  }

  function bulkRemove() {
    const ids = [...picked];
    const rows = techniques.filter((t) => picked.has(t.id));
    run(() => bulkDeleteTechniques(mapId, ids), new FormData(), () => {
      endSelect();
      toast({
        message: `Borradas ${ids.length} técnica(s)`,
        action: {
          label: "Deshacer",
          onClick: () => run(() => restoreRows(mapId, { techniques: rows }), new FormData()),
        },
      });
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Técnicas
      </h2>

      <form
        ref={formRef}
        className="flex flex-col gap-2 rounded-lg border border-black/10 p-3 dark:border-white/10"
        onSubmit={(e) => {
          e.preventDefault();
          run(createTechnique, new FormData(e.currentTarget), () => formRef.current?.reset());
        }}
      >
        <input type="hidden" name="map_id" value={mapId} />
        <TechniqueFields positions={positions} />
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-md bg-zinc-900 px-3 py-1 text-sm text-white disabled:opacity-60 dark:bg-white dark:text-zinc-900"
        >
          Añadir técnica
        </button>
      </form>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {techniques.length > 1 && (
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {!selecting ? (
            <button
              type="button"
              onClick={() => setSelecting(true)}
              className="rounded border border-black/15 px-2 py-0.5 hover:bg-black/5"
            >
              Seleccionar…
            </button>
          ) : (
            <>
              <span className="text-zinc-500">{picked.size} elegidas ·</span>
              {(["alta", "media", "baja"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={pending || picked.size === 0}
                  onClick={() => bulkConf(c)}
                  className="rounded border border-black/15 px-1.5 py-0.5 hover:bg-black/5 disabled:opacity-50"
                  style={{ color: CONFIDENCE_COLOR[c] }}
                >
                  {CONFIDENCE_LABEL[c]}
                </button>
              ))}
              <button
                type="button"
                disabled={pending || picked.size === 0}
                onClick={bulkRemove}
                className="rounded border border-red-300 px-1.5 py-0.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Borrar
              </button>
              <button
                type="button"
                onClick={endSelect}
                className="rounded border border-black/15 px-1.5 py-0.5 hover:bg-black/5"
              >
                Salir
              </button>
            </>
          )}
        </div>
      )}

      <ul className="flex flex-col gap-1">
        {shown.map((t) =>
          editingId === t.id ? (
            <li key={t.id} className="rounded-md border border-black/10 p-2 dark:border-white/10">
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  fd.set("id", t.id);
                  fd.set("map_id", mapId);
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
              {selecting && (
                <input
                  type="checkbox"
                  checked={picked.has(t.id)}
                  onChange={() => togglePick(t.id)}
                  className="shrink-0"
                />
              )}
              <span className="min-w-0 flex-1">
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
              {!selecting && (
                <span className="flex shrink-0 gap-2 text-xs">
                  <button onClick={() => setEditingId(t.id)} className="text-zinc-500 hover:underline">
                    editar
                  </button>
                  <button
                    onClick={() => removeTechnique(t)}
                    className="text-red-600 hover:underline"
                  >
                    borrar
                  </button>
                </span>
              )}
            </li>
          ),
        )}
        {techniques.length === 0 && (
          <li className="text-xs text-zinc-500">Todavía no hay técnicas.</li>
        )}
        {techniques.length > 0 && shown.length === 0 && (
          <li className="text-xs text-zinc-500">Ninguna técnica encaja con el filtro.</li>
        )}
      </ul>
    </section>
  );
}
