import type { Position, Technique } from "@/lib/types";

// Fábricas mínimas para los tests del núcleo.
export function pos(id: string, name: string, is_bad = false): Position {
  return {
    id,
    user_id: "u",
    name,
    is_bad,
    created_at: "2026-01-01T00:00:00Z",
    note: null,
    reference_url: null,
    reference_label: null,
    reference_start_seconds: null,
  };
}

export function tech(
  id: string,
  source_position_id: string,
  over: Partial<Technique> = {},
): Technique {
  return {
    id,
    user_id: "u",
    name: `t-${id}`,
    source_position_id,
    destination_position_id: null,
    fail_position_id: null,
    confidence: "media",
    is_submission: false,
    created_at: "2026-01-01T00:00:00Z",
    note: null,
    reference_url: null,
    reference_label: null,
    reference_start_seconds: null,
    ...over,
  };
}
