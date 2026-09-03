import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Tests unitarios del núcleo puro (lib/graph/*). No arranca Next.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
