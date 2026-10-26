import {
  hiragana,
  normalize,
  type AnswerChip,
  type AnswerBreakdownPart,
} from "../../shared/practice";
import { primaryReading, type Sentence } from "../../shared/sentence";
import { kanaToRomaji } from "../../shared/romaji";
import { answerChips } from "../../shared/answer-chips";
import { referenceLexemes } from "./reference-lexemes";
import { vocabulary } from "./vocabulary";
import pronunciations from "../../data/answer-entries/pronunciations.json";
import glossBank from "../../data/reference-glosses/bank.json";

const particlePronunciations = new Map(
  Object.entries(pronunciations.particles),
);
const wordPronunciations = new Map(Object.entries(pronunciations.words));

const dictionary = new Map<string, (typeof vocabulary)[number][]>();
for (const entry of vocabulary) {
  const entries = dictionary.get(entry.word) ?? [];
  entries.push(entry);
  dictionary.set(entry.word, entries);
}
const dictionaryById = new Map<string, (typeof vocabulary)[number][]>();
for (const entry of vocabulary) {
  if (!entry.jmdict_id) continue;
  const id = String(entry.jmdict_id);
  dictionaryById.set(id, [...(dictionaryById.get(id) ?? []), entry]);
}

// Kana lemmas such as もつ miss the kanji-keyed dictionary. A verified spelling
// span inside the chip names its exact JMdict entry; use it only when that
// span is the chip's single linked vocabulary entry.
function verifiedEntries(
  sentence: Sentence,
  position: { start: number; end: number },
) {
  const primary = primaryReading(sentence.reference).furigana;
  const ids = new Set(
    sentence.reference.spellings
      .filter((spelling) => spelling.furigana === primary)
      .flatMap((spelling) => spelling.spans)
      .filter(
        (span) => span.start >= position.start && span.end <= position.end,
      )
      .map((span) => span.dictionaryEntryId)
      .filter((id) => dictionaryById.has(id)),
  );
  return ids.size === 1 ? dictionaryById.get([...ids][0]!)! : [];
}

// JMdict senses for reference words missing from OpenJLPT, keyed by the exact
// chip spelling and reading (私 read わたし), plus the lemma when it differs
// (いった from 行く or 言う). Generated; see its README.
export const glossKey = (chip: AnswerChip, lemma?: string) =>
  `${chip.japanese}\u0000${chip.kana}\u0000${lemma ?? ""}`;
const glosses = new Map(
  (glossBank.version === 1 ? glossBank.entries : []).map((entry) => [
    glossKey(entry, "lemma" in entry ? entry.lemma : undefined),
    entry,
  ]),
);
const glossLemma = (chip: AnswerChip, lexeme?: { lemma: string }) =>
  lexeme && lexeme.lemma !== chip.japanese ? lexeme.lemma : undefined;

// Source UTF-16 positions of each chip; chips omit comparison punctuation.
export function chipPositions(sentence: Sentence, chips: AnswerChip[]) {
  const offsets: { start: number; end: number }[] = [];
  let rawOffset = 0;
  for (const character of sentence.reference.japanese) {
    if (normalize(character)) {
      for (let i = 0; i < character.length; i++)
        offsets.push({ start: rawOffset, end: rawOffset + character.length });
    }
    rawOffset += character.length;
  }
  let offset = 0;
  return chips.map((chip) => {
    const position = {
      start: offsets[offset]!.start,
      end: offsets[offset + chip.japanese.length - 1]!.end,
    };
    offset += chip.japanese.length;
    return position;
  });
}

const particles: Record<string, string> = {
  は: "Topic marker: introduces what the sentence is about. Pronounced wa when used as a particle.",
  が: "Subject marker; can also connect clauses with the sense of ‘but’.",
  を: "Object marker: marks what an action acts on. Pronounced o.",
  に: "Can mark a destination, a time, a recipient, or the location of existence.",
  へ: "Direction marker: indicates movement toward something. Pronounced e.",
  で: "Can mark where an action happens, a means, or a method.",
  な: "Can link a な-adjective or noun to what follows (静かな部屋, 病気なのです), soften a sentence ending (…だよな), or, after a verb's dictionary form, mean ‘don't’.",
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
  if (/^v[1-5skz]/u.test(code)) return "Verb";
  if (code === "adj-i" || code === "adj-ix") return "い-adjective";
  if (code === "adj-na") return "な-adjective";
  return (
    {
      n: "Noun",
      // JMdict: a noun that may take the genitive の (格段の違い).
      "adj-no": "Noun",
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

// Positioned breakdown words with their OpenJLPT vocabulary entries.
function lookedUpWords(
  sentence: Sentence,
  chips: AnswerChip[],
  // Source positions aligned with `chips`, enabling verified-spelling lookup.
  positions?: { start: number; end: number }[],
) {
  const lexemes = referenceLexemes(sentence);
  return chips
    .map((chip, index) => ({ chip, position: positions?.[index] }))
    .filter(({ chip }) => /[\p{L}\p{N}]/u.test(chip.japanese))
    .map(({ chip, position }) => {
      const lexeme = lexemes.find(
        (entry) =>
          entry.japanese === chip.japanese && entry.reading === chip.kana,
      );
      // Grammar derives verb forms from this lemma, so a verified entry adds
      // senses without replacing it (つかまる, not 捕まる).
      const dictionaryForm = lexeme?.lemma ?? chip.japanese;
      const sameReading = (entry: (typeof vocabulary)[number]) =>
        hiragana(entry.reading.normalize("NFKC")) === chip.kana;
      const byLemma = (dictionary.get(dictionaryForm) ?? []).filter((entry) =>
        lexeme ? true : sameReading(entry),
      );
      // OpenJLPT may list a kana word under its kana spelling (あなた) while the
      // lemma is a kanji spelling (貴方); fall back to the chip as written.
      const listed = byLemma.length
        ? byLemma
        : (dictionary.get(chip.japanese) ?? []).filter(sameReading);
      const entries =
        listed.length || !position
          ? listed
          : verifiedEntries(sentence, position);
      const grammarNote = particles[chip.japanese] ?? copulas[chip.japanese];
      return { chip, lexeme, dictionaryForm, entries, grammarNote };
    });
}

// The dictionary form worth showing, if any. The tokenizer gives classical す
// for すべき and すまい; learners look up する. A katakana word's hiragana
// lemma (バラ: ばら) is the same word, not a dictionary form.
function shownForm(chip: AnswerChip, dictionaryForm: string) {
  const form =
    dictionaryForm === "す" && chip.japanese.startsWith("す")
      ? "する"
      : dictionaryForm;
  return form === chip.japanese || hiragana(chip.japanese) === form
    ? undefined
    : form;
}

// Words that OpenJLPT cannot explain; the gloss generator looks these up.
export function glossTargets(sentence: Sentence) {
  const chips = answerChips(sentence);
  return lookedUpWords(sentence, chips, chipPositions(sentence, chips))
    .filter(({ entries, grammarNote }) => !entries.length && !grammarNote)
    .map(({ chip, lexeme }) => {
      const lemma = glossLemma(chip, lexeme);
      return {
        japanese: chip.japanese,
        kana: chip.kana,
        ...(lemma ? { lemma } : {}),
        // Lets a kana verb (きた) be read as its one common verb (来る).
        ...(lexeme?.verbClass ? { verbClass: lexeme.verbClass } : {}),
      };
    });
}

export function answerBreakdown(
  sentence: Sentence,
  chips: AnswerChip[],
  positions?: { start: number; end: number }[],
): AnswerBreakdownPart[] {
  return lookedUpWords(sentence, chips, positions).map(
    ({ chip, lexeme, dictionaryForm, entries: listed, grammarNote }) => {
      const gloss = glosses.get(glossKey(chip, glossLemma(chip, lexeme)));
      const entries =
        listed.length || grammarNote || !gloss
          ? listed
          : [
              {
                ...gloss,
                // Each compound part names its own reading: 料理 (りょうり · ryouri).
                meanings: gloss.parts
                  ? gloss.parts.map(
                      (part) =>
                        `${part.label} (${part.japanese === part.kana ? "" : `${part.kana} · `}${kanaToRomaji(part.kana)}): ${part.meanings.join(", ")}`,
                    )
                  : gloss.meanings,
              },
            ];
      const meanings = [
        ...new Set(entries.flatMap((entry) => entry.meanings)),
      ].slice(0, 4);
      const wordTypes = grammarNote
        ? [particles[chip.japanese] ? "Particle" : "Copula"]
        : [
            ...new Set(
              entries
                .flatMap((entry) => (entry.pos ?? []).map(wordType))
                .filter((label): label is string => !!label)
                .concat(lexeme?.verbClass ? ["Verb"] : []),
            ),
          ];
      const shown = shownForm(chip, dictionaryForm);
      const pronunciation =
        (grammarNote ? particlePronunciations.get(chip.japanese) : undefined) ??
        wordPronunciations.get(chip.japanese) ??
        chip.kana;
      return {
        ...chip,
        romaji: kanaToRomaji(pronunciation),
        // Dictionary senses are optional reference material, not a claim about
        // this occurrence. Context comes only from maintained answer entries.
        meanings: [],
        ...(grammarNote || !meanings.length
          ? {}
          : { dictionaryMeanings: meanings }),
        wordTypes,
        ...(shown ? { dictionaryForm: shown } : {}),
        ...(grammarNote
          ? { note: grammarNote }
          : lexeme &&
              dictionaryForm !== chip.japanese &&
              formNote(chip.japanese)
            ? { note: formNote(chip.japanese) }
            : {}),
      };
    },
  );
}
