# Learning data

- `manifest.json`: upstream revision, URLs, checksums, retrieval time, and actual counts.
- `sources/openjlpt/<commit>/`: unmodified upstream JSON plus README, NOTICE, and LICENSE.
- `processed/sentence-candidates.json`: deduplicated vocabulary example pairs with provenance and length measurements. These are unreviewed candidates, not a graded exercise bank.
- `phrase-hints/sentences.json`: maintained phrase spans with wording and readings from the Japanese reference. See [phrase hint maintenance](phrase-hints/README.md).
- `hint-glossary/bank.json`: additional JMdict English senses for existing vocabulary, used with reference support. See [hint glossary generation](hint-glossary/README.md).
- `sentence-levels/bank.json`: a vocabulary grade for each sentence, used to choose practice sentences by level. See [sentence levels](#sentence-levels).
- `spelling-variants/bank.json`: verified word-position spelling variants generated from JMdict and Sudachi, separate from alternative translations. See [generation and review](spelling-variants/README.md).

Read [DATA_DISCLOSURE.md](../DATA_DISCLOSURE.md) for credits, licenses, modifications, and educational limitations. Third-party data is not covered by the project's MIT software license.

Fetch the latest snapshot:

```sh
python3 scripts/fetch_learning_data.py
```

Reproduce a snapshot using the full revision from the manifest:

```sh
python3 scripts/fetch_learning_data.py --revision <commit-sha>
```

The script needs Python 3 and network access to GitHub. It checks upstream counts, leaves raw source text unchanged, and records hashes. Generated files are replaced on each import; keep exercise review decisions in separate files.

## Alternative answers

`alternatives/answers.json` contains Tsuzuru additions to the imported references,
keyed by sentence ID. The bank is distributed under CC BY-SA 4.0. Each record
retains the source revision, original English and Japanese text, alternative
wording and readings, and provenance identifying its creator, method, and changes.
Source sentence IDs connect the additions to the original attribution and links.
These additions are not translations supplied or endorsed by the upstream contributors.

The bank uses three methods:

- `omit-first-person-topic`: removes explicit 私は from references paired with
  first-person English prompts, retaining the remaining wording and readings.
  The speaker must be understood from the prompt.
- `number-spelling`: varies integer spelling without changing its numeric value,
  using Arabic digits, positional kanji numerals, or digit-by-digit kanji numerals.
  Kanji-to-digit conversion is limited to recognized counter contexts and checks
  for lexical compounds. Decimals, grouped numbers, leading-zero identifiers,
  and mixed digit/kanji numbers are excluded. Supplied readings are retained;
  missing pronunciations are not inferred. Up to 256 combinations per reading
  are generated, including variants of existing alternative answers.
- `authored`: wording added individually, including AI-authored additions made
  during development. The entry’s provenance records the actual creator and
  explanation; this method does not indicate independent language verification.

These methods do not establish translation correctness. The alternatives have
not been independently checked by native speakers, may contain errors, and do
not cover all valid translations. The app accepts listed forms when the optional
alternatives setting is on, under the selected writing-mode rules.

### Maintaining the bank

Run `bun run alternatives:generate` to rebuild rule-generated entries. It reads
and writes the same `alternatives/answers.json`, preserving entries whose
provenance method is `authored`. Add authored wording directly to that file with
matching source text, complete reading annotations, and accurate provenance.
Regeneration stops before writing if retained authored entries refer to a
changed source revision, mismatched source text, or invalid reading annotations.

`bun run alternatives:prompts` exports JSONL tasks for batch generation. It does
not download or invoke a model, or import responses automatically.

The server excludes outdated snapshots, changed source sentences, missing
provenance, duplicates, and inconsistent or incomplete reading annotations.
These are structural checks, not language review. Results display available
alternatives and their origins; new Journal entries retain that list as a snapshot.

When distributing the bank, retain attribution, a license link, and modification
notices under CC BY-SA 4.0. Keep original contributor credit separate from the
creator of added wording. See [DATA_DISCLOSURE.md](../DATA_DISCLOSURE.md).

## Romaji spacing

`romaji/word-boundaries.json` stores spacing for supplied furigana readings.
Like the other banks, entries are keyed by sentence ID and record the
`sourceJapanese` they were generated from, with one entry per supplied reading
(`readings`, keyed by furigana). The loader attaches them to a sentence only
while its ID, Japanese text, and furigana all still match.
Sudachi provides boundaries, while the original furigana provides pronunciation.
Honorific prefixes and inflectional endings stay with their words. Compound
particles `demo`, `temo`, and `deha` are joined. Noun + `suru` constructions and
auxiliary verbs after a te-form retain spaces (`benkyou suru`, `hamete ita`).
The output preserves kana spelling, including particles `ha`, `he`, and `wo`,
and explicit vowel sequences such as `ou` and `uu`.

`romaji/conjunction-reviews.json` records context-specific decisions for の + で
and の + に. Causal ので and concessive/regret のに are joined (`node`, `noni`);
nominalized clauses followed by case particles or explanatory copulas retain
spaces. These decisions were reviewed by Codex against the Japanese sentence
and English prompt; each entry records the reviewer and reason.

To regenerate after importing or editing sentences:

```sh
bun run tools:setup
bun run romaji:generate
bun run romaji:check
bun run romaji:test
```

Generation stops on missing, stale, or malformed conjunction decisions before
writing the bank. Update the review entry with matching Japanese and English
text, a reviewer, and a decision for every ambiguous token pair. `start` and
`end` are Python character offsets in the Japanese source, with an exclusive
end. `surface` must match that range; `join` is a boolean and `reason` explains
the contextual reading. Keep separate nominalizer/particle constructions
spaced even when their spelling matches a conjunction.

The regular Bun tests reject missing spacing for eligible readings and changed
review snapshots. CI also regenerates the bank in check mode and runs generator
tests, so changes to source data or spacing rules require an updated bank.

The same generator produces `romaji/reference-lexemes.json`, keyed and guarded
the same way, which connects
dictionary forms of verbs and adjectives to their complete conjugated words in
the reference. Endings and honorific prefixes use the romaji word boundaries;
all readings come from the supplied furigana. Word hints use these forms before
dictionary alternatives, so an English match for 飲む can display 飲みました
with its supplied reading. Whole-word annotations containing a stem and endings
are supported without splitting their reading; annotations spanning multiple
lexical words are excluded. Repeated words retain their distinct reference
forms and readings as hint alternatives, using the same primary furigana as
the romaji hint. This handles inflection and complete kana nouns/pronouns normalized to
dictionary forms. Additional senses from the pinned JMdict glossary resolve
English wording absent from OpenJLPT's abbreviated definitions. Idioms and
meanings absent from both glossaries still need explicit mappings in
`phrase-hints/sentences.json`. Dictionary fallback hints retain their existing
dictionary-source note.

## Sentence levels

`sentence-levels/bank.json` gives each sentence the highest JLPT level among its
content words, keyed by sentence ID and guarded by the source Japanese and
OpenJLPT revision like the other banks. Practice at a level offers sentences
graded at that level or easier, so an N4 session also includes N5 sentences.

The generator splits each sentence with Sudachi and looks up each word in the
OpenJLPT vocabulary lists, matching:

- the dictionary form or Sudachi's normalized spelling (終わる for listed 終る);
- the word without an honorific prefix (風呂 for listed お風呂, 主人 for 御主人);
- for a kanji spelling, an entry the lists write in kana (出来る for できる);
- for a kana spelling, a listed reading.

A kanji spelling never matches a kanji homophone's reading. Particles,
auxiliaries, names, numerals, and counters after a numeral (３時) are not graded,
and an unlisted compound falls back to its listed parts.

`sentence-levels/supplement.json` levels common words the lists lack, such as
父, 母, and 顔. Each entry needs a reason and a reviewer, and generation fails if
an entry duplicates a word the lists already reach by any spelling. Entries
marked as awaiting review were proposed during development; check the level,
then record your name as the reviewer.

A word still unlisted after these steps counts as above every level when it is
written with kanji (卒倒, 扮装), because such words are usually advanced. An
unlisted kana word, usually a loanword such as チョコレート, does not raise the
level. Each entry keeps the words that set its level, so a grade can be
explained. Grammar is not graded.

```sh
bun run levels:generate
bun run levels:check
bun run levels:test
```

CI regenerates the bank in check mode, and the load report test fails if any
loaded sentence lacks a current grade.

Only explicit entries in `phrase-hints/sentences.json` are labeled as sentence
translations. Automatic glossary matches are labeled as possible reference
vocabulary: the spelling and reading occur in the reference, while dictionary
meanings and English word pairing remain unconfirmed. Add a reviewed sentence
mapping when a polysemous English word would otherwise suggest the wrong sense.
