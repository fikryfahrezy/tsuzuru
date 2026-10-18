import { vocabulary } from "./vocabulary";

export interface VerbForms {
  te: string;
  stem: string;
  negative: string;
  volitional: string;
  imperative: string;
  causative: string;
}

// Use the dictionary's conjugation class rather than guessing from a suffix.
const classes = new Map<string, Set<string>>();
for (const entry of vocabulary) {
  const codes = classes.get(entry.word) ?? new Set<string>();
  for (const code of entry.pos ?? []) codes.add(code);
  classes.set(entry.word, codes);
}

export function verbForms(lemma: string, verbClass?: string): VerbForms[] {
  const codes = verbClass ? new Set([verbClass]) : classes.get(lemma);
  if (!codes) return [];
  if (codes.has("vk")) {
    const stem = lemma.slice(0, -2);
    return lemma.endsWith("来る")
      ? [
          {
            te: `${stem}来て`,
            stem: `${stem}来`,
            negative: `${stem}来な`,
            volitional: `${stem}来よう`,
            imperative: `${stem}来い`,
            causative: `${stem}来させ`,
          },
        ]
      : [
          {
            te: `${stem}きて`,
            stem: `${stem}き`,
            negative: `${stem}こな`,
            volitional: `${stem}こよう`,
            imperative: `${stem}こい`,
            causative: `${stem}こさせ`,
          },
        ];
  }
  if (lemma.endsWith("する") && (codes.has("vs-i") || codes.has("vs-s"))) {
    const stem = lemma.slice(0, -2);
    return [
      {
        te: `${stem}して`,
        stem: `${stem}し`,
        negative: `${stem}しな`,
        volitional: `${stem}しよう`,
        imperative: `${stem}しろ`,
        causative: `${stem}させ`,
      },
    ];
  }
  const root = lemma.slice(0, -1);
  const forms: VerbForms[] = [];
  if (codes.has("v1") || codes.has("v1-s"))
    forms.push({
      te: `${root}て`,
      stem: root,
      negative: `${root}な`,
      volitional: `${root}よう`,
      imperative: codes.has("v1-s") ? root : `${root}ろ`,
      causative: `${root}させ`,
    });
  const godan = [
    ["v5u", "って", "い", "わな", "おう", "え", "わせ"],
    ["v5u-s", "うて", "い", "わな", "おう", "え", "わせ"],
    ["v5k", "いて", "き", "かな", "こう", "け", "かせ"],
    ["v5k-s", "って", "き", "かな", "こう", "け", "かせ"],
    ["v5g", "いで", "ぎ", "がな", "ごう", "げ", "がせ"],
    ["v5s", "して", "し", "さな", "そう", "せ", "させ"],
    ["v5t", "って", "ち", "たな", "とう", "て", "たせ"],
    ["v5n", "んで", "に", "なな", "のう", "ね", "なせ"],
    ["v5b", "んで", "び", "ばな", "ぼう", "べ", "ばせ"],
    ["v5m", "んで", "み", "まな", "もう", "め", "ませ"],
    ["v5r", "って", "り", "らな", "ろう", "れ", "らせ"],
    ["v5r-i", "って", "り", "らな", "ろう", "れ", "らせ"],
    ["v5aru", "って", "い", "らな", "ろう", "い", "らせ"],
  ] as const;
  for (const [
    code,
    te,
    stem,
    negative,
    volitional,
    imperative,
    causative,
  ] of godan) {
    if (codes.has(code))
      forms.push({
        te: root + te,
        stem: root + stem,
        negative: lemma === "ある" ? "な" : root + negative,
        volitional: root + volitional,
        imperative: root + imperative,
        causative: root + causative,
      });
  }
  return forms;
}
