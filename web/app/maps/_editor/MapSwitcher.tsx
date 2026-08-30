"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MapSwitcher({
  mapId,
  maps,
}: {
  mapId: string;
  maps: { id: string; name: string }[];
}) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-1">
      <select
        value={mapId}
        onChange={(e) => router.push(`/maps/${e.currentTarget.value}`)}
        className="max-w-[10rem] rounded-md border border-black/15 px-2 py-1 text-sm"
      >
        {maps.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <Link
        href="/maps"
        className="rounded-md border border-black/15 px-2 py-1 text-xs text-zinc-600 hover:bg-black/5"
        title="Todos los mapas"
      >
        ⋯
      </Link>
    </div>
  );
}
