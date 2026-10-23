// Print the reference words OpenJLPT cannot explain, for generate-reference-glosses.py.
import { glossKey, glossTargets } from "../server/utils/answer-breakdown";
import { exercises } from "../server/utils/exercises";

type Target = ReturnType<typeof glossTargets>[number] & { english?: string[] };
const targets = new Map<string, Target>();
for (const sentence of exercises)
  for (const target of glossTargets(sentence)) {
    const key = glossKey(target, target.lemma);
    const found = targets.get(key) ?? target;
    // A katakana word's translations confirm its sense (サッカー: soccer).
    if (/^[ァ-ヶー・]+$/u.test(target.japanese))
      found.english = [...(found.english ?? []), sentence.english];
    targets.set(key, found);
  }
console.log(
  JSON.stringify(
    [...targets.values()].sort(
      (a, b) =>
        a.japanese.localeCompare(b.japanese) ||
        a.kana.localeCompare(b.kana) ||
        (a.lemma ?? "").localeCompare(b.lemma ?? ""),
    ),
  ),
);
