import next from "eslint-config-next";
import tseslint from "typescript-eslint";

/**
 * Flat config. eslint-config-next 16 ships a flat config directly, so no
 * FlatCompat shim is needed.
 */
const config = [
  ...next,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      // Deliberately-discarded destructured values are named with a leading
      // underscore throughout (e.g. stripping honeypot fields before a write).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
    },
  },
];

export default config;
