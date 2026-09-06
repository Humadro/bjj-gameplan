import { describe, expect, it } from "vitest";
import { activeSlot, describe as describeLine, lineTokens, parseLine, stripTags } from "./palette";

const maps = [
  { id: "m1", name: "No-Gi" },
  { id: "m2", name: "Competición" },
];

describe("stripTags", () => {
  it("peels a trailing confidence tag", () => {
    expect(stripTags("gancho, alta")).toEqual({ text: "gancho", conf: "alta", sub: false });
  });
  it("peels chained tags in any order", () => {
    expect(stripTags("armbar, sub, baja")).toEqual({ text: "armbar", conf: "baja", sub: true });
  });
  it("keeps a normal comma in the name", () => {
    expect(stripTags("gancho, el corto")).toEqual({ text: "gancho, el corto", conf: null, sub: false });
  });
});

describe("parseLine", () => {
  it("parses a position", () => {
    expect(parseLine("pos rubber guard", maps)).toEqual({
      kind: "position",
      name: "rubber guard",
      isBad: false,
    });
    expect(parseLine("pos mount bottom mala", maps)).toEqual({
      kind: "position",
      name: "mount bottom",
      isBad: true,
    });
  });

  it("parses goto against the map list", () => {
    expect(parseLine("ir competi", maps)).toEqual({ kind: "goto", map: maps[1] });
    expect(parseLine("ir nope", maps).kind).toBe("invalid");
  });

  it("parses one technique with destination and strips 'desde'", () => {
    const p = parseLine("desde media guardia > gancho > x-guard", maps);
    expect(p).toEqual({
      kind: "techniques",
      specs: [
        { source: "media guardia", name: "gancho", dest: "x-guard", confidence: "media", isSubmission: false },
      ],
    });
  });

  it("applies confidence PER technique in a chain", () => {
    const p = parseLine("media guardia > gancho, alta > x-guard > single leg, baja > side control top", maps);
    expect(p.kind).toBe("techniques");
    if (p.kind !== "techniques") return;
    expect(p.specs.map((s) => [s.name, s.confidence])).toEqual([
      ["gancho", "alta"],
      ["single leg", "baja"],
    ]);
  });

  it("uses a tag on the final position as the default for untagged techniques", () => {
    const p = parseLine("a > t1 > b > t2 > c, alta", maps);
    if (p.kind !== "techniques") throw new Error("expected techniques");
    expect(p.specs.every((s) => s.confidence === "alta")).toBe(true);
  });

  it("even-length chain: last technique has no destination", () => {
    const p = parseLine("mount top > armbar", maps);
    if (p.kind !== "techniques") throw new Error("expected techniques");
    expect(p.specs[0].dest).toBeNull();
    expect(p.specs[0].isSubmission).toBe(false);
  });

  it("marks a submission with ', sub'", () => {
    const p = parseLine("desde mount top > armbar, sub, alta", maps);
    if (p.kind !== "techniques") throw new Error("expected techniques");
    expect(p.specs[0]).toMatchObject({ isSubmission: true, dest: null, confidence: "alta" });
  });

  it("flags an empty segment", () => {
    expect(parseLine("a >  > b", maps).kind).toBe("invalid");
  });

  it("bare text with no separator is a phrase", () => {
    expect(parseLine("kimura desde norte sur", maps)).toEqual({
      kind: "phrase",
      text: "kimura desde norte sur",
    });
  });
});

describe("describe", () => {
  it("summarises a chain with per-hop confidence", () => {
    const p = parseLine("a > t1, alta > b > t2, baja > c", maps);
    const d = describeLine(p);
    if (d.kind !== "chain") throw new Error("expected chain");
    expect(d.hops.map((h) => [h.name, h.confidence])).toEqual([
      ["t1", "alta"],
      ["t2", "baja"],
    ]);
  });

  it("codes an invalid goto reason", () => {
    const d = describeLine(parseLine("ir nope", maps));
    expect(d).toMatchObject({ kind: "invalid", reason: "no-map", query: "nope" });
  });
});

describe("lineTokens", () => {
  it("bolds positions, not techniques, and mutes tags", () => {
    const toks = lineTokens("media guardia > gancho, alta > x-guard");
    const bold = toks.filter((t) => t.bold).map((t) => t.text.trim());
    expect(bold).toContain("media guardia");
    expect(bold).toContain("x-guard");
    expect(toks.some((t) => t.muted && /alta/.test(t.text))).toBe(true);
    expect(toks.some((t) => t.bold && t.text.includes("gancho"))).toBe(false);
  });
});

describe("activeSlot", () => {
  it("targets the source position slot", () => {
    const text = "media gu";
    const slot = activeSlot(text, text.length);
    expect(slot).not.toBeNull();
    expect(slot!.frag).toBe("media gu");
  });
  it("returns null inside a technique slot", () => {
    const text = "media guardia > gan";
    expect(activeSlot(text, text.length)).toBeNull();
  });
  it("targets a later position slot in a chain", () => {
    const text = "media guardia > gancho > x-gu";
    const slot = activeSlot(text, text.length);
    expect(slot!.frag).toBe("x-gu");
  });
  it("returns null on a `pos` line", () => {
    const text = "pos rubber gu";
    expect(activeSlot(text, text.length)).toBeNull();
  });
});
