import {
  hiragana,
  parts,
  validReadings,
  Strictness,
  type Candidate,
  type SpellingOption,
} from "./practice";

export interface SpellingSpan {
  start: number;
  end: number;
  surface: string;
  reading: string;
  spellings: string[];
  dictionaryEntryId: string;
  lemma: string;
  method: "unambiguous-dictionary" | "reviewed-context";
  reviewer?: string;
  note?: string;
}
export interface SpellingReference {
  japanese: string;
  furigana: string;
  spans: SpellingSpan[];
}
export interface SpellingBank {
  version: number;
  license: string;
  sourceRevision: string;
  entries: Record<
    string,
    {
      sourceEnglish: string;
      sourceJapanese: string;
      references: SpellingReference[];
    }
  >;
}

function spellingPath(reference: SpellingReference): string[][] | null {
  const segments = parts(reference.furigana);
  if (
    segments.map((part) => part.surface).join("") !== reference.japanese ||
    !reference.spans.length
  )
    return null;
  const positioned = segments.map((part, index) => {
    const start = segments
      .slice(0, index)
      .reduce((offset, item) => offset + item.surface.length, 0);
    return { ...part, start, end: start + part.surface.length };
  });
  function slice(
    start: number,
    end: number,
  ): { options: string[][]; reading: string } | null {
    const options: string[][] = [];
    let reading = "";
    for (const part of positioned) {
      const left = Math.max(start, part.start);
      const right = Math.min(end, part.end);
      if (left >= right) continue;
      if (part.surface === part.reading) {
        const text = part.surface.slice(left - part.start, right - part.start);
        options.push([text]);
        reading += text;
      } else if (left === part.start && right === part.end) {
        options.push([part.surface, part.reading]);
        reading += part.reading;
      } else return null;
    }
    return { options, reading };
  }
  const path: string[][] = [];
  let cursor = 0;
  for (const span of reference.spans) {
    if (
      !Number.isInteger(span.start) ||
      !Number.isInteger(span.end) ||
      span.start < cursor ||
      span.start >= span.end ||
      span.end > reference.japanese.length ||
      reference.japanese.slice(span.start, span.end) !== span.surface ||
      !span.reading ||
      /[\p{Script=Han}{}|]/u.test(span.reading) ||
      !span.spellings.length ||
      !/^\d+$/u.test(span.dictionaryEntryId) ||
      !span.lemma ||
      (span.method !== "unambiguous-dictionary" &&
        span.method !== "reviewed-context") ||
      (span.method === "reviewed-context" &&
        (!span.reviewer?.trim() || !span.note?.trim())) ||
      span.spellings.some(
        (spelling) => !spelling || /[\s{}|。、，．！？,.!?]/u.test(spelling),
      )
    )
      return null;
    const before = slice(cursor, span.start);
    const original = slice(span.start, span.end);
    if (!before || !original || hiragana(original.reading) !== span.reading)
      return null;
    path.push(...before.options, [
      span.surface,
      span.reading,
      ...span.spellings,
    ]);
    cursor = span.end;
  }
  const after = slice(cursor, reference.japanese.length);
  return after ? [...path, ...after.options] : null;
}

export function verifiedSpellings(
  candidate: Candidate,
  bank: SpellingBank,
  revision: string,
): SpellingReference[] {
  if (
    bank.version !== 1 ||
    bank.license !== "CC-BY-SA-4.0" ||
    bank.sourceRevision !== revision
  )
    return [];
  const entry = bank.entries[candidate.id];
  if (
    !entry ||
    entry.sourceEnglish !== candidate.english ||
    entry.sourceJapanese !== candidate.japanese
  )
    return [];
  const references = [candidate, ...(candidate.acceptedAlternatives ?? [])];
  return entry.references.filter(
    (reference) =>
      references.some(
        (source) =>
          source.japanese === reference.japanese &&
          validReadings({ ...candidate, ...source }).includes(
            reference.furigana,
          ),
      ) && spellingPath(reference) !== null,
  );
}

export function spellingOptions(candidate: Candidate): SpellingOption[] {
  const primary = validReadings(candidate)[0];
  const options = new Map<string, SpellingOption>();
  for (const reference of candidate.spellingVariants ?? []) {
    if (
      reference.japanese !== candidate.japanese ||
      reference.furigana !== primary ||
      !spellingPath(reference)
    )
      continue;
    for (const span of reference.spans) {
      const key = `${span.surface}\0${span.reading}`;
      const option = options.get(key) ?? {
        japanese: span.surface,
        kana: span.reading,
        spellings: [],
      };
      option.spellings = [
        ...new Set([...option.spellings, ...span.spellings]),
      ].filter((word) => word !== span.surface);
      if (option.spellings.length) options.set(key, option);
    }
  }
  return [...options.values()];
}

// Comparison and difference highlighting consume these same allowed paths.
// Keep separate paths for each supplied reading; never combine incompatible readings.
export function writingPaths(
  candidate: Candidate,
  mode: Strictness,
): string[][][] {
  if (mode === Strictness.Exact) return [[[candidate.japanese]]];
  const readings = validReadings(candidate);
  const paths = readings.map((reading) =>
    parts(reading).map((part) =>
      mode === Strictness.Kana ? [part.reading] : [part.surface, part.reading],
    ),
  );
  if (mode === Strictness.Flexible) {
    for (const reference of candidate.spellingVariants ?? []) {
      if (
        reference.japanese !== candidate.japanese ||
        !readings.includes(reference.furigana)
      )
        continue;
      const path = spellingPath(reference);
      if (path) paths.push(path);
    }
  }
  return paths;
}
