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

`grammarAnnotations` optionally links exact Japanese occurrences to any of the
526 OpenJLPT lessons. Each annotation has `start`, `end`, exact `japanese`, and
one or more `grammarIds` (the lesson IDs, unique across levels). Spans must start
and end at base breakdown word boundaries and can cover multiple words. Unlike
hint mappings, they do not require an English translation or change word grouping.
Choose the lesson for the occurrence's actual role: for example `yori` for
comparison, `no` for possession, and `no-koto-nominalizer` for nominalization.

Breakdowns show the lesson's meaning, formation, usage notes, and first example.
An explanation belongs to the entry containing the span's start; its full Japanese
span is displayed even when the construction crosses several entries. Explicit
spans replace automatic form explanations within that span. Grammar from base
words survives grouping into maintained phrases. Common unambiguous particles
and verified inflected verbs receive automatic lessons. `server/utils/verb-grammar.ts`
also recognizes common verb constructions across consecutive base words, using
the supplied dictionary form and its vocabulary conjugation class. This includes
permission, requests, prohibition, obligation, ongoing actions, trying an action,
preparation, completion, sequence, concessions, wishes, and simultaneous actions.
It also recognizes past experience (たことがある), ability (ことができる),
advice (た / ないほうがいい), favors (てもらう / てあげる), and intentions
(dictionary / ない form + つもり), including common polite and negative endings.
Dictionary-form constructions can start at an uninflected verb without a stored
inflection lexeme. Verb forms use the generated tokenizer conjugation class,
falling back to the vocabulary class for older or manually supplied entries.
This keeps kana spellings and compounds usable even when the vocabulary list
does not include them. Unsupported spellings and conjugations still require annotations.
Additional handlers cover favors with てくれる, offers with ましょうか,
verb/adjective/noun conditions with たら, causal ので, wanting things with
がほしい, action lists with たり, and casual てる / でる contractions of ている.
Action lists require a final する (including common inflections), and one lesson
spans the list. Joined ので relies on the maintained conjunction reviews;
possessive の followed by で remains separate. Whole constructions take priority
over component explanations, while partially overlapping constructions retain
their separate lessons.
`server/utils/comparison-grammar.ts` recognizes comparative より when its standard
and a following adjective or comparative predicate establish the use. Source
より ("from"), により, and ambiguous clauses do not establish a comparison.
`server/utils/question-grammar.ts` recognizes standalone clause-ending question
か after a predicate, including explanatory のか. It leaves internal choices,
indefinite forms, embedded questions, and ambiguous noun fragments to annotations.
`server/utils/particle-grammar.ts` recognizes clear roles for の, が, に, で,
と, and から using positioned nouns, nearby predicates, and maintained lexical
cues. This covers noun-to-noun possession/description; subject and clause-linking
が; destination, existence location, and explicit time に; action-location and
means で; compatible noun lists, companions, and quoted speech/thought と; and
starting-point versus causal から. Place, transport, tool, language, and compatible
list categories are intentionally limited. Nominalized clauses, purpose に,
frequency expressions, copular で, conditional と, naming という, temporal
うち, and unresolved readings do not receive a role just from their spelling.
Predicate searches stop at sentence or quotation boundaries. Unsupported or
ambiguous roles still need explicit annotations, which override these handlers.
Matches must cover complete base words, retain punctuation and spacing, and use
the longest recognized construction; explicit annotations take priority.
Ambiguous roles and unsupported forms still require annotations. This supports
every lesson, but does not claim automatic recognition of all Japanese grammar
in the sentence corpus. Unrestricted substring matches must never establish a
grammar lesson. Existing general particle notes remain available when the
particular role has not been annotated.

An unknown lesson ID or invalid grammar span rejects the sentence annotation in
the same way as an invalid hint mapping. Bump `answerDetailsVersion` for changes
to grammar annotations or automatic interpretation too.

Coverage for all 526 lessons is tracked in [the generated inventory](../../docs/grammar-coverage.md).
Run `bun run grammar:audit` after handler, annotation, or corpus changes, and
`bun run grammar:check` to verify that the reports and reviewed positive/negative
cases remain current. The inventory distinguishes rule presence, observed corpus
matches, annotation-only lessons, and unverified search candidates.

The current implementation separates rule catalogs, semantic handlers, exact
span matching, precedence, and explanation attachment. See the
[architecture guide](../../docs/grammar-detection.md) for module responsibilities,
detection dependencies, and the procedure for adding coverage. Shared rules
cover reviewed verb constructions, particles, comparisons, noun relations,
contextual clauses, fused-word derivations, voice, and honorifics. Their recognition
remains partial; lexical categories and clause context constrain each reading.

Version `answer-entries-v14` refreshes saved journal breakdowns after the current
interpretation changes. Reviewed contextual occurrences retain explicit
annotations with the existing English, Japanese, and reading guards. See the
[candidate review notes](../grammar-coverage/review-notes.md) for rejected
lookalikes and source-lesson sense differences.
