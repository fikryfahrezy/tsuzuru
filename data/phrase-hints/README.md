# Sentence phrase hints

`sentences.json` maps English phrase spans to wording and readings extracted
from the existing Japanese reference. These AI-assisted development annotations
are not independently reviewed translations. They inherit the source sentence
attribution and CC BY-SA 4.0 terms described in [the data disclosure](../../DATA_DISCLOSURE.md).
The sentence ID links each entry to its original source record in
`processed/sentence-candidates.json`.

This initial bank covers 18 sentences, including ambiguous phrases, idioms, and
separated phrasal verbs. Other sentences retain dictionary hints. Lemmatization
normalizes English inflections; it does not determine the correct meaning in
context. Additional context-sensitive phrases need maintained mappings.

To add a mapping, copy the sentence ID and exact English and Japanese reference
into an entry. Add each phrase's English spans with `start`, `end`, and `text`.
Offsets use JavaScript string positions (UTF-16); `end` is exclusive. A contiguous
phrase uses one span. A separated phrase uses multiple spans, leaving its object
outside the spans so it keeps its own hint. For example, the spans for “turn the
light on” are “turn” and “on.” Repeated words must use their actual positions.

Each hint contains `japanese`, `reading`, and `meaning`. Japanese wording must
occur verbatim in the reference. Its reading must match an existing valid
furigana variant; do not supply inferred readings or substitute dictionary forms
in this bank. Romaji is derived automatically. The English meaning should describe
the phrase in that sentence, including tense where useful.

The server rejects an entire entry if its source text changes, spans split a word
or overlap, or a Japanese reading cannot be verified from supplied furigana.
Run `bun test tests/word-hints.test.ts` after edits: it checks every entry against
the current exercise bank and verifies that prompt text is preserved.
