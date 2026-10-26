import type { GrammarAnnotation } from "../../shared/answer-entries";
import { lessonPolicies } from "./grammar-rules/lesson-policy";
import { overlaps, sameSpan } from "./grammar-matcher";
import { grammarById } from "./grammar-reference";

export const retainsNestedDerivation = (match: GrammarAnnotation) =>
  match.grammarIds.some((id) => lessonPolicies[id]?.retainNestedDerivation);

const isInflectedPredicate = (match: GrammarAnnotation) =>
  match.grammarIds.every(
    (id) => lessonPolicies[id]?.explainPredicateInflection,
  );

function clauseMarkerEnd(match: GrammarAnnotation, id: string) {
  const prefix = lessonPolicies[id]?.clauseContentAfter?.find((marker) =>
    match.japanese.startsWith(marker),
  );
  return prefix === undefined ? undefined : match.start + prefix.length;
}

export function permitsClauseContent(
  outer: GrammarAnnotation,
  inner: { start: number; end: number },
) {
  return outer.grammarIds.every((id) => {
    const markerEnd = clauseMarkerEnd(outer, id);
    return (
      markerEnd !== undefined &&
      inner.start >= markerEnd &&
      inner.end <= outer.end
    );
  });
}

export function contextualParticleNote(
  part: { japanese: string; start: number; end: number },
  contextual: GrammarAnnotation[],
) {
  if (part.japanese !== "も") return;
  const scope = contextual.find(
    (match) =>
      match.grammarIds.includes("nani-mo-nai-dare-mo-nai") &&
      part.start >= match.start &&
      part.end <=
        (clauseMarkerEnd(match, "nani-mo-nai-dare-mo-nai") ?? match.start),
  );
  if (scope)
    return "With だれ/誰 or なに/何 and a negative predicate, も forms ‘nobody’ or ‘nothing’.";
}

const obligationIds = [
  "nakereba-naranai-nakute-wa-ikenai",
  "nai-to-ikenai-nakucha",
];

// The verb that opens an obligation often carries the condition inside it
// (出さなきゃ, 払わなければ), so no separate は or と can explain the "if".
const conditionForms: [string, string][] = [
  ["なければ", "the conditional of ない"],
  ["なきゃ", "short for なければ"],
  ["なくっちゃ", "short for なくては"],
  ["なくちゃ", "short for なくては"],
  ["なくては", "the て-form of ない plus は"],
  ["ねば", "a literary form of なければ"],
  ["ないと", "ない plus と"],
];

export function contextualConditionNote(
  part: { japanese: string; start: number; end: number },
  contextual: GrammarAnnotation[],
) {
  // The word may begin before the lesson span: 気をつけなければ.
  const opens = contextual.some(
    (match) =>
      match.grammarIds.some((id) => obligationIds.includes(id)) &&
      part.start <= match.start &&
      part.end > match.start,
  );
  if (!opens) return;
  // でなければならない: で is the copula, "must be".
  if (part.japanese === "で")
    return "Here で is the connective form of だ (‘is’), so でなければならない means ‘must be’.";
  return conditionNote(part.japanese);
}

function conditionNote(japanese: string) {
  const form = conditionForms.find(([ending]) => japanese.endsWith(ending));
  if (!form) return;
  return `${form[0]} is ${form[1]}: ‘if (you) don’t …’. Followed by ならない, いけない or だめ, or with the rest left unsaid, it means ‘must’.`;
}

// Words after the verb in an obligation (なくては + なりません) or a
// prohibition (ては + ならない) belong to the construction: は is not the topic
// and ならない does not mean "become".
export function contextualObligationNote(
  part: { japanese: string; start: number; end: number },
  contextual: GrammarAnnotation[],
) {
  const scope = contextual.find(
    (match) =>
      match.grammarIds.some(
        (id) => obligationIds.includes(id) || id === "te-wa-ikenai",
      ) &&
      part.start > match.start &&
      part.start < match.end,
  );
  if (!scope) return;
  const prohibition = scope.grammarIds.includes("te-wa-ikenai");
  if (part.japanese === "は")
    return prohibition
      ? "Part of 〜ては: after a て-form, は makes the condition ‘if (you) do …’. Pronounced wa."
      : "Part of 〜なくては: after a negative て-form, は makes the condition ‘if (you) don’t …’. Pronounced wa.";
  if (part.japanese === "と") return "Part of 〜ないと: ‘if (you) don’t …’.";
  if (part.japanese === "ちゃ" || part.japanese === "っちゃ")
    return "Part of 〜なくちゃ: ちゃ is short for ては, so なくちゃ means ‘if (you) don’t …’, and so ‘must’.";
  // でなければならない: the condition is its own word after で.
  const condition = prohibition ? undefined : conditionNote(part.japanese);
  if (condition) return condition;
  if (/^(?:なら|なり|いけ|ダメ|だめ|駄目)/u.test(part.japanese))
    return prohibition
      ? "Part of the prohibition pattern: literally ‘(it) won’t do’, so together with the condition it means ‘must not’."
      : "Part of the obligation pattern: literally ‘(it) won’t do’, so together with the negative condition it means ‘must’ or ‘have to’.";
}

// Possible masu-stems of a dictionary form: 諦める → 諦め, 書く → 書き.
// Kana spellings such as あきらめる may be missing from the vocabulary.
const iRow: Record<string, string> = {
  う: "い",
  く: "き",
  ぐ: "ぎ",
  す: "し",
  つ: "ち",
  ぬ: "に",
  ぶ: "び",
  む: "み",
  る: "り",
};
const verbStems = (lemma: string) => {
  const root = lemma.slice(0, -1);
  const godan = iRow[lemma.at(-1)!];
  return [
    ...(lemma.endsWith("る") ? [root] : []),
    ...(godan ? [root + godan] : []),
  ];
};

type BreakdownWord = {
  japanese: string;
  start: number;
  end: number;
  wordTypes: string[];
  dictionaryForm?: string;
};

// な outside a detected lesson, told apart by its neighbours.
export function contextualNaNote(
  text: string,
  parts: BreakdownWord[],
  index: number,
) {
  const part = parts[index]!;
  if (part.japanese !== "な") return;
  const previous = parts[index - 1];
  const next = parts[index + 1];
  const after = text.slice(part.end);
  if (/^[のん]/u.test(after))
    return "Links a noun or な-adjective to の or ん, which explains or emphasizes (病気なのです, きれいなんだ, 近視なので).";
  if (
    previous?.end === part.start &&
    previous.wordTypes.includes("Verb") &&
    // A causative in its dictionary form lists する as its lemma: させるな.
    ((previous.dictionaryForm ?? previous.japanese) === previous.japanese ||
      previous.japanese.endsWith("せる")) &&
    /[うくぐすつぬぶむる]$/u.test(previous.japanese)
  )
    return "After a verb's dictionary form, な means ‘don't’ (a strong prohibition).";
  // Stem + な at the end is a casual なさい: あきらめな "just give up".
  if (
    previous?.end === part.start &&
    previous.wordTypes.includes("Verb") &&
    previous.dictionaryForm &&
    verbStems(previous.dictionaryForm).includes(previous.japanese) &&
    /^(?:[。！？?!…」』]|$)/u.test(after)
  )
    return "After a verb's stem, な is a casual command, short for なさい (あきらめな ‘just give up’).";
  if (previous?.japanese === "か" && previous.end === part.start)
    return "With か at the end of a sentence: ‘I wonder …’ (雨が降るかな).";
  if (
    next?.wordTypes.includes("Noun") &&
    // A comma may separate a list of modifiers: きれいな、緑の地球.
    (next.start === part.end ||
      (/^[、,]$/u.test(text.slice(part.end, next.start)) &&
        !!previous?.wordTypes.includes("な-adjective"))) &&
    !previous?.wordTypes.some((type) => type === "Verb" || type === "Particle")
  )
    return "Links a な-adjective to the noun it describes (静かな部屋).";
  if (/^(?:[。！？?!、,～〜…」』]|と|$)/u.test(after))
    return "Sentence-ending particle: adds feeling or invites agreement (いいな, だよな).";
}

// A grammatical word inside a lesson span is explained by the lesson itself.
export function contextualPatternNote(
  part: { start: number; end: number },
  contextual: GrammarAnnotation[],
) {
  // The narrowest span wins: いる in 終わろうとしている belongs to 〜ている.
  const scope = contextual
    .filter(
      (match) =>
        part.start > match.start &&
        part.start < match.end &&
        match.grammarIds.some((id) => lessonPolicies[id]?.explainInnerWords),
    )
    .sort((a, b) => a.end - a.start - (b.end - b.start))[0];
  const id = scope?.grammarIds.find(
    (id) => lessonPolicies[id]?.explainInnerWords,
  );
  const lesson = id ? grammarById.get(id) : undefined;
  return lesson && `Part of ${lesson.pattern}: ${lesson.meaning}.`;
}

export function allowsPredicateInflection(
  match: GrammarAnnotation,
  contextual: GrammarAnnotation[],
) {
  return (
    isInflectedPredicate(match) &&
    !contextual.some(
      (other) =>
        other !== match &&
        overlaps(other, match) &&
        !permitsClauseContent(other, match) &&
        !(sameSpan(other, match) && isInflectedPredicate(other)),
    )
  );
}
