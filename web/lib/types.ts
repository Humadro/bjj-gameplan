export type Confidence = "alta" | "media" | "baja";

export type Position = {
  id: string;
  user_id: string;
  name: string;
  is_bad: boolean;
  created_at: string;
};

export type Technique = {
  id: string;
  user_id: string;
  name: string;
  source_position_id: string;
  destination_position_id: string | null;
  confidence: Confidence;
  is_submission: boolean;
  created_at: string;
};

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
