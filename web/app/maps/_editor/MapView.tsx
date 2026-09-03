import type { Position, Technique } from "@/lib/types";
import EditorBody from "./EditorBody";
import { ToastProvider } from "./Toast";

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
  return (
    <ToastProvider>
      <EditorBody
        email={email}
        mapId={mapId}
        mapName={mapName}
        shareSlug={shareSlug}
        maps={maps}
        positions={positions}
        techniques={techniques}
      />
    </ToastProvider>
  );
}
