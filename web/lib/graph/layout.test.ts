import { describe, expect, it } from "vitest";
import { buildGraph } from "./layout";
import { pos, tech } from "./fixtures";

describe("buildGraph", () => {
  it("only draws positions referenced by a technique", () => {
    const positions = [pos("a", "A"), pos("b", "B"), pos("orphan", "Orphan")];
    const techniques = [tech("1", "a", { destination_position_id: "b" })];
    const { nodes } = buildGraph(positions, techniques);
    const ids = nodes.map((n) => n.id);
    expect(ids).toContain("pos:a");
    expect(ids).toContain("pos:b");
    expect(ids).not.toContain("pos:orphan");
    expect(ids).toContain("tech:1");
  });

  it("a hub position is a single node no matter how many techniques point at it", () => {
    const positions = [pos("a", "A"), pos("b", "B"), pos("hub", "Hub")];
    const techniques = [
      tech("1", "a", { destination_position_id: "hub" }),
      tech("2", "b", { destination_position_id: "hub" }),
    ];
    const { nodes } = buildGraph(positions, techniques);
    expect(nodes.filter((n) => n.id === "pos:hub")).toHaveLength(1);
  });

  it("emits a dotted 'si fallas' edge, skipping self-referential plan B", () => {
    const positions = [pos("a", "A"), pos("b", "B"), pos("c", "C")];
    const good = buildGraph(positions, [
      tech("1", "a", { destination_position_id: "b", fail_position_id: "c" }),
    ]);
    expect(good.edges.some((e) => e.id === "fail:1")).toBe(true);

    const selfPlanB = buildGraph(positions, [
      tech("2", "a", { destination_position_id: "b", fail_position_id: "a" }),
    ]);
    expect(selfPlanB.edges.some((e) => e.id === "fail:2")).toBe(false);
  });

  it("submission technique gets no destination edge", () => {
    const positions = [pos("a", "A")];
    const { edges } = buildGraph(positions, [tech("1", "a", { is_submission: true })]);
    expect(edges.some((e) => e.id === "dst:1")).toBe(false);
    expect(edges.some((e) => e.id === "src:1")).toBe(true);
  });
});
