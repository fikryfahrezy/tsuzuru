# Verified writing spellings

`bank.json` records word-position kana/kanji spellings for the existing Japanese
references and accepted alternative translations. Kana + kanji mode uses these
automatically, independently of the alternatives toggle and vocabulary level.
Kana-only and exact modes do not use this bank. Comparison and highlighting
consume the same spelling paths; original references remain unchanged.

## Sources and attribution

Japanese lexical spellings and readings come from **JMdict**, copyright James
William Breen and the Electronic Dictionary Research and Development Group
(EDRDG), under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
See the [EDRDG licence and attribution requirements](https://www.edrdg.org/edrdg/licence.html)
and [dictionary documentation](https://www.edrdg.org/wiki/JMdict-EDICT_Dictionary_Project.html).
The generated bank is distributed under CC BY-SA 4.0. Its changes consist of
extracting dictionary relationships, attaching them to sentence positions, and
preserving the reference's inflected forms. This is not an EDRDG endorsement.

Analysis uses **SudachiPy 0.6.11** and **SudachiDict-core 20251022**, copyright
Works Applications, under Apache 2.0. SudachiDict incorporates UniDic and part
of NEologd; retain [SUDACHI-LEGAL.txt](SUDACHI-LEGAL.txt) and
[APACHE-2.0.txt](APACHE-2.0.txt). Those notices also describe the upstream
dictionary sources. Original sentence text and supplied readings retain the
OpenJLPT/Tatoeba attribution in [DATA_DISCLOSURE.md](../../DATA_DISCLOSURE.md).
Each sentence ID links to that original source record.

The bank records the JMdict download URL and SHA-256, upstream sentence revision,
tool versions, dictionary entry IDs, and whether a spelling was approved by the
conservative dictionary rules or an explicit context review.

## Generation

Create an ignored local environment using Python 3.13 or another version with
a compatible SudachiPy wheel:

```sh
python3 -m venv .cache/spelling-tools
.cache/spelling-tools/bin/python -m pip install -r scripts/spelling-requirements.txt
```

If a Python launcher cannot create a working environment, use the actual Python
executable reported by `python3 -c 'import sys; print(sys.executable)'`.
Download a snapshot and intentionally regenerate:

```sh
bun run spellings:generate --download --refresh
bun run spellings:check
bun run spellings:test
bun test tests/writing-spellings.test.ts
```

Generation is offline after the download. Keep the cached gzip file to reproduce
that snapshot, or use `--jmdict /path/to/archived/JMdict_e.gz`. Its SHA-256 must
match the bank unless `--refresh` is specified. `--check` writes nothing and
compares regenerated artifacts against the current bank and local review report.
The app requires only the generated JSON, not Python or either full dictionary.
Maintain a regular dictionary update procedure, reviewing regenerated changes
before distribution, as described by EDRDG's licence statement.

## Approval rules and review

For each noun, pronoun, verb, or adjective, the generator checks the reference's supplied
furigana against Sudachi's reading. It excludes unknown words and proper names.
It uses permitted JMdict spelling/reading pairs, excluding unusual-spelling
flags and kana-only readings. Kana references must identify a single compatible
dictionary entry; kanji references additionally require their dictionary spelling
in that entry. Sense-restricted spellings are held for review.

Pronouns match only dictionary pronoun entries, excluding same-reading nouns.
For a replacement pronoun, the tokenizer may default to a different reading
(for example, 私 defaults to わたくし). The permitted JMdict spelling/reading
pair verifies the original pronunciation instead; the recorded reading remains
わたし when that was supplied. All other tokens must retain their readings, and
lexical identity, part of speech, conjugation and segmentation still must match.

Only the kanji prefix is substituted; inflected kana, auxiliaries, and particles
stay unchanged. A full-sentence retokenization must preserve lexical normalized
forms, readings, part of speech, conjugation, and segmentation. This procedure
does not establish grammatical correctness or semantic equivalence for every
Japanese expression. It deliberately leaves uncertain cases unmatched.

Unresolved cases are written to `.cache/spelling-review.json`. Record an approved
case in `reviews.json` using its exact sentence ID, source English, reference
Japanese, furigana, UTF-16 offsets, source surface/reading, chosen dictionary ID,
allowed inflected spellings, reviewer, and explanation:

```json
{
  "sentenceId": "<id>",
  "sourceEnglish": "<exact English>",
  "sourceJapanese": "<exact Japanese reference>",
  "furigana": "<exact supplied furigana>",
  "start": 0,
  "end": 2,
  "surface": "はし",
  "reading": "はし",
  "dictionaryEntryId": "<chosen JMdict entry ID>",
  "spellings": ["橋"],
  "reviewer": "<actual reviewer>",
  "note": "<why this dictionary word fits this sentence>"
}
```

The example is a schema illustration, not an approved mapping. End offsets are
exclusive. Context reviews may resolve the selected token's lexical ambiguity;
all dictionary-reading, pronunciation, POS/conjugation, and other-token checks
still apply. Unsupported or stale reviews stop regeneration rather than silently
discarding decisions. Runtime validation also rejects changed source sentences,
bad readings, overlapping spans, and incomplete review provenance.
