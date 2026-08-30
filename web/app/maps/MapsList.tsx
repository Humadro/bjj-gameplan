"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { createMap, deleteMap, renameMap } from "./actions";

export type MapRow = {
  id: string;
  name: string;
  positions: number;
  techniques: number;
};

const inputCls = "rounded-md border border-black/15 px-3 py-2 text-sm";

export default function MapsList({ maps }: { maps: MapRow[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const createRef = useRef<HTMLFormElement>(null);

  function run(action: (fd: FormData) => Promise<{ error?: string }>, fd: FormData, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await action(fd);
      if (res?.error) setError(res.error);
      else after?.();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        ref={createRef}
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(createMap, new FormData(e.currentTarget), () => createRef.current?.reset());
        }}
      >
        <input
          name="name"
          placeholder="Nombre del mapa nuevo (p. ej. No-gi, Competición…)"
          required
          className={`${inputCls} flex-1`}
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Crear mapa
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {maps.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Aún no tienes ningún mapa. Crea el primero arriba.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {maps.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-black/10 p-3"
            >
              {editingId === m.id ? (
                <form
                  className="flex flex-1 gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    fd.set("id", m.id);
                    run(renameMap, fd, () => setEditingId(null));
                  }}
                >
                  <input name="name" defaultValue={m.name} required className={`${inputCls} flex-1`} />
                  <button className="rounded-md bg-zinc-900 px-3 py-1 text-xs text-white">
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-md border border-black/15 px-3 py-1 text-xs"
                  >
                    Cancelar
                  </button>
                </form>
              ) : (
                <>
                  <Link href={`/maps/${m.id}`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{m.name}</span>
                    <span className="text-xs text-zinc-500">
                      {m.positions} posiciones · {m.techniques} técnicas
                    </span>
                  </Link>
                  <span className="flex shrink-0 gap-2 text-xs">
                    <button
                      onClick={() => setEditingId(m.id)}
                      className="text-zinc-500 hover:underline"
                    >
                      renombrar
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm(`¿Borrar el mapa "${m.name}" y todo su contenido?`)) return;
                        const fd = new FormData();
                        fd.set("id", m.id);
                        run(deleteMap, fd);
                      }}
                      className="text-red-600 hover:underline"
                    >
                      borrar
                    </button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
