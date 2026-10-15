import glossary from "../../data/hint-glossary/bank.json";
import rules from "../../data/hint-glossary/rules.json";
import { HintSource, hiragana, type PromptPart } from "../../shared/practice";
import { kanaToRomaji } from "../../shared/romaji";
import {
  primaryRendering,
  type PhraseHintSpan,
  type Sentence,
} from "../../shared/sentence";
import lemmatize from "wink-lemmatizer";
import { referenceLexemes } from "./reference-lexemes";
import { referenceReading } from "./sentence-phrase-hints";
import { vocabulary } from "./vocabulary";
import { referenceSpellings } from "./reference-spellings";

interface Entry {
  word: string;
  reading: string;
  meaning: string;
  exact: boolean;
  verb: boolean;
  referenceOnly?: boolean;
  pronoun?: boolean;
}
const index = new Map<string, Entry[]>();
const phraseIndex = new Map<string, Entry[]>();
let longestPhrase = 1;
// These gloss words usually describe grammar, rather than a standalone translation.
const functionWords = new Set(rules.functionWords);
const subjectPronouns = new Map(Object.entries(rules.subjectPronouns));
const spatialParaphrases = new Map(Object.entries(rules.spatialParaphrases));
const phraseParaphrases = new Map(Object.entries(rules.phraseParaphrases));
const verbParaphrases = new Map(Object.entries(rules.verbParaphrases));

for (const phrase of phraseParaphrases.keys()) {
  longestPhrase = Math.max(longestPhrase, englishWords(phrase).length);
}

function englishWords(text: string): string[] {
  return (
    text.toLowerCase().match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []
  );
}

const extraSenses: Record<
  string,
  { word: string; reading: string; meanings: string[] }
> = glossary.entries;

for (const entry of vocabulary) {
  const extra = extraSenses[entry.id];
  const meanings = [
    ...entry.meanings.map((meaning) => ({ meaning, referenceOnly: false })),
    ...(extra?.word === entry.word && extra.reading === entry.reading
      ? extra.meanings.map((meaning) => ({ meaning, referenceOnly: true }))
      : []),
  ];
  for (const { meaning, referenceOnly } of meanings) {
    const clean = meaning
      .replace(/\([^)]*\)/gu, "")
      .replace(/^to\s+/iu, "")
      .trim();
    const terms = englishWords(clean);
    const vocabulary = {
      word: entry.word,
      reading: hiragana(entry.reading.normalize("NFKC")),
      meaning,
      exact: terms.length === 1,
      verb: /^to\s+/iu.test(meaning),
      referenceOnly,
      pronoun: entry.pos?.includes("pn"),
    };
    // Only join whitespace-separated words, never clauses or punctuation.
    if (
      terms.length > 1 &&
      terms.join(" ") === clean.toLowerCase().replace(/\s+/gu, " ")
    ) {
      const phrase = terms.join(" ");
      const matches = phraseIndex.get(phrase) ?? [];
      matches.push({ ...vocabulary, exact: true });
      phraseIndex.set(phrase, matches);
      longestPhrase = Math.max(longestPhrase, terms.length);
    }
    for (const term of new Set(terms)) {
      // Single-word hints must match a complete gloss, not incidental words in a
      // definition such as "I think" in a quotation particle's explanation.
      if (!vocabulary.exact) continue;
      if (functionWords.has(term)) continue;
      const matches = index.get(term) ?? [];
      matches.push(vocabulary);
      index.set(term, matches);
    }
  }
}

function lookup(word: string): Entry[] {
  const term = word.toLowerCase().replaceAll("’", "'");
  const verb = lemmatize.verb(term);
  const noun = lemmatize.noun(term);
  const subjectPronoun = subjectPronouns.get(term);
  return [
    ...(index.get(term) ?? []),
    ...(verb === term
      ? []
      : (index.get(verb) ?? []).filter((entry) => entry.verb)),
    ...(noun === term
      ? []
      : (index.get(noun) ?? []).filter((entry) => !entry.verb)),
    // Japanese pronouns retain their lexical form in object position. Require
    // a pronoun entry and reference support rather than guessing from English.
    ...(subjectPronoun
      ? (index.get(subjectPronoun) ?? [])
          .filter((entry) => entry.pronoun)
          .map((entry) => ({ ...entry, referenceOnly: true }))
      : []),
    // English spatial prepositions can correspond to Japanese nouns. These
    // dictionary paraphrases apply across sentences, only with reference support.
    ...(spatialParaphrases.get(term) ?? []).flatMap((phrase) =>
      (phraseIndex.get(phrase) ?? []).map((entry) => ({
        ...entry,
        referenceOnly: true,
      })),
    ),
    // Only reviewed verb equivalences may omit a particle; never strip
    // arbitrary phrasal verbs to infer a standalone meaning.
    ...(verbParaphrases.get(verb) ?? []).flatMap((phrase) =>
      (phraseIndex.get(phrase) ?? [])
        .filter((entry) => entry.verb)
        .map((entry) => ({ ...entry, referenceOnly: true })),
    ),
  ];
}

function lookupPhrase(words: string[]): Entry[] {
  const terms = words.map((word) => word.toLowerCase().replaceAll("’", "'"));
  return [
    ...(phraseIndex.get(terms.join(" ")) ?? []),
    ...(phraseParaphrases.get(terms.join(" ")) ?? []).flatMap((phrase) =>
      (phraseIndex.get(phrase) ?? []).map((entry) => ({
        ...entry,
        referenceOnly: true,
      })),
    ),
    ...(
      phraseIndex.get(
        [lemmatize.verb(terms[0]!), ...terms.slice(1)].join(" "),
      ) ?? []
    ).filter((entry) => entry.verb),
  ];
}

export function wordHints(sentence: Sentence): PromptPart[] {
  const lexemes = referenceLexemes(sentence);
  const forms = new Map<string, { japanese: string; reading: string }[]>();
  const primaryReference = primaryRendering(sentence.reference);
  const referenceForms = (entry: Entry) => {
    if (!forms.has(entry.word)) {
      const inflected = lexemes.filter((lexeme) => lexeme.lemma === entry.word);
      const readings = referenceReading(primaryReference, entry.word);
      forms.set(entry.word, [
        ...inflected,
        ...readings.map((reading) => ({ japanese: entry.word, reading })),
      ]);
    }
    return forms.get(entry.word)!;
  };
  // Reference presence confirms the Japanese form, not an incidental English
  // word inside a longer gloss ("good" in "good day", for example).
  const inReference = (entry: Entry) =>
    entry.exact && referenceForms(entry).length > 0;
  const tokens =
    sentence.english.match(
      /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*|[^\p{L}\p{N}]+/gu,
    ) ?? [];
  const grouped: {
    text: string;
    matches: Entry[];
    annotation?: PhraseHintSpan;
  }[] = [];
  const annotations = sentence.phraseHints;
  // Character positions keep explicit phrase spans aligned with the original prompt.
  const offsets: number[] = [];
  let offset = 0;
  for (const token of tokens) {
    offsets.push(offset);
    offset += token.length;
  }
  for (let start = 0; start < tokens.length; start++) {
    const annotation = annotations.find(
      (span) => span.start === offsets[start],
    );
    if (annotation) {
      grouped.push({ text: annotation.text, matches: [], annotation });
      while (start + 1 < tokens.length && offsets[start + 1]! < annotation.end)
        start++;
      continue;
    }
    const text = tokens[start]!;
    let end = start;
    let matches = /^[\p{L}\p{N}]/u.test(text) ? lookup(text) : [];
    if (/^[\p{L}\p{N}]/u.test(text)) {
      const words = [text];
      for (
        let cursor = start + 2;
        cursor < tokens.length && words.length < longestPhrase;
        cursor += 2
      ) {
        if (
          !/^\s+$/u.test(tokens[cursor - 1]!) ||
          !/^[\p{L}\p{N}]/u.test(tokens[cursor]!)
        )
          break;
        words.push(tokens[cursor]!);
        if (
          annotations.some(
            (span) =>
              span.start < offsets[cursor]! + tokens[cursor]!.length &&
              span.end > offsets[start]!,
          )
        )
          break;
        const phraseMatches = lookupPhrase(words);
        if (phraseMatches.length) {
          const phraseInReference = phraseMatches.some(inReference);
          if (
            !phraseInReference &&
            phraseMatches.every((entry) => entry.referenceOnly)
          )
            continue;
          const individualInReference = words.some((word) =>
            lookup(word).some(inReference),
          );
          // A generic phrase must not hide words supplied by this sentence.
          if (
            !phraseInReference &&
            (matches.some(inReference) || individualInReference)
          )
            continue;
          end = cursor;
          matches = phraseMatches;
        }
      }
    }
    grouped.push({ text: tokens.slice(start, end + 1).join(""), matches });
    start = end;
  }
  const prompt: PromptPart[] = grouped.map(({ text, matches, annotation }) => {
    if (annotation)
      return {
        text,
        isWord: true,
        hints: annotation.hints,
        phrase: annotation.phrase,
        hintSource: HintSource.Sentence,
      };
    const isWord = /^[\p{L}\p{N}]/u.test(text);
    const contextual = matches.filter(inReference);
    const sentenceMatched = contextual.length > 0;
    const sorted = (
      sentenceMatched
        ? contextual
        : matches.filter((entry) => entry.exact && !entry.referenceOnly)
    ).sort(
      (a, b) =>
        Number(inReference(b)) - Number(inReference(a)) ||
        Number(b.exact) - Number(a.exact),
    );
    const seen = new Set<string>();
    const hints = sorted
      .flatMap((entry) => {
        const supplied = referenceForms(entry);
        const choices = supplied.length
          ? supplied
          : [{ japanese: entry.word, reading: entry.reading }];
        return choices.map((form) => ({
          japanese: form.japanese,
          reading: form.reading,
          romaji: kanaToRomaji(form.reading),
          meaning: entry.meaning,
        }));
      })
      .filter((hint) => {
        const key = `${hint.japanese}\0${hint.reading}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 3);
    return {
      text,
      isWord,
      hints,
      // Presence in the reference validates the wording and pronunciation,
      // but does not establish the English meaning or occurrence alignment.
      ...(sentenceMatched ? { hintSource: HintSource.Reference } : {}),
    };
  });
  return prompt.map((part) => ({
    ...part,
    hints: part.hints.map((hint) => {
      // Only expose spellings already verified for the primary reference and
      // its supplied pronunciation; dictionary fallback hints stay unchanged.
      const spellings = part.hintSource
        ? referenceSpellings(sentence, hint)
        : [];
      return spellings.length ? { ...hint, spellings } : hint;
    }),
  }));
}
