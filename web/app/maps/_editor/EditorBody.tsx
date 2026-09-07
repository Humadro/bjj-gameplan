"use client";

import { useMemo, useState, type ReactNode } from "react";
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

// En móvil, Técnicas y Posiciones son dos cajones independientes que se abren
// por separado; en escritorio (md+) siempre están desplegados.
function MobileSection({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center justify-between rounded-md border border-black/10 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 md:hidden dark:border-white/10"
      >
        {title}
        <span aria-hidden className="text-base leading-none">
          {open ? "–" : "+"}
        </span>
      </button>
      <div className={`${open ? "mt-3 block" : "hidden"} md:mt-0 md:block`}>{children}</div>
    </div>
  );
}

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
  const tEditor = useTranslations("Editor");
  const tTech = useTranslations("Techniques");
  const tPos = useTranslations("Positions");
  const hasRoutedTechnique = techniques.some(
    (x) => x.is_submission || x.destination_position_id !== null,
  );

  const [filter, setFilter] = useState<MapFilter>(emptyFilter);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
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
    <div className="flex h-screen h-[100dvh] overflow-hidden">
      {sidebarOpen && (
        <button
          type="button"
          aria-label={t("close")}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[88%] max-w-sm flex-col gap-5 overflow-y-auto border-r border-black/10 bg-background p-4 pb-24 shadow-xl transition-transform duration-200 md:static md:z-auto md:w-80 md:max-w-none md:pb-4 md:shadow-none md:transition-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label={t("close")}
              className="rounded-md border border-black/15 px-2 py-1 text-xs md:hidden"
            >
              ✕
            </button>
            <MapSwitcher mapId={mapId} maps={maps} />
          </div>
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

        <MobileSection title={tTech("heading")}>
          <TechniquePanel
            mapId={mapId}
            positions={positions}
            techniques={techniques}
            matchTechIds={active ? match.techIds : null}
          />
        </MobileSection>
        <MobileSection title={tPos("heading")}>
          <PositionPanel
            mapId={mapId}
            positions={positions}
            techniques={techniques}
            matchPosIds={active ? match.posIds : null}
          />
        </MobileSection>
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

      {/* Barra de acciones inferior: solo móvil. */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-black/10 bg-background/95 p-2 backdrop-blur md:hidden"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex-1 rounded-md border border-black/15 bg-white px-3 py-2 text-sm font-medium shadow-sm dark:bg-zinc-800"
        >
          ☰ {tEditor("open")}
        </button>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex-1 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white shadow-sm dark:bg-white dark:text-zinc-900"
        >
          + {tEditor("add")}
        </button>
      </div>

      <CommandPalette
        mapId={mapId}
        positions={positions}
        maps={maps}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
      />
      <CanonicalPositionsDatalist />
    </div>
  );
}
