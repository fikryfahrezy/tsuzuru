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
  "spelling-variants.json": "data/spelling-variants/bank.json",
  "spelling-variants.md": "data/spelling-variants/README.md",
  "hint-glossary.json": "data/hint-glossary/bank.json",
  "sentence-levels.json": "data/sentence-levels/bank.json",
  "sentence-level-supplement.json": "data/sentence-levels/supplement.json",
  "hint-glossary.md": "data/hint-glossary/README.md",
  "sudachi-legal.txt": "data/spelling-variants/SUDACHI-LEGAL.txt",
  "sudachi-license.txt": "data/spelling-variants/APACHE-2.0.txt",
};
for (const [name, path] of Object.entries(documents)) {
  await writeFile(resolve(output, name), await readFile(resolve(root, path)));
}
