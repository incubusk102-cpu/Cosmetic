import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "tests/**/*.test.ts"],
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only` throws when imported under a Vite (non-Next) bundler.
      // Map it to an empty noop module so server-side libs can be unit-tested.
      "server-only": path.resolve(__dirname, "node_modules/server-only/empty.js"),
    },
  },
});
