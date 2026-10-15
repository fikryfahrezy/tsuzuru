// Runs Python data tools in the project's pinned Sudachi environment.
//
//   bun scripts/python-tools.ts --setup            create or update the environment
//   bun scripts/python-tools.ts <python args...>   run Python inside it
//
// Generated banks are compared byte for byte in CI, so tools must run with the
// exact SudachiPy and SudachiDict versions in scripts/spelling-requirements.txt.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const environment = resolve(root, ".cache/spelling-tools");
const bin = resolve(
  environment,
  process.platform === "win32" ? "Scripts" : "bin",
);
const python = resolve(
  bin,
  process.platform === "win32" ? "python.exe" : "python",
);
const requirements = resolve(root, "scripts/spelling-requirements.txt");
// A copy of the requirements the environment was built from.
const installed = resolve(environment, "installed-requirements.txt");

function run(command: string[]): number {
  return Bun.spawnSync(command, {
    cwd: root,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }).exitCode;
}

function fail(message: string): never {
  console.error(`${message}\nRun: bun run tools:setup`);
  process.exit(1);
}

const args = process.argv.slice(2);
if (args[0] === "--setup") {
  // Re-running venv over an existing environment can rewrite its interpreter
  // path, so only create one when it is missing.
  if (!existsSync(python)) {
    // Resolve shims (pyenv, uv, Homebrew links) to the real interpreter;
    // venv records the launcher's directory as the environment's home.
    const resolved = Bun.spawnSync([
      "python3",
      "-c",
      "import os, sys; print(os.path.realpath(sys.executable))",
    ]);
    if (resolved.exitCode !== 0) {
      console.error("Install Python 3, then run: bun run tools:setup");
      process.exit(1);
    }
    const interpreter = resolved.stdout.toString().trim();
    const code = run([interpreter, "-m", "venv", environment]);
    if (code !== 0) process.exit(code);
  }
  const code = run([
    python,
    "-m",
    "pip",
    "install",
    "--quiet",
    "--disable-pip-version-check",
    "-r",
    requirements,
  ]);
  if (code !== 0) process.exit(code);
  writeFileSync(installed, readFileSync(requirements));
  console.log(`Python tools ready in ${environment}`);
  process.exit(0);
}

if (!existsSync(python)) fail("Python tools are not installed.");
if (
  !existsSync(installed) ||
  readFileSync(installed, "utf8") !== readFileSync(requirements, "utf8")
)
  fail("Python tools are out of date with scripts/spelling-requirements.txt.");
process.exit(run([python, ...args]));
