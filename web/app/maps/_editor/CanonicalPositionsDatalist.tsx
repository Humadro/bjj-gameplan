import { CANONICAL_POSITIONS } from "@/lib/seed";

// Id compartido: los inputs de "nueva posición" (panel de posiciones y panel de
// técnicas) apuntan aquí con list={CANONICAL_POS_LIST_ID} para autocompletar
// con el vocabulario canónico sin impedir escribir un nombre propio.
export const CANONICAL_POS_LIST_ID = "canonical-positions";

export default function CanonicalPositionsDatalist() {
  return (
    <datalist id={CANONICAL_POS_LIST_ID}>
      {CANONICAL_POSITIONS.map((p) => (
        <option key={p.name} value={p.name} />
      ))}
    </datalist>
  );
}
