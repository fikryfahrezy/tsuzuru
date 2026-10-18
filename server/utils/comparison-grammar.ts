import { grammarMatcher } from "./grammar-matcher";
import type { GrammarAnnotation } from "../../shared/answer-entries";
import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";
import { nominal } from "./grammar-context";

const comparativeVerbs = new Set(["劣る", "勝る", "優れる", "勝つ"]);
const comparativeNouns = new Set(["年上", "年下", "上", "下"]);

export function comparisonGrammar(
  sentence: Sentence,
  base: AnswerEntry[],
): GrammarAnnotation[] {
  const { text, ends, matches, span: add } = grammarMatcher(sentence, base);
  for (const [index, entry] of base.entries()) {
    if (entry.japanese !== "より" || !entry.wordTypes.includes("Particle"))
      continue;
    const standard = base[index - 1];
    if (
      !standard ||
      standard.end !== entry.start ||
      (!standard.wordTypes.some((type) => ["Noun", "Pronoun"].includes(type)) &&
        // Proper names are often absent from the vocabulary bank. Restrict
        // untyped standards to noun-like spellings or demonstrative pronouns.
        !(
          standard.wordTypes.length === 0 &&
          (/^[\p{Script=Han}\p{Script=Katakana}ー]+$/u.test(
            standard.japanese,
          ) ||
            [
              "これ",
              "それ",
              "あれ",
              "どれ",
              "こちら",
              "そちら",
              "あちら",
            ].includes(standard.japanese))
        ))
    )
      continue;
    // より also means "from". Require a following comparative predicate in
    // the same uninterrupted clause; the particle alone cannot select a lesson.
    let cursor = entry.end;
    for (let nextIndex = index + 1; nextIndex < base.length; nextIndex++) {
      const following = base[nextIndex]!;
      const gap = sentence.reference.japanese.slice(cursor, following.start);
      if (gap || /[。？！?!、,「」『』]/u.test(following.japanese)) break;
      cursor = following.end;
      const lemma = following.dictionaryForm ?? following.japanese;
      const adjective = following.wordTypes.some((type) =>
        ["い-adjective", "な-adjective"].includes(type),
      );
      if (
        adjective ||
        comparativeVerbs.has(lemma) ||
        comparativeNouns.has(lemma)
      ) {
        // An attributive adjective before a noun is not enough evidence:
        // 東京より新しい商品が届いた can use より as "from Tokyo".
        const next = base[nextIndex + 1];
        if (
          adjective &&
          next?.wordTypes.some((type) => ["Noun", "Pronoun"].includes(type))
        )
          break;
        matches.push({
          start: entry.start,
          end: entry.end,
          japanese: entry.japanese,
          grammarIds: ["yori"],
        });
        break;
      }
      // A different verb or copula establishes a predicate without providing
      // evidence of comparison. Do not search a later clause for an adjective.
      if (
        following.wordTypes.includes("Copula") ||
        (following.wordTypes.includes("Verb") &&
          !following.wordTypes.includes("Noun"))
      )
        break;
    }
  }
  for (const [index, entry] of base.entries()) {
    const previous = base[index - 1];
    if (!previous || previous.end !== entry.start || !nominal(previous))
      continue;
    if (entry.japanese === "の" && text.startsWith("の方が", entry.start)) {
      const hou = base[index + 1];
      if (hou?.kana !== "ほう" || !ends.has(entry.start + 3)) continue;
      for (const yori of matches.filter((match) =>
        match.grammarIds.includes("yori"),
      )) {
        const start = Math.min(entry.start, yori.start);
        const end = Math.max(entry.start + 3, yori.end);
        if (/[。？！?!、,「」『』]/u.test(text.slice(start, end))) continue;
        // Both halves must belong to the same comparison, without an
        // intervening predicate establishing another clause.
        if (
          base.some(
            (part) =>
              part.start >= start &&
              part.end <= end &&
              part.wordTypes.some((type) =>
                ["Verb", "Copula", "い-adjective", "な-adjective"].includes(
                  type,
                ),
              ) &&
              !part.wordTypes.includes("Noun"),
          )
        )
          continue;
        add(start, end, "no-hou-ga-yori");
      }
    }
    if (entry.japanese === "と") {
      const noun = base[index + 1];
      const second = base[index + 2];
      if (
        !noun ||
        !nominal(noun) ||
        noun.start !== entry.end ||
        second?.japanese !== "と" ||
        second.start !== noun.end
      )
        continue;
      for (const phrase of ["とどちらが", "とどっちが"]) {
        const end = second.start + phrase.length;
        const predicate = base.find((part) => part.start === end);
        if (
          text.startsWith(phrase, second.start) &&
          predicate?.wordTypes.some((type) =>
            ["い-adjective", "な-adjective"].includes(type),
          )
        )
          add(previous.start, end, "to-to-dochira-ga");
      }
    }
    if (entry.japanese === "の" && text.startsWith("の中で", entry.start)) {
      const naka = base[index + 1];
      if (naka?.kana !== "なか") continue;
      const subject = base.find((part) => part.start === entry.start + 3);
      if (!subject || !nominal(subject)) continue;
      for (const phrase of ["が一番", "がいちばん"]) {
        const end = subject.end + phrase.length;
        if (text.startsWith(phrase, subject.end))
          add(entry.start, end, "no-naka-de-ga-ichiban");
      }
    }
  }
  return matches;
}
