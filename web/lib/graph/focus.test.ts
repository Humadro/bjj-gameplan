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
  const positions = [pos("a", "A"), pos("b", "B"), pos("c", "C")];

  it("follows the highest-confidence technique at each position", () => {
    const techniques = [
      tech("weak", "a", { destination_position_id: "c", confidence: "baja" }),
      tech("strong", "a", { destination_position_id: "b", confidence: "alta" }),
      tech("finish", "b", { is_submission: true, confidence: "media" }),
    ];
    const { nodeIds, edgeIds } = computeMainLine(positions, techniques, "a");
    expect(nodeIds.has("pos:a")).toBe(true);
    expect(nodeIds.has("tech:strong")).toBe(true);
    expect(nodeIds.has("pos:b")).toBe(true);
    expect(nodeIds.has("tech:finish")).toBe(true);
    expect(nodeIds.has("tech:weak")).toBe(false);
    expect(edgeIds.has("dst:strong")).toBe(true);
    expect(edgeIds.has("dst:finish")).toBe(false); // sumisión: sin arista de destino
  });

  it("stops on a cycle", () => {
    const techniques = [
      tech("1", "a", { destination_position_id: "b", confidence: "alta" }),
      tech("2", "b", { destination_position_id: "a", confidence: "alta" }),
    ];
    const { nodeIds } = computeMainLine(positions, techniques, "a");
    expect([...nodeIds].sort()).toEqual(["pos:a", "pos:b", "tech:1", "tech:2"]);
  });
});
