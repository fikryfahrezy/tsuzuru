import { grammarMatcher } from "./grammar-matcher";
import type { GrammarAnnotation } from "../../shared/answer-entries";
import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";
import { finite, nominal } from "./grammar-context";
import { verbForms } from "./verb-forms";

import { humans } from "./grammar-context";

const necessity = new Set([
  "必要",
  "便利",
  "十分",
  "有用",
  "使う",
  "用いる",
  "利用する",
  "かかる",
  "掛かる",
  "要する",
]);
const results = new Set([
  "困る",
  "咲く",
  "濡れる",
  "死ぬ",
  "止まる",
  "起こる",
  "始まる",
  "終わる",
]);
const giving = new Set(["あげる", "くれる", "もらう"]);
// What follows Verb + ように selects its lesson: a reported request
// (するように頼んだ), an effort or purpose (遅れないように注意した), or a
// likeness (疲れているように見える).
const requests = new Set([
  "言う",
  "いう",
  "頼む",
  "命じる",
  "命ずる",
  "命令する",
  "依頼する",
  "要請する",
  "要求する",
  "勧める",
  "促す",
  "説得する",
  "合図する",
  "教える",
  "強制する",
  "説きつける",
  "ときつける",
]);
const efforts = new Set([
  "取り計らう",
  "気をつける",
  "注意する",
  "心がける",
  "心掛ける",
  "努める",
  "努力する",
  "用心する",
  "祈る",
  "期待する",
]);
const likenesses = new Set([
  "見える",
  "思える",
  "思われる",
  "感じる",
  "感ずる",
  "思う",
]);
const count = "[0-9０-９一二三四五六七八九十百千万半]+";

// The lesson of Verb + ように, from the verb before it and the predicate
// after it. `reported` marks ようにとの指示 and similar nouns.
function youNiLesson(
  verb: AnswerEntry,
  predicate: string | undefined,
  uncontrollable: boolean,
  reported: boolean,
) {
  if (!verb.wordTypes.includes("Verb") || verb.japanese.endsWith("ます"))
    return;
  // A past verb before ように is "as" (言ったように), never a request.
  if (
    !/(?:た|だ)$/u.test(verb.japanese) &&
    (requests.has(predicate ?? "") || reported)
  )
    return "you-ni-iu-you-ni-tanomu";
  if (!predicate) return;
  // Something the subject cannot control (通れる, 遅れない) is the goal of
  // any following action; ようになる is its own lesson.
  if (
    efforts.has(predicate) ||
    (uncontrollable && !likenesses.has(predicate) && predicate !== "なる")
  )
    return "you-ni";
  if (likenesses.has(predicate) && finite(verb)) return "you-na-you-ni-like";
}

export function contextGrammar(
  sentence: Sentence,
  base: AnswerEntry[],
  voices: GrammarAnnotation[] = [],
): GrammarAnnotation[] {
  const { text, matches, span: add } = grammarMatcher(sentence, base);
  function firstPredicate(index: number, allowComma = false) {
    let cursor = base[index]!.end;
    for (const word of base.slice(index + 1)) {
      if (
        (text.slice(cursor, word.start) &&
          !(
            allowComma && /^[、,\s]+$/u.test(text.slice(cursor, word.start))
          )) ||
        word.wordTypes.includes("Conjunction")
      )
        return;
      cursor = word.end;
      if (
        word.wordTypes.some((type) =>
          ["Verb", "い-adjective", "な-adjective", "Copula"].includes(type),
        ) &&
        !word.wordTypes.includes("Noun")
      )
        return word;
      if (necessity.has(word.japanese)) return word;
    }
  }
  // A predicate's dictionary form, joining split する verbs (命令 + した)
  // and 気 + を + つける.
  function predicateKey(word: AnswerEntry) {
    const index = base.indexOf(word);
    const lemma = word.dictionaryForm ?? word.japanese;
    const before = base[index - 1];
    if (lemma === "する" && before?.end === word.start && nominal(before))
      return before.japanese + "する";
    if (
      ["つける", "付ける"].includes(lemma) &&
      text.slice(0, word.start).endsWith("気を")
    )
      return "気をつける";
    return lemma;
  }
  for (const [index, entry] of base.entries()) {
    const previous = base[index - 1];
    const owner = base[index - 2];
    if (!previous || previous.end !== entry.start) continue;
    const lemma = previous.dictionaryForm ?? previous.japanese;
    const dictionary =
      previous.wordTypes.includes("Verb") && previous.japanese === lemma;
    const predicate = firstPredicate(index);
    const predicateLemma = predicate?.dictionaryForm ?? predicate?.japanese;
    if (
      entry.japanese === "まま" &&
      ((previous.wordTypes.includes("Verb") &&
        /(?:た|だ|ない)$/u.test(previous.japanese)) ||
        previous.wordTypes.includes("い-adjective") ||
        (previous.japanese === "の" && !!owner && nominal(owner)))
    )
      add(previous.start, entry.end, "mama");
    if (
      entry.japanese === "さえ" &&
      nominal(previous) &&
      predicate?.japanese.endsWith("ば")
    )
      add(previous.start, predicate.end, "sae-ba");
    if (
      entry.japanese === "ながら" &&
      ["残念", "不本意", "嫌々"].includes(previous.japanese)
    )
      add(previous.start, entry.end, "nagara-mo");
    if (
      entry.japanese === "で" &&
      ["何", "なん", "誰", "だれ", "どこ", "いつ", "いずれ"].includes(
        previous.japanese,
      ) &&
      text.startsWith("であれ", entry.start) &&
      text[entry.start + 3] !== "ば"
    )
      add(previous.start, entry.start + 3, "de-are-de-are-de-are");
    if (entry.japanese === "もの" && previous.wordTypes.includes("Verb")) {
      const before = text.slice(0, previous.start);
      const habit =
        /(?:よく|毎日|高校時代|子供のころ|以前は|昔)[^。！？?!「」『』]*$/u.test(
          before,
        );
      const people =
        /(?:私|彼|彼女|父|母|僕|君|あなた|人々|彼ら)は[^。！？?!「」『』]*$/u.test(
          before,
        );
      const routine = /(?:よく|毎日|高校時代)[^。！？?!「」『』]*$/u.test(
        before,
      );
      const generic =
        dictionary &&
        /(?:子供|子ども|男の子|人|人間|妻|夫|鳥|正義|人生)は[^。！？?!「」『』]*$/u.test(
          before,
        );
      if (
        generic ||
        (/(?:た|だ)$/u.test(previous.japanese) && habit && (people || routine))
      )
        for (const form of ["ものだ", "ものです", "ものだった", "ものでした"])
          if (text.startsWith(form, entry.start))
            add(previous.start, entry.start + form.length, "mono-da");
    }
    if (
      entry.japanese === "か" &&
      previous.japanese === "どこ" &&
      predicate &&
      ["教える", "示す"].includes(predicateLemma ?? "") &&
      /(?:お手洗い|トイレ|駅|学校|家|住所|場所|店)は[^。！？?!、,「」『』]*$/u.test(
        text.slice(0, previous.start),
      )
    )
      add(entry.start, entry.end, "ka-embedded-question");
    if (
      entry.japanese === "の" &&
      finite(previous) &&
      text.startsWith("のに", entry.start) &&
      /^(?:なあ|なぁ|ね)[。！？?!]*$/u.test(text.slice(entry.start + 2))
    )
      add(entry.start, entry.start + 2, "noni-although");
    if (
      entry.japanese === "と" &&
      owner?.japanese === "を" &&
      nominal(previous) &&
      nominal(base[index - 3]) &&
      owner.end === previous.start
    ) {
      for (const form of ["として", "とする"])
        if (text.startsWith(form, entry.start))
          add(owner.start, entry.start + form.length, "o-to-shite");
    }
    if (
      text.startsWith("を除", entry.start) &&
      [
        "価格",
        "値段",
        "料金",
        "費用",
        "年末年始",
        "日曜日",
        "休日",
        "一部",
        "彼",
        "彼女",
        "私",
      ].includes(previous.japanese)
    ) {
      for (const form of ["を除いて", "を除き"])
        if (
          text.startsWith(form, entry.start) &&
          /^[はも]/u.test(text.slice(entry.start + form.length))
        )
          add(entry.start, entry.start + form.length, "o-nozoite");
    }
    if (
      entry.japanese === "に" &&
      ["ビール", "コーヒー", "お茶", "紅茶", "ラーメン", "温泉"].includes(
        previous.japanese,
      ) &&
      /(?:暑い|疲れ|寒い|夏|冬)[^。！？?!「」『』]*$/u.test(
        text.slice(0, previous.start),
      ) &&
      text.startsWith("に限る", entry.start) &&
      /^[。！？?!]*$/u.test(text.slice(entry.start + 3))
    )
      add(entry.start, entry.start + 3, "ni-kagiru");
    if (
      entry.japanese === "に" &&
      text.startsWith("に加えて", entry.start) &&
      nominal(previous) &&
      !["鍋", "なべ", "水", "湯", "容器", "皿"].includes(previous.japanese)
    ) {
      const marker = base.findIndex((part) => part.end === entry.start + 4);
      if (marker >= 0) {
        const after = firstPredicate(marker);
        if (
          after &&
          /も/u.test(text.slice(entry.start + 4, after.start)) &&
          ["必要", "大切", "重要", "ある", "いる"].includes(
            after.dictionaryForm ?? after.japanese,
          )
        )
          add(entry.start, entry.start + 4, "ni-kuwaete");
      }
    }
    if (entry.japanese === "ばかり" && nominal(previous))
      add(entry.start, entry.end, "bakari");
    if (
      entry.japanese === "でも" &&
      [
        "お茶",
        "コーヒー",
        "紅茶",
        "ビール",
        "酒",
        "お酒",
        "ジュース",
        "パン",
        "ケーキ",
        "寿司",
        "ラーメン",
      ].includes(previous.japanese) &&
      predicate &&
      ["飲む", "食べる"].includes(predicateLemma ?? "") &&
      /(?:ませんか|ましょう|もう|べよう|みたい)[。？！?!]*$/u.test(
        text.slice(predicate.start),
      )
    )
      add(entry.start, entry.end, "de-mo-suggestion");
    // An amount + も is "as many as" (３割も, 何年も), and 一 + counter + も
    // with a negative is "not even one" (一言も答えなかった). 何 alone is not
    // an amount: 何も is "nothing", 何事も "everything".
    if (
      entry.japanese === "も" &&
      new RegExp(
        `^(?:${count}|何)(?:時間|分|秒|日|週|年|年間|日間|週間|か月|ヶ月|カ月|円|ドル|人|個|つ|枚|本|冊|杯|台|回|度|倍|割|％|%|件|軒|匹|点|歩|言|敗|銭|床|マイル|キロ|メートル|ページ)$`,
        "u",
      ).test(previous.japanese)
    )
      add(previous.start, entry.end, "mo-emphasis");
    const next =
      base[index + 1]?.start === entry.end ? base[index + 1] : undefined;
    // できやしない: emphatic や between a verb stem and a negative する.
    if (
      entry.japanese === "や" &&
      previous.wordTypes.includes("Verb") &&
      !previous.wordTypes.includes("Noun") &&
      next &&
      (next.dictionaryForm ?? next.japanese) === "する" &&
      /(?:ない|ません|なかった)$/u.test(next.japanese)
    )
      add(entry.start, next.end, "ya-shinai");
    // Noun + だって is casual "even" (君だって, 子供にだって, いつだって).
    if (
      entry.japanese === "って" &&
      previous.japanese === "だ" &&
      owner?.end === previous.start &&
      (nominal(owner) ||
        (owner.wordTypes.includes("Particle") &&
          ["に", "で", "と", "から", "へ"].includes(owner.japanese)))
    )
      add(previous.start, entry.end, "datte-even");
    // A case particle before まで makes it "even": 夢にまで見る.
    if (
      entry.japanese === "まで" &&
      previous.wordTypes.includes("Particle") &&
      ["に", "で", "と", "から", "へ"].includes(previous.japanese)
    )
      add(entry.start, entry.end, "made-even");
    // では / じゃ + ない / ありません is split by the tokenizer.
    const negative =
      next && /^(?:ない|ないです|ありません)$/u.test(next.japanese)
        ? next
        : undefined;
    if (["では", "じゃ"].includes(entry.japanese) && negative) {
      const explanatory =
        ["の", "ん"].includes(previous.japanese) &&
        previous.wordTypes.includes("Particle");
      const start = explanatory ? previous.start : entry.start;
      const ka = base.find(
        (word) => word.start === negative.end && word.japanese === "か",
      );
      const after = text.slice(negative.end);
      if (ka && !after.startsWith("かもしれ")) {
        // ではないかと思う / 心配する is a guess; ではありませんか。 asks for
        // agreement.
        if (/^か(?:と|って)/u.test(after))
          add(start, ka.end, "no-de-wa-nai-ka");
        else if (/^か(?:[。？！?!」]|$)/u.test(after))
          add(entry.start, ka.end, "de-wa-arimasen-ka-confirm");
        else if (explanatory) add(start, ka.end, "no-de-wa-nai-ka");
      } else if (
        explanatory &&
        !base.some((word) => word.start === negative.end && nominal(word))
      )
        add(start, negative.end, "no-de-wa-nai");
    }
    // Contracted prohibition: 過信しちゃいけない, 食べちゃダメ, 飲んじゃだめ.
    if (
      ["ちゃ", "じゃ"].includes(entry.japanese) &&
      previous.wordTypes.includes("Verb") &&
      // やらなくちゃならない is obligation, 〜なくちゃ.
      !previous.japanese.endsWith("なく") &&
      (entry.japanese === "ちゃ" || /[んい]$/u.test(previous.japanese)) &&
      next &&
      /^(?:いけない|いけません|いけなかった|ダメ|だめ|駄目|ならない|なりません)/u.test(
        next.japanese,
      )
    )
      add(previous.start, next.end, "te-wa-ikenai");
    // 眠るといけないので: "in case". A negative verb before と is
    // 〜ないといけない "must".
    if (
      entry.japanese === "と" &&
      entry.wordTypes.includes("Particle") &&
      previous.wordTypes.includes("Verb") &&
      !/(?:ない|ず|ません)$/u.test(previous.japanese) &&
      next &&
      ["いけない", "いけません"].includes(next.japanese) &&
      /^(?:ので|から|し)/u.test(text.slice(next.end))
    )
      add(entry.start, next.end, "to-ikenai-in-case");
    // 誕生日とは人が生まれた日のことだ: a sentence that opens with X とは
    // and ends in a copula defines X. Another topic or subject before it
    // (私とは正反対だ) or a second と (君と僕とは) makes it a comparison.
    if (
      entry.japanese === "は" &&
      previous.japanese === "と" &&
      previous.wordTypes.includes("Particle") &&
      (text.slice(0, previous.start).endsWith("」") ||
        (owner?.end === previous.start && nominal(owner)))
    ) {
      const opening = text.slice(0, previous.start);
      const sentenceStart =
        Math.max(
          ...[..."。！？?!、"].map((mark) => opening.lastIndexOf(mark)),
        ) + 1;
      const closing = text
        .slice(entry.end)
        .match(/^[^。！？?!]*[。！？?!]?/u)![0];
      const earlier = base.filter(
        (word) =>
          word.start >= sentenceStart &&
          word.end <= previous.start &&
          word.wordTypes.includes("Particle") &&
          ["は", "が"].includes(word.japanese),
      );
      const paired = base[index - 3];
      if (
        !earlier.length &&
        !(paired?.japanese === "と" && paired.end === owner?.start) &&
        /(?:だ|です|である|ですか|でしょう)[。！？?!」]*$|ということ/u.test(
          closing,
        )
      )
        add(previous.start, entry.end, "to-wa-definition");
    }
    if (
      entry.japanese === "か" &&
      entry.wordTypes.includes("Particle") &&
      (finite(previous) ||
        (previous.japanese === "の" && owner && finite(owner))) &&
      predicate &&
      [
        "知る",
        "分かる",
        "わかる",
        "教える",
        "尋ねる",
        "聞く",
        "決める",
        "迷う",
        "調べる",
      ].includes(predicateLemma ?? "")
    )
      add(entry.start, entry.end, "ka-embedded-question");
    if (entry.japanese === "とか" && nominal(previous)) {
      let cursor = entry.end;
      for (const [offset, part] of base.slice(index + 1).entries()) {
        if (text.slice(cursor, part.start) || finite(part)) break;
        cursor = part.end;
        if (part.japanese === "とか" && nominal(base[index + offset])) {
          add(previous.start, part.end, "toka-toka");
          break;
        }
      }
    }
    // Formal writing drops に after a verb: 整うよう取り計らいます. ようだ,
    // ような, ようがない and the like keep their own lessons.
    const bare =
      entry.japanese === "よう" &&
      previous.wordTypes.includes("Verb") &&
      !/^(?:に|な|だ|で|の|か|が|も|と|は)/u.test(text.slice(entry.end));
    if (
      entry.japanese === "よう" &&
      (text.startsWith("ように", entry.start) || bare)
    ) {
      const end = bare ? entry.end : entry.start + 3;
      if (
        previous.wordTypes.includes("Verb") &&
        previous.japanese.endsWith("ます") &&
        /^[。？！?!]*$/u.test(text.slice(end))
      )
        add(previous.start, end, "masu-you-ni");
      const uncontrollable =
        previous.wordTypes.includes("Verb") &&
        (/(?:ない|ません)$/u.test(previous.japanese) ||
          [
            "分かる",
            "わかる",
            "見える",
            "聞こえる",
            "合う",
            "間に合う",
          ].includes(lemma) ||
          voices.some(
            (match) =>
              match.grammarIds.includes("eru-rareru-potential") &&
              match.end === previous.end,
          ));
      const niIndex = base.findIndex((part) => part.end === end);
      // A comma may separate a purpose from its action (覚まさないように、歩いた).
      const purpose = niIndex >= 0 ? firstPredicate(niIndex, true) : undefined;
      const lesson = youNiLesson(
        previous,
        purpose && predicateKey(purpose),
        uncontrollable,
        /^との(?:指示|命令|依頼|要請)/u.test(text.slice(end)),
      );
      if (lesson) add(entry.start, end, lesson);
    }
    if (
      entry.japanese === "ところ" &&
      previous.wordTypes.includes("Verb") &&
      finite(previous)
    ) {
      const before = text.slice(0, previous.start);
      const cue =
        /(?:今|ちょうど|まさに|そのとき|たった今|さっき|(?:私|彼|彼女|父|母|僕|君|あなた|二人|諸君)は)[^。！？?!「」『』]*$/u.test(
          before,
        ) && !/(?:ここ|そこ|あそこ)は[^。！？?!「」『』]*$/u.test(before);
      if (cue)
        for (const ending of [
          "ところだ",
          "ところです",
          "ところだった",
          "ところでした",
        ])
          if (text.startsWith(ending, entry.start))
            add(entry.start, entry.start + ending.length, "tokoro-da");
      if (
        /(?:危うく|危なく|うっかり|もう少しで|もう少しの所で)[^。！？?!「」『』]*$/u.test(
          before,
        ) &&
        dictionary
      )
        for (const ending of ["ところだった", "ところでした"])
          if (text.startsWith(ending, entry.start))
            add(previous.start, entry.start + ending.length, "tokoro-datta");
    }
    if (
      entry.japanese === "ほど" &&
      (nominal(previous) || finite(previous)) &&
      predicate
    ) {
      const root = predicate.dictionaryForm ?? predicate.japanese;
      const negatives =
        predicate.wordTypes.includes("い-adjective") && root.endsWith("い")
          ? [root.slice(0, -1) + "くない", root.slice(0, -1) + "くなかった"]
          : predicate.wordTypes.includes("な-adjective")
            ? [
                root + "ではない",
                root + "でない",
                root + "じゃない",
                root + "ではありません",
              ]
            : [];
      for (const form of negatives)
        if (text.startsWith(form, predicate.start))
          add(entry.start, predicate.start + form.length, "hodo-nai");
      const quality = predicate.wordTypes.includes("な-adjective")
        ? predicate.japanese + "な"
        : predicate.wordTypes.includes("い-adjective")
          ? predicate.japanese
          : "";
      if (quality)
        for (const noun of ["もの", "こと"]) {
          const form = quality + noun + "はない";
          if (text.startsWith(form, predicate.start))
            add(entry.start, predicate.start + form.length, "hodo-wa-nai");
        }
    }
    if (
      ["間", "あいだ"].includes(entry.japanese) &&
      entry.kana === "あいだ" &&
      (dictionary ||
        (previous.wordTypes.includes("Verb") &&
          ["いる", "いた"].includes(previous.japanese)))
    ) {
      add(entry.start, entry.end, "aida-aida-ni");
      if (text[entry.end] === "に")
        add(entry.start, entry.end + 1, "aida-aida-ni");
    }
    if (
      entry.japanese === "の" &&
      dictionary &&
      text.startsWith("のに", entry.start)
    ) {
      const niIndex = base.findIndex((part) => part.end === entry.start + 2);
      if (niIndex >= 0) {
        const predicate = firstPredicate(niIndex);
        if (
          predicate &&
          necessity.has(predicate.dictionaryForm ?? predicate.japanese)
        )
          add(entry.start, entry.start + 2, "noni-purpose");
      }
    }
    if (
      entry.japanese === "と" &&
      entry.wordTypes.includes("Particle") &&
      finite(previous)
    ) {
      const predicate = firstPredicate(index);
      if (
        predicate &&
        results.has(predicate.dictionaryForm ?? predicate.japanese)
      )
        add(entry.start, entry.end, "to");
    }
    if (
      ["に", "が"].includes(entry.japanese) &&
      humans.has(previous.japanese)
    ) {
      const predicate = firstPredicate(index);
      if (
        predicate &&
        giving.has(predicate.dictionaryForm ?? predicate.japanese)
      )
        add(predicate.start, predicate.end, "ageru-kureru-morau");
    }
    if (
      entry.japanese === "に" &&
      /[0-9０-９一二三四五六七八九十]/u.test(previous.japanese)
    ) {
      const per = text
        .slice(previous.start)
        .match(
          new RegExp(
            `^${count}(?:ダース|ポンド|キロ|個|人|枚|本|冊|台|年|月|日|時間)につき`,
            "u",
          ),
        )?.[0];
      if (per) add(previous.start, previous.start + per.length, "ni-tsuki");
    }
  }
  const feelings = new Set([
    "驚く",
    "喜ぶ",
    "悲しむ",
    "困る",
    "泣く",
    "嬉しい",
    "うれしい",
    "悲しい",
    "寂しい",
    "さびしい",
    "不安",
    "残念",
    "安心",
  ]);
  for (const [index, entry] of base.entries()) {
    const lemma = entry.dictionaryForm ?? entry.japanese;
    const forms: string[] = [];
    if (entry.wordTypes.includes("Verb"))
      for (const verb of verbForms(lemma))
        forms.push(verb.te, verb.negative + "くて");
    if (entry.wordTypes.includes("い-adjective") && lemma.endsWith("い"))
      forms.push((lemma === "いい" ? "よ" : lemma.slice(0, -1)) + "くて");
    // A reason that ends the sentence leaves its result unsaid (忙しくてね,
    // 抜けなくて). Casual speech says くって for くて. A verb's plain て-form
    // at the end is usually a request (待って), so only なくて counts.
    for (const form of forms.filter((form) => form.endsWith("くて"))) {
      for (const spoken of [form, form.slice(0, -1) + "って"]) {
        const end = entry.start + spoken.length;
        if (
          text.startsWith(spoken, entry.start) &&
          base.some((part) => part.end === end) &&
          /^(?:[ねさ])?[。！？?!…」』]*$/u.test(text.slice(end))
        )
          add(entry.start, end, "te-trailing");
      }
    }
    // A verb's て-form or ないで that ends a statement is a casual request
    // (見て, 触らないでよ), except a polite まして or と思って, which trail
    // off like the reasons above. A question (どうして？) is neither.
    if (
      entry.wordTypes.includes("Verb") &&
      entry.dictionaryForm &&
      entry.dictionaryForm !== entry.japanese &&
      /(?:て|[んい]で)$/u.test(entry.japanese) &&
      !entry.japanese.endsWith("なくて") &&
      // 待て is the imperative, not a て-form.
      !verbForms(entry.dictionaryForm).some(
        (form) => form.imperative === entry.japanese,
      ) &&
      // Nobody asks someone to be able to (読めて).
      !voices.some(
        (voice) =>
          voice.grammarIds.includes("eru-rareru-potential") &&
          voice.start < entry.end &&
          voice.end > entry.start,
      ) &&
      /^[ねよ]?[。！!…」』]*$/u.test(text.slice(entry.end))
    ) {
      const thought =
        ["思う", "考える"].includes(entry.dictionaryForm) &&
        base[index - 1]?.japanese === "と";
      add(
        entry.start,
        entry.end,
        entry.japanese.endsWith("まして") || thought
          ? "te-trailing"
          : "te-request",
      );
    }
    // て + は is a condition (減っては戦ができぬ) unless a helper follows,
    // as in 甘んじてはいない or the prohibition and suggestion lessons.
    const topic = base[index + 1];
    const after = base[index + 2];
    if (
      entry.wordTypes.includes("Verb") &&
      entry.dictionaryForm &&
      entry.dictionaryForm !== entry.japanese &&
      /(?:て|[んい]で)$/u.test(entry.japanese) &&
      topic?.japanese === "は" &&
      topic.start === entry.end &&
      after?.start === topic.end &&
      // Compound particles: については, としては, に関しては, にとっては.
      !(
        ["に", "と"].includes(base[index - 1]?.japanese ?? "") &&
        /^(?:ついて|就いて|対して|関して|とって|して|際して|おいて|よって|当たって|あたって)$/u.test(
          entry.japanese,
        )
      )
    ) {
      const helper = after.dictionaryForm ?? after.japanese;
      if (["いる", "居る"].includes(helper))
        add(entry.start, after.end, "te-iru");
      else if (
        !after.wordTypes.includes("Auxiliary verb") &&
        !/^(?:いけ|行け|なら|なり|だめ|駄目|ダメ|いられ|どう|いかが|いい|良い|よい|みる|おく|しま|くれ|もら|あげ|いただ|くださ)/u.test(
          after.japanese,
        )
      )
        add(entry.start, topic.end, "te-wa-condition");
    }
    if (entry.wordTypes.includes("な-adjective"))
      forms.push(entry.japanese + "で");
    const illness = [
      "風邪",
      "かぜ",
      "病気",
      "事故",
      "大雪",
      "台風",
      "けが",
      "怪我",
    ].includes(entry.japanese);
    if (illness) forms.push(entry.japanese + "で");
    for (const form of forms) {
      const end = entry.start + form.length;
      const markerIndex = base.findIndex((part) => part.end === end);
      if (markerIndex < index || !text.startsWith(form, entry.start)) continue;
      const effect = firstPredicate(markerIndex, true);
      if (!effect) continue;
      const effectLemma = effect.dictionaryForm ?? effect.japanese;
      const compound = base[base.indexOf(effect) - 1];
      const emotional =
        feelings.has(effectLemma) ||
        (effectLemma === "する" &&
          !!compound &&
          ["びっくり", "安心", "がっかり", "感動", "失望"].includes(
            compound.japanese,
          ));
      const negativeAbility =
        /(?:ない|ません|なかった)$/u.test(effect.japanese) &&
        voices.some(
          (voice) =>
            voice.grammarIds.includes("eru-rareru-potential") &&
            voice.start === effect.start &&
            voice.end === effect.end,
        );
      const illnessEffect =
        illness && ["休む", "遅れる", "死ぬ"].includes(effectLemma);
      if (emotional || negativeAbility || illnessEffect)
        add(entry.start, end, "te-reason");
    }
  }
  for (const [index, entry] of base.entries()) {
    const next = base[index + 1];
    if (
      !next ||
      next.start !== entry.end ||
      !nominal(next) ||
      !entry.wordTypes.includes("Verb") ||
      !/(?:た|だ)$/u.test(entry.japanese)
    )
      continue;
    const lemma = entry.dictionaryForm ?? entry.japanese;
    // Before a time or occasion a change is still an event: 折れたとき.
    const event = notStateNouns.has(next.japanese);
    const previous =
      base[index - 1]?.end === entry.start ? base[index - 1] : undefined;
    const before = base[index - 2];
    // 堂々とした顔, ほっそりした姿, ちょっとした資産: a manner word + した
    // describes how something is. Noun + とした (子供を対象とした本) is
    // 〜とする, and 研究した人 is a past action.
    const manner =
      lemma === "する" &&
      entry.japanese === "した" &&
      !!previous &&
      (["ちょっと", "そう", "こう", "ああ"].includes(previous.japanese) ||
        (previous.wordTypes.includes("Adverb") &&
          !previous.wordTypes.includes("Noun")) ||
        (previous.japanese === "と" &&
          before?.end === previous.start &&
          !before.wordTypes.some((type) =>
            ["Noun", "Pronoun", "Particle"].includes(type),
          ) &&
          /(?:り|っ|々|ん)$/u.test(before.japanese)) ||
        (previous.japanese === "と" &&
          before?.end === previous.start &&
          /^(?:堂々|どんより|すらり|むっつり|ピリッ|ウラウラ|きちん|ちゃん|しっかり|さっぱり|がっしり|がっちり|ほっそり)$/u.test(
            before.japanese,
          )));
    if (
      stativeVerbs.has(lemma) ||
      (!event && (resultVerbs.has(lemma) || manner))
    )
      add(entry.start, entry.end, "ta-state");
  }
  return matches;
}

// Verbs that only describe a state before a noun: 優れた能力 "excellent",
// 似た話 "similar", 庭に面した部屋 "facing".
const stativeVerbs = new Set([
  "優れる",
  "ばかげる",
  "馬鹿げる",
  "違う",
  "似る",
  "尖る",
  "とがる",
  "面する",
  "ありふれる",
  "聳える",
  "そびえる",
]);
// Changes whose result is a state: 壊れた花瓶 "broken", 服を着た女性
// "wearing", 間違った方角 "wrong".
const resultVerbs = new Set([
  "間違う",
  "決まる",
  "汚れる",
  "濡れる",
  "ぬれる",
  "壊れる",
  "折れる",
  "倒れる",
  "冷える",
  "凍る",
  "疲れる",
  "老いる",
  "曲がる",
  "太る",
  "痩せる",
  "やせる",
  "腐る",
  "錆びる",
  "乾く",
  "割れる",
  "欠ける",
  "破れる",
  "着る",
  "混む",
  "込む",
]);
const notStateNouns = new Set([
  "時",
  "とき",
  "後",
  "あと",
  "瞬間",
  "ところ",
  "所",
  "際",
  "前",
  "日",
  "年",
  "こと",
  "事",
  "の",
]);
