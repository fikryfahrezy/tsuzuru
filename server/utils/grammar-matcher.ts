import type { GrammarAnnotation } from "../../shared/answer-entries";
import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";

type Span = { start: number; end: number };
export const overlaps = (left: Span, right: Span) =>
  left.start < right.end && left.end > right.start;
export const sameSpan = (left: Span, right: Span) =>
  left.start === right.start && left.end === right.end;

// Shared span mechanics only. Each handler still decides whether a formation
// and its sentence context establish a particular grammatical reading.
export function grammarMatcher(sentence: Sentence, base: AnswerEntry[]) {
  const text = sentence.reference.japanese;
  const ends = new Set(base.map((entry) => entry.end));
  const matches: GrammarAnnotation[] = [];
  function span(start: number, end: number, id: string) {
    if (ends.has(end)) {
      const match: GrammarAnnotation = {
        start,
        end,
        japanese: text.slice(start, end),
        grammarIds: [id],
      };
      matches.push(match);
      return match;
    }
  }
  function add(start: number, japanese: string, id: string) {
    if (text.startsWith(japanese, start))
      return span(start, start + japanese.length, id);
  }
  function longest(start: number, forms: readonly string[], id: string) {
    let best = "";
    for (const form of forms)
      if (
        form.length > best.length &&
        ends.has(start + form.length) &&
        text.startsWith(form, start)
      )
        best = form;
    if (best) return add(start, best, id);
  }
  function reading(start: number, end: number) {
    return base
      .filter((part) => part.start >= start && part.end <= end)
      .map((part) => part.kana)
      .join("");
  }
  return { text, ends, matches, span, add, longest, reading };
}
