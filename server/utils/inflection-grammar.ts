import type { GrammarAnnotation } from "../../shared/answer-entries";
import type { AnswerEntry } from "./answer-entries";
import { potentialDerivation } from "./potential-forms";
import {
  allowsPredicateInflection,
  permitsClauseContent,
} from "./grammar-policy";
import { overlaps } from "./grammar-matcher";
import { grammarById } from "./grammar-reference";

// Lessons built on the た form, where た is not past tense: 見たことがある,
// 食べたら, 食べたり, 行ったほうがいい, 見たまま. Lessons that only follow a
// past verb (食べたんでしょう, 行ったはず) keep its tense.
const taBased = new Set([
  "ta-koto-ga-aru",
  "tara",
  "tara-dou",
  "tari-tari-suru",
  "hou-ga-ii",
  "ato-de",
  "ta-bakari",
  "ta-totan-ta-totan-ni",
  "mama",
  // Hypothetical: あったとしても, 起こったとすれば.
  "to-shite-mo",
  "to-sureba-to-shitara",
]);
const pattern = (id: string) => grammarById.get(id)?.pattern ?? "";
// Forms a larger lesson leaves to the verb, each with a test for the
// lessons built on it: なければならない and かもしれない contain ない, and
// 〜てくれませんか and 〜ますように contain their polite form.
const keptForms: Record<string, (owner: string) => boolean> = {
  ta: (owner) => taBased.has(owner),
  nai: (owner) => /ない|なく|ず|ません/u.test(pattern(owner)),
  masu: (owner) => /ます/u.test(pattern(owner)),
  mashita: (owner) => /ました/u.test(pattern(owner)),
  // ません is a polite negative, so a negative lesson already explains half
  // of it (してはいけません, かもしれません).
  masen: (owner) => /ない|なく|ず|ませ/u.test(pattern(owner)),
  "masen-deshita": (owner) => /ない|なく|ず|ませ/u.test(pattern(owner)),
};

// Only unambiguous standalone forms belong here. Contextual handlers
// cover specific constructions (e.g. がほしい, てから, and question か).
// Particle handlers use neighboring words, predicate roles, and lexical cues.
// Ambiguous uses still need annotations; spelling alone cannot select a lesson.
const standalone: Record<string, string> = {
  は: "wa",
  を: "o",
  へ: "e",
  も: "mo",
  や: "ya",
  まで: "made",
  ね: "ne",
  よ: "yo",
  です: "desu",
  でした: "deshita",
  だ: "da",
  ではない: "de-wa-arimasen-ja-nai",
  じゃない: "de-wa-arimasen-ja-nai",
  ではありません: "de-wa-arimasen-ja-nai",
};

function formGrammar(entry: AnswerEntry): string[] {
  const id = standalone[entry.japanese];
  if (id) return [id];
  // A suffix alone does not establish grammar (e.g. 頭 is not a past verb).
  const lemma = entry.dictionaryForm ?? potentialDerivation(entry);
  if (!lemma || lemma === entry.japanese) return [];
  if (entry.wordTypes.includes("Verb")) {
    if (entry.japanese.endsWith("なかった")) return ["nai", "ta"];
    for (const [ending, grammarId] of [
      ["ませんでした", "masen-deshita"],
      ["ました", "mashita"],
      ["ません", "masen"],
      ["ます", "masu"],
      ["ましょう", "mashou"],
      ["ない", "nai"],
      ["た", "ta"],
      ["だ", "ta"],
      ["て", "te"],
      ["で", "te"],
    ] as const) {
      if (!entry.japanese.endsWith(ending)) continue;
      // Voiced past and て forms follow ん or い (読んだ, 泳いで); すべきだ and
      // すべきで end in a copula.
      if (/^[だで]$/u.test(ending) && !/[んい][だで]$/u.test(entry.japanese))
        continue;
      return [grammarId];
    }
  }
  if (
    entry.wordTypes.includes("い-adjective") &&
    /(?:くない|かった|くなかった)$/u.test(entry.japanese)
  ) {
    return ["ku-nai-katta-ku-nakatta"];
  }
  return [];
}

export function inflectionGrammar(
  base: AnswerEntry[],
  contextual: GrammarAnnotation[],
): GrammarAnnotation[] {
  // Work on the matched predicate span, which may cross tokenizer words.
  // A containing construction still owns its component inflections.
  const inflections = contextual
    .filter((match) => allowsPredicateInflection(match, contextual))
    .map((match) => {
      const words = base.filter(
        (part) => part.start >= match.start && part.end <= match.end,
      );
      const first = words[0];
      const entry = first
        ? {
            ...first,
            japanese: match.japanese,
            end: match.end,
            wordTypes: ["Verb"],
            dictionaryForm:
              first.dictionaryForm ??
              words.find(
                (part) =>
                  part.wordTypes.includes("Verb") && part.dictionaryForm,
              )?.dictionaryForm,
          }
        : undefined;
      return { ...match, grammarIds: entry ? formGrammar(entry) : [] };
    });
  const automatic = base.flatMap((part) => {
    const owners = contextual.filter(
      (annotation) =>
        overlaps(annotation, part) && !permitsClauseContent(annotation, part),
    );
    if (!owners.length) return [{ ...part, grammarIds: formGrammar(part) }];
    // Tense, negation and politeness inside a larger lesson are still shown
    // (なってきた, 満たしていない, 座っていました), unless that lesson is built
    // on the form or its span already explains it.
    const kept = formGrammar(part).filter(
      (id) =>
        Object.hasOwn(keptForms, id) &&
        !owners.some((owner) =>
          owner.grammarIds.some((ownerId) => keptForms[id]!(ownerId)),
        ) &&
        !inflections.some(
          (match) => overlaps(match, part) && match.grammarIds.includes(id),
        ) &&
        // した + まえ is the imperative たまえ (出さないようにしたまえ).
        !(
          id === "ta" &&
          base.some(
            (word) => word.start === part.end && word.japanese === "まえ",
          )
        ),
    );
    return kept.length ? [{ ...part, grammarIds: kept }] : [];
  });
  return [...inflections, ...automatic];
}
