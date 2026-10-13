import { existsSync } from "node:fs";

if (
  !process.env.CI &&
  process.env.NODE_ENV !== "production" &&
  existsSync(new URL("../.git", import.meta.url))
) {
  const result = Bun.spawnSync(["bun", "--bun", "lefthook", "install"], {
    stdout: "inherit",
    stderr: "inherit",
  });
  process.exit(result.exitCode);
}
