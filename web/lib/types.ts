export type Confidence = "alta" | "media" | "baja";

// Enlace de estudio (vídeo/instructional) opcional, común a posiciones y técnicas.
// Se llena tras la migración 0005.
export type ReferenceFields = {
  reference_url: string | null;
  reference_label: string | null;
  reference_start_seconds: number | null;
};

export type Position = {
  id: string;
  user_id: string;
  name: string;
  is_bad: boolean;
  created_at: string;
  // Nota personal del dueño. Privada: no se expone en la vista compartida.
  note: string | null;
} & ReferenceFields;

export type Technique = {
  id: string;
  user_id: string;
  name: string;
  source_position_id: string;
  destination_position_id: string | null;
  // Posición a la que vas a parar si la técnica NO sale (plan B). null = te quedas
  // donde estabas o no está definido. Se llena tras la migración 0004.
  fail_position_id: string | null;
  confidence: Confidence;
  is_submission: boolean;
  created_at: string;
  // Nota personal del dueño. Privada: no se expone en la vista compartida.
  note: string | null;
} & ReferenceFields;

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

// Mismos colores que Mapa_Juego_BJJ.dot
export const CONFIDENCE_COLOR: Record<Confidence, string> = {
  alta: "#2E7D32",
  media: "#F9A825",
  baja: "#C62828",
};
