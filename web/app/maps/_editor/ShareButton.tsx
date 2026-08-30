"use client";

import { useState, useTransition } from "react";
import { setMapSharing } from "../actions";

export default function ShareButton({
  mapId,
  shareSlug,
}: {
  mapId: string;
  shareSlug: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const url = shareSlug ? `${origin}/s/${shareSlug}` : "";

  function toggle(enabled: boolean) {
    const fd = new FormData();
    fd.set("id", mapId);
    fd.set("enabled", enabled ? "1" : "0");
    startTransition(async () => {
      await setMapSharing(fd);
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* el usuario puede copiar a mano */
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-black/15 bg-white px-2 py-1 text-xs shadow-sm hover:bg-black/5"
      >
        {shareSlug ? "Compartido ✓" : "Compartir"}
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1 w-72 rounded-lg border border-black/15 bg-white p-3 text-xs shadow-lg">
          <p className="font-semibold">Enlace de solo lectura</p>
          {shareSlug ? (
            <>
              <p className="mt-1 text-zinc-500">
                Cualquiera con el enlace ve este mapa (no puede editarlo).
              </p>
              <div className="mt-2 flex gap-1">
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded border border-black/15 px-2 py-1"
                />
                <button
                  onClick={copy}
                  className="rounded bg-zinc-900 px-2 py-1 text-white"
                >
                  {copied ? "✓" : "Copiar"}
                </button>
              </div>
              <div className="mt-2 flex gap-3">
                <button
                  disabled={pending}
                  onClick={() => toggle(false)}
                  className="text-red-600 hover:underline disabled:opacity-60"
                >
                  Desactivar enlace
                </button>
                <button
                  disabled={pending}
                  onClick={() => {
                    toggle(false);
                    setTimeout(() => toggle(true), 300);
                  }}
                  className="text-zinc-500 hover:underline disabled:opacity-60"
                >
                  Regenerar
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-zinc-500">
                Genera un enlace para que otros vean este mapa sin cuenta.
              </p>
              <button
                disabled={pending}
                onClick={() => toggle(true)}
                className="mt-2 rounded bg-zinc-900 px-3 py-1 text-white disabled:opacity-60"
              >
                {pending ? "…" : "Crear enlace"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
