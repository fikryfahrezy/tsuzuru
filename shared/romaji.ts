import { hiragana, parts, validReadings, type Candidate } from "./practice";

const syllables: Record<string, string> = {};
const rows = [
  ["あいうえお", "a i u e o"],
  ["かきくけこ", "ka ki ku ke ko"],
  ["がぎぐげご", "ga gi gu ge go"],
  ["さしすせそ", "sa shi su se so"],
  ["ざじずぜぞ", "za ji zu ze zo"],
  ["たちつてと", "ta chi tsu te to"],
  ["だぢづでど", "da ji zu de do"],
  ["なにぬねの", "na ni nu ne no"],
  ["はひふへほ", "ha hi fu he ho"],
  ["ばびぶべぼ", "ba bi bu be bo"],
  ["ぱぴぷぺぽ", "pa pi pu pe po"],
  ["まみむめも", "ma mi mu me mo"],
  ["やゆよ", "ya yu yo"],
  ["らりるれろ", "ra ri ru re ro"],
  ["わゐゑをん", "wa wi we wo n"],
  ["ぁぃぅぇぉゃゅょゎゔ", "a i u e o ya yu yo wa vu"],
] as const;
for (const [kana, sounds] of rows) {
  const values = sounds.split(" ");
  [...kana].forEach((character, index) => {
    syllables[character] = values[index]!;
  });
}
for (const [kana, stem] of [
  ["き", "ky"],
  ["ぎ", "gy"],
  ["し", "sh"],
  ["じ", "j"],
  ["ち", "ch"],
  ["ぢ", "j"],
  ["に", "ny"],
  ["ひ", "hy"],
  ["び", "by"],
  ["ぴ", "py"],
  ["み", "my"],
  ["り", "ry"],
] as const) {
  for (const [small, vowel] of [
    ["ゃ", "a"],
    ["ゅ", "u"],
    ["ょ", "o"],
  ] as const)
    syllables[kana + small] = stem + vowel;
}
Object.assign(syllables, {
  いぇ: "ye",
  うぃ: "wi",
  うぇ: "we",
  うぉ: "wo",
  しぇ: "she",
  じぇ: "je",
  ちぇ: "che",
  てぃ: "ti",
  てゅ: "tyu",
  でぃ: "di",
  でゅ: "dyu",
  とぅ: "tu",
  どぅ: "du",
  つぁ: "tsa",
  つぃ: "tsi",
  つぇ: "tse",
  つぉ: "tso",
  ふぁ: "fa",
  ふぃ: "fi",
  ふぇ: "fe",
  ふぉ: "fo",
  ふゅ: "fyu",
  ゔぁ: "va",
  ゔぃ: "vi",
  ゔぇ: "ve",
  ゔぉ: "vo",
  ゔゅ: "vyu",
});

// Romanize the supplied kana spelling; vowel sequences remain explicit (ou, uu).
export function kanaToRomaji(reading: string): string {
  const kana = [...hiragana(reading.normalize("NFKC"))];
  let output = "";
  for (let index = 0; index < kana.length; index++) {
    const character = kana[index]!;
    const pair = character + (kana[index + 1] ?? "");
    const sound = syllables[pair] ?? syllables[character];
    if (character === "っ") {
      const next =
        syllables[(kana[index + 1] ?? "") + (kana[index + 2] ?? "")] ??
        syllables[kana[index + 1] ?? ""];
      output += next?.startsWith("ch")
        ? "t"
        : next && /^[bcdfghjklmpqrstvwxyz]/.test(next)
          ? next[0]
          : "tsu";
    } else if (character === "ー") {
      output += output.match(/[aeiou]$/)?.[0] ?? "-";
    } else if (character === "ん") {
      const next = syllables[kana[index + 1] ?? ""];
      output += next && /^[aeiouy]/.test(next) ? "n'" : "n";
    } else if (sound) {
      output += sound;
      if (syllables[pair]) index++;
    } else {
      output +=
        (
          {
            "。": ".",
            "、": ",",
            "・": " ",
            "「": '"',
            "」": '"',
            "『": '"',
            "』": '"',
          } as Record<string, string>
        )[character] ?? character;
    }
  }
  return output;
}

export function romajiHint(candidate: Candidate): string {
  const reading = validReadings(candidate)[0];
  if (!reading) return "";
  const chunks: { text: string; annotated: boolean }[] = [];
  for (const part of parts(reading)) {
    if (!part.surface) continue;
    if (part.surface !== part.reading) {
      const previous = chunks.at(-1);
      // Keep a numeric prefix with its annotated counter or duration.
      if (previous && /^[0-9０-９]+$/u.test(previous.text)) {
        previous.text += part.reading;
        previous.annotated = true;
      } else chunks.push({ text: part.reading, annotated: true });
      continue;
    }
    const literals =
      part.reading.match(
        /[ぁ-ゖ]+|[ァ-ヶー]+|[\p{Letter}\p{Number}]+|[^\p{Letter}\p{Number}]+/gu,
      ) ?? [];
    for (const literal of literals) {
      const previous = chunks.at(-1);
      if (/^[ぁ-ゖ]+$/u.test(literal)) {
        // Separate common particles at a supplied word/script boundary.
        // Keep okurigana with its annotated stem (飲 + みます → nomimasu).
        const particle =
          literal.match(/^[はをへ]/u)?.[0] ??
          (/^(?:が|の|に|と|で|も|や|から|まで|では|には|にも)$/u.test(literal)
            ? literal
            : undefined);
        if (particle) {
          chunks.push({ text: particle, annotated: false });
          if (literal.length > particle.length)
            chunks.push({
              text: literal.slice(particle.length),
              annotated: false,
            });
        } else if (previous?.annotated) {
          previous.text += literal;
          previous.annotated = false;
        } else chunks.push({ text: literal, annotated: false });
      } else chunks.push({ text: literal, annotated: false });
    }
  }
  return kanaToRomaji(chunks.map((chunk) => chunk.text).join(" "))
    .replace(/\s+([.,!?;:)\]"％%])/gu, "$1")
    .replace(/([,;:!?])(?=\S)/gu, "$1 ")
    .replace(/([([])\s+/gu, "$1")
    .replace(/\s+/gu, " ")
    .trim();
}
