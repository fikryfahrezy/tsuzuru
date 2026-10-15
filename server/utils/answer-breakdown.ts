import {
  hiragana,
  type AnswerChip,
  type AnswerBreakdownPart,
  type Candidate,
  type PromptPart,
} from "../../shared/practice";
import { kanaToRomaji } from "../../shared/romaji";
import { referenceLexemes } from "./reference-lexemes";
import { vocabulary } from "./word-hints";

const dictionary = new Map<string, (typeof vocabulary)[number][]>();
for (const entry of vocabulary) {
  const entries = dictionary.get(entry.word) ?? [];
  entries.push(entry);
  dictionary.set(entry.word, entries);
}

const particles: Record<string, string> = {
  は: "Topic marker: introduces what the sentence is about. Pronounced wa when used as a particle.",
  が: "Subject marker; can also connect clauses with the sense of ‘but’.",
  を: "Object marker: marks what an action acts on. Pronounced o.",
  に: "Can mark a destination, a time, a recipient, or the location of existence.",
  へ: "Direction marker: indicates movement toward something. Pronounced e.",
  で: "Can mark where an action happens, a means, or a method.",
  の: "Can connect nouns to show possession or description, or turn a clause into a noun.",
  と: "Can mean ‘and’ or ‘with’, mark a quotation, or introduce a condition.",
  も: "Adds the sense of ‘also’, ‘too’, or ‘even’.",
  から: "Can mark a starting point (‘from’) or a reason (‘because’).",
  まで: "Marks an endpoint: ‘until’ or ‘as far as’.",
  か: "Can mark a question, uncertainty, or a choice (‘or’).",
  ね: "Sentence-ending particle that seeks agreement or shared understanding.",
  よ: "Sentence-ending particle that draws attention to information or adds emphasis.",
  や: "Links examples in a non-exhaustive list: ‘and … among others’.",
  では: "Combines で with the topic or contrast marker は.",
  には: "Combines に with the topic or contrast marker は.",
  にも: "Combines に with も (‘also’ or ‘even’).",
};
const copulas: Record<string, string> = {
  です: "Polite copula: often corresponds to ‘is’, ‘am’, or ‘are’.",
  でした: "Past form of the polite copula です: ‘was’ or ‘were’.",
  だ: "Plain copula: often corresponds to ‘is’, ‘am’, or ‘are’.",
  だった: "Past form of the plain copula だ: ‘was’ or ‘were’.",
};
function wordType(code: string): string | undefined {
  if (/^v[1-5s]/u.test(code)) return "Verb";
  if (code === "adj-i") return "い-adjective";
  if (code === "adj-na") return "な-adjective";
  return (
    {
      n: "Noun",
      adv: "Adverb",
      pn: "Pronoun",
      prt: "Particle",
      conj: "Conjunction",
      exp: "Expression",
      "aux-v": "Auxiliary verb",
      "aux-adj": "Auxiliary adjective",
      num: "Number",
      ctr: "Counter",
      int: "Interjection",
    } as Record<string, string>
  )[code];
}
function formNote(text: string): string | undefined {
  if (text.endsWith("ませんでした")) return "Polite past negative form.";
  if (text.endsWith("ました")) return "Polite past form.";
  if (text.endsWith("ません")) return "Polite negative form.";
  if (text.endsWith("ます"))
    return "Polite non-past form: can describe the present, a habit, or the future.";
  return undefined;
}

export function answerBreakdown(
  candidate: Candidate,
  chips: AnswerChip[],
  hints: PromptPart[],
): AnswerBreakdownPart[] {
  const lexemes = referenceLexemes(candidate);
  return chips
    .filter((chip) => /[\p{L}\p{N}]/u.test(chip.japanese))
    .map((chip) => {
      const lexeme = lexemes.find(
        (entry) =>
          entry.japanese === chip.japanese && entry.reading === chip.kana,
      );
      const dictionaryForm = lexeme?.lemma ?? chip.japanese;
      const entries = (dictionary.get(dictionaryForm) ?? []).filter((entry) =>
        lexeme ? true : hiragana(entry.reading.normalize("NFKC")) === chip.kana,
      );
      const contextual = hints
        .flatMap((part) => (part.hintSource ? part.hints : []))
        .filter(
          (hint) =>
            hint.japanese === chip.japanese && hint.reading === chip.kana,
        );
      const grammarNote = particles[chip.japanese] ?? copulas[chip.japanese];
      const meanings = [
        ...new Set([
          ...contextual.map((hint) => hint.meaning),
          ...entries.flatMap((entry) => entry.meanings),
        ]),
      ].slice(0, 4);
      const wordTypes = grammarNote
        ? [particles[chip.japanese] ? "Particle" : "Copula"]
        : [
            ...new Set(
              entries
                .flatMap((entry) => (entry.pos ?? []).map(wordType))
                .filter((label): label is string => !!label),
            ),
          ];
      return {
        ...chip,
        romaji:
          ({ は: "wa", へ: "e", を: "o" } as Record<string, string>)[
            chip.japanese
          ] ?? kanaToRomaji(chip.kana),
        meanings: grammarNote ? [] : meanings,
        wordTypes,
        ...(dictionaryForm !== chip.japanese ? { dictionaryForm } : {}),
        ...(grammarNote
          ? { note: grammarNote }
          : lexeme &&
              dictionaryForm !== chip.japanese &&
              formNote(chip.japanese)
            ? { note: formNote(chip.japanese) }
            : {}),
      };
    });
}
