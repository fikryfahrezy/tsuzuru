# Shared sentence answer entries

`sentences.json` is the maintained source for contextual meanings and English hint
mappings. Practice hints are published only from these mappings. Dictionary lookup
can help prepare annotations but cannot establish a published mapping or supply
context to the breakdown.

These AI-assisted development annotations are not independently reviewed
translations. They retain the source sentences' provenance and CC BY-SA 4.0 terms
in [the data disclosure](../../DATA_DISCLOSURE.md). The sentence ID links to
`processed/sentence-candidates.json`.

Each sentence record snapshots its exact English, Japanese, and primary furigana.
Each `answerEntries` item contains:

- `id`: `ja-START-END`, unique within the sentence and tied to the Japanese occurrence.
- `start`, `end`: UTF-16 offsets in the Japanese reference; the end is exclusive.
- `japanese`: the exact reference text at those offsets.
- `reading`: the supplied primary pronunciation, checked against the reference.
- `meaning`: the contextual meaning of this occurrence.
- `wordTypes` (optional): contextual grammatical categories that override ambiguous
  dictionary categories, such as prenominal `ある` rather than the verb “exist”.

An entry may cover one tokenizer word or several consecutive words. A maintained
phrase replaces those words as one breakdown entry. Separate occurrences of the
same Japanese spelling have separate IDs and may have different meanings.
Romaji is derived once from the shared pronunciation, including particle
pronunciation. Spellings come from the primary reference's verified spelling bank.
Do not guess pronunciations or store independently authored romaji.
`pronunciations.json` holds particle and greeting pronunciation rules used when
deriving romaji. The reference's kana spelling is retained for display, while
forms such as particle は and greeting こんにちは use their spoken pronunciation.

Each `hintMappings` item contains `answerEntryIds` and English `spans` with
`start`, `end`, and exact `text`. These offsets also use UTF-16. A contiguous
phrase uses one span; a separated phrase uses several spans pointing to the same
answer IDs. Repeated English words must use their actual occurrences. English
spans must cover whole words, cannot overlap, and cannot split contractions or
hyphenated words. Do not map words omitted from the Japanese answer.

Both views read the shared answer entries. Removing an English hint mapping does
not change the breakdown. Entries without maintained context show no contextual
meaning, though optional dictionary senses and grammar notes remain available.
Unmapped English words have no hint. There is no automatic dictionary fallback.

A stale snapshot, missing ID, overlap, partial Japanese token, or unsupported
reading rejects the whole sentence annotation. It then has no contextual meanings
or hints; the reference answer and optional dictionary material remain available.

For annotation changes, bump `answerDetailsVersion` in `shared/answer-entries.ts`
so saved journal breakdowns refresh when opened. Run `bun test tests` and
`bun run typecheck`. Tests include independent expected meanings for reported
regressions, malformed and stale data, repeated occurrences, separated phrases,
and a check that removing mappings leaves the breakdown unchanged.
