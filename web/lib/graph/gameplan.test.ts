import { describe, expect, it } from "vitest";
import { buildGamePlanText, buildPositionCardText } from "./gameplan";
import { pos, tech } from "./fixtures";

describe("buildGamePlanText", () => {
  const positions = [pos("a", "Guardia"), pos("b", "Montada"), pos("c", "Side Bottom", true)];
  const techniques = [
    tech("1", "a", { name: "Barrido", destination_position_id: "b", confidence: "alta", fail_position_id: "c" }),
    tech("2", "b", { name: "Armbar", is_submission: true, confidence: "media" }),
  ];

  it("one section per position, in map order", () => {
    const txt = buildGamePlanText("Mi Plan", positions, techniques);
    expect(txt).toContain("MI PLAN");
    expect(txt.indexOf("[o] Guardia")).toBeLessThan(txt.indexOf("[o] Montada"));
    expect(txt).toContain("[v] Side Bottom  (posicion mala)");
  });

  it("shows confidence, destination, submission and 'si fallas'", () => {
    const txt = buildGamePlanText("P", positions, techniques);
    expect(txt).toContain("- Barrido  [Alta]  -> Montada");
    expect(txt).toContain("x si fallas -> Side Bottom");
    expect(txt).toContain("- Armbar  [Media]  sumision");
  });

  it("marks positions with no outgoing technique", () => {
    const txt = buildGamePlanText("P", positions, techniques);
    expect(txt).toContain("(sin tecnicas de salida)");
  });
});

describe("buildPositionCardText", () => {
  const positions = [pos("a", "Guardia"), pos("b", "Montada"), pos("c", "Side", true)];
  const techniques = [
    tech("1", "a", { name: "Barrido", destination_position_id: "b", confidence: "alta", fail_position_id: "c" }),
    tech("2", "a", { name: "Kimura", is_submission: true, confidence: "baja" }),
    tech("3", "b", { name: "otra", destination_position_id: "a" }),
  ];

  it("only lists the given position's outgoing techniques", () => {
    const txt = buildPositionCardText("Plan", positions[0], positions, techniques);
    expect(txt).toContain("PLAN · FICHA");
    expect(txt).toContain("Guardia");
    expect(txt).toContain("- Barrido  [Alta]  -> Montada");
    expect(txt).toContain("x si fallas -> Side");
    expect(txt).toContain("- Kimura  [Baja]  sumision");
    expect(txt).not.toContain("otra");
  });

  it("handles a position with no outgoing technique", () => {
    const txt = buildPositionCardText("Plan", positions[2], positions, techniques);
    expect(txt).toContain("Side  (posicion mala)");
    expect(txt).toContain("(sin tecnicas de salida)");
  });
});
