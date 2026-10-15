import { expect, test } from "bun:test";
import { vocabulary, wordHints } from "../server/utils/word-hints";
import { exerciseById, exercises } from "../server/utils/exercises";
import type { Candidate } from "../shared/practice";
import phraseBank from "../data/phrase-hints/sentences.json";
import { sentencePhraseHints } from "../server/utils/sentence-phrase-hints";
import { referenceLexemes } from "../server/utils/reference-lexemes";
import lexemeBank from "../data/romaji/reference-lexemes.json";
import { HintSource, validReadings } from "../shared/practice";
import hintGlossary from "../data/hint-glossary/bank.json";
import spellingBank from "../data/spelling-variants/bank.json";

const water: Candidate = {
  ...exercises[0]!,
  english: "I drink water.",
  japanese: "私は水を飲みます。",
  furiganaVariants: ["{私|わたし}は{水|みず}を{飲|の}みます。"],
};

test("across resolves kana and kanji reference nouns without a sentence mapping", () => {
  const candidate = exerciseById.get("ed2c1d01698a754816d6a9ed")!;
  expect(sentencePhraseHints(candidate)).toEqual([]);
  for (const english of [
    candidate.english,
    "Take me across the river, please.",
  ]) {
    const token = wordHints({ ...candidate, english }).find(
      (part) => part.text === "across",
    );
    expect(token).toMatchObject({
      hintSource: HintSource.Reference,
      hints: [{ japanese: "むこう", reading: "むこう", romaji: "mukou" }],
    });
  }
  const kanji = wordHints({
    ...water,
    english: "Across the river.",
    japanese: "川の向こう。",
    furiganaVariants: ["{川|かわ}の{向|む}こう。"],
  });
  expect(kanji[0]?.hints[0]).toMatchObject({
    japanese: "向こう",
    reading: "むこう",
    romaji: "mukou",
  });
});

test("additional dictionary senses work across vocabulary with reference support", () => {
  for (const [english, japanese, furigana, expected] of [
    ["stream", "川。", "{川|かわ}。", "川"],
    ["parasol", "傘。", "{傘|かさ}。", "傘"],
    ["opposite side", "向こう。", "{向|む}こう。", "向こう"],
  ]) {
    const token = wordHints({
      ...water,
      english: english!,
      japanese: japanese!,
      furiganaVariants: [furigana!],
    })[0];
    expect(token?.hintSource).toBe(HintSource.Reference);
    expect(token?.hints.some((hint) => hint.japanese === expected)).toBe(true);
    const unsupported = wordHints({ ...water, english: english! })[0];
    expect(unsupported?.hints.some((hint) => hint.japanese === expected)).toBe(
      false,
    );
  }
});

test("spatial paraphrases cannot infer reference words from kana substrings", () => {
  const candidate = exerciseById.get("ed2c1d01698a754816d6a9ed")!;
  const tokens = wordHints({
    ...candidate,
    japanese: "むこうずね。",
    furiganaVariants: ["むこうずね。"],
  });
  expect(tokens.find((token) => token.text === "across")?.hints).toEqual([]);
});

test("English object pronouns resolve subject-form glosses only with reference support", () => {
  for (const [english, japanese, furigana] of [
    ["him", "彼", "{彼|かれ}"],
    ["her", "彼女", "{彼女|かのじょ}"],
    ["them", "彼ら", "{彼|かれ}ら"],
  ]) {
    const token = wordHints({
      ...water,
      english: english!,
      japanese: japanese!,
      furiganaVariants: [furigana!],
    })[0];
    expect(token?.hintSource).toBe(HintSource.Reference);
    expect(token?.hints[0]?.japanese).toBe(japanese);
    expect(
      wordHints({ ...water, english: english! })[0]?.hints.some(
        (hint) => hint.japanese === japanese,
      ),
    ).toBe(false);
  }
});

test("extended meanings retain their pinned dictionary and source vocabulary", () => {
  expect(hintGlossary.source).toEqual(spellingBank.sources.jmdict);
  for (const [id, entry] of Object.entries(hintGlossary.entries)) {
    expect(
      vocabulary.some(
        (word) =>
          word.id === id &&
          word.word === entry.word &&
          word.reading === entry.reading,
      ),
    ).toBe(true);
  }
});

test("each English word has a clickable hint and punctuation preserves the original prompt", () => {
  const tokens = wordHints(water);
  expect(tokens.map((token) => token.text).join("")).toBe(water.english);
  expect(
    tokens.filter((token) => token.isWord).map((token) => token.text),
  ).toEqual(["I", "drink", "water"]);
  expect(tokens.find((token) => token.text === "I")?.hints[0]?.japanese).toBe(
    "私",
  );
  expect(
    tokens.find((token) => token.text === "drink")?.hints[0]?.japanese,
  ).toBe("飲む");
  expect(
    tokens.find((token) => token.text === "water")?.hints[0]?.japanese,
  ).toBe("水");
  expect(
    tokens.find((token) => token.text === "water")?.hints[0],
  ).toMatchObject({
    japanese: "水",
    reading: "みず",
    romaji: "mizu",
  });
  expect(
    tokens.find((token) => token.text === "drink")?.hints[0],
  ).toMatchObject({
    japanese: "飲む",
    reading: "のむ",
    romaji: "nomu",
  });
  expect(tokens.find((token) => token.text === ".")).toMatchObject({
    isWord: false,
    hints: [],
  });
});

test("dataset vocabulary is prioritized and articles do not acquire misleading dictionary hints", () => {
  const tennis = exerciseById.get("004f3984827963025986b55a")!;
  const tokens = wordHints(tennis);
  expect(tokens.find((token) => token.text === "tennis")?.hints).toEqual([
    {
      japanese: "テニス",
      reading: "てにす",
      romaji: "tenisu",
      meaning: "tennis",
    },
  ]);
  expect(tokens.find((token) => token.text === "the")).toMatchObject({
    isWord: true,
    hints: [],
  });
  expect(
    tokens
      .find((token) => token.text === "year")
      ?.hints.some((hint) => hint.japanese === "年中"),
  ).toBe(true);
});

test("contractions, hyphenated words, whitespace, and unknown words remain intact", () => {
  const english = "I'm drinking  water—it's ice-cold! Zqxv.";
  const tokens = wordHints({ ...water, english });
  expect(tokens.map((token) => token.text).join("")).toBe(english);
  expect(
    tokens.filter((token) => token.isWord).map((token) => token.text),
  ).toEqual(["I'm", "drinking", "water", "it's", "ice-cold", "Zqxv"]);
  expect(
    tokens.find((token) => token.text === "drinking")?.hints[0]?.japanese,
  ).toBe("飲む");
  expect(tokens.find((token) => token.text === "Zqxv")).toMatchObject({
    isWord: true,
    hints: [],
  });
});

test("dictionary phrases form one hint across regular and irregular verb forms", () => {
  for (const [phrase, japanese] of [
    ["get up", "起きる"],
    ["got up", "起きる"],
    ["getting up", "起きる"],
    ["woke up", "覚める"],
    ["looked for", "探す"],
    ["looking for", "探す"],
    ["turned on", "つける"],
    ["gave up", "諦める"],
  ]) {
    const english = `I ${phrase}.`;
    const tokens = wordHints({
      ...water,
      english,
      japanese: "",
      furiganaVariants: [],
    });
    expect(tokens.map((token) => token.text).join("")).toBe(english);
    expect(tokens.find((token) => token.text === phrase)).toMatchObject({
      isWord: true,
      hints: expect.arrayContaining([expect.objectContaining({ japanese })]),
    });
  }
});

test("phrase hints keep dictionary readings and prioritize reference vocabulary", () => {
  const tokens = wordHints({
    ...water,
    english: "I gave up.",
    japanese: "諦めた。",
    furiganaVariants: ["{諦|あきら}めた。"],
  });
  expect(
    tokens.find((token) => token.text === "gave up")?.hints[0],
  ).toMatchObject({
    japanese: "諦める",
    reading: "あきらめる",
    romaji: "akirameru",
  });
  const gotUp = wordHints({ ...water, english: "I got up." });
  expect(
    gotUp.find((token) => token.text === "got up")?.hints[0],
  ).toMatchObject({
    japanese: "起きる",
    reading: "おきる",
    romaji: "okiru",
  });
});

test("longer phrases and original whitespace are preserved without crossing punctuation", () => {
  const english = "I'm looking\tforward to it. I got  up. Get, up!";
  const tokens = wordHints({ ...water, english });
  expect(tokens.map((token) => token.text).join("")).toBe(english);
  expect(
    tokens.find((token) => token.text === "looking\tforward to")?.hints.length,
  ).toBeGreaterThan(0);
  expect(
    tokens.find((token) => token.text === "got  up")?.hints[0]?.japanese,
  ).toBe("起きる");
  expect(tokens.some((token) => token.text === "Get, up")).toBe(false);
});

test("lemmatization covers irregular verbs beyond the former list without corrupting nouns", () => {
  for (const [word, japanese] of [
    ["swam", "泳ぐ"],
    ["ate", "食べる"],
    ["slept", "眠る"],
    ["goes", "行く"],
  ]) {
    const tokens = wordHints({
      ...water,
      english: word!,
      japanese: "",
      furiganaVariants: [],
    });
    expect(tokens[0]?.hints.some((hint) => hint.japanese === japanese)).toBe(
      true,
    );
  }
  const tennis = wordHints({
    ...water,
    english: "tennis",
    japanese: "",
    furiganaVariants: [],
  });
  expect(tennis[0]?.hints.some((hint) => hint.japanese === "十")).toBe(false);
});

test("sentence mappings distinguish waking up from dressing up and use supplied conjugated readings", () => {
  const waking = wordHints(exerciseById.get("45dee2bd33974022d4c206b8")!);
  const dressing = wordHints(exerciseById.get("509e3885d6a95a1d8130ec56")!);
  expect(waking.find((token) => token.text === "got up")).toMatchObject({
    hintSource: HintSource.Sentence,
    hints: [{ japanese: "起きた", reading: "おきた", romaji: "okita" }],
  });
  expect(dressing.find((token) => token.text === "got up")).toMatchObject({
    hintSource: HintSource.Sentence,
    hints: [{ japanese: "着飾っていた", reading: "きかざっていた" }],
  });
});

test("separated phrases share a hint while their object keeps its own hint", () => {
  const candidate = exerciseById.get("efa5a7b6a9fe73f45005153f")!;
  const tokens = wordHints(candidate);
  const turn = tokens.find((token) => token.text === "turn")!;
  const on = tokens.find((token) => token.text === "on")!;
  expect(turn).toMatchObject({
    phrase: "turn … on",
    hintSource: HintSource.Sentence,
  });
  expect(on.hints).toEqual(turn.hints);
  expect(turn.hints[0]).toMatchObject({
    japanese: "つけて",
    reading: "つけて",
  });
  expect(tokens.find((token) => token.text === "light")?.isWord).toBe(true);
  expect(
    tokens.find((token) => token.text === "light")?.hints.length,
  ).toBeGreaterThan(0);
  expect(tokens.map((token) => token.text).join("")).toBe(candidate.english);

  const unrelated = wordHints(exerciseById.get("3fa72f5a628c1e7da7191956")!);
  expect(unrelated.some((token) => token.phrase === "turn … on")).toBe(false);
  const rotating = wordHints(exerciseById.get("b4b2a4b94ba7e0d81cf2f913")!);
  expect(
    rotating.find((token) => token.text === "turns on")?.hints[0]?.japanese,
  ).toBe("自転している");
});

test("idioms absent from the glossary can use sentence-specific hints", () => {
  const tokens = wordHints(exerciseById.get("bc3183eb19754387b26be05c")!);
  expect(tokens.find((token) => token.text === "fed up with")).toMatchObject({
    hintSource: HintSource.Sentence,
    hints: [{ japanese: "辟易している", reading: "へきえきしている" }],
  });
});

test("every maintained phrase mapping remains aligned with its source and reading", () => {
  for (const entry of phraseBank.entries) {
    const candidate = exerciseById.get(entry.sentenceId)!;
    expect(candidate).toBeDefined();
    expect(sentencePhraseHints(candidate)).toHaveLength(
      entry.phrases.reduce((count, phrase) => count + phrase.spans.length, 0),
    );
    const tokens = wordHints(candidate);
    expect(tokens.map((token) => token.text).join("")).toBe(candidate.english);
    expect(
      tokens.filter(
        (token) => token.hintSource === HintSource.Sentence && token.phrase,
      ),
    ).toHaveLength(sentencePhraseHints(candidate).length);
  }
});

test("reference words take priority over an unrelated dictionary phrase", () => {
  const candidate = exerciseById.get("1da7295f0006574b48b73277")!;
  const tokens = wordHints(candidate);
  expect(tokens.map((token) => token.text).join("")).toBe(candidate.english);
  expect(tokens.some((token) => token.text === "laundry service")).toBe(false);
  expect(tokens.find((token) => token.text === "laundry")).toMatchObject({
    hintSource: HintSource.Sentence,
    hints: [{ japanese: "洗濯", reading: "せんたく", romaji: "sentaku" }],
  });
  expect(tokens.find((token) => token.text === "service")).toMatchObject({
    hintSource: HintSource.Reference,
    hints: [{ japanese: "サービス", reading: "さーびす", romaji: "saabisu" }],
  });
});

test("a phrase is retained when its vocabulary appears in the reference", () => {
  const tokens = wordHints({
    ...water,
    english: "Do you have a laundry service?",
    japanese: "クリーニングはありますか。",
    furiganaVariants: ["クリーニングはありますか。"],
  });
  expect(
    tokens.find((token) => token.text === "laundry service"),
  ).toMatchObject({
    hintSource: HintSource.Reference,
    hints: [{ japanese: "クリーニング", romaji: "kuriiningu" }],
  });
});

test("generic phrases cannot consume a later word supported by the reference", () => {
  const tokens = wordHints({
    ...water,
    english: "Do you have a laundry service?",
    japanese: "サービスはありますか。",
    furiganaVariants: ["サービスはありますか。"],
  });
  expect(tokens.some((token) => token.text === "laundry service")).toBe(false);
  expect(tokens.find((token) => token.text === "service")).toMatchObject({
    hintSource: HintSource.Reference,
    hints: [{ japanese: "サービス", romaji: "saabisu" }],
  });
});

test("reference hints use supplied pronunciation and omit unrelated synonyms", () => {
  const tokens = wordHints({
    ...water,
    english: "Tomorrow.",
    japanese: "明日。",
    furiganaVariants: ["{明日|あす}。"],
  });
  expect(tokens[0]).toMatchObject({
    hintSource: HintSource.Reference,
    hints: [{ japanese: "明日", reading: "あす", romaji: "asu" }],
  });
});

test("partial annotations cannot be labeled as reference vocabulary", () => {
  const tokens = wordHints({
    ...water,
    english: "water",
    japanese: "水曜日。",
    furiganaVariants: ["{水曜日|すいようび}。"],
  });
  expect(tokens[0]?.hintSource).toBeUndefined();
});

test("dictionary lemmas resolve to conjugated wording used by real reference sentences", () => {
  const tried = wordHints(exerciseById.get("0000e8f8c0565c3fbcea0a4c")!);
  expect(tried.find((token) => token.text === "tried")).toMatchObject({
    hintSource: HintSource.Reference,
    hints: [
      { japanese: "試みた", reading: "こころみた", romaji: "kokoromita" },
    ],
  });
  const think = wordHints(exerciseById.get("000459094742195f226bab0e")!);
  expect(think.find((token) => token.text === "think")).toMatchObject({
    hintSource: HintSource.Reference,
    hints: [
      { japanese: "思います", reading: "おもいます", romaji: "omoimasu" },
    ],
  });
});

test("generated lexemes stay aligned with every eligible reference reading", () => {
  for (const candidate of exercises) {
    const furigana = validReadings(candidate)[0]!;
    const expected = (lexemeBank as Record<string, unknown[]>)[furigana] ?? [];
    expect(referenceLexemes(candidate)).toHaveLength(expected.length);
  }
});

test("changed or missing supplied readings cannot reuse cached conjugation hints", () => {
  const candidate = exerciseById.get("0000e8f8c0565c3fbcea0a4c")!;
  expect(referenceLexemes({ ...candidate, japanese: "違います。" })).toEqual(
    [],
  );
  expect(referenceLexemes({ ...candidate, furiganaVariants: [] })).toEqual([]);
});

test("repeated reference words retain their distinct supplied pronunciations", () => {
  const tokens = wordHints({
    ...water,
    english: "Tomorrow and tomorrow.",
    japanese: "明日と明日。",
    furiganaVariants: ["{明日|あす}と{明日|あした}。"],
  });
  expect(tokens[0]?.hints).toEqual([
    expect.objectContaining({
      japanese: "明日",
      reading: "あす",
      romaji: "asu",
    }),
    expect.objectContaining({
      japanese: "明日",
      reading: "あした",
      romaji: "ashita",
    }),
  ]);
});

test("repeated conjugated verbs are offered as distinct reference forms", () => {
  const tokens = wordHints(exerciseById.get("0df89d44e3e6a8aeefcf9f4f")!);
  expect(tokens.find((token) => token.text === "bought")).toMatchObject({
    hintSource: HintSource.Reference,
    hints: [
      { japanese: "買い", reading: "かい", romaji: "kai" },
      { japanese: "買った", reading: "かった", romaji: "katta" },
    ],
  });
});

test("reference hints use the same primary reading as the romaji hint", () => {
  const tokens = wordHints({
    ...water,
    english: "Tomorrow.",
    japanese: "明日。",
    furiganaVariants: ["{明日|あす}。", "{明日|あした}。"],
  });
  expect(tokens[0]?.hints).toEqual([
    expect.objectContaining({
      japanese: "明日",
      reading: "あす",
      romaji: "asu",
    }),
  ]);
});

test("reviewed mappings prevent unrelated senses for left and wore", () => {
  const tokens = wordHints(exerciseById.get("00121c45c61969376c90e342")!);
  expect(tokens.find((token) => token.text === "left")).toMatchObject({
    hintSource: HintSource.Sentence,
    hints: [{ japanese: "左手", reading: "ひだりて", romaji: "hidarite" }],
  });
  expect(tokens.find((token) => token.text === "wore")).toMatchObject({
    hintSource: HintSource.Sentence,
    hints: [
      { japanese: "はめていた", reading: "はめていた", romaji: "hameteita" },
    ],
  });
});

test("explicit mappings cannot use a secondary pronunciation different from the romaji reference", () => {
  const candidate = {
    ...water,
    english: "Tomorrow.",
    japanese: "明日。",
    furiganaVariants: ["{明日|あす}。", "{明日|あした}。"],
  };
  expect(
    sentencePhraseHints(candidate, {
      sentenceId: candidate.id,
      english: candidate.english,
      japanese: candidate.japanese,
      phrases: [
        {
          spans: [{ start: 0, end: 8, text: "Tomorrow" }],
          hints: [{ japanese: "明日", reading: "あした", meaning: "tomorrow" }],
        },
      ],
    }),
  ).toEqual([]);
});

test("stale snapshots, partial words, overlaps, and unsupported Japanese readings invalidate mappings", () => {
  const entry = phraseBank.entries[0]!;
  const candidate = exerciseById.get(entry.sentenceId)!;
  expect(
    sentencePhraseHints({ ...candidate, english: candidate.english + "!" }),
  ).toEqual([]);
  expect(sentencePhraseHints({ ...candidate, japanese: "違う。" })).toEqual([]);
  expect(sentencePhraseHints({ ...candidate, furiganaVariants: [] })).toEqual(
    [],
  );
  const partial = structuredClone(entry);
  partial.phrases[0]!.spans[0]!.start++;
  partial.phrases[0]!.spans[0]!.text = "ot up";
  expect(sentencePhraseHints(candidate, partial)).toEqual([]);
  const overlap = structuredClone(entry);
  overlap.phrases.push(overlap.phrases[0]!);
  expect(sentencePhraseHints(candidate, overlap)).toEqual([]);
  const wrongReading = structuredClone(entry);
  wrongReading.phrases[0]!.hints[0]!.reading = "ねた";
  expect(sentencePhraseHints(candidate, wrongReading)).toEqual([]);
  const missingSurface = structuredClone(entry);
  missingSurface.phrases[0]!.hints[0]!.japanese = "寝た";
  expect(sentencePhraseHints(candidate, missingSurface)).toEqual([]);
});
