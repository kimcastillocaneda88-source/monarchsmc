/**
 * Boots the end-to-end environment:
 *   1. a production build — WITHOUT emulator variables, so prerendering does
 *      not try to reach a Firestore that has not started yet
 *   2. Firebase emulators (Auth, Firestore, Storage) with the real rules
 *   3. the seed script, so the app has content to render
 *   4. the built app served on port 3210, this time pointed at the emulators
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const PORT = 3210;

function loadEnvFile(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return env;
}

const testEnv = loadEnvFile(".env.test");
const runtimeEnv = { ...process.env, ...testEnv, PORT: String(PORT) };

/**
 * The build must not see the emulator host variables: `isAdminConfigured()`
 * would return true, static generation would try to reach an emulator that is
 * not running yet, and the Admin SDK would retry until the harness times out.
 * Public pages prerender with their empty states instead, which is also what a
 * credential-less CI build does.
 */
const buildEnv = { ...process.env };
for (const key of Object.keys(testEnv)) {
  if (key.startsWith("NEXT_PUBLIC_")) buildEnv[key] = testEnv[key];
}
delete buildEnv.FIRESTORE_EMULATOR_HOST;
delete buildEnv.FIREBASE_AUTH_EMULATOR_HOST;
delete buildEnv.FIREBASE_STORAGE_EMULATOR_HOST;
delete buildEnv.FIREBASE_PROJECT_ID;
delete buildEnv.FIREBASE_CLIENT_EMAIL;
delete buildEnv.FIREBASE_PRIVATE_KEY;

function run(command, args, env) {
  return spawn(command, args, { stdio: "inherit", env, shell: false });
}

async function main() {
  console.log("[e2e] building (no Firebase credentials, so nothing blocks on the emulator)…");
  await new Promise((resolve, reject) => {
    const build = run("npx", ["next", "build"], buildEnv);
    build.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`build failed with code ${code}`)),
    );
  });

  console.log("[e2e] starting emulators, seeding, serving…");
  const child = run(
    "npx",
    [
      "firebase",
      "emulators:exec",
      "--only",
      "auth,firestore,storage",
      "--project",
      "monarchs-mc-test",
      `npx tsx scripts/seed.ts && npx next start -p ${PORT} -H 127.0.0.1`,
    ],
    runtimeEnv,
  );

  const shutdown = () => {
    child.kill("SIGTERM");
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((error) => {
  console.error("[e2e]", error.message);
  process.exit(1);
});
