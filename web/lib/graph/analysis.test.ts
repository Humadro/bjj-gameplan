import { describe, expect, it } from "vitest";
import { analyzeMap } from "./analysis";
import { pos, tech } from "./fixtures";

describe("analyzeMap", () => {
  it("flags a reached position with no way out (bad = sin escape)", () => {
    const positions = [pos("a", "A"), pos("b", "B", true)];
    const techniques = [tech("1", "a", { destination_position_id: "b" })];
    const g = analyzeMap(positions, techniques);
    expect(g.deadEndBad.map((p) => p.id)).toEqual(["b"]);
    expect(g.deadEndGood).toHaveLength(0);
  });

  it("ignores parked positions (nothing reaches them)", () => {
    const positions = [pos("a", "A"), pos("orphan", "Orphan")];
    const techniques = [tech("1", "a", { is_submission: true })];
    const g = analyzeMap(positions, techniques);
    expect(g.deadEndGood).toHaveLength(0);
    expect(g.deadEndBad).toHaveLength(0);
  });

  it("lists techniques with a destination but no plan B", () => {
    const positions = [pos("a", "A"), pos("b", "B")];
    const techniques = [
      tech("1", "a", { destination_position_id: "b" }),
      tech("2", "a", { destination_position_id: "b", fail_position_id: "a" }),
      tech("3", "a", { is_submission: true }),
    ];
    const g = analyzeMap(positions, techniques);
    expect(g.noPlanB.map((t) => t.id)).toEqual(["1"]);
  });
});
