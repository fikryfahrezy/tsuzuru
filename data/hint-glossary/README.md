# Additional dictionary meanings for hints

`bank.json` contains additional English senses for the existing OpenJLPT
vocabulary, extracted from the spelling bank's checksum-pinned JMdict snapshot.
JMdict is copyright James William Breen and the Electronic Dictionary Research
and Development Group (EDRDG), under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
Retain the [EDRDG licence and attribution](https://www.edrdg.org/edrdg/licence.html)
and [project data disclosure](../../DATA_DISCLOSURE.md). This derived bank uses
the same licence; it extracts English glosses and links them to vocabulary IDs
without changing the upstream snapshot. This is not an EDRDG endorsement.

Generation requires matching dictionary IDs, spellings and readings, honors
spelling/reading restrictions on individual senses, and excludes non-English
glosses. Entries snapshot source words and readings to reject stale meanings.

Additional meanings require Japanese reference support. They match complete
glosses or phrases, rather than incidental words in longer definitions. Existing
dictionary fallback behavior is preserved. A shared spatial paraphrase connects
“across” to the dictionary glosses “other side” and “opposite side”, also requiring
reference support. This relationship applies across sentences.

English object pronouns also match subject-form dictionary glosses (for example,
“me” can match “I”), restricted to pronoun entries with reference support.

Reference lexemes also link complete kana noun and pronoun tokens to Sudachi's normalized
dictionary form while preserving supplied pronunciation: むこう can resolve to
向こう. Matching never uses arbitrary kana substrings or a reading-only search
for homophones. These hints retain the “possible reference vocabulary” label;
dictionary senses and tokenizer normalization do not establish the intended
translation of every English word. Idioms and ambiguous uses may still need
explicit sentence mappings.

Word hints display the reference wording alongside up to three verified spelling
variants from the primary reference's spelling bank, for example わたし / 私.
Readings and romaji remain supplied by the reference. Variants also preserve
conjugated endings and can apply within maintained phrase hints. Dictionary
fallback hints do not inherit reference spelling variants.

Prepare the spelling-tools environment and cached dictionary using
[the spelling bank README](../spelling-variants/README.md), then run:

```sh
bun run hints:generate
bun run hints:check
bun run hints:test
bun run romaji:generate
bun run romaji:check
bun run romaji:test
bun test tests/word-hints.test.ts
```

Generation is offline and rejects a checksum that differs from the spelling
bank. Use `--jmdict /path/to/JMdict_e.gz` for an archived snapshot. `--check`
verifies reproducibility without writing. Runtime only needs generated JSON.
