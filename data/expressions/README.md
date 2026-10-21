# Fixed expressions

`bank.json` is a manually maintained list of fixed expressions whose meaning is
not the sum of their words, such as もってこい (“ideal”), which the tokenizer
splits into もって + こいだ. The meanings are written for this project; they are
not copied from a dictionary.

Each expression contains:

- `dictionaryForm`: the form shown as “Dictionary form” when the matched words differ.
- `reading`: the hiragana reading shared by every form.
- `forms`: surface spellings to match, such as `気をつけ` and `気を付け`. Verb
  expressions list the stem shared by their inflections.
- `meanings`: general English senses.
- `wordTypes`: breakdown categories. Include `Verb` when the expression inflects.

The breakdown groups consecutive words when their text starts with a form and
their kana starts with the reading. A match starts at a word boundary, never
crosses punctuation, and never covers a word with a maintained
[answer entry](../answer-entries/README.md) meaning. The group ends at a word
boundary, so a following inflection or copula stays inside it (もってこいだ).

The meanings appear as dictionary senses, not contextual meanings. Grammar
explanations that start inside a non-verb form are dropped, because the parts'
own forms do not apply: どうしても is not a ても concession. Verb expressions keep
their inflections, and maintained grammar annotations are always kept.

After editing, bump `answerDetailsVersion` in `shared/answer-entries.ts` and run
`bun test tests/expressions.test.ts`.
