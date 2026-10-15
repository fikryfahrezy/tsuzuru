import { createError, defineEventHandler, getQuery } from "h3";
import { randomInt } from "node:crypto";
import { exercises, exerciseById } from "../utils/exercises";
import { romajiHint } from "../../shared/romaji";
import { wordHints } from "../utils/word-hints";
import { answerChips, shuffledAnswerChips } from "../utils/answer-chips";
import { answerBreakdown } from "../utils/answer-breakdown";
import { spellingOptions } from "../../shared/writing-spellings";
import {
  lengthOf,
  isLevel,
  isLength,
  type Question,
} from "../../shared/practice";

export default defineEventHandler((event): Question => {
  const query = getQuery(event);
  if (query.sentence !== undefined) {
    if (typeof query.sentence !== "string" || !query.sentence.trim())
      throw createError({
        statusCode: 400,
        statusMessage: "Choose a valid sentence ID.",
      });
    const selected = exerciseById.get(query.sentence);
    if (!selected)
      throw createError({
        statusCode: 404,
        statusMessage: "This sentence is unavailable.",
      });
    const hints = wordHints(selected);
    const chips = shuffledAnswerChips(selected);
    return {
      id: selected.id,
      english: selected.english,
      romaji: romajiHint(selected),
      wordHints: hints,
      wordCount: selected.englishWordCount,
      poolSize: 1,
      alternativeCount: selected.acceptedAlternatives?.length ?? 0,
      spellingOptions: spellingOptions(selected),
      wordBank: chips,
      answerBreakdown: answerBreakdown(selected, answerChips(selected), hints),
    };
  }
  if (!isLevel(query.level) || !isLength(query.length)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Choose a valid level and length.",
    });
  }
  const pool = exercises.filter(
    (row) =>
      row.targetVocabulary.some((target) => target.level === query.level) &&
      lengthOf(row.englishWordCount) === query.length,
  );
  if (!pool.length)
    throw createError({
      statusCode: 404,
      statusMessage: "No sentences for these settings yet.",
    });
  const alternatives = pool.filter((row) => row.id !== query.previous);
  const available = alternatives.length ? alternatives : pool;
  const row = available[randomInt(available.length)]!;
  const hints = wordHints(row);
  const chips = shuffledAnswerChips(row);
  return {
    id: row.id,
    english: row.english,
    romaji: romajiHint(row),
    wordHints: hints,
    wordCount: row.englishWordCount,
    poolSize: pool.length,
    alternativeCount: row.acceptedAlternatives?.length ?? 0,
    spellingOptions: spellingOptions(row),
    wordBank: chips,
    answerBreakdown: answerBreakdown(row, answerChips(row), hints),
  };
});
