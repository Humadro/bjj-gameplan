import GraphCanvas from "./GraphCanvas";
import PositionPanel from "./PositionPanel";
import TechniquePanel from "./TechniquePanel";
import type { Position, Technique } from "@/lib/types";

export default function MapView({
  email,
  positions,
  techniques,
}: {
  email: string | undefined;
  positions: Position[];
  techniques: Technique[];
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-80 shrink-0 flex-col gap-6 overflow-y-auto border-r border-black/10 p-4 dark:border-white/10">
        <header className="flex items-center justify-between">
          <span className="text-sm font-semibold">BJJ Game Plan</span>
          <form action="/auth/signout" method="post">
            <button className="text-xs text-zinc-500 hover:underline" title={email}>
              Salir
            </button>
          </form>
        </header>

        <PositionPanel positions={positions} />
        <TechniquePanel positions={positions} techniques={techniques} />
      </aside>

      <main className="relative flex-1">
        <GraphCanvas positions={positions} techniques={techniques} />
      </main>
    </div>
  );
}
