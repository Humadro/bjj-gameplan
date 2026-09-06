"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "../../LocaleSwitcher";
import { getRef } from "@/lib/graph/refs";
import type { Position, Technique } from "@/lib/types";
import CanonicalPositionsDatalist from "./CanonicalPositionsDatalist";
import CommandPalette from "./CommandPalette";
import GraphCanvas from "./GraphCanvas";
import MapAnalysis from "./MapAnalysis";
import MapFilterBar, { type MapFilter, emptyFilter, filterActive } from "./MapFilterBar";
import MapSwitcher from "./MapSwitcher";
import OnboardingChecklist from "./OnboardingChecklist";
import PositionPanel from "./PositionPanel";
import SeedPanel from "./SeedPanel";
import ShareButton from "./ShareButton";
import TechniquePanel from "./TechniquePanel";

export default function EditorBody({
  email,
  mapId,
  mapName,
  shareSlug,
  maps,
  positions,
  techniques,
}: {
  email: string | undefined;
  mapId: string;
  mapName: string;
  shareSlug: string | null;
  maps: { id: string; name: string }[];
  positions: Position[];
  techniques: Technique[];
}) {
  const t = useTranslations("Common");
  const hasRoutedTechnique = techniques.some(
    (x) => x.is_submission || x.destination_position_id !== null,
  );

  const [filter, setFilter] = useState<MapFilter>(emptyFilter);
  const active = filterActive(filter);

  const match = useMemo(() => {
    const q = filter.q.trim().toLowerCase();
    const techIds = new Set<string>();
    for (const tech of techniques) {
      if (q && !tech.name.toLowerCase().includes(q)) continue;
      if (filter.conf.size > 0 && !filter.conf.has(tech.confidence)) continue;
      if (filter.withRef && !getRef(tech)) continue;
      if (filter.subsOnly && !tech.is_submission) continue;
      techIds.add(tech.id);
    }
    // Una posición cuenta si su nombre encaja con el texto o si toca una técnica
    // que ha pasado el filtro (origen / destino / plan B).
    const posIds = new Set<string>();
    for (const p of positions) {
      if (q && p.name.toLowerCase().includes(q)) posIds.add(p.id);
    }
    for (const tech of techniques) {
      if (!techIds.has(tech.id)) continue;
      posIds.add(tech.source_position_id);
      if (tech.destination_position_id) posIds.add(tech.destination_position_id);
      if (tech.fail_position_id) posIds.add(tech.fail_position_id);
    }
    // Nodos del grafo a mantener brillantes.
    const nodeIds = new Set<string>();
    for (const id of techIds) nodeIds.add(`tech:${id}`);
    for (const id of posIds) nodeIds.add(`pos:${id}`);
    return { techIds, posIds, nodeIds };
  }, [filter, positions, techniques]);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-80 shrink-0 flex-col gap-5 overflow-y-auto border-r border-black/10 p-4">
        <header className="flex items-center justify-between gap-2">
          <MapSwitcher mapId={mapId} maps={maps} />
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <form action="/auth/signout" method="post">
              <button className="text-xs text-zinc-500 hover:underline" title={email}>
                {t("signOut")}
              </button>
            </form>
          </div>
        </header>

        <MapFilterBar value={filter} onChange={setFilter} />

        <OnboardingChecklist
          hasPositions={positions.length > 0}
          hasTechniques={techniques.length > 0}
          hasRoutedTechnique={hasRoutedTechnique}
        />

        <MapAnalysis positions={positions} techniques={techniques} />

        <TechniquePanel
          mapId={mapId}
          positions={positions}
          techniques={techniques}
          matchTechIds={active ? match.techIds : null}
        />
        <PositionPanel
          mapId={mapId}
          positions={positions}
          techniques={techniques}
          matchPosIds={active ? match.posIds : null}
        />
      </aside>

      <main className="relative flex-1">
        {positions.length === 0 ? (
          <SeedPanel mapId={mapId} mapName={mapName} />
        ) : (
          <GraphCanvas
            positions={positions}
            techniques={techniques}
            mapId={mapId}
            mapName={mapName}
            highlightIds={active ? match.nodeIds : null}
            toolbar={<ShareButton mapId={mapId} shareSlug={shareSlug} />}
          />
        )}
      </main>

      <CommandPalette mapId={mapId} positions={positions} maps={maps} />
      <CanonicalPositionsDatalist />
    </div>
  );
}
