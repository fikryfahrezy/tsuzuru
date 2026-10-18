import type { GrammarAnnotation } from "../../shared/answer-entries";
import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";

// Shared span mechanics only. Each handler still decides whether a formation
// and its sentence context establish a particular grammatical reading.
export function grammarMatcher(sentence: Sentence, base: AnswerEntry[]) {
  const text = sentence.reference.japanese;
  const ends = new Set(base.map((entry) => entry.end));
  const matches: GrammarAnnotation[] = [];
  function span(start: number, end: number, id: string) {
    if (ends.has(end))
      matches.push({
        start,
        end,
        japanese: text.slice(start, end),
        grammarIds: [id],
      });
  }
  function add(start: number, japanese: string, id: string) {
    if (text.startsWith(japanese, start))
      span(start, start + japanese.length, id);
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
    if (best) add(start, best, id);
  }
  function reading(start: number, end: number) {
    return base
      .filter((part) => part.start >= start && part.end <= end)
      .map((part) => part.kana)
      .join("");
  }
  return { text, ends, matches, span, add, longest, reading };
}
