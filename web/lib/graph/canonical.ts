// Emparejador "suave" de nombres de posición contra el vocabulario canónico.
// No fuerza nada: la UI usa suggestCanonical() para ofrecer el nombre estándar
// ("¿Te refieres a Back Control?") y el usuario decide. Objetivo: pillar fácil
// las relaciones (traducciones ES/EN, abreviaturas, orden de palabras, erratas)
// sin bloquear los nombres propios.

import { CANONICAL_POSITIONS } from "@/lib/seed";

const CANON: string[] = CANONICAL_POSITIONS.map((p) => p.name);

/** minúsculas, sin acentos, sin signos, espacios colapsados. */
export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // marcas diacríticas
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// Alias frecuentes (español + abreviaturas inglesas) -> nombre canónico.
// Las claves ya están normalizadas (normalizeName).
const ALIASES: Record<string, string> = {
  // Standing
  "de pie": "Standing",
  "en pie": "Standing",
  standup: "Standing",
  "stand up": "Standing",
  // Passing
  pasando: "Passing",
  pase: "Passing",
  pasar: "Passing",
  "pasando la guardia": "Passing",
  "guard passing": "Passing",
  // Side Control Top
  "control lateral": "Side Control Top",
  "side control": "Side Control Top",
  "cien kilos": "Side Control Top",
  "100 kilos": "Side Control Top",
  "quatro quadris": "Side Control Top",
  // Side Control Bottom
  "control lateral abajo": "Side Control Bottom",
  "bajo control lateral": "Side Control Bottom",
  "side control abajo": "Side Control Bottom",
  // Knee on Belly
  "rodilla en barriga": "Knee on Belly",
  "rodilla en estomago": "Knee on Belly",
  "rodilla montada": "Knee on Belly",
  kob: "Knee on Belly",
  // Mount Top
  montada: "Mount Top",
  monta: "Mount Top",
  mount: "Mount Top",
  "mount top": "Mount Top",
  // Mount Bottom
  "montada abajo": "Mount Bottom",
  "bajo montada": "Mount Bottom",
  montado: "Mount Bottom",
  "mount bottom": "Mount Bottom",
  // Back Control
  espalda: "Back Control",
  "a la espalda": "Back Control",
  "control de espalda": "Back Control",
  "toma de espalda": "Back Control",
  back: "Back Control",
  "back mount": "Back Control",
  "back control": "Back Control",
  costas: "Back Control",
  // Back Control Bottom
  "espalda abajo": "Back Control Bottom",
  "espalda tomada": "Back Control Bottom",
  "me toman la espalda": "Back Control Bottom",
  "back tomada": "Back Control Bottom",
  // North-South
  "norte sur": "North-South",
  "cabeza con cabeza": "North-South",
  "north south": "North-South",
  // Half Guard Top
  "media guardia arriba": "Half Guard Top",
  "top half guard": "Half Guard Top",
  "media arriba": "Half Guard Top",
  // Half Guard Bottom
  "media guardia": "Half Guard Bottom",
  "media guardia abajo": "Half Guard Bottom",
  "bottom half guard": "Half Guard Bottom",
  "half guard": "Half Guard Bottom",
  "media guarda": "Half Guard Bottom",
  // Closed Guard Bottom
  "guardia cerrada": "Closed Guard Bottom",
  "closed guard": "Closed Guard Bottom",
  "guarda fechada": "Closed Guard Bottom",
  // Open Guard Bottom
  "guardia abierta": "Open Guard Bottom",
  "open guard": "Open Guard Bottom",
  "guarda aberta": "Open Guard Bottom",
  // Butterfly Bottom
  mariposa: "Butterfly Bottom",
  "guardia mariposa": "Butterfly Bottom",
  butterfly: "Butterfly Bottom",
  "butterfly guard": "Butterfly Bottom",
  "guarda borboleta": "Butterfly Bottom",
  // Turtle Top
  tortuga: "Turtle Top",
  "tortuga arriba": "Turtle Top",
  turtle: "Turtle Top",
  // Turtle Bottom
  "tortuga abajo": "Turtle Bottom",
  "en tortuga": "Turtle Bottom",
  "turtle bottom": "Turtle Bottom",
  // Front Headlock Bottom
  "front headlock": "Front Headlock Bottom",
  frontal: "Front Headlock Bottom",
  "mata leao frontal": "Front Headlock Bottom",
  "defensa de guillotina": "Front Headlock Bottom",
  // Rubber Guard
  rubber: "Rubber Guard",
  "guardia rubber": "Rubber Guard",
  // Truck
  "el camion": "Truck",
  camion: "Truck",
  "the truck": "Truck",
};

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// Misma "bolsa de palabras" salvo orden, admitiendo prefijos (>=3 chars):
// "top half guard" ~ "half guard top", "side control bot" ~ "side control bottom".
function tokensMatch(a: string[], b: string[]): boolean {
  if (a.length === 0 || a.length !== b.length) return false;
  const pool = [...b];
  for (const t of a) {
    const i = pool.findIndex(
      (x) => x === t || (t.length >= 3 && (x.startsWith(t) || t.startsWith(x))),
    );
    if (i === -1) return false;
    pool.splice(i, 1);
  }
  return true;
}

/**
 * Devuelve el nombre canónico que probablemente quería el usuario, o null si el
 * texto ya es canónico (misma grafía) o no se parece a ninguno.
 */
export function suggestCanonical(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length < 2) return null;
  const n = normalizeName(trimmed);
  if (!n) return null;

  // 1. Ya es canónica exacta -> nada que sugerir.
  if (CANON.includes(trimmed)) return null;

  // 2. Igual salvo grafía (mayúsculas / acentos / guiones) -> estandariza.
  const norm = CANON.find((c) => normalizeName(c) === n);
  if (norm) return norm;

  // 3. Alias directo.
  if (ALIASES[n]) return ALIASES[n];

  // 4. Mismas palabras en otro orden / con prefijos.
  const nt = n.split(" ");
  const byTokens = CANON.find((c) => tokensMatch(nt, normalizeName(c).split(" ")));
  if (byTokens) return byTokens;

  // 5. Errata: distancia de edición pequeña sobre el texto normalizado.
  let best: { c: string; d: number } | null = null;
  for (const c of CANON) {
    const d = levenshtein(n, normalizeName(c));
    if (d <= 2 && (!best || d < best.d)) best = { c, d };
  }
  return best ? best.c : null;
}
