import {
  hiragana,
  Politeness,
  type AnswerChip,
  type PolitenessForm,
} from "../../shared/practice";
import { answerChips } from "../../shared/answer-chips";
import type { Sentence } from "../../shared/sentence";
import { chipPositions } from "./answer-breakdown";
import { referenceLexemes } from "./reference-lexemes";
import { verbForms, type VerbForms } from "./verb-forms";
import { vocabulary } from "./vocabulary";

// The sentence-final predicate and its other politeness forms. `start` and
// `end` locate the current form in the reference; every form replaces that
// span. Keigo is irregular and depends on who acts, so it is never derived.
export interface FinalPredicate {
  start: number;
  end: number;
  forms: PolitenessForm[];
}

interface Spec {
  japanese: string;
  kana: string;
  politeness: Politeness;
  note?: string;
}

const plain = (japanese: string, kana = japanese, note?: string): Spec => ({
  japanese,
  kana,
  politeness: Politeness.Plain,
  ...(note ? { note } : {}),
});
const polite = (japanese: string, kana = japanese, note?: string): Spec => ({
  japanese,
  kana,
  politeness: Politeness.Polite,
  ...(note ? { note } : {}),
});

const written = "Neutral; common in writing.";
const spoken = "Spoken.";
const conversational = "Conversational.";

// Each slot keeps tense and negation fixed, so its forms differ only in
// politeness: だ ↔ です, never だ ↔ でした.
const copulaSlots: Spec[][] = [
  [plain("だ"), polite("です")],
  [plain("だった"), polite("でした")],
  [
    plain("ではない", undefined, written),
    plain("じゃない", undefined, spoken),
    polite("ではありません"),
    polite("じゃありません", undefined, spoken),
    polite("ではないです", undefined, conversational),
    polite("じゃないです", undefined, conversational),
  ],
  [
    plain("ではなかった", undefined, written),
    plain("じゃなかった", undefined, spoken),
    polite("ではありませんでした"),
    polite("じゃありませんでした", undefined, spoken),
    polite("ではなかったです", undefined, conversational),
    polite("じゃなかったです", undefined, conversational),
  ],
];

// ない after an adjective's く form, or alone as “there is no”.
const naiSlots: Spec[][] = [
  [
    plain("ない"),
    polite("ありません"),
    polite("ないです", undefined, conversational),
  ],
  [
    plain("なかった"),
    polite("ありませんでした"),
    polite("なかったです", undefined, conversational),
  ],
];

// Set phrases whose plain form changes their meaning or tone.
const setPhrases =
  /(?:ございます|ございました|お願いします|お願いいたします|いただきます|申し訳ありません|すみません|すいません|失礼します|失礼しました|ごちそうさまでした)$/u;
// Keigo verbs: their plain forms keep the honorific or humble meaning but
// mix registers (申す), so they are left as written.
const keigoVerbs = new Set([
  "申す",
  "申し上げる",
  "参る",
  "致す",
  "いたす",
  "おる",
  "存じる",
  "伺う",
  "いらっしゃる",
  "おっしゃる",
  "仰る",
  "なさる",
  "くださる",
  "下さる",
  "召し上がる",
  "ござる",
]);
const politeMarkers = /です|でし|ます|まし|ませ|ください/u;

const adjectives = new Set(
  vocabulary
    .filter((entry) => entry.pos?.includes("adj-i"))
    .flatMap((entry) => [entry.word, ...(entry.other_forms ?? [])]),
);
const adjectiveReadings = new Set(
  vocabulary
    .filter((entry) => entry.pos?.includes("adj-i"))
    .map((entry) => hiragana(entry.reading)),
);

function slotOf(slots: Spec[][], japanese: string) {
  for (const slot of slots) {
    const index = slot.findIndex((form) => form.japanese === japanese);
    if (index >= 0) return { slot, index };
  }
  return null;
}

function prefixed(prefix: AnswerChip, slot: Spec[]): Spec[] {
  return slot.map((form) => ({
    ...form,
    japanese: prefix.japanese + form.japanese,
    kana: prefix.kana + form.kana,
  }));
}

function commonPrefix(a: string, b: string) {
  let length = 0;
  while (length < a.length && length < b.length && a[length] === b[length])
    length++;
  return length;
}

// A verb chip's plain and polite forms for its tense and negation.
function verbSlot(
  chip: AnswerChip,
  lemma: string,
  verbClass: string,
): { slot: Spec[]; index: number } | null {
  const shared = commonPrefix(lemma, chip.japanese);
  const suffix = chip.japanese.slice(shared);
  const isKana = (text: string) => /^[\p{Script=Hiragana}ー]+$/u.test(text);
  // Readings follow the same conjugation from the kana lemma. A kana verb
  // can share nothing with its lemma (します, する); 来る changes its own
  // reading (こない, きます), so only the bare verb is derived.
  const kanaLemma =
    verbClass === "vk" && lemma.includes("来")
      ? lemma === "来る"
        ? "くる"
        : null
      : isKana(lemma) && isKana(chip.japanese)
        ? lemma
        : shared && chip.kana.endsWith(hiragana(suffix))
          ? chip.kana.slice(0, chip.kana.length - suffix.length) +
            lemma.slice(shared)
          : null;
  if (!kanaLemma) return null;
  const written = verbForms(lemma, verbClass)[0];
  const read = verbForms(kanaLemma, verbClass)[0];
  if (!written || !read) return null;
  const past = (te: string) =>
    te.slice(0, -1) + (te.endsWith("で") ? "だ" : "た");
  const pair = (
    politeness: Politeness,
    form: (forms: VerbForms, dictionary: string) => string,
    note?: string,
  ): Spec => ({
    japanese: form(written, lemma),
    kana: form(read, kanaLemma),
    politeness,
    ...(note ? { note } : {}),
  });
  return slotOf(
    [
      [
        pair(Politeness.Plain, (_, dictionary) => dictionary),
        pair(Politeness.Polite, (f) => f.stem + "ます"),
      ],
      [
        pair(Politeness.Plain, (f) => past(f.te)),
        pair(Politeness.Polite, (f) => f.stem + "ました"),
      ],
      [
        pair(Politeness.Plain, (f) => f.negative + "い"),
        pair(Politeness.Polite, (f) => f.stem + "ません"),
        pair(Politeness.Polite, (f) => f.negative + "いです", conversational),
      ],
      [
        pair(Politeness.Plain, (f) => f.negative + "かった"),
        pair(Politeness.Polite, (f) => f.stem + "ませんでした"),
        pair(
          Politeness.Polite,
          (f) => f.negative + "かったです",
          conversational,
        ),
      ],
    ],
    chip.japanese,
  );
}

function isAdjective(chip: AnswerChip, lemma?: string) {
  return (
    (lemma !== undefined && adjectives.has(lemma)) ||
    adjectives.has(chip.japanese) ||
    adjectiveReadings.has(chip.kana)
  );
}

// An adjective (or 〜たい) chip: plain うまい, polite うまいです.
function adjectiveSlot(
  chip: AnswerChip,
  lemma: string | undefined,
  verbClass: string | undefined,
): { slot: Spec[]; index: number } | null {
  const desire =
    verbClass && /たい(?:です)?$|たかった(?:です)?$/u.test(chip.japanese);
  const base = chip.japanese.replace(/です$/u, "");
  const baseKana = chip.kana.replace(/です$/u, "");
  if (!desire && !isAdjective({ japanese: base, kana: baseKana }, lemma))
    return null;
  // 新しくない splits into its く form and ない.
  const negative = /くな(?:い|かった)$/u.exec(base);
  if (negative) {
    const stem = base.slice(0, negative.index + 1);
    const stemKana = baseKana.slice(
      0,
      baseKana.length - (base.length - stem.length),
    );
    const nai = slotOf(
      naiSlots,
      base.slice(stem.length) + (base === chip.japanese ? "" : "です"),
    );
    return nai
      ? {
          slot: prefixed({ japanese: stem, kana: stemKana }, nai.slot),
          index: nai.index,
        }
      : null;
  }
  if (!/(?:い|かった)$/u.test(base)) return null;
  const slot = [
    plain(base, baseKana),
    polite(base + "です", baseKana + "です"),
  ];
  return { slot, index: base === chip.japanese ? 0 : 1 };
}

export function finalPredicate(sentence: Sentence): FinalPredicate | null {
  const reference = sentence.reference.japanese;
  const chips = answerChips(sentence);
  const positions = chipPositions(sentence, chips);
  let last = chips.length - 1;
  while (last > 0 && /^(?:よ|ね)$/u.test(chips[last]!.japanese)) last--;
  const chip = chips[last];
  if (!chip) return null;
  const end = positions[last]!.end;
  // One sentence only, ending in the predicate plus よ, ね, or よね.
  if (!/^(?:よね|よ|ね)?[。！!]*$/u.test(reference.slice(end))) return null;
  const previous = chips[last - 1];
  const lexemes = referenceLexemes(sentence);
  const lexeme = (word: AnswerChip | undefined) =>
    word &&
    lexemes.find(
      (entry) =>
        entry.japanese === word.japanese && entry.reading === word.kana,
    );
  let found: { slot: Spec[]; index: number; start: number } | null = null;
  const withPrevious = (match: { slot: Spec[]; index: number } | null) =>
    match && previous
      ? {
          slot: prefixed(previous, match.slot),
          index: match.index,
          start: positions[last - 1]!.start,
        }
      : null;
  const alone = (match: { slot: Spec[]; index: number } | null) =>
    match && { ...match, start: positions[last]!.start };

  if (/^(?:では|じゃ)$/u.test(previous?.japanese ?? "")) {
    // んじゃない is often “isn't it?” (いいんじゃない), not a negative.
    const negative = /^(?:ん|の)$/u.test(chips[last - 2]?.japanese ?? "")
      ? null
      : slotOf(naiSlots, chip.japanese);
    const copula =
      negative &&
      slotOf(
        copulaSlots,
        previous!.japanese + negative.slot[negative.index]!.japanese,
      );
    found = copula && {
      ...copula,
      start: positions[last - 1]!.start,
    };
  } else if (/^(?:です|でした)$/u.test(chip.japanese)) {
    const before = lexeme(previous);
    // After an adjective or a negative (高い, 行かない), です only adds
    // politeness: the plain form drops it, and でした is not a form there.
    const predicate =
      previous &&
      (adjectiveSlot(previous, before?.lemma, before?.verbClass) ||
        /(?:ない|なかった)$/u.test(previous.japanese));
    if (predicate)
      found =
        chip.japanese === "です"
          ? withPrevious({ slot: [plain(""), polite("です")], index: 1 })
          : null;
    else if (!before?.verbClass)
      found = alone(slotOf(copulaSlots, chip.japanese));
  } else if (/^(?:だ|だった)$/u.test(chip.japanese)) {
    found = alone(slotOf(copulaSlots, chip.japanese));
  } else if (
    /^(?:ない|なかった|ありません|ありませんでした)$/u.test(chip.japanese) &&
    previous &&
    /く$|^(?:は|が|も)$/u.test(previous.japanese)
  ) {
    const nai = slotOf(naiSlots, chip.japanese);
    found = previous.japanese.endsWith("く") ? withPrevious(nai) : alone(nai);
  } else {
    const word = lexeme(chip);
    // である is a written copula; its polite form is です, not であります.
    if (word?.lemma === "ある" && previous?.japanese === "で") return null;
    found = alone(
      (word?.verbClass &&
        !keigoVerbs.has(word.lemma) &&
        verbSlot(chip, word.lemma, word.verbClass)) ||
        adjectiveSlot(chip, word?.lemma, word?.verbClass),
    );
  }
  if (!found) return null;
  // Changing only the last of several sentences would mix registers.
  if (
    /[。！？!?]/u.test(reference.slice(0, found.start)) ||
    setPhrases.test(reference.slice(0, end))
  )
    return null;
  return {
    start: found.start,
    end,
    forms: found.slot.map((form, index) => ({
      ...form,
      ...(index === found.index ? { current: true } : {}),
    })),
  };
}

// Whether a polite reference can become plain without leaving an earlier
// polite clause (雨ですが、行きます) in a plain sentence.
export function plainAllowed(sentence: Sentence, predicate: FinalPredicate) {
  return !politeMarkers.test(
    sentence.reference.japanese.slice(0, predicate.start),
  );
}

// A rendering with its final predicate in another form, or null when the
// change is not a plain kana ending (来ない → 来ません also changes 来's
// reading) or the rendering does not end in the current form.
export function withPolitenessForm(
  rendering: { japanese: string; furiganaVariants: string[] },
  current: PolitenessForm,
  form: PolitenessForm,
  after: string,
): { japanese: string; furiganaVariants: string[] } | null {
  const shared = commonPrefix(current.japanese, form.japanese);
  const from = current.japanese.slice(shared);
  const to = form.japanese.slice(shared);
  const kana = /^\p{Script=Hiragana}*$/u;
  if (
    !kana.test(from) ||
    !kana.test(to) ||
    !current.kana.endsWith(from) ||
    form.kana !==
      current.kana.slice(0, current.kana.length - from.length) + to ||
    !rendering.japanese.endsWith(current.japanese + after)
  )
    return null;
  const swap = (text: string) =>
    text.endsWith(from + after)
      ? text.slice(0, text.length - from.length - after.length) + to + after
      : null;
  return {
    japanese: swap(rendering.japanese)!,
    furiganaVariants: rendering.furiganaVariants.flatMap(
      (variant) => swap(variant) ?? [],
    ),
  };
}
