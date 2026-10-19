import { grammarMatcher } from "./grammar-matcher";
import type { GrammarAnnotation } from "../../shared/answer-entries";
import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";
import { verbForms } from "./verb-forms";
import { finite, humans } from "./grammar-context";
import { referenceLexemes } from "./reference-lexemes";
import { potentialDerivation } from "./potential-forms";
import { potentialEndings } from "./grammar-rules/voice";
import { rareruForm } from "./rareru-forms";
import {
  voiceMatches,
  type VoiceAnalysis,
  type VoiceEvidence,
  type VoiceRole,
} from "./voice-analysis";
const passiveVerbs = new Set([
  "褒める",
  "ほめる",
  "叱る",
  "しかる",
  "責める",
  "殴る",
  "叩く",
  "殺す",
  "追う",
  "追いかける",
  "捕まえる",
  "捕える",
  "嫌う",
  "傷つける",
  "だます",
  "騙す",
  "裏切る",
]);
const endings = [
  "る",
  "ます",
  "た",
  "ました",
  "ない",
  "ません",
  "なかった",
  "ませんでした",
  "て",
];
const honorific = new Map<string, { id: string; role: VoiceRole }>([
  ["いらっしゃる", { id: "sonkeigo", role: "honorific" }],
  ["おっしゃる", { id: "sonkeigo", role: "honorific" }],
  ["なさる", { id: "sonkeigo", role: "honorific" }],
  ["召し上がる", { id: "sonkeigo", role: "honorific" }],
  ["伺う", { id: "kenjougo", role: "humble" }],
  ["申す", { id: "kenjougo", role: "humble" }],
  ["申し上げる", { id: "kenjougo", role: "humble" }],
]);

export function analyzeVoice(
  sentence: Sentence,
  base: AnswerEntry[],
): VoiceAnalysis[] {
  const analyses: VoiceAnalysis[] = [];
  const text = sentence.reference.japanese;
  const lexemes = referenceLexemes(sentence);
  const { longest } = grammarMatcher(sentence, base);
  function record(
    match: GrammarAnnotation | undefined,
    entry: AnswerEntry,
    role: VoiceRole,
    evidence: VoiceEvidence,
    derivedLemma?: string,
  ) {
    if (match || derivedLemma)
      analyses.push({
        start: entry.start,
        originalLemma: entry.dictionaryForm,
        derivedLemma,
        role,
        evidence,
        match,
      });
  }
  for (const [index, entry] of base.entries()) {
    const potential = potentialDerivation(entry, text.slice(entry.start));
    if (potential)
      record(
        longest(
          entry.start,
          potentialEndings.map((ending) => potential.slice(0, -1) + ending),
          "eru-rareru-potential",
        ),
        entry,
        "potential",
        { kind: "reviewed-potential" },
        potential,
      );
    const lemma = entry.dictionaryForm ?? entry.japanese;
    const lesson = honorific.get(lemma);
    if (lesson && entry.wordTypes.includes("Verb"))
      for (const forms of verbForms(lemma))
        record(
          longest(
            entry.start,
            [
              lemma,
              forms.te,
              forms.te.replace(/て$/u, "た").replace(/で$/u, "だ"),
              forms.stem + "ます",
              forms.stem + "ました",
              forms.stem + "ません",
              forms.negative + "い",
            ],
            lesson.id,
          ),
          entry,
          lesson.role,
          { kind: "lexical-register" },
        );
    if (entry.japanese === "拝見")
      record(
        longest(
          entry.start,
          ["拝見する", "拝見します", "拝見した", "拝見しました", "拝見して"],
          "kenjougo",
        ),
        entry,
        "humble",
        { kind: "lexical-register" },
      );
    if (
      entry.japanese !== "に" ||
      !humans.has(base[index - 1]?.japanese ?? "") ||
      base[index - 1]?.end !== entry.start
    )
      continue;
    let cursor = entry.end;
    for (const predicate of base.slice(index + 1)) {
      if (text.slice(cursor, predicate.start)) break;
      cursor = predicate.end;
      if (
        !predicate.wordTypes.includes("Verb") ||
        predicate.wordTypes.includes("Noun")
      ) {
        if (finite(predicate)) break;
        continue;
      }
      const original = predicate.dictionaryForm ?? predicate.japanese;
      const verbClass = lexemes.find(
        (word) =>
          word.japanese === predicate.japanese &&
          word.reading === predicate.kana,
      )?.verbClass;
      if (passiveVerbs.has(original))
        for (const forms of verbForms(original, verbClass)) {
          const root =
            forms.stem === original.slice(0, -1)
              ? forms.stem + "られ"
              : forms.negative.slice(0, -1) + "れ";
          record(
            longest(
              predicate.start,
              endings.map((ending) => root + ending),
              "reru-rareru-passive",
            ),
            predicate,
            "passive",
            { kind: "human-agent" },
            rareruForm(predicate, verbClass)?.lemma,
          );
        }
      break;
    }
  }
  return analyses;
}

export function voiceGrammar(
  sentence: Sentence,
  base: AnswerEntry[],
): GrammarAnnotation[] {
  return voiceMatches(analyzeVoice(sentence, base));
}
