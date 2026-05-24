import { existsSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(scriptDir);
const releaseDir = join(projectRoot, "src-tauri", "target", "release");
const artifactName = process.platform === "win32" ? "one-word-reader.exe" : "one-word-reader";
const artifactPath = join(releaseDir, artifactName);

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    fail(`Unable to run '${command}': ${result.error.message}`);
  }

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
}

function checkCommand(command) {
  const result = spawnSync(command, ["--version"], {
    cwd: projectRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  if (result.error || result.status !== 0) {
    fail(`'${command}' not found. Install it and try again.`);
  }

  const version = result.stdout.trim() || result.stderr.trim();
  console.log(`  ${version}`);
}

console.log("\n==> Checking prerequisites");
checkCommand("bun");
checkCommand("rustc");
checkCommand("cargo");

if (!existsSync(join(projectRoot, "node_modules"))) {
  console.log("\n==> Installing JavaScript dependencies");
  run("bun", ["install", "--frozen-lockfile"]);
} else {
  console.log("\n==> Using existing JavaScript dependencies");
}

console.log("\n==> Building Tauri release artifact");
run("bun", ["tauri", "build", "--no-bundle"]);

console.log("\n==> Build artifact");
if (existsSync(artifactPath)) {
  const sizeInMb = statSync(artifactPath).size / (1024 * 1024);
  console.log(`  Artifact: ${artifactPath}`);
  console.log(`  Size:     ${sizeInMb.toFixed(2)} MB`);
} else {
  console.log(`  Expected artifact was not found at ${artifactPath}`);
}

console.log("\nBuild complete!");
