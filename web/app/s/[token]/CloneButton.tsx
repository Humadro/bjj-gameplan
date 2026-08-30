"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cloneSharedMap } from "@/app/maps/actions";

export default function CloneButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  return (
    <span className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await cloneSharedMap(token);
            if (res?.needsAuth) {
              router.push(`/login?next=${encodeURIComponent(pathname)}`);
              return;
            }
            if (res?.error) setError(res.error);
            // en caso de éxito la acción hace redirect() al nuevo mapa
          })
        }
        className="rounded-md border border-black/15 bg-white px-2 py-1 text-xs shadow-sm hover:bg-black/5 disabled:opacity-60"
      >
        {pending ? "Copiando…" : "Copiar a mi cuenta"}
      </button>
    </span>
  );
}
