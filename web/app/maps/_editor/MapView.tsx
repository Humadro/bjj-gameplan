import CommandPalette from "./CommandPalette";
import GraphCanvas from "./GraphCanvas";
import MapAnalysis from "./MapAnalysis";
import MapSwitcher from "./MapSwitcher";
import OnboardingChecklist from "./OnboardingChecklist";
import PositionPanel from "./PositionPanel";
import SeedPanel from "./SeedPanel";
import ShareButton from "./ShareButton";
import TechniquePanel from "./TechniquePanel";
import type { Position, Technique } from "@/lib/types";

export default function MapView({
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
  const hasRoutedTechnique = techniques.some(
    (t) => t.is_submission || t.destination_position_id !== null,
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-80 shrink-0 flex-col gap-5 overflow-y-auto border-r border-black/10 p-4">
        <header className="flex items-center justify-between gap-2">
          <MapSwitcher mapId={mapId} maps={maps} />
          <form action="/auth/signout" method="post">
            <button className="text-xs text-zinc-500 hover:underline" title={email}>
              Salir
            </button>
          </form>
        </header>

        <OnboardingChecklist
          hasPositions={positions.length > 0}
          hasTechniques={techniques.length > 0}
          hasRoutedTechnique={hasRoutedTechnique}
        />

        <MapAnalysis positions={positions} techniques={techniques} />

        <TechniquePanel mapId={mapId} positions={positions} techniques={techniques} />
        <PositionPanel mapId={mapId} positions={positions} />
      </aside>

      <main className="relative flex-1">
        {positions.length === 0 ? (
          <SeedPanel mapId={mapId} mapName={mapName} />
        ) : (
          <GraphCanvas
            positions={positions}
            techniques={techniques}
            mapName={mapName}
            toolbar={<ShareButton mapId={mapId} shareSlug={shareSlug} />}
          />
        )}
      </main>

      <CommandPalette mapId={mapId} positions={positions} maps={maps} />
    </div>
  );
}
