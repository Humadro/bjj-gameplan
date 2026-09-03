import { describe, expect, it } from "vitest";
import type { Edge } from "@xyflow/react";
import { computeFocusSet, computeMainLine } from "./focus";
import { pos, tech } from "./fixtures";

// a -> b -> c , y d -> b
const edges: Edge[] = [
  { id: "e1", source: "a", target: "b" },
  { id: "e2", source: "b", target: "c" },
  { id: "e3", source: "d", target: "b" },
];

describe("computeFocusSet", () => {
  it("up = todo lo que LLEGA al nodo", () => {
    const { nodeIds } = computeFocusSet(edges, "c", "up");
    expect([...nodeIds].sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("down = todo lo que SALE del nodo", () => {
    const { nodeIds, edgeIds } = computeFocusSet(edges, "a", "down");
    expect([...nodeIds].sort()).toEqual(["a", "b", "c"]);
    expect([...edgeIds].sort()).toEqual(["e1", "e2"]);
  });

  it("es seguro con ciclos", () => {
    const cyc: Edge[] = [
      { id: "x", source: "a", target: "b" },
      { id: "y", source: "b", target: "a" },
    ];
    const { nodeIds } = computeFocusSet(cyc, "a", "down");
    expect([...nodeIds].sort()).toEqual(["a", "b"]);
  });
});

describe("computeMainLine", () => {
  const positions = [pos("a", "A"), pos("b", "B"), pos("c", "C"), pos("d", "D")];

  it("marks the high-confidence tree that enters AND leaves the position", () => {
    const techniques = [
      tech("in", "d", { destination_position_id: "a", confidence: "alta" }),
      tech("out", "a", { destination_position_id: "b", confidence: "alta" }),
      tech("weak", "a", { destination_position_id: "c", confidence: "baja" }),
      tech("next", "b", { destination_position_id: "c", confidence: "media" }),
    ];
    const { nodeIds, edgeIds } = computeMainLine(positions, techniques, "a");
    // sube por la arista que llega a "a"...
    expect(nodeIds.has("pos:d")).toBe(true);
    expect(nodeIds.has("tech:in")).toBe(true);
    expect(edgeIds.has("dst:in")).toBe(true);
    // ...y baja por la que sale
    expect(nodeIds.has("pos:b")).toBe(true);
    expect(nodeIds.has("tech:out")).toBe(true);
    // pero solo por técnicas de confianza >= umbral (alta)
    expect(nodeIds.has("tech:weak")).toBe(false);
    expect(nodeIds.has("tech:next")).toBe(false);
    expect(nodeIds.has("pos:c")).toBe(false);
  });

  it("falls back to the max confidence present when nothing alta touches the position", () => {
    const techniques = [
      tech("m1", "a", { destination_position_id: "b", confidence: "media" }),
      tech("m2", "b", { destination_position_id: "c", confidence: "media" }),
      tech("low", "a", { destination_position_id: "c", confidence: "baja" }),
    ];
    const { nodeIds } = computeMainLine(positions, techniques, "a");
    expect(nodeIds.has("tech:m1")).toBe(true);
    expect(nodeIds.has("tech:m2")).toBe(true);
    expect(nodeIds.has("pos:c")).toBe(true);
    expect(nodeIds.has("tech:low")).toBe(false);
  });

  it("includes an outgoing high-confidence submission as a leaf (no dst edge)", () => {
    const techniques = [
      tech("sub", "a", { is_submission: true, confidence: "alta" }),
      tech("weak", "a", { destination_position_id: "b", confidence: "baja" }),
    ];
    const { nodeIds, edgeIds } = computeMainLine(positions, techniques, "a");
    expect(nodeIds.has("tech:sub")).toBe(true);
    expect(edgeIds.has("src:sub")).toBe(true);
    expect(edgeIds.has("dst:sub")).toBe(false);
  });

  it("is safe with cycles", () => {
    const techniques = [
      tech("1", "a", { destination_position_id: "b", confidence: "alta" }),
      tech("2", "b", { destination_position_id: "a", confidence: "alta" }),
    ];
    const { nodeIds } = computeMainLine(positions, techniques, "a");
    expect([...nodeIds].sort()).toEqual(["pos:a", "pos:b", "tech:1", "tech:2"]);
  });
});
