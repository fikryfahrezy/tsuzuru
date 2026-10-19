import type { GrammarAnnotation } from "../../shared/answer-entries";
import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";
import { verbGrammar } from "./verb-grammar";
import { questionGrammar } from "./question-grammar";
import { comparisonGrammar } from "./comparison-grammar";
import { clauseGrammar } from "./clause-grammar";
import { particleGrammar } from "./particle-grammar";
import { predicateGrammar } from "./predicate-grammar";
import { structuralGrammar } from "./structural-grammar";
import { constructionGrammar } from "./construction-grammar";
import { scopeGrammar } from "./scope-grammar";
import { nominalGrammar } from "./nominal-grammar";
import { derivationGrammar } from "./derivation-grammar";
import { contextGrammar } from "./context-grammar";
import { analyzeVoice } from "./voice-grammar";
import { emphaticGrammar } from "./emphatic-grammar";
import { analyzeRareruVoice } from "./rareru-grammar";
import { voiceMatches } from "./voice-analysis";

// Dependencies between passes are explicit: verb constructions and context
// need voice evidence, scope needs verb matches, and emphatic wrappers inspect
// the initial detections.
export function detectGrammar(
  sentence: Sentence,
  base: AnswerEntry[],
): GrammarAnnotation[] {
  const voiceAnalyses = [
    ...analyzeVoice(sentence, base),
    ...analyzeRareruVoice(sentence, base),
  ];
  const voices = voiceMatches(voiceAnalyses);
  const verbs = verbGrammar(sentence, base, voiceAnalyses);
  const rawDetected = [
    ...verbs,
    ...questionGrammar(sentence, base),
    ...comparisonGrammar(sentence, base),
    ...clauseGrammar(sentence, base),
    ...particleGrammar(sentence, base),
    ...predicateGrammar(sentence, base),
    ...structuralGrammar(sentence, base),
    ...constructionGrammar(sentence, base),
    ...scopeGrammar(sentence, base, verbs),
    ...nominalGrammar(sentence, base),
    ...derivationGrammar(sentence, base),
    ...contextGrammar(sentence, base, voices),
    ...voices,
  ];
  return [...rawDetected, ...emphaticGrammar(sentence, base, rawDetected)];
}
