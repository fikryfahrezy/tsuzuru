import type { GrammarAnnotation } from "../../shared/answer-entries";
import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";
import { verbForms, type VerbForms } from "./verb-forms";
import { referenceLexemes } from "./reference-lexemes";
import { vocabulary } from "./vocabulary";
import { hiragana } from "../../shared/practice";
import {
  constructions,
  lexicalKakeruStems,
  lexicalNukuStems,
  type ConstructionForm,
} from "./grammar-rules/verb";
import { validAdvancedTail } from "./grammar-rules/advanced";
import { explanatoryTail } from "./grammar-rules/construction";
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

const conjecturalTails = new Set(["だろう", "でしょう"]);

// 〜たら followed by a past main clause reports what happened or was found
// (見たらおもしろかった). Wishes (たらよかった), questions, quotations and
// embedded thoughts (晴れたら行こうと思った) are excluded.
function pastMainClause(text: string, base: AnswerEntry[], end: number) {
  const rest = text.slice(end).match(/^[^。！？?!]*/u)![0];
  const stop = text[end + rest.length];
  if (
    stop === "？" ||
    stop === "?" ||
    /^[、,]?(?:よかった|良かった|いい|よい|どう)/u.test(rest) ||
    /[「」『』]|と(?:思|言|考)|って(?:言|思)/u.test(rest)
  )
    return false;
  const last = base.findLast(
    (part) =>
      part.start >= end &&
      part.end <= end + rest.length &&
      !(
        part.wordTypes.includes("Particle") &&
        /^[よねわさ]$/u.test(part.japanese)
      ),
  );
  return (
    !!last &&
    (last.japanese.endsWith("た") ||
      (last.wordTypes.includes("Verb") &&
        last.japanese.endsWith("だ") &&
        last.dictionaryForm !== undefined &&
        last.dictionaryForm !== last.japanese))
  );
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
      if (lemma.endsWith("する")) return lemma.slice(0, -2) + "せ";
      // ある's negative is ない, but its classical base is あら (あらねば).
      return lemma === "ある" ? "あら" : forms.negative.slice(0, -1);
    case "passive": {
      if (lemma.endsWith("する")) return lemma.slice(0, -2) + "され";
      // Ichidan and 来る verbs take られ; godan verbs take れ.
      const root = forms.negative.slice(0, -1);
      return root + (forms.causative === root + "させ" ? "られ" : "れ");
    }
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
    // The tokenizer may keep a stem + かける / 抜く as one dictionary
    // compound (終わりかける, 撃ち抜く) or split it (おぼれ + かけた).
    case "compoundStem": {
      const auxiliary = ["かける", "抜く", "ぬく"].find(
        (word) => lemma.endsWith(word) && lemma.length > word.length,
      );
      return auxiliary ? lemma.slice(0, -auxiliary.length) : forms.stem;
    }
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
  // A construction may end inside a word whose rest is only a conjectural
  // tail: 出さなきゃ + なら|ないだろう. だろう keeps its own lesson.
  const endsWord = (end: number) =>
    boundaries.has(end) ||
    base.some(
      (part) =>
        part.start < end &&
        part.end > end &&
        conjecturalTails.has(text.slice(end, part.end)),
    );
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
            !endsWord(end) ||
            !text.startsWith(japanese, entry.start) ||
            !validAdvancedTail(rule.id, text.slice(end)) ||
            !explanatoryTail(rule.id, japanese, text.slice(end)) ||
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
            (rule.id === "kakeru" && lexicalKakeruStems.has(form)) ||
            (rule.id === "nuku" && lexicalNukuStems.has(form)) ||
            // ありがたい "grateful" is lexical.
            (rule.id === "gatai" && ["ある", "有る"].includes(lemma)) ||
            (rule.id === "ta-tokoro" && !/^[、,]/u.test(text.slice(end))) ||
            (rule.id === "nari" && /^[のに]/u.test(text.slice(end))) ||
            // こと closes the sentence; elsewhere it is a nominalizer.
            (rule.id === "koto-instruction" &&
              !/^(?:[。！!」』]|$)/u.test(text.slice(end))) ||
            // 〜たって before a verb of saying or at the end is a quotation
            // or hearsay (遅れたって言った), not "even if".
            (rule.id === "tatte-datte" &&
              /^(?:[。！？?!」』]|[ねよば]|言|いう|いっ|聞|思|$)/u.test(
                text.slice(end),
              )) ||
            // A bare なきゃ / なくちゃ is obligation only when the sentence
            // stops there; otherwise it is a condition (しなきゃ大丈夫).
            (rule.id === "nai-to-ikenai-nakucha" &&
              /(?:ちゃ|きゃ)$/u.test(japanese) &&
              !/^(?:[。！？?!」』…]|[よねなぞわ]|なら|なり|いけ|$)/u.test(
                text.slice(end),
              )) ||
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
    if (best?.grammarIds[0] === "tara" && pastMainClause(text, base, best.end))
      best.grammarIds.push("tara-ta");
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
