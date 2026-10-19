import type { GrammarAnnotation } from "../../shared/answer-entries";
import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";
import { verbForms, type VerbForms } from "./verb-forms";
import { referenceLexemes } from "./reference-lexemes";
import { vocabulary } from "./vocabulary";
import { hiragana } from "../../shared/practice";
import { constructions, type ConstructionForm } from "./grammar-rules/verb";
import { validAdvancedTail } from "./grammar-rules/advanced";
import { potentialDerivation } from "./potential-forms";
import type { VoiceAnalysis } from "./voice-analysis";

// てある requires a transitive action. Missing transitivity metadata leaves the
// occurrence for review rather than inferring it from the spelling alone.
const transitive = new Map<string, Set<string>>();
for (const entry of vocabulary) {
  if (!entry.pos?.includes("vt")) continue;
  const verbClass = entry.pos.find((code) => /^v[1-5sk]/u.test(code));
  const forms = verbForms(hiragana(entry.reading), verbClass);
  const readings = transitive.get(entry.word) ?? new Set<string>();
  for (const form of forms) readings.add(form.te);
  transitive.set(entry.word, readings);
}

const conditionalEndings: Record<string, string> = {
  う: "え",
  く: "け",
  ぐ: "げ",
  す: "せ",
  つ: "て",
  ぬ: "ね",
  ぶ: "べ",
  む: "め",
  る: "れ",
};

// Map a verified conjugation to the base used by a construction. Rule tables
// describe suffixes; this is the only place that interprets their form kinds.
function constructionBase(
  lemma: string,
  forms: VerbForms,
  kind: ConstructionForm,
): string {
  switch (kind) {
    case "dictionary":
      return lemma;
    case "classical":
      return lemma.endsWith("する")
        ? lemma.slice(0, -2) + "せ"
        : forms.negative.slice(0, -1);
    case "beki":
      return lemma.endsWith("する") ? lemma.slice(0, -1) : lemma;
    case "honorificStem":
      return "お" + forms.stem;
    case "zu":
      return lemma.endsWith("する")
        ? lemma.slice(0, -2) + "せず"
        : forms.negative.slice(0, -1) + "ず";
    case "ta":
      return forms.te.replace(/て$/u, "た").replace(/で$/u, "だ");
    case "conditional":
      return lemma.slice(0, -1) + (conditionalEndings[lemma.at(-1)!] ?? "");
    default:
      return forms[kind];
  }
}

export function verbGrammar(
  sentence: Sentence,
  base: AnswerEntry[],
  voices?: VoiceAnalysis[],
): GrammarAnnotation[] {
  const text = sentence.reference.japanese;
  const lexemes = referenceLexemes(sentence);
  const boundaries = new Set(base.map((entry) => entry.end));
  const matches: GrammarAnnotation[] = [];
  for (const entry of base) {
    if (!entry.wordTypes.includes("Verb")) continue;
    let best: GrammarAnnotation | undefined;
    const verbClass = lexemes.find(
      (lexeme) =>
        lexeme.japanese === entry.japanese && lexeme.reading === entry.kana,
    )?.verbClass;
    const derived = voices
      ? voices.find(
          (voice) => voice.start === entry.start && voice.derivedLemma,
        )?.derivedLemma
      : potentialDerivation(entry, text.slice(entry.start));
    const lemma = derived ?? entry.dictionaryForm ?? entry.japanese;
    for (const forms of verbForms(lemma, derived ? "v1" : verbClass)) {
      for (const rule of constructions) {
        if (
          rule.id === "te-aru" &&
          ![...(transitive.get(lemma) ?? [])].some((reading) =>
            entry.kana.startsWith(reading),
          )
        )
          continue;
        const form = constructionBase(lemma, forms, rule.form);
        for (const ending of rule.endings) {
          const japanese =
            form + ending + (rule.id === "ba-hodo" ? lemma + "ほど" : "");
          const end = entry.start + japanese.length;
          // Match whole positioned words, including a construction split over
          // several chips. Punctuation and whitespace cannot be skipped.
          if (
            end < entry.end ||
            !boundaries.has(end) ||
            !text.startsWith(japanese, entry.start) ||
            !validAdvancedTail(rule.id, text.slice(end)) ||
            (rule.id === "dasu" &&
              ![
                "泣く",
                "笑う",
                "降る",
                "走る",
                "動く",
                "騒ぐ",
                "話す",
                "歌う",
                "吹く",
              ].includes(lemma)) ||
            (rule.id === "ba-ii" &&
              base.some(
                (part) => part.start === end && part.wordTypes.includes("Noun"),
              )) ||
            // てもらう is a different construction, even if chips split も.
            (rule.id === "te-mo-de-mo" && text[end] === "ら") ||
            (rule.id === "ou-you" &&
              ["ある", "有る", "在る"].includes(lemma)) ||
            (rule.id === "masen-ka" &&
              (![
                "行く",
                "来る",
                "見る",
                "読む",
                "食べる",
                "飲む",
                "遊ぶ",
              ].includes(lemma) ||
                !/(?:一緒に|いっしょに|私と|僕と|わたしと|ぼくと)[^。？！?!、,「」『』]*$/u.test(
                  text.slice(0, entry.start),
                ))) ||
            (rule.id === "e-ro" &&
              [
                "くださる",
                "下さる",
                "なさる",
                "為さる",
                "いらっしゃる",
                "おっしゃる",
              ].includes(lemma)) ||
            (rule.id === "kata" &&
              base.some(
                (part) =>
                  part.start >= entry.start &&
                  part.end === end &&
                  part.japanese === "方" &&
                  part.kana !== "かた",
              )) ||
            (rule.id === "na-prohibition" &&
              !/^(?:[。！？?!」』]|[よねぞ]|$)/u.test(text.slice(end))) ||
            (rule.id === "zu-ni" && /^(?:は|も)/u.test(text.slice(end))) ||
            (rule.id === "naide" &&
              (!base.some(
                (part) =>
                  part.start >= end &&
                  part.wordTypes.includes("Verb") &&
                  !/[。？！?!、,「」『』]/u.test(text.slice(end, part.start)),
              ) ||
                /^(?:ください|下さい|くれ|ほし|欲し|もら|いただ|頂)/u.test(
                  text.slice(end),
                ))) ||
            (best && best.end >= end)
          )
            continue;
          best = { start: entry.start, end, japanese, grammarIds: [rule.id] };
        }
      }
    }
    if (best) matches.push(best);
  }
  // A たり occurrence establishes a listing only when its final する is
  // present. Collect consecutive occurrences into one explanation.
  const lists: GrammarAnnotation[] = [];
  let pending: GrammarAnnotation[] = [];
  for (const match of matches.filter((match) =>
    match.grammarIds.includes("tari-tari-suru"),
  )) {
    const previous = pending.at(-1);
    if (
      previous &&
      /[。？！?!「」『』]/u.test(text.slice(previous.end, match.start))
    )
      pending = [];
    pending.push(match);
    for (const ending of [
      "する",
      "します",
      "した",
      "しました",
      "して",
      "しない",
      "しません",
      "しよう",
    ]) {
      const end = match.end + ending.length;
      if (!text.startsWith(ending, match.end) || !boundaries.has(end)) continue;
      const start = pending[0]!.start;
      lists.push({
        start,
        end,
        japanese: text.slice(start, end),
        grammarIds: ["tari-tari-suru"],
      });
      pending = [];
      break;
    }
  }
  // The longest construction owns its auxiliary words too.
  const complete = [
    ...matches.filter((match) => !match.grammarIds.includes("tari-tari-suru")),
    ...lists,
  ];
  return complete.filter(
    (match) =>
      !complete.some(
        (other) => other.start < match.start && other.end >= match.end,
      ),
  );
}
