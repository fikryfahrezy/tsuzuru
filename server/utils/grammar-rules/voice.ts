// Reviewed godan potentials without a competing lexical intransitive reading.
// Ambiguous 切れる / 売れる / 開ける and られる forms need context.
export const potentialVerbs = [
  ["読む", "読める"],
  ["書く", "書ける"],
  ["話す", "話せる"],
  ["泳ぐ", "泳げる"],
  ["飲む", "飲める"],
  ["走る", "走れる"],
  ["買う", "買える"],
  ["待つ", "待てる"],
  ["使う", "使える"],
  ["会う", "会える"],
  ["聞く", "聞ける"],
  ["持つ", "持てる"],
  ["呼ぶ", "呼べる"],
  ["遊ぶ", "遊べる"],
  ["渡る", "渡れる"],
  ["戻る", "戻れる"],
  ["通る", "通れる"],
] as const;

export interface VoiceAction {
  base: string[];
  active: string[];
  passive: string[];
}

// Reviewed action alignments, not generic English modal/passive triggers.
// Empty passive lists exclude intransitive English verbs such as come/live.
export const rareruActions: Record<string, VoiceAction> = {
  食べる: { base: ["eat"], active: ["eats", "ate"], passive: ["eaten"] },
  見る: {
    base: ["see", "watch"],
    active: ["sees", "saw", "watches", "watched"],
    passive: ["seen", "watched"],
  },
  みる: {
    base: ["see", "watch"],
    active: ["sees", "saw", "watches", "watched"],
    passive: ["seen", "watched"],
  },
  来る: { base: ["come"], active: ["comes", "came"], passive: [] },
  くる: { base: ["come"], active: ["comes", "came"], passive: [] },
  教える: {
    base: ["teach"],
    active: ["teaches", "taught"],
    passive: ["taught"],
  },
  曲げる: { base: ["bend"], active: ["bends", "bent"], passive: ["bent"] },
  見つける: { base: ["find"], active: ["finds", "found"], passive: ["found"] },
  並べる: {
    base: ["lay", "arrange"],
    active: ["lays", "laid", "arranges", "arranged"],
    passive: ["laid", "arranged"],
  },
  閉める: {
    base: ["close"],
    active: ["closes", "closed"],
    passive: ["closed"],
  },
  育てる: {
    base: ["raise", "foster"],
    active: ["raises", "raised", "fosters", "fostered"],
    passive: ["raised", "fostered"],
  },
  開ける: { base: ["open"], active: ["opens", "opened"], passive: ["opened"] },
  持ち上げる: {
    base: ["lift"],
    active: ["lifts", "lifted"],
    passive: ["lifted"],
  },
  生きる: {
    base: ["live", "exist"],
    active: ["lives", "lived", "exists", "existed"],
    passive: [],
  },
  終える: {
    base: ["finish"],
    active: ["finishes", "finished"],
    passive: ["finished"],
  },
  出かける: { base: ["go out"], active: ["goes out", "went out"], passive: [] },
};

export const respectfulSubjects = new Set([
  "先生",
  "教授",
  "社長",
  "部長",
  "課長",
  "校長",
  "お客様",
]);

export const potentialEndings = [
  "る",
  "ます",
  "た",
  "ました",
  "ない",
  "ません",
  "なかった",
  "ませんでした",
  "て",
  "れば",
  "なければ",
  "たら",
  "なかったら",
  "るなら",
  "ないなら",
  "ても",
  "ては",
  "なくても",
  "なくては",
  "ると",
  "ないと",
] as const;
