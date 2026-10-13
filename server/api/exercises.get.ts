import { createError, defineEventHandler, getQuery } from "h3";
import { randomInt } from "node:crypto";
import { exercises } from "../utils/exercises";
import { lengthOf, levels, type Question } from "../../shared/practice";

export default defineEventHandler((event): Question => {
  const query = getQuery(event);
  if (
    !levels.some((level) => level === query.level) ||
    !["short", "medium", "long"].includes(String(query.length))
  ) {
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
  return {
    id: row.id,
    english: row.english,
    wordCount: row.englishWordCount,
    poolSize: pool.length,
  };
});
