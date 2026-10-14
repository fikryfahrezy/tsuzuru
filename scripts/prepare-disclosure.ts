import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(
  await readFile(resolve(root, "data/manifest.json"), "utf8"),
) as { snapshotPath: string };
const output = resolve(root, "public/disclosures");
await mkdir(output, { recursive: true });
const documents = {
  "data-disclosure.md": "DATA_DISCLOSURE.md",
  "openjlpt-notice.md": `${manifest.snapshotPath}/NOTICE.md`,
  "openjlpt-license.txt": `${manifest.snapshotPath}/LICENSE`,
  "manifest.json": "data/manifest.json",
  "accepted-alternatives.json": "data/alternatives/answers.json",
};
for (const [name, path] of Object.entries(documents)) {
  await writeFile(resolve(output, name), await readFile(resolve(root, path)));
}
