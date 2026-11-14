import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // API tests share one database; run files one after another.
    fileParallelism: false,
  },
});
