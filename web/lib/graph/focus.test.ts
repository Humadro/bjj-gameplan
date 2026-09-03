import { describe, expect, it } from "vitest";
import type { Edge } from "@xyflow/react";
import { computeFocusSet } from "./focus";

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
