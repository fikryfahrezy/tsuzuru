import { createError, defineEventHandler, getQuery } from "h3";
import { randomInt } from "node:crypto";
import { exercises, exerciseById } from "../utils/exercises";
import { practicePool } from "../utils/practice-pool";
import { romajiHint } from "../../shared/romaji";
import { shuffledAnswerChips } from "../utils/answer-chips";
import { practiceDetails } from "../utils/practice-details";
import { spellingOptions } from "../../shared/writing-spellings";
import { isLevel, isLength, type Question } from "../../shared/practice";
import type { Sentence } from "../../shared/sentence";

function toQuestion(
  sentence: Sentence,
  poolSize: number,
  widened?: Question["widened"],
): Question {
  return {
    id: sentence.id,
    english: sentence.english,
    romaji: romajiHint(sentence),
    ...practiceDetails(sentence),
    wordCount: sentence.englishWordCount,
    poolSize,
    ...(widened && { widened }),
    alternativeCount: sentence.alternatives.length,
    spellingOptions: spellingOptions(sentence),
    wordBank: shuffledAnswerChips(sentence),
  };
}

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
    return toQuestion(selected, 1);
  }
  if (!isLevel(query.level) || !isLength(query.length)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Choose a valid level and length.",
    });
  }
  const { pool, widenedTo } = practicePool(
    exercises,
    query.level,
    query.length,
  );
  if (!pool.length)
    throw createError({
      statusCode: 404,
      statusMessage: "No sentences for these settings yet.",
    });
  const alternatives = pool.filter((row) => row.id !== query.previous);
  const available = alternatives.length ? alternatives : pool;
  const row = available[randomInt(available.length)]!;
  return toQuestion(
    row,
    pool.length,
    widenedTo && { level: query.level, length: query.length, to: widenedTo },
  );
});
