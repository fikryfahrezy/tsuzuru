import { expect, test } from "bun:test";
import { kanaToRomaji, romajiHint } from "../shared/romaji";
import { compare, Strictness } from "../shared/practice";
import {
  candidates,
  defaultBanks,
  exercises,
  exerciseById,
  loadSentence,
} from "../server/utils/exercises";
import conjunctionReviews from "../data/romaji/conjunction-reviews.json";
import sourceCandidates from "../data/processed/sentence-candidates.json";

test("romaji handles both kana scripts, combined sounds, and doubled consonants", () => {
  expect(kanaToRomaji("みずをのみます。")).toBe("mizuwonomimasu.");
  expect(kanaToRomaji("きょう、しゃしんをとった。")).toBe(
    "kyou,shashinwototta.",
  );
  expect(kanaToRomaji("マッチとコーヒーとティー")).toBe("matchitokoohiitotii");
  expect(kanaToRomaji("しんよう、ほんや、こんにちは")).toBe(
    "shin'you,hon'ya,konnichiha",
  );
  expect(kanaToRomaji("ファイル、シェフ、フィルム")).toBe("fairu,shefu,firumu");
  expect(kanaToRomaji("ﾁｮｯﾄ！")).toBe("chotto!");
});

test("hints use validated readings instead of guessing kanji pronunciation", () => {
  const record = {
    ...candidates[0]!,
    japanese: "水を飲みます。",
    furiganaVariants: ["{橋|はし}です。", "{水|みず}を{飲|の}みます。"],
  };
  expect(romajiHint(loadSentence(record)!)).toBe("mizu wo nomimasu.");
  expect(loadSentence({ ...record, furiganaVariants: [] })).toBeNull();
});

test("hints space annotations, particles, and script runs while keeping verb endings together", () => {
  expect(romajiHint(exerciseById.get("004f3984827963025986b55a")!)).toBe(
    "watashi ha 1nenjuu tenisu wo shimasu.",
  );
});

test("every eligible exercise provides a hint without Japanese letters", () => {
  for (const candidate of exercises) {
    const hint = romajiHint(candidate);
    expect(hint.length).toBeGreaterThan(0);
    if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(hint))
      throw new Error(`Incomplete romaji for ${candidate.id}: ${hint}`);
  }
});

test("hints separate kana words and particles after an annotated noun", () => {
  const candidate = exerciseById.get("8f62ed30e02787755889cb7f")!;
  expect(romajiHint(candidate)).toBe("uta ga umakereba ii noni naa.");
});

test("every supplied reading has generated spacing so new data cannot silently use the fallback", () => {
  for (const candidate of exercises) {
    for (const reading of candidate.reference.readings) {
      if (!reading.wordBoundaries)
        throw new Error(
          `Missing romaji spacing for ${candidate.id}; run romaji:generate.`,
        );
    }
  }
});

test("generated spacing applies only while the sentence ID, source text, and reading match", () => {
  const record = candidates.find(
    (row) => row.id === "0000e8f8c0565c3fbcea0a4c",
  )!;
  const spacing = (row: typeof record) =>
    loadSentence(row, defaultBanks)!.reference.readings[0]!.wordBoundaries;
  expect(spacing(record)).toBeDefined();
  expect(spacing({ ...record, id: "unknown" })).toBeUndefined();
  expect(
    spacing({
      ...record,
      japanese: "二人はかわるがわる試した。",
      furiganaVariants: ["{二人|ふたり}はかわるがわる{試|ため}した。"],
    }),
  ).toBeUndefined();
  expect(
    spacing({
      ...record,
      furiganaVariants: ["{二|ふた}{人|り}はかわるがわる{試|こころ}みた。"],
    }),
  ).toBeUndefined();
});

test("conjunction decisions remain aligned with their reviewed source", () => {
  const sourceById = new Map(
    sourceCandidates.map((candidate) => [candidate.id, candidate]),
  );
  for (const review of conjunctionReviews) {
    const candidate = sourceById.get(review.id);
    expect(candidate?.japanese).toBe(review.japanese);
    expect(candidate?.english).toBe(review.english);
  }
});

test("reviewed causal conjunctions are joined while nominalized clauses stay separate", () => {
  expect(romajiHint(exerciseById.get("00ca9b14f39400422c5f4d04")!)).toBe(
    "tomodachi ga koko ni inai node gakkari da.",
  );
  expect(romajiHint(exerciseById.get("0c9cd7596a064f9334263e09")!)).toBe(
    "naoru no ni dono kurai no kikan ga kakarimasu ka.",
  );
});

test("compound particle deha follows the documented spacing convention", () => {
  expect(romajiHint(exerciseById.get("0028ff5e1ccfd69a615c5240")!)).toBe(
    "watashi ha suugaku deha kare yori ototte iru.",
  );
});

test("word spacing preserves polite negative and past endings", () => {
  expect(romajiHint(exerciseById.get("02cb469b4193cbcf21c1460c")!)).toBe(
    "sono hako ni ha nani mo arimasendeshita.",
  );
});

test("compound demo and temo stay together across the sentence bank", () => {
  expect(romajiHint(exerciseById.get("5f5cc8b5eae897bed3742337")!)).toBe(
    "kamereon ha donna iro ni demo nareru.",
  );
  expect(romajiHint(exerciseById.get("04e30483b5c4c5b9a80d794c")!)).toBe(
    "onaji mono ha doko ni demo mitsukarimasu.",
  );
  expect(romajiHint(exerciseById.get("0364a0abf8ed1efcc797071b")!)).toBe(
    "sukoshi terebi wo mitemo iidesu ka.",
  );
});

test("honorific prefixes stay with their nouns in sentence hints", () => {
  expect(romajiHint(exerciseById.get("037ecf536cc433ef401f94da")!)).toBe(
    "suupu wo ireru kubonda osara ga arimasu ka.",
  );
  expect(romajiHint(exerciseById.get("0324d950cada541bfaeb25e2")!)).toBe(
    "kikimashita wa yo. goryoushin ga shakkin wo nokoshite jouhatsu shita sou desu wa ne.",
  );
});

test("sentences once annotated with JMdict entry numbers use the entry's reading", () => {
  // Upstream annotated 前 as #1392580; see data/reading-repairs/repairs.json.
  const speech = exerciseById.get("09b5499b1decb1d0d7b92193")!;
  expect(romajiHint(speech)).toBe(
    "kare ha takusan no hito no mae de enzetsu shita.",
  );
  expect(
    compare(speech, "かれはたくさんのひとのまえでえんぜつした", Strictness.Kana)
      .matched,
  ).toBe(true);
  for (const sentence of exercises)
    for (const rendering of [sentence.reference, ...sentence.alternatives])
      for (const reading of rendering.readings)
        expect(reading.furigana).not.toMatch(/\|[#＃]/u);
});
