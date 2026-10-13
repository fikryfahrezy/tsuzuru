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

The original upstream NOTICE.md is retained alongside the data. Full standalone JMdict, KANJIDIC2, and Tatoeba corpora have not been downloaded; their content is included through OpenJLPT. KanjiVG stroke diagrams, audio, fonts, and upstream application code are not included in this import.

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

No accepted-answer variants, tokenized readings, kana-only answers, automatic semantic judgments, or AI-generated exercises have been created by this import. Source grammar examples remain in their original grammar files and are not merged into the vocabulary sentence-candidate file.

## Educational limitations

The [official JLPT FAQ](https://www.jlpt.jp/e/faq/) explains that current vocabulary, kanji, and grammar specifications are not published. Dataset level labels come from community resources and are not official certification. The JLPT itself does not include composition testing; Tsuzuru's writing exercises are its own practice format.

A vocabulary level describes the target word, not all vocabulary and grammar in an accompanying sentence. Sentences can also require context, differ in register, or have multiple valid translations. Neither the source data nor this import guarantees exhaustive accepted answers or error-free readings and translations.

Candidates need language review, sentence-level difficulty assessment, and approved answer forms before they are enabled as graded exercises. Comparing kana alone can confuse words with the same reading. Exact reference matching should be described to learners as matching an approved form, rather than proving all other translations incorrect.

## Reproducibility and updates

Run `python3 scripts/fetch_learning_data.py --revision <commit-sha>` using the revision in the manifest to reproduce the source selection. Run without a revision to import the current upstream main commit. Python 3 and HTTPS access to GitHub are required; there are no third-party Python dependencies.

The importer resolves a commit before downloading, checks JSON syntax and upstream per-level counts, and records SHA-256 checksums. These checks verify integrity and structure, not pedagogical accuracy. Review upstream licenses and notices when updating. Keep source data reasonably current, as requested by the upstream notice, and review changes before replacing any published exercise bank.

An update rewrites the generated candidate file and current manifest, retaining older raw commit snapshots. Store manual review decisions and accepted answers separately, keyed by candidate ID, so they are not overwritten by reimporting.
