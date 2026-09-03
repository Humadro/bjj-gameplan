"use client";

// Apunte personal (privado) sobre una posición o técnica. Colapsable, igual que
// ReferenceFieldset. El `name="note"` lo lee noteValue() en actions.ts; si el
// form no incluye este campo, la columna no se toca.
export default function NoteField({ note }: { note?: string | null }) {
  const has = Boolean(note && note.trim());
  return (
    <details
      open={has}
      className="rounded-md border border-black/10 px-2 py-1 dark:border-white/10"
    >
      <summary className="cursor-pointer text-xs text-zinc-500">Nota personal (opcional)</summary>
      <textarea
        name="note"
        rows={3}
        defaultValue={note ?? ""}
        placeholder="Solo para ti: detalles, recordatorios, con quién falló…"
        className="mt-2 w-full rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15 dark:bg-zinc-800"
      />
    </details>
  );
}
