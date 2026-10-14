import { expect, test } from "bun:test";
import { kanaToRomaji, romajiHint } from "../shared/romaji";
import { exercises, exerciseById } from "../server/utils/exercises";

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
  const candidate = {
    ...exercises[0]!,
    japanese: "水を飲みます。",
    furiganaVariants: ["{橋|はし}です。", "{水|みず}を{飲|の}みます。"],
  };
  expect(romajiHint(candidate)).toBe("mizu wo nomimasu.");
  expect(romajiHint({ ...candidate, furiganaVariants: [] })).toBe("");
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
  expect(romajiHint(candidate)).toBe("uta ga umakereba ii no ni naa.");
});

test("word spacing preserves polite negative and past endings", () => {
  expect(romajiHint(exerciseById.get("02cb469b4193cbcf21c1460c")!)).toBe(
    "sono hako ni ha nani mo arimasendeshita.",
  );
});
