import { expect, test } from "bun:test";
import { createApp, toWebHandler } from "h3";
import exerciseHandler from "../server/api/exercises.get";
import { exercises } from "../server/utils/exercises";
import { minimumPoolSize, practicePool } from "../server/utils/practice-pool";
import {
  isLength,
  isWithinLevel,
  Length,
  lengthOf,
  Level,
  levels,
  matchesLength,
} from "../shared/practice";
import type { Sentence } from "../shared/sentence";
import { sentence } from "./sentences";

test("random length matches every length", () => {
  expect(isLength(Length.Random)).toBe(true);
  for (const count of [1, 7, 8, 12, 13, 40]) {
    expect(matchesLength(count, Length.Random)).toBe(true);
    expect(matchesLength(count, lengthOf(count))).toBe(true);
  }
  expect(matchesLength(3, Length.Long)).toBe(false);
});

test("large pools keep the chosen level and length", () => {
  const { pool, widenedTo } = practicePool(exercises, Level.N5, Length.Short);
  expect(widenedTo).toBeUndefined();
  expect(pool.length).toBeGreaterThanOrEqual(minimumPoolSize);
  for (const row of pool) {
    expect(isWithinLevel(row.level!, Level.N5)).toBe(true);
    expect(lengthOf(row.englishWordCount)).toBe(Length.Short);
  }
});

test("small pools widen to the first harder level with enough sentences", () => {
  const { pool, widenedTo } = practicePool(exercises, Level.N5, Length.Long);
  expect(widenedTo).toBeDefined();
  expect(pool.length).toBeGreaterThanOrEqual(minimumPoolSize);
  // Every level before the one reached was too small on its own.
  for (const level of levels.slice(0, levels.indexOf(widenedTo!)))
    expect(
      exercises.filter(
        (row) =>
          row.level !== null &&
          isWithinLevel(row.level, level) &&
          lengthOf(row.englishWordCount) === Length.Long,
      ).length,
    ).toBeLessThan(minimumPoolSize);
  for (const row of pool) {
    expect(isWithinLevel(row.level!, widenedTo!)).toBe(true);
    expect(lengthOf(row.englishWordCount)).toBe(Length.Long);
  }
});

test("random length combines every length at the chosen level", () => {
  const { pool, widenedTo } = practicePool(exercises, Level.N5, Length.Random);
  expect(widenedTo).toBeUndefined();
  expect(pool).toEqual(
    exercises.filter(
      (row) => row.level !== null && isWithinLevel(row.level, Level.N5),
    ),
  );
  expect(new Set(pool.map((row) => lengthOf(row.englishWordCount)))).toEqual(
    new Set([Length.Short, Length.Medium, Length.Long]),
  );
});

test("widening stops at the hardest level even when the pool stays small", () => {
  const rows: Sentence[] = [
    {
      ...sentence({ id: "a", japanese: "みず", furiganaVariants: ["みず"] }),
      level: Level.N2,
    },
  ];
  expect(practicePool(rows, Level.N5, Length.Short)).toEqual({
    pool: rows,
    widenedTo: Level.N1,
  });
  expect(practicePool(rows, Level.N1, Length.Short)).toEqual({ pool: rows });
});

test("the exercise API reports a widened pool and accepts random length", async () => {
  const app = createApp();
  app.use("/api/exercises", exerciseHandler);
  const handle = toWebHandler(app);
  const get = async (query: string) =>
    (
      await handle(new Request(`http://localhost/api/exercises?${query}`))
    ).json();
  const long = await get("level=N5&length=long");
  expect(long.widened).toEqual({
    level: Level.N5,
    length: Length.Long,
    to: practicePool(exercises, Level.N5, Length.Long).widenedTo,
  });
  const short = await get("level=N5&length=short");
  expect(short.widened).toBeUndefined();
  const random = await get("level=N5&length=random");
  expect(random.poolSize).toBe(
    practicePool(exercises, Level.N5, Length.Random).pool.length,
  );
});
