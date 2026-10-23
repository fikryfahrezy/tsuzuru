import { expect, test } from "bun:test";
import { verbGrammar } from "../server/utils/verb-grammar";
import { clauseGrammar } from "../server/utils/clause-grammar";
import { withBreakdownGrammar } from "../server/utils/breakdown-grammar";
import {
  sentenceAnswerEntries,
  type AnswerEntry,
} from "../server/utils/answer-entries";
import { exerciseById } from "../server/utils/exercises";
import { referenceLexemes } from "../server/utils/reference-lexemes";
import { currentAnswerBreakdown } from "../shared/answer-entries";

type Word = [text: string, types?: string[], lemma?: string];
function fixture(words: Word[]) {
  const source = exerciseById.get("8781e50b14468843e9839443")!;
  const japanese = words.map(([word]) => word).join("");
  const sentence = { ...source, reference: { ...source.reference, japanese } };
  let offset = 0;
  const base: AnswerEntry[] = words.map(([word, types = [], lemma]) => {
    const start = offset;
    offset += word.length;
    return {
      japanese: word,
      kana: word,
      romaji: "",
      meanings: [],
      wordTypes: types,
      ...(lemma ? { dictionaryForm: lemma } : {}),
      start,
      end: offset,
      entryId: `ja-${start}-${offset}`,
    };
  });
  return { sentence, base };
}

test("favors, offers, verb conditions, and casual ongoing forms use verified conjugations", () => {
  for (const [text, lemma, id] of [
    ["してくれた", "する", "te-kureru"],
    ["読んでくれません", "読む", "te-kureru"],
    ["食べましょうか", "食べる", "mashou-ka"],
    ["泳ぎましょうか", "泳ぐ", "mashou-ka"],
    ["鳴いたら", "鳴く", "tara"],
    ["飲んだら", "飲む", "tara"],
    ["来なかったら", "来る", "tara"],
    ["待ちましたら", "待つ", "tara"],
    ["食べてる", "食べる", "te-iru"],
    ["飲んでた", "飲む", "te-iru"],
    ["読んでない", "読む", "te-iru"],
    ["してました", "する", "te-iru"],
  ]) {
    const { sentence, base } = fixture([[text!, ["Verb"], lemma]]);
    expect(verbGrammar(sentence, base), text).toEqual([
      { start: 0, end: text!.length, japanese: text, grammarIds: [id] },
    ]);
  }
});

test("adjective and noun conditions, causal ので, and wanting things have distinct lessons", () => {
  const cases: [Word[], string][] = [
    [[["高かったら", ["い-adjective"], "高い"]], "tara"],
    [[["高くなかったら", ["い-adjective"], "高い"]], "tara"],
    [[["よかったら", ["い-adjective"], "いい"]], "tara"],
    [[["高ければ", ["い-adjective"], "高い"]], "ba"],
    [[["よくなければ", ["い-adjective"], "いい"]], "ba"],
    [[["静かだったら", ["な-adjective"], "静か"]], "tara"],
    [[["雨", ["Noun"]], ["だったら"]], "tara"],
    [[["行く", ["Verb"]], ["ので"]], "node"],
    [[["学生", ["Noun"]], ["な"], ["ので"]], "node"],
    [
      [
        ["水", ["Noun"]],
        ["が", ["Particle"]],
        ["欲しいです", ["い-adjective"], "欲しい"],
      ],
      "ga-hoshii",
    ],
    [[["本", ["Noun"]], ["が", ["Particle"]], ["ほしくなかった"]], "ga-hoshii"],
  ];
  for (const [words, id] of cases) {
    const { sentence, base } = fixture(words);
    const matches = clauseGrammar(sentence, base);
    expect(matches, sentence.reference.japanese).toHaveLength(1);
    expect(matches[0]!.grammarIds).toEqual([id]);
  }
});

test("lexical lookalikes, possessive の + で, and incomplete lists do not acquire lessons", () => {
  const cases: Word[][] = [
    [["頭", ["Noun"]]],
    [["飲いてる", ["Verb"], "飲む"]],
    [["こちら", ["Pronoun"]]],
    [
      ["水", ["Noun"]],
      ["の", ["Particle"]],
      ["で", ["Particle"]],
    ],
    [["ので"]],
    [["食べた", ["Verb"], "食べる"], ["り"], ["たい"]],
  ];
  for (const words of cases) {
    const { sentence, base } = fixture(words);
    expect(
      [...verbGrammar(sentence, base), ...clauseGrammar(sentence, base)],
      sentence.reference.japanese,
    ).toEqual([]);
  }
  const conjecture = fixture([["食べたらしい", ["Verb"], "食べる"]]);
  const ids = verbGrammar(conjecture.sentence, conjecture.base).flatMap(
    (match) => match.grammarIds,
  );
  expect(ids).toContain("rashii");
  expect(ids).not.toContain("tara");
});

test("action wishes receive their action lesson rather than the wanting-things lesson", () => {
  const { sentence, base } = fixture([
    ["猫", ["Noun"]],
    ["が", ["Particle"]],
    ["食べて", ["Verb"], "食べる"],
    ["欲しい"],
  ]);
  const ids = withBreakdownGrammar(sentence, base, base)
    .flatMap((part) => part.grammar ?? [])
    .map((g) => g.id);
  expect(ids).toContain("te-hoshii");
  expect(ids).not.toContain("ga-hoshii");
});

test("nominalization requires a complete verb and case marking, distinct from possession and explanation", () => {
  const positive = fixture([
    ["走る", ["Verb"]],
    ["こと", ["Noun"]],
    ["を", ["Particle"]],
    ["やめる", ["Verb"]],
  ]);
  expect(clauseGrammar(positive.sentence, positive.base)).toContainEqual(
    expect.objectContaining({
      grammarIds: ["no-koto-nominalizer"],
      japanese: "こと",
    }),
  );
  for (const words of [
    [
      ["私", ["Pronoun"]],
      ["の", ["Particle"]],
      ["本", ["Noun"]],
    ],
    [
      ["走る", ["Verb"]],
      ["の", ["Particle"]],
      ["です", ["Copula"]],
    ],
    [
      ["走り", ["Verb"], "走る"],
      ["こと", ["Noun"]],
      ["が", ["Particle"]],
    ],
  ] as Word[][]) {
    const { sentence, base } = fixture(words);
    expect(
      clauseGrammar(sentence, base).flatMap((g) => g.grammarIds),
    ).not.toContain("no-koto-nominalizer");
  }
});

test("lists span their verbs and final する once, keeping only its politeness, while offers suppress component question lessons", () => {
  const { sentence, base } = fixture([
    ["食べ", ["Verb"], "食べる"],
    ["たり"],
    ["飲ん", ["Verb"], "飲む"],
    ["だり"],
    ["します", ["Verb"], "する"],
  ]);
  const parts = withBreakdownGrammar(sentence, base, base);
  expect(parts.flatMap((part) => part.grammar ?? [])).toEqual([
    expect.objectContaining({
      id: "tari-tari-suru",
      japanese: "食べたり飲んだりします",
    }),
    expect.objectContaining({ id: "masu", japanese: "します" }),
  ]);
  const offer = fixture([
    ["食べましょう", ["Verb"], "食べる"],
    ["か", ["Particle"]],
  ]);
  expect(
    withBreakdownGrammar(offer.sentence, offer.base, offer.base).flatMap(
      (part) => part.grammar ?? [],
    ),
  ).toEqual([
    expect.objectContaining({ id: "mashou-ka", japanese: "食べましょうか" }),
  ]);
});

test("new lessons and metadata repairs work through real sentence breakdowns", () => {
  for (const [id, lesson, span] of [
    ["078f0ec37cc2cfcc1d3297fe", "te-kureru", "してくれた"],
    ["1f18f60819ebf71825aa1dcc", "mashou-ka", "差し上げましょうか"],
    ["001e32e4d1b107427fe4c37c", "tara", "鳴いたら"],
    ["00ca9b14f39400422c5f4d04", "node", "ので"],
    ["2ce84f0285fb95e3500ec9d9", "ga-hoshii", "じゅうたんが欲しい"],
    ["0362bd071775c5234a93ec8f", "tari-tari-suru", "吸ったり吐いたりして"],
    ["05782aa2968b01c31871f3a1", "te-iru", "してる"],
    ["507e6ccf649cfed10835218f", "te-morau", "きてもらう"],
    ["3281d6d47784cfb098c422d1", "hou-ga-ii", "書き直したほうがいい"],
    ["63fedb3ce41aaf4e9cdb2f5a", "te-morau", "つくろってもらった"],
  ]) {
    const sentence = exerciseById.get(id!)!;
    const parts = sentenceAnswerEntries(sentence).entries;
    expect(
      parts.flatMap((part) => part.grammar ?? []),
      id,
    ).toContainEqual(expect.objectContaining({ id: lesson, japanese: span }));
  }
  const repaired = exerciseById.get("63fedb3ce41aaf4e9cdb2f5a")!;
  expect(referenceLexemes(repaired)).toContainEqual(
    expect.objectContaining({
      japanese: "つくろって",
      lemma: "つくろう",
      reading: "つくろって",
      verbClass: "v5u",
    }),
  );
  expect(
    currentAnswerBreakdown({
      answerDetailsVersion: "answer-entries-v7",
      answerBreakdown: sentenceAnswerEntries(repaired).entries,
    }),
  ).toBeUndefined();
});
