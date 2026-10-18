import type { GrammarAnnotation } from "../../shared/answer-entries";
import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";
import { verbForms } from "./verb-forms";

// These lexical cues deliberately cover clear, common roles. A noun category
// alone does not tell us whether で is a place, tool, time limit, or cause.
const pronouns = new Set([
  "私",
  "わたし",
  "僕",
  "ぼく",
  "俺",
  "あなた",
  "貴方",
  "彼",
  "彼女",
  "君",
  "きみ",
  "誰",
  "だれ",
  "これ",
  "それ",
  "あれ",
  "どれ",
  "ここ",
  "そこ",
  "あそこ",
  "どこ",
]);
const people = new Set([
  "父",
  "母",
  "兄",
  "姉",
  "弟",
  "妹",
  "家族",
  "友達",
  "友人",
  "先生",
  "学生",
  "子供",
  "子ども",
  "人",
  "孫",
  "お父さん",
  "お母さん",
  "お兄さん",
  "お姉さん",
]);
const places = new Set([
  "家",
  "部屋",
  "学校",
  "大学",
  "病院",
  "図書館",
  "公園",
  "駅",
  "空港",
  "会社",
  "店",
  "教室",
  "事務所",
  "食堂",
  "庭",
  "海",
  "山",
  "川",
  "日本",
  "東京",
  "大阪",
  "京都",
  "南極",
  "ここ",
  "そこ",
  "あそこ",
  "どこ",
]);
const times = new Set([
  "今",
  "朝",
  "昼",
  "夜",
  "今日",
  "昨日",
  "明日",
  "来週",
  "先週",
  "毎日",
  "月曜日",
  "火曜日",
  "水曜日",
  "木曜日",
  "金曜日",
  "土曜日",
  "日曜日",
]);
const transport = new Set([
  "電車",
  "バス",
  "車",
  "自動車",
  "タクシー",
  "飛行機",
  "自転車",
  "地下鉄",
  "船",
  "徒歩",
]);
const tools = new Set([
  "ペン",
  "鉛筆",
  "箸",
  "ナイフ",
  "フォーク",
  "はさみ",
  "ハサミ",
  "手",
  "電話",
  "現金",
  "カード",
]);
const languages = new Set([
  "日本語",
  "英語",
  "中国語",
  "フランス語",
  "ドイツ語",
  "スペイン語",
]);
const movement = new Set([
  "行く",
  "いく",
  "来る",
  "くる",
  "帰る",
  "戻る",
  "向かう",
  "着く",
  "到着する",
  "入る",
  "出かける",
]);
const existence = new Set(["ある", "有る", "在る", "いる", "居る", "ござる"]);
const recipientVerbs = new Set([
  "渡す",
  "あげる",
  "くれる",
  "送る",
  "貸す",
  "返す",
  "教える",
  "伝える",
  "知らせる",
  "話す",
]);
function activeRecipientVerb(entry: AnswerEntry) {
  const word = lemma(entry);
  if (!recipientVerbs.has(word)) return false;
  return verbForms(word).some((forms) =>
    [
      word,
      forms.te,
      forms.te.replace(/て$/u, "た").replace(/で$/u, "だ"),
      forms.stem + "ます",
      forms.stem + "ました",
      forms.stem + "ません",
      forms.negative + "い",
    ].includes(entry.japanese),
  );
}
const social = new Set([
  "話す",
  "話し合う",
  "遊ぶ",
  "歩く",
  "行く",
  "帰る",
  "会う",
  "相談する",
]);
const desire = new Set(["欲しい", "ほしい", "好き", "嫌い", "上手", "下手"]);
const listGroups = [
  new Set([
    "りんご",
    "リンゴ",
    "林檎",
    "みかん",
    "ミカン",
    "オレンジ",
    "バナナ",
    "梨",
    "桃",
    "ぶどう",
    "葡萄",
  ]),
  new Set(["パン", "ご飯", "御飯", "肉", "魚", "卵", "野菜", "米", "チーズ"]),
  new Set([
    "水",
    "お茶",
    "紅茶",
    "コーヒー",
    "牛乳",
    "ビール",
    "酒",
    "お酒",
    "ジュース",
  ]),
  new Set(["本", "ノート", "ペン", "鉛筆", "紙", "辞書", "教科書", "消しゴム"]),
  people,
];

const lemma = (entry: AnswerEntry) => entry.dictionaryForm ?? entry.japanese;
const has = (set: Set<string>, entry: AnswerEntry) =>
  set.has(lemma(entry)) || set.has(entry.japanese);
function nominal(entry: AnswerEntry | undefined): entry is AnswerEntry {
  return (
    !!entry &&
    (entry.wordTypes.some((type) => ["Noun", "Pronoun"].includes(type)) ||
      has(pronouns, entry) ||
      (entry.wordTypes.length === 0 &&
        /^[\p{Script=Han}\p{Script=Katakana}ー]+$/u.test(entry.japanese)))
  );
}
function place(entry: AnswerEntry) {
  return (
    has(places, entry) ||
    (nominal(entry) &&
      /(?:駅|学校|大学|病院|図書館|公園|空港|教室|事務所|市|県)$/u.test(
        entry.japanese,
      ))
  );
}
function time(entry: AnswerEntry) {
  return has(times, entry) || specificTime(entry);
}
function specificTime(entry: AnswerEntry) {
  return /^(?:午[前後])?[0-9一二三四五六七八九十百]+(?:時(?:半|[0-9一二三四五六七八九十]+分)?|月|日)$/u.test(
    entry.japanese.normalize("NFKC"),
  );
}
function human(entry: AnswerEntry) {
  return (
    has(people, entry) ||
    (has(pronouns, entry) &&
      ![
        "これ",
        "それ",
        "あれ",
        "どれ",
        "ここ",
        "そこ",
        "あそこ",
        "どこ",
      ].includes(entry.japanese))
  );
}
function finite(entry: AnswerEntry) {
  if (
    [
      "だ",
      "です",
      "だった",
      "でした",
      "ない",
      "なかった",
      "でしょう",
      "だろう",
    ].includes(entry.japanese)
  )
    return true;
  if (entry.wordTypes.includes("Copula")) return true;
  if (entry.wordTypes.includes("い-adjective"))
    return /(?:い|かった|です)$/u.test(entry.japanese);
  return (
    entry.wordTypes.includes("Verb") &&
    !entry.wordTypes.includes("Noun") &&
    (entry.japanese === lemma(entry) ||
      /(?:る|う|く|ぐ|す|つ|ぬ|ぶ|む|た|だ|ない|ます|ました|ません|ませんでした)$/u.test(
        entry.japanese,
      ))
  );
}

export function particleGrammar(
  sentence: Sentence,
  base: AnswerEntry[],
): GrammarAnnotation[] {
  const text = sentence.reference.japanese;
  const matches: GrammarAnnotation[] = [];
  function placeAt(index: number) {
    const entry = base[index];
    if (!entry) return false;
    if (place(entry)) return true;
    const no = base[index - 1];
    const owner = base[index - 2];
    return (
      ["中", "外", "上", "下", "前", "後ろ"].includes(entry.japanese) &&
      !!no &&
      !!owner &&
      no.japanese === "の" &&
      no.end === entry.start &&
      owner.end === no.start &&
      (place(owner) ||
        ["机", "テーブル", "椅子", "箱", "棚"].includes(lemma(owner)))
    );
  }
  function nextPredicate(index: number): AnswerEntry | undefined {
    let cursor = base[index]!.end;
    for (let next = index + 1; next < base.length; next++) {
      const word = base[next]!;
      const gap = text.slice(cursor, word.start);
      if (
        !/^[、,\s]*$/u.test(gap) ||
        /[。？！?!「」『』、,]/u.test(word.japanese)
      )
        return;
      cursor = word.end;
      if (word.japanese === "と" && word.wordTypes.includes("Particle")) return;
      const following = base[next + 1];
      if (word.wordTypes.includes("い-adjective")) {
        if (word.japanese.endsWith("く") || nominal(following)) continue;
        return word;
      }
      if (word.wordTypes.includes("な-adjective")) {
        if (following?.japanese === "な" || following?.japanese === "の")
          continue;
        return word;
      }
      if (
        word.wordTypes.includes("Copula") ||
        (word.wordTypes.includes("Verb") && !word.wordTypes.includes("Noun"))
      )
        return word;
    }
  }
  function add(entry: AnswerEntry, id: string, end = entry.end) {
    matches.push({
      start: entry.start,
      end,
      japanese: text.slice(entry.start, end),
      grammarIds: [id],
    });
  }
  for (const [index, entry] of base.entries()) {
    if (!entry.wordTypes.includes("Particle")) continue;
    const previous = base[index - 1];
    const next = base[index + 1];
    if (!previous) continue;
    const adjacent = previous.end === entry.start;
    const followingAdjacent = next?.start === entry.end;
    if (entry.japanese === "の") {
      if (adjacent && followingAdjacent && nominal(previous) && nominal(next))
        add(entry, "no");
      continue;
    }
    if (entry.japanese === "と") {
      const quoted = /^[」』”"]$/u.test(text.slice(previous.end, entry.start));
      if (
        followingAdjacent &&
        next &&
        (quoted || (adjacent && finite(previous)))
      ) {
        if (["思う", "おもう"].includes(lemma(next)))
          add(entry, "to-omou", next.end);
        else if (
          ["言う", "いう", "話す"].includes(lemma(next)) &&
          !nominal(base[index + 2])
        )
          add(entry, "to-iu-say", next.end);
        continue;
      }
      if (!adjacent || !followingAdjacent || !nominal(previous) || !next)
        continue;
      if (
        human(previous) &&
        (next.japanese === "一緒" ||
          (next.wordTypes.includes("Verb") && has(social, next)))
      ) {
        add(entry, "to-with");
      } else if (
        nominal(next) &&
        listGroups.some((group) => has(group, previous) && has(group, next))
      ) {
        const after = base[index + 2];
        if (
          after?.start === next.end &&
          ["を", "が", "は", "も", "と"].includes(after.japanese) &&
          !(human(previous) && human(next) && after.japanese === "を")
        )
          add(entry, "to-and");
      }
      continue;
    }
    if (!adjacent) continue;
    const predicate = nextPredicate(index);
    if (entry.japanese === "が") {
      if (nominal(previous) && predicate && !has(desire, predicate))
        add(entry, "ga-subject");
      else if (finite(previous) && predicate) add(entry, "ga-but");
    } else if (
      entry.japanese === "に" &&
      (nominal(previous) || specificTime(previous))
    ) {
      const numberedTime = specificTime(previous);
      if (numberedTime && next && !/[回度]/u.test(next.japanese))
        add(entry, "ni-time");
      else if (
        human(previous) &&
        next &&
        !["は", "も"].includes(next.japanese) &&
        predicate &&
        activeRecipientVerb(predicate)
      )
        add(entry, "ni-indirect-object");
      else if (predicate && placeAt(index - 1)) {
        if (has(movement, predicate)) add(entry, "ni-destination");
        else if (has(existence, predicate)) add(entry, "ni-location");
      }
    } else if (
      entry.japanese === "で" &&
      nominal(previous) &&
      predicate &&
      predicate.wordTypes.includes("Verb") &&
      !has(existence, predicate)
    ) {
      if (has(transport, previous) && has(movement, predicate))
        add(entry, "de-means");
      else if (
        has(languages, previous) &&
        ["話す", "読む", "書く", "言う", "説明する"].includes(lemma(predicate))
      )
        add(entry, "de-means");
      else if (
        has(tools, previous) &&
        [
          "書く",
          "食べる",
          "切る",
          "払う",
          "支払う",
          "話す",
          "連絡する",
        ].includes(lemma(predicate))
      )
        add(entry, "de-means");
      else if (placeAt(index - 1)) add(entry, "de-place");
    } else if (entry.japanese === "から") {
      if (finite(previous)) add(entry, "kara-reason");
      else if (
        nominal(previous) &&
        ((placeAt(index - 1) && lemma(predicate ?? previous) !== "する") ||
          time(previous) ||
          (human(previous) &&
            predicate &&
            ["もらう", "受け取る"].includes(lemma(predicate))))
      )
        add(entry, "kara-from");
    }
  }
  return matches;
}
