import { describe, expect, it } from "vitest";
import { normalizeName, suggestCanonical } from "./canonical";

describe("normalizeName", () => {
  it("baja, quita acentos y signos, colapsa espacios", () => {
    expect(normalizeName("  Média-Guardia  Abajo ")).toBe("media guardia abajo");
    expect(normalizeName("North-South")).toBe("north south");
  });
});

describe("suggestCanonical", () => {
  it("no sugiere nada cuando el nombre ya es canónico exacto", () => {
    expect(suggestCanonical("Back Control")).toBeNull();
    expect(suggestCanonical("Side Control Bottom")).toBeNull();
  });

  it("estandariza la grafía (mayúsculas / acentos / guiones)", () => {
    expect(suggestCanonical("back control")).toBe("Back Control");
    expect(suggestCanonical("NORTH SOUTH")).toBe("North-South");
  });

  it("resuelve alias en español", () => {
    expect(suggestCanonical("espalda")).toBe("Back Control");
    expect(suggestCanonical("montada")).toBe("Mount Top");
    expect(suggestCanonical("guardia cerrada")).toBe("Closed Guard Bottom");
    expect(suggestCanonical("media guardia")).toBe("Half Guard Bottom");
    expect(suggestCanonical("rodilla en barriga")).toBe("Knee on Belly");
  });

  it("pilla el mismo nombre en otro orden de palabras", () => {
    expect(suggestCanonical("Top Half Guard")).toBe("Half Guard Top");
  });

  it("pilla prefijos de palabra", () => {
    expect(suggestCanonical("side control bot")).toBe("Side Control Bottom");
  });

  it("tolera erratas cortas", () => {
    expect(suggestCanonical("Mont Top")).toBe("Mount Top");
    expect(suggestCanonical("Standng")).toBe("Standing");
  });

  it("devuelve null para un nombre propio que no se parece a nada", () => {
    expect(suggestCanonical("Mi guardia rara del sábado")).toBeNull();
    expect(suggestCanonical("Dogfight")).toBeNull();
  });

  it("ignora entradas triviales", () => {
    expect(suggestCanonical("")).toBeNull();
    expect(suggestCanonical(" x ")).toBeNull();
  });
});
