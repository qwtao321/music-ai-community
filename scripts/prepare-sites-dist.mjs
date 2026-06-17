import { access, copyFile, cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const openNextDir = path.join(root, ".open-next");
const distDir = path.join(root, "dist");
const distServerDir = path.join(distDir, "server");
const distClientDir = path.join(distDir, "client");
const distOpenAiDir = path.join(distDir, ".openai");
const hostingSource = path.join(root, ".openai", "hosting.json");
const hostingTarget = path.join(distOpenAiDir, "hosting.json");

async function assertExists(targetPath, description) {
  try {
    await access(targetPath);
  } catch {
    throw new Error(`Missing ${description}: ${targetPath}`);
  }
}

await assertExists(openNextDir, ".open-next build output");

await rm(distDir, { recursive: true, force: true });
await mkdir(distServerDir, { recursive: true });
await mkdir(distClientDir, { recursive: true });
await mkdir(distOpenAiDir, { recursive: true });

await cp(openNextDir, path.join(distDir, ".open-next"), {
  recursive: true,
  force: true,
});

await writeFile(
  path.join(distServerDir, "index.js"),
  'export { default } from "../.open-next/worker.js";\n',
);

const assetsDir = path.join(openNextDir, "assets");
try {
  await cp(assetsDir, distClientDir, { recursive: true, force: true });
} catch {
  // Some builds may inline all assets elsewhere; keep the artifact valid either way.
}

try {
  await copyFile(hostingSource, hostingTarget);
} catch {
  // The save/deploy flow can still include the repo copy if this source file is absent.
}
