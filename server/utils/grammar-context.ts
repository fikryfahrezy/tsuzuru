import type { AnswerEntry } from "./answer-entries";

const lemma = (word: AnswerEntry) => word.dictionaryForm ?? word.japanese;
export function nominal(word: AnswerEntry | undefined): boolean {
  return (
    !!word &&
    (word.wordTypes.some((type) =>
      ["Noun", "Pronoun", "Number"].includes(type),
    ) ||
      /^(?:これ|それ|あれ|どれ|ここ|そこ|あそこ|どこ|私|あなた)$/u.test(
        word.japanese,
      ) ||
      (word.wordTypes.length === 0 &&
        /^[\p{Script=Han}\p{Script=Katakana}ー]+$/u.test(word.japanese)))
  );
}
export function finite(word: AnswerEntry) {
  return (
    (!word.wordTypes.includes("Noun") &&
      [
        "だろう",
        "でしょう",
        "ない",
        "なかった",
        "じゃない",
        "ではない",
      ].includes(word.japanese)) ||
    word.wordTypes.includes("Copula") ||
    (word.wordTypes.includes("い-adjective") &&
      /(?:い|かった|です)$/u.test(word.japanese)) ||
    (word.wordTypes.includes("Verb") &&
      !word.wordTypes.includes("Noun") &&
      (!word.wordTypes.includes("Adverb") || !!word.dictionaryForm) &&
      ((!!word.dictionaryForm && word.japanese === lemma(word)) ||
        /(?:う|く|ぐ|す|つ|ぬ|ぶ|む|る|た|だ|ない|たい|たかった|やすい|にくい|ます|ました|ません)$/u.test(
          word.japanese,
        )))
  );
}

// Reviewed human roles shared by giving and passive-agent recognition.
export const humans = new Set([
  "私",
  "わたし",
  "僕",
  "ぼく",
  "俺",
  "あなた",
  "君",
  "彼",
  "彼女",
  "父",
  "母",
  "兄",
  "姉",
  "弟",
  "妹",
  "家族",
  "友達",
  "友人",
  "先生",
  "学生",
  "子供",
  "子ども",
  "人",
  "おじさん",
  "おじ",
]);
