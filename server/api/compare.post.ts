import { createError, defineEventHandler, readBody } from "h3";
import { exerciseById } from "../utils/exercises";
import { compare, isStrictness } from "../../shared/practice";

export default defineEventHandler(async (event) => {
  const body: unknown = await readBody(event);
  if (
    !body ||
    typeof body !== "object" ||
    !("id" in body) ||
    !("answer" in body) ||
    !("mode" in body) ||
    typeof body.id !== "string" ||
    typeof body.answer !== "string" ||
    !body.answer.trim() ||
    body.answer.length > 2000 ||
    !isStrictness(body.mode) ||
    ("acceptAlternatives" in body &&
      typeof body.acceptAlternatives !== "boolean")
  ) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Enter an answer of up to 2,000 characters and choose a writing mode.",
    });
  }
  const row = exerciseById.get(body.id);
  if (!row)
    throw createError({
      statusCode: 404,
      statusMessage: "This sentence is unavailable. Load another sentence.",
    });
  return compare(
    row,
    body.answer,
    body.mode,
    "acceptAlternatives" in body && body.acceptAlternatives === true,
  );
});
