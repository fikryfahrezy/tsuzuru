export enum PracticeDifficulty {
  Guided = "guided",
  Challenge = "challenge",
}

export enum PracticePermission {
  AnswerBreakdown = "answer-breakdown",
  GrammarReference = "grammar-reference",
  RomajiHint = "romaji-hint",
  WordHints = "word-hints",
}

// Permissions apply to aids during practice; feedback and journal review stay available.
export const difficultyPermissions: Record<
  PracticeDifficulty,
  readonly PracticePermission[]
> = {
  [PracticeDifficulty.Guided]: [
    PracticePermission.AnswerBreakdown,
    PracticePermission.GrammarReference,
    PracticePermission.RomajiHint,
    PracticePermission.WordHints,
  ],
  [PracticeDifficulty.Challenge]: [],
};

export const difficultyOptions = [
  {
    value: PracticeDifficulty.Guided,
    label: "Guided",
    note: "Practice with breakdowns, grammar reference, romaji, and word hints.",
  },
  {
    value: PracticeDifficulty.Challenge,
    label: "Challenge",
    note: "Practice without those aids. Answer breakdowns remain available after checking and in the journal.",
  },
] as const;

export function isPracticeDifficulty(
  value: unknown,
): value is PracticeDifficulty {
  return Object.values(PracticeDifficulty).some(
    (difficulty) => difficulty === value,
  );
}

export function hasPracticePermission(
  difficulty: PracticeDifficulty,
  permission: PracticePermission,
): boolean {
  return difficultyPermissions[difficulty].includes(permission);
}
