import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";
import { grammarMatcher } from "./grammar-matcher";
import { potentialEndings } from "./grammar-rules/voice";
import { rareruForm } from "./rareru-forms";
import { referenceLexemes } from "./reference-lexemes";
import {
  alignedEnglishVoice,
  japaneseVoiceRoles,
  resolveRareruRole,
  voiceSentenceContext,
} from "./rareru-context";
import { voiceMatches, type VoiceAnalysis } from "./voice-analysis";

const lessons = {
  potential: "eru-rareru-potential",
  passive: "reru-rareru-passive",
  honorific: "reru-rareru-honorific",
} as const;

export function analyzeRareruVoice(
  sentence: Sentence,
  base: AnswerEntry[],
): VoiceAnalysis[] {
  const analyses: VoiceAnalysis[] = [];
  const english = voiceSentenceContext(sentence, base);
  if (english === undefined) return analyses;
  const { longest } = grammarMatcher(sentence, base);
  const lexemes = referenceLexemes(sentence);
  for (const [index, entry] of base.entries()) {
    const candidate = rareruForm(
      entry,
      lexemes.find(
        (p) => p.japanese === entry.japanese && p.reading === entry.kana,
      )?.verbClass,
    );
    if (!candidate) continue;
    const evidence = alignedEnglishVoice(candidate.action, english);
    if (!evidence) continue;
    const japanese = japaneseVoiceRoles(base, index);
    const role = resolveRareruRole(evidence, japanese);
    if (!role) continue;
    const match = longest(
      entry.start,
      [...potentialEndings, "なくて"].map((ending) => candidate.root + ending),
      lessons[role],
    );
    if (match)
      analyses.push({
        start: entry.start,
        originalLemma: entry.dictionaryForm,
        derivedLemma: candidate.lemma,
        role,
        evidence: { kind: "aligned-translation", english: evidence, japanese },
        match,
      });
  }
  return analyses;
}

export function rareruGrammar(sentence: Sentence, base: AnswerEntry[]) {
  return voiceMatches(analyzeRareruVoice(sentence, base));
}
