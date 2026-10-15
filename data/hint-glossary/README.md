# Additional dictionary meanings for hints

`rules.json` is manually maintained lookup data: function words excluded from
indexing, object-to-subject pronoun mappings, and spatial, phrase, and verb
paraphrases. Edit this file to maintain those rules; glossary generation
does not overwrite it. TypeScript retains lemmatization, matching, part-of-speech
filters, and Japanese reference validation.

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

The glossary and rules support dictionary lookup tooling. They do not establish
contextual meanings or publish practice hints. Practice hints now come only from
maintained [shared answer entries](../answer-entries/README.md), which both hint
and breakdown views read independently. Unmapped English words have no hint.
Optional dictionary senses in the breakdown remain separate from contextual
meanings.

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
verifies reproducibility without writing. Dictionary lookup reads `bank.json` and `rules.json`; it does not need the source
dictionary or Python tools.
