import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";
import { humans } from "./grammar-context";
import { respectfulSubjects, type VoiceAction } from "./grammar-rules/voice";
import type {
  EnglishVoiceEvidence,
  JapaneseVoiceRoles,
  VoiceRole,
} from "./voice-analysis";

const alternatives = (words: string[]) =>
  words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("|");
const adverbs =
  "(?:(?:always|never|still|already|only|easily|soon|often|usually|not)\\s+)*";
const modalPassive =
  /\b(?:can|cannot|can't|could|couldn't|may|might|must|should|would|will)\s+(?:not\s+)?(?:have\s+)?(?:be|been|being)\b/u;

function compileAction(action: VoiceAction) {
  const allActions = [
    ...new Set([...action.base, ...action.active, ...action.passive]),
  ];
  return {
    occurrences: new RegExp(`\\b(?:${alternatives(allActions)})\\b`, "gu"),
    ability: new RegExp(
      `\\b(?:can(?:not| not)?|can't|could(?: not)?|couldn't|(?:am|is|are|was|were|be|become|became) (?:not )?able to|(?:am|is|are|was|were) unable to)\\s+${adverbs}(?:${alternatives(action.base)})\\b`,
      "u",
    ),
    passive: action.passive.length
      ? new RegExp(
          `\\b(?:am|is|are|was|were|been|being)\\s+${adverbs}(?:${alternatives(action.passive)})\\b`,
          "u",
        )
      : undefined,
    respectfulActive: new RegExp(
      `^(?:the |my |our )?(?:teacher|professor|president|principal|manager|guest)\\s+${adverbs}(?:${alternatives([...action.base, ...action.active])}|(?:does|did)(?: not|n't)?\\s+${adverbs}(?:${alternatives(action.base)}))\\b`,
      "u",
    ),
  };
}

const actionPatterns = new WeakMap<
  VoiceAction,
  ReturnType<typeof compileAction>
>();

export function voiceSentenceContext(
  sentence: Sentence,
  base: AnswerEntry[],
): string | undefined {
  const english = sentence.english
    .toLowerCase()
    .replaceAll("’", "'")
    .replace(/\b(is|are|was|were)n't\b/gu, "$1 not")
    .trim()
    .replace(/[.!?]$/u, "");
  // Without clause alignment, keep the same conservative scope boundaries.
  if (
    base.filter((p) => p.wordTypes.includes("Verb") && /られ/u.test(p.japanese))
      .length !== 1 ||
    /[。！？!?「」『』]/u.test(
      sentence.reference.japanese.replace(/[。！？!?]$/u, ""),
    ) ||
    /[.!?;"“”「」]/u.test(english) ||
    /(?:^|\s)'|'(?:$|\s)/u.test(english) ||
    /\b(?:said|says|told|asked|wonder|wondered|think|thought|wish)\b/u.test(
      english,
    )
  )
    return;
  return english;
}

export function alignedEnglishVoice(
  action: VoiceAction,
  english: string,
): EnglishVoiceEvidence | undefined {
  let patterns = actionPatterns.get(action);
  if (!patterns) {
    patterns = compileAction(action);
    actionPatterns.set(action, patterns);
  }
  if (
    [...english.matchAll(patterns.occurrences)].length !== 1 ||
    modalPassive.test(english)
  )
    return;
  return {
    ability: patterns.ability.test(english),
    passive: patterns.passive?.test(english) ?? false,
    respectfulActive: patterns.respectfulActive.test(english),
  };
}

export function japaneseVoiceRoles(
  base: AnswerEntry[],
  index: number,
): JapaneseVoiceRoles {
  const before = base.slice(0, index);
  const subjects = before.flatMap((p, i) =>
    ["は", "が"].includes(p.japanese) && p.wordTypes.includes("Particle")
      ? [before[i - 1]?.japanese ?? ""]
      : [],
  );
  return {
    hasObject: before.some(
      (p) => p.japanese === "を" && p.wordTypes.includes("Particle"),
    ),
    hasAgent: before.some(
      (p, i) =>
        p.japanese === "に" && humans.has(before[i - 1]?.japanese ?? ""),
    ),
    respectfulSubject: respectfulSubjects.has(subjects.at(-1) ?? ""),
  };
}

export function resolveRareruRole(
  english: EnglishVoiceEvidence,
  japanese: JapaneseVoiceRoles,
): Exclude<VoiceRole, "humble"> | undefined {
  const respect =
    japanese.respectfulSubject &&
    !japanese.hasAgent &&
    english.respectfulActive;
  if (english.ability && !english.passive && !respect) return "potential";
  if (english.passive && !english.ability && !respect && !japanese.hasObject)
    return "passive";
  if (respect && !english.ability && !english.passive) return "honorific";
}
