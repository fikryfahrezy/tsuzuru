import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function preparePwa(output: string) {
  const root = resolve(import.meta.dirname, "..");
  const template = await readFile(
    resolve(root, "scripts/pwa-worker.js"),
    "utf8",
  );
  const files = (await readdir(output, { recursive: true }))
    .filter(
      (file) =>
        (file.startsWith("_nuxt/") && /\.(js|css|woff2?)$/.test(file)) ||
        file.startsWith("app/icons/") ||
        file === "app/manifest.webmanifest" ||
        file === "favicon.svg",
    )
    .sort();
  if (!files.some((file) => file.startsWith("_nuxt/"))) {
    throw new Error(
      "Build the Nuxt client before preparing the service worker.",
    );
  }
  const hash = createHash("sha256").update(template);
  for (const file of files) {
    hash.update(file).update(await readFile(resolve(output, file)));
  }
  await writeFile(
    resolve(output, "sw.js"),
    template
      .replace("__PWA_VERSION__", hash.digest("hex").slice(0, 16))
      .replace(
        '"__PWA_ASSETS__"',
        JSON.stringify(files.map((file) => `/${file}`)),
      ),
  );
}
