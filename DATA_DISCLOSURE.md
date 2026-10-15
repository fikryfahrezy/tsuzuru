# Tsuzuru data disclosure

Prepared on 13 October 2026. This document covers the learning data imported into this repository. The exact upstream commit, retrieval timestamp, file checksums, and record counts are recorded in [data/manifest.json](data/manifest.json).

## Imported material

Tsuzuru imports an OpenJLPT snapshot containing N5–N1 vocabulary, kanji, grammar, and associated examples. The original JSON files, upstream README, attribution notice, and license are retained without modification in the commit-specific directory under [data/sources/openjlpt](data/sources/openjlpt).

OpenJLPT combines several sources. This table records their attribution and the licenses stated in OpenJLPT's upstream notice; it is not an independent legal audit of every source record.

| Source / attribution | Material used | Upstream license / reference |
| --- | --- | --- |
| [OpenJLPT and its contributors](https://github.com/evanclan/OpenJLPT) | Compiled datasets, corrections, and original grammar explanations and examples | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| [Jonathan Waller's JLPT Resources](https://www.tanos.co.uk/jlpt/) | Vocabulary and kanji level assignments and vocabulary glosses | CC BY, as identified in the upstream notice; that notice does not specify a version |
| [Electronic Dictionary Research and Development Group — JMdict](https://www.edrdg.org/jmdict/j_jmdict.html) | Dictionary identifiers, parts of speech, and verification of word forms and readings | CC BY-SA 4.0 as identified by OpenJLPT; [EDRDG terms](https://www.edrdg.org/edrdg/licence.html) |
| [Electronic Dictionary Research and Development Group — KANJIDIC2](https://www.edrdg.org/wiki/KANJIDIC_Project.html) | Kanji readings, meanings, and associated metadata | CC BY-SA 4.0 as identified by OpenJLPT; [EDRDG terms](https://www.edrdg.org/edrdg/licence.html) |
| [Tatoeba and its sentence contributors](https://tatoeba.org/) | Japanese–English vocabulary example pairs | [CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/) as identified by OpenJLPT |

The original upstream NOTICE.md is retained alongside the data. The initial import includes dictionary and sentence content through OpenJLPT; later spelling and hint banks use a separately pinned JMdict snapshot as described below. Full standalone KANJIDIC2 and Tatoeba corpora have not been downloaded. KanjiVG stroke diagrams, audio, fonts, and upstream application code are not included in this import.

## License boundary and redistribution

The project's existing root [LICENSE](LICENSE) applies to original project software. It does not relicense third-party learning data. The imported OpenJLPT dataset and the derived sentence-candidate file are distributed under CC BY-SA 4.0, with the underlying source credits preserved. The full upstream license text is included with the snapshot.

When sharing these datasets or adaptations, retain source credit, a license link, and a description of changes, and apply the ShareAlike terms to adapted data. Do not present the source organizations as endorsing Tsuzuru. Preserve this disclosure and the snapshot's NOTICE.md and LICENSE when packaging learning data.

For an application release, expose the following credit in an accessible About / Data sources view, with working links:

> Tsuzuru uses OpenJLPT data under CC BY-SA 4.0, incorporating JMdict and KANJIDIC2 from EDRDG, Jonathan Waller's JLPT Resources, and sentences from Tatoeba contributors. Tsuzuru has reorganized example pairs for writing practice. JLPT labels are unofficial estimates.

Link OpenJLPT, EDRDG, Waller, Tatoeba, the CC BY-SA 4.0 license, and this disclosure. Each Tatoeba exercise should also expose the source sentence link retained in its provenance. The imported examples generally provide a Japanese sentence ID, not a separate English sentence ID or complete contributor list. Preserve that limitation; additional attribution metadata can be enriched from Tatoeba before publication.

## Changes made by Tsuzuru

The raw snapshot is unchanged. The local importer creates [sentence-candidates.json](data/processed/sentence-candidates.json) by:

- Extracting nonempty English–Japanese examples from vocabulary records at all five levels.
- Combining identical text pairs while retaining all associated vocabulary and source references.
- Preserving supplied furigana variants and Tatoeba IDs and links.
- Adding stable pair identifiers, English word counts, and Japanese character counts.
- Explicitly marking every candidate unreviewed and leaving its sentence-level JLPT assignment unset.

English word count uses a documented regular expression in the importer. Japanese character count counts Unicode code points except whitespace, including punctuation; it is not a Japanese word count. Length buckets have not yet been assigned.

The raw import creates no accepted-answer variants or automatic semantic judgments.
Source grammar examples remain in their original grammar files and are not merged
into the vocabulary sentence-candidate file.

### Added alternative answers

Tsuzuru keeps added answers in [data/alternatives/answers.json](data/alternatives/answers.json),
separate from the unmodified source snapshot and imported sentence candidates.
The adapted bank is distributed under CC BY-SA 4.0 with the original source
attribution retained. Added wording is a Tsuzuru adaptation, not a translation
supplied or endorsed by the original sentence contributors.

Alternatives are produced by rules that omit explicit first-person topics or
vary integer spellings, and by AI-authored wording added during development.
Subject omission relies on the speaker being implied by the English prompt.
Integer variants preserve numeric values and supplied reading annotations;
when the source represents a number with digits and provides no pronunciation,
the reading retains those digits. The generator excludes unsupported number
formats and restricts kanji-to-digit conversion to recognized counter contexts.
It does not infer missing pronunciations or perform semantic translation grading.

Each entry records its source revision, original English and Japanese text,
creator, generation method, change explanation, and reading annotations. Its
sentence ID connects it to the retained upstream provenance and Tatoeba link.
This metadata distinguishes the source reference from later additions and makes
the origin of individual answers inspectable.

Neither rule-generated nor AI-authored additions have independent native-speaker
verification. They may contain errors or depend on context, and the list is not
exhaustive. Structural validation and inclusion in the bank do not certify that
an answer is a correct translation. See [data/README.md](data/README.md) for the
methods, supported formats, and regeneration behavior.

## Current application use

The beta app uses candidates with complete, consistent reading annotations for reference practice. It filters by target vocabulary level and English word count, and derives kana spellings from supplied furigana at comparison time. It does not assign certified sentence-level difficulty or perform semantic translation grading. Flexible writing accepts each annotated word's reference spelling or supplied kana reading, plus the verified variants described below; exact writing preserves the reference script. When the optional pre-generated-alternatives setting is enabled, these same rules also apply to listed alternative sentences. Added wording is attributed according to its own provenance; attribution and links for the original reference are retained separately. Results show the available alternatives after comparison or revealing the reference, regardless of whether alternative matching is on. New Journal entries save the list and provenance as a snapshot. The enriched bank remains CC BY-SA 4.0 and is downloadable from the credits page. All modes normalize Unicode width differences and ignore whitespace and common sentence punctuation. The original imported files remain unchanged.

The app's Data & credits page exposes this disclosure, the upstream attribution notice and license, and the import manifest. Tatoeba sentence links appear with reference answers. Manual language review and additional accepted translations remain necessary for a reviewed exercise bank. Practice history and preferences are saved in browser localStorage; the app server compares answers without persisting them or invoking an AI service.

## Verified spelling variants

`data/spelling-variants/bank.json` adds word-position spelling variants derived
from a checksum-recorded JMdict snapshot and pinned SudachiPy/SudachiDict versions.
JMdict is copyright James William Breen and EDRDG, under CC BY-SA 4.0; the derived
spelling bank uses that same licence. Sudachi and SudachiDict are from Works
Applications under Apache 2.0, and the dictionary includes UniDic and NEologd
material. Retained licences, upstream notices, attribution, source checksums,
generation rules, and the review procedure are documented in
[the spelling bank README](data/spelling-variants/README.md).

The generator validates spelling/reading restrictions, supplied reference
furigana, and unchanged lexical forms, pronunciation, POS and conjugation in a
whole-sentence round trip. Unresolved homophones and sense-specific spellings
are held for explicit context review; the generated bank does not claim
independent language review. Original references remain unchanged. Kana + kanji
mode accepts recorded spelling variants automatically, separately from the
optional alternative translations. Kana-only and exact modes retain their
existing restrictions. Comparison and highlighting use the same allowed paths.

## Educational limitations

The additional hint glossary in `data/hint-glossary/bank.json` extracts English
senses for existing vocabulary from the same pinned JMdict snapshot. It retains
JMdict copyright and CC BY-SA 4.0 attribution. Added senses require Japanese
reference support; complete kana nouns can resolve through Sudachi lexical
normalization using supplied readings. Shared spatial paraphrases connect
“across” with “other side” and “opposite side”. These are possible dictionary
matches, not reviewed sentence translations. See the
[hint glossary README](data/hint-glossary/README.md) for generation and limits.

The [official JLPT FAQ](https://www.jlpt.jp/e/faq/) explains that current vocabulary, kanji, and grammar specifications are not published. Dataset level labels come from community resources and are not official certification. The JLPT itself does not include composition testing; Tsuzuru's writing exercises are its own practice format.

A vocabulary level describes the target word, not all vocabulary and grammar in an accompanying sentence. Sentences can also require context, differ in register, or have multiple valid translations. Neither the source data nor this import guarantees exhaustive accepted answers or error-free readings and translations.

This is reference practice, not certified translation grading. Language review and sentence-level difficulty assessment would be needed for a graded exercise bank. Comparing kana alone can confuse words with the same reading. A match indicates that an answer follows a listed form under the selected writing rules; a mismatch does not prove the translation is incorrect.

## Reproducibility and updates

Run `python3 scripts/fetch_learning_data.py --revision <commit-sha>` using the revision in the manifest to reproduce the source selection. Run without a revision to import the current upstream main commit. Python 3 and HTTPS access to GitHub are required; there are no third-party Python dependencies.

The importer resolves a commit before downloading, checks JSON syntax and upstream per-level counts, and records SHA-256 checksums. These checks verify integrity and structure, not pedagogical accuracy. Review upstream licenses and notices when updating. Keep source data reasonably current, as requested by the upstream notice, and review changes before replacing any published exercise bank.

An update rewrites the generated candidate file and current manifest, retaining older raw commit snapshots. Store manual review decisions and accepted answers separately, keyed by candidate ID, so they are not overwritten by reimporting.
