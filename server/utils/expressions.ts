import bank from "../../data/expressions/bank.json";
import type { GrammarAnnotation } from "../../shared/answer-entries";
import { hiragana } from "../../shared/practice";
import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";
import { referenceSpellings } from "./reference-spellings";

export interface Expression {
  dictionaryForm: string;
  // Kana of every form; matching compares it with the covered words' kana.
  reading: string;
  forms: string[];
  meanings: string[];
  wordTypes: string[];
}

export const expressions: readonly Expression[] =
  bank.version === 1 ? bank.expressions : [];

interface ExpressionGroup {
  start: number;
  // End of the matched form. The group itself ends at a word boundary.
  formEnd: number;
  inflects: boolean;
}

function matchAt(entries: AnswerEntry[], index: number) {
  let best: { expression: Expression; form: string; count: number } | undefined;
  for (const expression of expressions) {
    for (const form of expression.forms) {
      if (best && form.length <= best.form.length) continue;
      let japanese = "";
      let kana = "";
      let count = 0;
      while (japanese.length < form.length) {
        const entry = entries[index + count];
        // Maintained context wins, and expressions never cross punctuation.
        if (
          !entry ||
          entry.meanings.length ||
          (count && entry.start !== entries[index + count - 1]!.end)
        )
          break;
        japanese += entry.japanese;
        kana += entry.kana;
        count++;
      }
      if (
        japanese.startsWith(form) &&
        kana.startsWith(hiragana(expression.reading))
      )
        best = { expression, form, count };
    }
  }
  return best;
}

// Group consecutive words that start with a listed fixed expression, such as
// もって + こいだ. Groups start and end at word boundaries, so a following
// inflection or copula stays inside the group.
export function withExpressions(sentence: Sentence, entries: AnswerEntry[]) {
  const grouped: AnswerEntry[] = [];
  const groups: ExpressionGroup[] = [];
  for (let index = 0; index < entries.length;) {
    const match = matchAt(entries, index);
    if (!match) {
      grouped.push(entries[index++]!);
      continue;
    }
    const covered = entries.slice(index, index + match.count);
    index += match.count;
    const start = covered[0]!.start;
    const end = covered.at(-1)!.end;
    const japanese = covered.map((part) => part.japanese).join("");
    const kana = covered.map((part) => part.kana).join("");
    const { expression } = match;
    const spellings = referenceSpellings(sentence, { japanese, reading: kana });
    grouped.push({
      entryId: `ja-${start}-${end}`,
      start,
      end,
      japanese,
      kana,
      romaji: covered.map((part) => part.romaji).join(""),
      // A listed expression is general dictionary material, not context.
      meanings: [],
      dictionaryMeanings: expression.meanings,
      wordTypes: expression.wordTypes,
      ...(japanese !== expression.dictionaryForm
        ? { dictionaryForm: expression.dictionaryForm }
        : {}),
      ...(spellings.length ? { spellings } : {}),
    });
    groups.push({
      start,
      formEnd: start + match.form.length,
      inflects: expression.wordTypes.includes("Verb"),
    });
  }
  return { entries: grouped, groups };
}

// Inside a fixed expression, the parts' own forms are misleading: どうしても is
// not a ても concession, and もってこいだ is not a past verb. Verb expressions
// such as 気をつける keep their inflections, as do maintained annotations.
export function withoutExpressionGrammar(
  entries: AnswerEntry[],
  groups: ExpressionGroup[],
  annotations: GrammarAnnotation[] = [],
): AnswerEntry[] {
  return entries.map((part) => {
    const group = groups.find(
      (entry) => entry.start === part.start && !entry.inflects,
    );
    if (!group || !part.grammar) return part;
    const grammar = part.grammar.filter(
      (explanation) =>
        explanation.start >= group.formEnd ||
        annotations.some(
          (annotation) =>
            annotation.start === explanation.start &&
            annotation.end === explanation.end &&
            annotation.grammarIds.includes(explanation.id),
        ),
    );
    const { grammar: _, ...rest } = part;
    return grammar.length ? { ...rest, grammar } : rest;
  });
}
