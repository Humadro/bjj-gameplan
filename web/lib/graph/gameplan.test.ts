import { describe, expect, it } from "vitest";
import { buildGamePlanText } from "./gameplan";
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
