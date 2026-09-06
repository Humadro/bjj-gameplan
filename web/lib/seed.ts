import type { Confidence } from "@/lib/types";

export type SeedPosition = { key: string; name: string; isBad?: boolean };
export type SeedTechnique = {
  name: string;
  from: string; // key de SeedPosition
  to?: string; // key de SeedPosition; ausente => sumisión o callejón sin salida
  confidence: Confidence;
  submission?: boolean;
};
export type SeedTemplate = {
  id: string;
  label: string;
  description: string;
  positions: SeedPosition[];
  techniques: SeedTechnique[];
};

// ---------------------------------------------------------------------------
// Vocabulario canónico de posiciones (No-Gi). Es la lista "oficial": los selects
// del editor y el autocompletado la ofrecen para que todo el mundo escriba
// "Side Control Bottom" y no "side control bot" — así los datos son comparables
// entre mapas y usuarios. No impide crear posiciones propias: solo estandariza.
// ---------------------------------------------------------------------------
export const CANONICAL_POSITIONS: { name: string; isBad?: boolean }[] = [
  { name: "Standing" },
  { name: "Passing" },
  { name: "Side Control Top" },
  { name: "Knee on Belly" },
  { name: "Mount Top" },
  { name: "Back Control" },
  { name: "Truck" },
  { name: "North-South" },
  { name: "Half Guard Top" },
  { name: "Turtle Top" },
  { name: "Closed Guard Bottom" },
  { name: "Open Guard Bottom" },
  { name: "Half Guard Bottom" },
  { name: "Butterfly Bottom" },
  { name: "Rubber Guard" },
  { name: "Front Headlock Bottom", isBad: true },
  { name: "Side Control Bottom", isBad: true },
  { name: "Mount Bottom", isBad: true },
  { name: "Back Control Bottom", isBad: true },
  { name: "Turtle Bottom", isBad: true },
];

// ---------------------------------------------------------------------------
// Plantilla 1: posiciones base (sin técnicas) — es el vocabulario canónico.
// ---------------------------------------------------------------------------
const POSICIONES_BASE: SeedTemplate = {
  id: "posiciones-base",
  label: "Posiciones base",
  description: "~20 posiciones canónicas con las bottom marcadas. Sin técnicas: tú las cuelgas.",
  positions: CANONICAL_POSITIONS.map((p) => ({ key: p.name, name: p.name, isBad: p.isBad })),
  techniques: [],
};

// ---------------------------------------------------------------------------
// Plantilla 2: port de Mapa_Juego_BJJ.dot
// (técnicas con doble destino bueno/malo en el .dot -> se queda el destino bueno)
// ---------------------------------------------------------------------------
const MAPA_EJEMPLO: SeedTemplate = {
  id: "mapa-ejemplo",
  label: "Mapa de ejemplo",
  description: "Port completo del Mapa_Juego_BJJ.dot: ~13 posiciones y ~31 técnicas para editar.",
  positions: [
    { key: "standing", name: "Standing" },
    { key: "passing", name: "Passing" },
    { key: "fhl", name: "Front Headlock Bottom", isBad: true },
    { key: "sct", name: "Side Control Top" },
    { key: "thg", name: "Half Guard Top" },
    { key: "turtle", name: "Turtle Top" },
    { key: "mount", name: "Mount Top" },
    { key: "espalda", name: "Back Control" },
    { key: "mbottom", name: "Mount Bottom", isBad: true },
    { key: "scb", name: "Side Control Bottom", isBad: true },
    { key: "bhg", name: "Half Guard Bottom" },
    { key: "dogfight", name: "Dogfight" }, // transición, sin equivalente canónico
  ],
  techniques: [
    // Standing
    { name: "Blast double", from: "standing", to: "sct", confidence: "baja" },
    { name: "Snatch single leg + run the pipe / trip", from: "standing", to: "sct", confidence: "media" },
    { name: "Snapdown + go behind", from: "standing", to: "sct", confidence: "baja" },
    { name: "Overhook lat drop", from: "standing", to: "sct", confidence: "baja" },
    // Passing
    { name: "J point passing", from: "passing", to: "sct", confidence: "alta" },
    { name: "Double unders", from: "passing", to: "thg", confidence: "media" },
    // Front Headlock Bottom
    { name: "Sucker drag", from: "fhl", to: "turtle", confidence: "baja" },
    { name: "Dump", from: "fhl", to: "sct", confidence: "baja" },
    // Side Control Top
    { name: "Knee on belly", from: "sct", to: "mount", confidence: "alta" },
    { name: "Twister pass", from: "sct", to: "mount", confidence: "alta" },
    // Half Guard Top
    { name: "Knee slice", from: "thg", to: "sct", confidence: "alta" },
    { name: "Cowcatcher", from: "thg", to: "sct", confidence: "media" },
    { name: "Pressure pass", from: "thg", to: "sct", confidence: "alta" },
    // Mount Top
    { name: "Kata gatame", from: "mount", confidence: "alta", submission: true },
    { name: "Gift wrap backtake", from: "mount", to: "espalda", confidence: "alta" },
    { name: "Gift wrap armbar", from: "mount", confidence: "baja", submission: true },
    { name: "Ezekiel", from: "mount", confidence: "alta", submission: true },
    { name: "Mounted triangle", from: "mount", confidence: "baja", submission: true },
    // Turtle Top
    { name: "Darce", from: "turtle", confidence: "media", submission: true },
    { name: "J chen backtake", from: "turtle", to: "espalda", confidence: "media" },
    // Back Control
    { name: "RNC", from: "espalda", confidence: "media", submission: true },
    // Mount Bottom
    { name: "Elbow escape", from: "mbottom", to: "bhg", confidence: "alta" },
    { name: "Reverse alcatraz", from: "mbottom", to: "bhg", confidence: "alta" },
    { name: "Kip escape", from: "mbottom", to: "bhg", confidence: "baja" },
    // Side Control Bottom
    { name: "Underhook bridge to top turtle", from: "scb", to: "turtle", confidence: "media" },
    { name: "Bridge to halfguard bottom", from: "scb", to: "bhg", confidence: "media" },
    { name: "Ghost escape", from: "scb", confidence: "baja" }, // sin salida a propósito
    // Half Guard Bottom
    { name: "Underhook to dogfight", from: "bhg", to: "dogfight", confidence: "alta" },
    { name: "Underhook to electric sweep", from: "bhg", to: "sct", confidence: "alta" },
    // Dogfight
    { name: "Knee tap", from: "dogfight", to: "sct", confidence: "media" },
    { name: "Plan B", from: "dogfight", to: "sct", confidence: "baja" },
  ],
};

// ---------------------------------------------------------------------------
// Plantillas pequeñas y temáticas (3-6 posiciones): punto de partida suave
// ---------------------------------------------------------------------------
const DE_PIE: SeedTemplate = {
  id: "de-pie",
  label: "De pie",
  description: "3 posiciones · derribos hasta Side Control.",
  positions: [
    { key: "standing", name: "Standing" },
    { key: "sct", name: "Side Control Top" },
    { key: "fh", name: "Front Headlock" },
  ],
  techniques: [
    { name: "Double leg", from: "standing", to: "sct", confidence: "media" },
    { name: "Snatch single leg", from: "standing", to: "sct", confidence: "media" },
    { name: "Snapdown a front headlock", from: "standing", to: "fh", confidence: "media" },
    { name: "Guillotine", from: "fh", confidence: "media", submission: true },
  ],
};

const PASAR_GUARDIA: SeedTemplate = {
  id: "pasar-guardia",
  label: "Pasando la guardia",
  description: "4 posiciones · pases hasta montada.",
  positions: [
    { key: "passing", name: "Passing" },
    { key: "hgt", name: "Half Guard Top" },
    { key: "sct", name: "Side Control Top" },
    { key: "mount", name: "Mount Top" },
  ],
  techniques: [
    { name: "Toreando", from: "passing", to: "sct", confidence: "media" },
    { name: "Knee slice", from: "passing", to: "hgt", confidence: "alta" },
    { name: "Knee slice desde half", from: "hgt", to: "sct", confidence: "alta" },
    { name: "Pressure pass", from: "hgt", to: "sct", confidence: "media" },
    { name: "Knee on belly a montada", from: "sct", to: "mount", confidence: "media" },
  ],
};

const JUEGO_ABAJO: SeedTemplate = {
  id: "juego-abajo",
  label: "Juego de abajo",
  description: "5 posiciones · barridas para salir de abajo.",
  positions: [
    { key: "cgb", name: "Closed Guard Bottom" },
    { key: "hgb", name: "Half Guard Bottom" },
    { key: "bfb", name: "Butterfly Bottom" },
    { key: "mount", name: "Mount Top" },
    { key: "sct", name: "Side Control Top" },
  ],
  techniques: [
    { name: "Hip bump sweep", from: "cgb", to: "mount", confidence: "media" },
    { name: "Pendulum sweep", from: "cgb", to: "mount", confidence: "media" },
    { name: "Scissor sweep", from: "cgb", to: "sct", confidence: "media" },
    { name: "Underhook a dogfight", from: "hgb", to: "sct", confidence: "alta" },
    { name: "Butterfly hook sweep", from: "bfb", to: "sct", confidence: "alta" },
    { name: "Elevator sweep", from: "bfb", to: "mount", confidence: "media" },
  ],
};

const ATAQUES_MONTADA: SeedTemplate = {
  id: "ataques-montada",
  label: "Ataques desde montada",
  description: "2 posiciones · finalizaciones y paso a la espalda.",
  positions: [
    { key: "mount", name: "Mount Top" },
    { key: "back", name: "Back Control" },
  ],
  techniques: [
    { name: "Armbar", from: "mount", confidence: "alta", submission: true },
    { name: "Cross collar choke", from: "mount", confidence: "media", submission: true },
    { name: "Ezekiel", from: "mount", confidence: "media", submission: true },
    { name: "Gift wrap a la espalda", from: "mount", to: "back", confidence: "alta" },
    { name: "RNC", from: "back", confidence: "alta", submission: true },
    { name: "Bow and arrow", from: "back", confidence: "alta", submission: true },
  ],
};

export const SMALL_TEMPLATES: SeedTemplate[] = [
  DE_PIE,
  PASAR_GUARDIA,
  JUEGO_ABAJO,
  ATAQUES_MONTADA,
];

export const FULL_TEMPLATES: SeedTemplate[] = [POSICIONES_BASE, MAPA_EJEMPLO];

export const SEED_TEMPLATES: SeedTemplate[] = [...SMALL_TEMPLATES, ...FULL_TEMPLATES];

export function getTemplate(id: string): SeedTemplate | undefined {
  return SEED_TEMPLATES.find((t) => t.id === id);
}

// Posiciones sueltas para los "chips" de la pantalla vacía (añadir de un clic).
export const SUGGESTED_POSITIONS: { name: string; isBad?: boolean }[] = [
  { name: "Standing" },
  { name: "Passing" },
  { name: "Closed Guard Bottom" },
  { name: "Half Guard Bottom" },
  { name: "Butterfly Bottom" },
  { name: "Side Control Top" },
  { name: "Mount Top" },
  { name: "Back Control" },
  { name: "Side Control Bottom", isBad: true },
  { name: "Mount Bottom", isBad: true },
];
