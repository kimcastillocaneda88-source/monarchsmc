import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

const root = import.meta.dirname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(root, ".") },
  },
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: { alias: { "@": path.resolve(root, ".") } },
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["tests/unit/**/*.test.{ts,tsx}"],
          setupFiles: ["tests/setup.ts"],
          globals: true,
        },
      },
      {
        resolve: { alias: { "@": path.resolve(root, ".") } },
        test: {
          name: "rules",
          environment: "node",
          include: ["tests/rules/**/*.test.ts"],
          // Rules tests talk to the emulator; they are slower and must not
          // race each other over the same documents.
          fileParallelism: false,
          testTimeout: 20000,
          hookTimeout: 20000,
        },
      },
    ],
  },
});
