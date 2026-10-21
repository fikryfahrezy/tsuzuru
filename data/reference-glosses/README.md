# Reference word glosses

`bank.json` holds English senses for words in the Japanese reference sentences
that the OpenJLPT vocabulary cannot explain, such as 私 read わたし (OpenJLPT only
lists わたくし and あたし) or 父, 母 and 東京. The answer breakdown shows them as
optional dictionary senses after OpenJLPT entries and verified spelling links.
They do not establish contextual meanings or publish practice hints.

The senses are extracted from the spelling bank's checksum-pinned JMdict
snapshot. JMdict is copyright James William Breen and the Electronic Dictionary
Research and Development Group (EDRDG), under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Retain the
[EDRDG licence and attribution](https://www.edrdg.org/edrdg/licence.html) and
[project data disclosure](../../DATA_DISCLOSURE.md). This derived bank uses the
same licence. This is not an EDRDG endorsement.

`scripts/reference-gloss-targets.ts` lists each breakdown word (exact spelling
and hiragana reading) that has no OpenJLPT entry and is not a particle or
copula. For each word, generation:

- uses the JMdict entry whose spelling and reading both match, honoring
  reading and per-sense spelling/reading restrictions;
- for a kana word, uses only entries without a kanji spelling or senses marked
  as usually written in kana, so 私 senses never reach a kana homophone;
- for an inflected word (下さい), falls back to its kanji dictionary form;
- skips the word when more than one entry matches;
- keeps up to eight English glosses and the matching senses' part-of-speech
  codes, dropping `vs` (takes する) because the word itself is the noun.

A word JMdict does not list as a whole is explained from its parts, each of
which must match exactly one entry with the part's reading:

- a godan potential verb written with kanji: 救える → potential of 救う;
- a number and counter: ６時 → 時 “hour, o'clock”, using counter senses
  only after a number;
- an honorific prefix: ご家族 → ご “honorific prefix” + 家族 “family”;
- a katakana name with an honorific: パーカーさん → さん only, not the name;
- a stem and final part: 料理用 → 料理 “cooking” + 用 “for the use of”. The
  final part uses its suffix senses when it has them, the stem must contain
  kanji or katakana (たくさん輪 is a tokenizer join, not a compound), and when
  several splits fit, only a single one ending in a suffix is used
  (朝食 + 用, not 朝 + 食用).

`parts` records each part's spelling, kana, dictionary entry, label and senses.
The breakdown shows each part with its reading and romaji
(`用 (よう · you): for the use of ...`, or `たち (tachi)` for a kana part); `meanings` holds the same text without
readings.

Each whole-word entry records `japanese`, `kana`, `dictionaryEntryId`, `meanings`
and `pos`.
Senses are general and can miss the sentence's sense; for example, katakana
オラ (dialect “I”) only matches the Spanish greeting in JMdict.

Prepare the cached dictionary using [the spelling bank README](../spelling-variants/README.md), then run:

```sh
bun run glosses:generate
bun run glosses:check
bun run glosses:test
```

Regenerate after changing breakdown words or dictionary lookup, then bump
`answerDetailsVersion` in `shared/answer-entries.ts` and run `bun run grammar:audit`,
because part-of-speech codes feed grammar detection.
