import { normalize, parts, validReadings, type Candidate } from "./practice";

const digits = "〇一二三四五六七八九";
const counters =
  /^(?:年|月|日|時|分|秒|歳|才|個|人|回|本|枚|匹|台|円|冊|杯|階|度|番|週|割|キロ|メートル|ポンド|ヤード|つ)/u;

function kanjiNumber(number: bigint): string {
  if (number === 0n) return "零";
  let result = "";
  for (const [unit, label] of [
    [1000000000000n, "兆"],
    [100000000n, "億"],
    [10000n, "万"],
  ] as const) {
    if (number >= unit) {
      result += kanjiNumber(number / unit) + label;
      number %= unit;
    }
  }
  for (const [unit, label] of [
    [1000n, "千"],
    [100n, "百"],
    [10n, "十"],
  ] as const) {
    if (number >= unit) {
      const count = Number(number / unit);
      result += (count === 1 ? "" : digits[count]!) + label;
      number %= unit;
    }
  }
  return result + (number ? digits[Number(number)]! : "");
}

function numericValue(text: string): bigint | null {
  if (/^[0-9]+$/.test(text)) {
    if (text.length > 16 || (text.length > 1 && text.startsWith("0")))
      return null;
    return BigInt(text);
  }
  if (/^[〇零一二三四五六七八九]+$/u.test(text)) {
    const value = text
      .replace(/零/g, "〇")
      .split("")
      .map((digit) => digits.indexOf(digit))
      .join("");
    if (value.length > 16 || (value.length > 1 && value.startsWith("0")))
      return null;
    return BigInt(value);
  }
  let total = 0n,
    group = 0n,
    current = 0n;
  const units: Record<string, bigint> = {
    十: 10n,
    百: 100n,
    千: 1000n,
    万: 10000n,
    億: 100000000n,
    兆: 1000000000000n,
  };
  for (const character of text) {
    const digit = digits.indexOf(character);
    if (digit >= 0) current = BigInt(digit);
    else {
      const unit = units[character];
      if (!unit) return null;
      if (unit < 10000n) group += (current || 1n) * unit;
      else {
        total += (group + current || 1n) * unit;
        group = 0n;
      }
      current = 0n;
    }
  }
  const value = total + group + current;
  return value < 10000000000000000n && kanjiNumber(value) === text
    ? value
    : null;
}

type Edit = { start: number; end: number; text: string };
function replace(text: string, edits: Edit[], offset = 0): string {
  for (const edit of [...edits].reverse())
    text =
      text.slice(0, edit.start - offset) +
      edit.text +
      text.slice(edit.end - offset);
  return text;
}

export function numberAlternatives(candidate: Candidate) {
  const variants = new Map<
    string,
    { japanese: string; furiganaVariants: string[] }
  >();
  for (const reading of validReadings(candidate)) {
    let offset = 0;
    const segments = parts(reading)
      .filter((part) => part.surface.length)
      .map((part) => {
        const start = offset;
        offset += part.surface.length;
        return { ...part, start, end: offset };
      });
    const surface = segments.map((part) => part.surface).join("");
    const slots: { start: number; end: number; options: string[] }[] = [];
    for (const match of surface.matchAll(
      /[0-9０-９〇零一二三四五六七八九十百千万億兆]+/gu,
    )) {
      const start = match.index,
        end = start + match[0].length;
      const before = surface.slice(0, start).at(-1) ?? "";
      const after = surface.slice(end);
      // Keep decimals, grouped numbers, dates, identifiers and lexical compounds intact.
      if (
        /[A-Za-zＡ-Ｚａ-ｚ.,．，/／\-−]/u.test(before) ||
        /^[A-Za-zＡ-Ｚａ-ｚ.,．，/／\-−]/u.test(after)
      )
        continue;
      const text = match[0].normalize("NFKC");
      if (
        !/^[0-9]+$/.test(text) &&
        (!counters.test(after) ||
          /^(?:時[的代]|人称|分[一二三四五六七八九十]+裂)/u.test(after))
      )
        continue;
      if (!/^[0-9]+$/.test(text)) {
        const segment = segments.find(
          (part) => part.start <= start && part.end > start,
        )!;
        const prefix = segment.surface.slice(0, start - segment.start);
        const suffix = segment.surface.slice(end - segment.start);
        // A numeral embedded in an annotated lexical word (三日月, 五月雨,
        // 二人三脚, etc.) is not a standalone quantity.
        if (
          (prefix && prefix !== "第") ||
          (suffix &&
            !/^(?:年(?:中|生|前|後|間|度)?|月(?:間)?|日(?:間|目)?|時(?:間)?|分(?:間)?|秒(?:間)?|歳|才|個|人|回|本|枚|匹|台|円|冊|杯|階|度|番|週(?:間)?|割|キロ|メートル|ポンド|ヤード|つ)$/u.test(
              suffix,
            ))
        )
          continue;
      }
      const value = numericValue(text);
      if (value === null) continue;
      const spellings = [
        match[0],
        String(value),
        kanjiNumber(value),
        String(value).replace(/[0-9]/g, (digit) => digits[Number(digit)]!),
      ];
      slots.push({ start, end, options: [...new Set(spellings)] });
    }
    if (!slots.length) continue;
    let combinations: Edit[][] = [[]];
    for (const slot of slots)
      combinations = combinations
        .flatMap((edits) =>
          slot.options.map((text) => [
            ...edits,
            { start: slot.start, end: slot.end, text },
          ]),
        )
        .slice(0, 256);
    for (const edits of combinations) {
      const changed = edits.filter(
        (edit) => surface.slice(edit.start, edit.end) !== edit.text,
      );
      const japanese = replace(surface, changed);
      if (normalize(japanese) === normalize(candidate.japanese)) continue;
      // Merge annotations crossed by an edit; preserve their supplied reading verbatim.
      let annotated = "";
      for (let index = 0; index < segments.length;) {
        let last = index;
        const first = segments[index]!;
        while (true) {
          const crossing = changed.filter(
            (edit) =>
              edit.start < segments[last]!.end && edit.end > first.start,
          );
          const end = Math.max(
            segments[last]!.end,
            ...crossing.map((edit) => edit.end),
          );
          if (segments[last]!.end >= end) break;
          last++;
        }
        const group = segments.slice(index, last + 1);
        const end = segments[last]!.end;
        const local = changed.filter(
          (edit) => edit.start >= first.start && edit.end <= end,
        );
        const original = group.map((part) => part.surface).join("");
        const transformed = replace(original, local, first.start);
        const supplied = group.map((part) => part.reading).join("");
        annotated +=
          transformed === supplied
            ? transformed
            : `{${transformed}|${supplied}}`;
        index = last + 1;
      }
      if (
        !validReadings({
          ...candidate,
          japanese,
          furiganaVariants: [annotated],
        }).length
      )
        continue;
      const key = normalize(japanese);
      const existing = variants.get(key);
      if (existing) {
        if (!existing.furiganaVariants.includes(annotated))
          existing.furiganaVariants.push(annotated);
      } else variants.set(key, { japanese, furiganaVariants: [annotated] });
    }
  }
  return [...variants.values()];
}
