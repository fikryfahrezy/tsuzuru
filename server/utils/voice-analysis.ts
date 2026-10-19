import type { GrammarAnnotation } from "../../shared/answer-entries";

export type VoiceRole = "potential" | "passive" | "honorific" | "humble";

export interface EnglishVoiceEvidence {
  ability: boolean;
  passive: boolean;
  respectfulActive: boolean;
}

export interface JapaneseVoiceRoles {
  hasObject: boolean;
  hasAgent: boolean;
  respectfulSubject: boolean;
}

export type VoiceEvidence =
  | { kind: "reviewed-potential" }
  | { kind: "lexical-register" }
  | { kind: "human-agent" }
  | {
      kind: "aligned-translation";
      english: EnglishVoiceEvidence;
      japanese: JapaneseVoiceRoles;
    };

// A reviewed potential may supply construction morphology even when no lesson
// span ends at a tokenizer boundary (e.g. one token covering 読めるようになった).
export interface VoiceAnalysis {
  start: number;
  originalLemma?: string;
  // Present only when the existing reviewed construction morphology permits it.
  derivedLemma?: string;
  role: VoiceRole;
  evidence: VoiceEvidence;
  match?: GrammarAnnotation;
}

export const voiceMatches = (analyses: VoiceAnalysis[]): GrammarAnnotation[] =>
  analyses.flatMap((analysis) => (analysis.match ? [analysis.match] : []));
