import { grammarMatcher } from "./grammar-matcher";
import type { GrammarAnnotation } from "../../shared/answer-entries";
import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";

export function clauseGrammar(
  sentence: Sentence,
  base: AnswerEntry[],
): GrammarAnnotation[] {
  const {
    text,
    ends: boundaries,
    matches,
    add,
  } = grammarMatcher(sentence, base);
  for (const [index, entry] of base.entries()) {
    // Joined ので has already been distinguished from possessive の + で
    // by the maintained conjunction reviews used to generate word boundaries.
    if (entry.japanese === "ので" && base[index - 1]?.end === entry.start)
      add(entry.start, entry.japanese, "node");

    const lemma = entry.dictionaryForm ?? entry.japanese;
    if (entry.wordTypes.includes("い-adjective") && lemma.endsWith("い")) {
      const root = lemma === "いい" ? "よ" : lemma.slice(0, -1);
      for (const ending of ["かったら", "くなかったら"])
        add(entry.start, root + ending, "tara");
      for (const ending of ["ければ", "くなければ"])
        add(entry.start, root + ending, "ba");
    }
    // A nominalizer needs a complete verb predicate before it and an explicit
    // case/topic particle after it. Possessive nouns and explanatory のです
    // are left to their own handlers or occurrence annotations.
    if (["の", "こと", "事"].includes(entry.japanese)) {
      const previous = base[index - 1];
      const next = base[index + 1];
      if (
        previous?.end === entry.start &&
        next?.start === entry.end &&
        next.wordTypes.includes("Particle") &&
        ["が", "を", "は", "も"].includes(next.japanese) &&
        previous.wordTypes.includes("Verb") &&
        !previous.wordTypes.includes("Noun") &&
        (previous.japanese === (previous.dictionaryForm ?? previous.japanese) ||
          /(?:る|た|だ|ない)$/u.test(previous.japanese))
      ) {
        add(entry.start, entry.japanese, "no-koto-nominalizer");
      }
    }
    if (
      entry.wordTypes.some((type) => ["Noun", "な-adjective"].includes(type))
    ) {
      for (const ending of ["だったら", "じゃなかったら", "ではなかったら"])
        add(entry.start, lemma + ending, "tara");
    }
    if (entry.japanese === "が" && entry.wordTypes.includes("Particle")) {
      const noun = base[index - 1];
      if (
        !noun ||
        noun.end !== entry.start ||
        noun.wordTypes.some((type) =>
          ["Particle", "Copula", "い-adjective"].includes(type),
        ) ||
        (noun.wordTypes.includes("Verb") && !noun.wordTypes.includes("Noun"))
      )
        continue;
      const candidates: GrammarAnnotation[] = [];
      for (const root of ["ほし", "欲し"]) {
        for (const ending of ["い", "くない", "かった", "くなかった"]) {
          for (const polite of ["", "です"]) {
            const japanese = noun.japanese + "が" + root + ending + polite;
            const end = noun.start + japanese.length;
            if (boundaries.has(end) && text.startsWith(japanese, noun.start))
              candidates.push({
                start: noun.start,
                end,
                japanese,
                grammarIds: ["ga-hoshii"],
              });
          }
        }
      }
      candidates.sort((a, b) => b.end - a.end);
      if (candidates[0]) matches.push(candidates[0]);
    }
  }
  return matches;
}
