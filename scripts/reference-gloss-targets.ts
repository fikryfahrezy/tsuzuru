// Print the reference words OpenJLPT cannot explain, for generate-reference-glosses.py.
import { glossTargets } from "../server/utils/answer-breakdown";
import { exercises } from "../server/utils/exercises";

const targets = new Map<string, ReturnType<typeof glossTargets>[number]>();
for (const sentence of exercises)
  for (const target of glossTargets(sentence))
    targets.set(`${target.japanese}\u0000${target.kana}`, target);
console.log(
  JSON.stringify(
    [...targets.values()].sort(
      (a, b) =>
        a.japanese.localeCompare(b.japanese) || a.kana.localeCompare(b.kana),
    ),
  ),
);
