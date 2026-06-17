import { spawnSync } from "node:child_process";

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (process.env.OPENNEXT_BUILD === "1") {
  run("npm", ["run", "build:next"]);
} else {
  run("npx", ["opennextjs-cloudflare", "build"], { OPENNEXT_BUILD: "1" });
  run("node", ["scripts/prepare-sites-dist.mjs"]);
}
