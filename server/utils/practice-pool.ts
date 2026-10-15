import {
  isWithinLevel,
  levels,
  matchesLength,
  type Length,
  type Level,
} from "../../shared/practice";
import type { Sentence } from "../../shared/sentence";

// Below this many sentences, practice repeats too often; widen the pool.
export const minimumPoolSize = 20;

// Sentences graded at the chosen level or easier, with the chosen length. When
// that pool is too small, include the next harder level until it is large
// enough, so N5 + long does not repeat one sentence.
export function practicePool(
  rows: readonly Sentence[],
  level: Level,
  length: Length,
): { pool: Sentence[]; widenedTo?: Level } {
  let pool: Sentence[] = [];
  let included = level;
  for (included of levels.slice(levels.indexOf(level))) {
    pool = rows.filter(
      (row) =>
        row.level !== null &&
        isWithinLevel(row.level, included) &&
        matchesLength(row.englishWordCount, length),
    );
    if (pool.length >= minimumPoolSize) break;
  }
  return included === level ? { pool } : { pool, widenedTo: included };
}
