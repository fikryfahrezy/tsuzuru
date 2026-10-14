# Learning data

- `manifest.json`: upstream revision, URLs, checksums, retrieval time, and actual counts.
- `sources/openjlpt/<commit>/`: unmodified upstream JSON plus README, NOTICE, and LICENSE.
- `processed/sentence-candidates.json`: deduplicated vocabulary example pairs with provenance and length measurements. These are unreviewed candidates, not a graded exercise bank.
- `phrase-hints/sentences.json`: maintained phrase spans with wording and readings from the Japanese reference. See [phrase hint maintenance](phrase-hints/README.md).
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
