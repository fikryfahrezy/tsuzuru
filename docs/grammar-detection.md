# Breakdown grammar architecture

Grammar detection consumes positioned Japanese words and returns lesson links for
exact source spans. It does not alter answer grading, English hint mappings, or
the upstream lesson definitions.

## Responsibilities

| Layer                   | Responsibility                                                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `answer-entries.ts`     | Build base words and validate maintained sentence snapshots, groupings, hints, and annotations.                                               |
| `detect-grammar.ts`     | Run semantic handlers in a defined order and pass verb/voice evidence to dependent handlers.                                                  |
| `grammar-rules/`        | Declare construction forms, suffixes, prefix requirements, and reviewed relation categories. No handler execution imports.                    |
| `verb-forms.ts`         | Generate inflections from verified dictionary/tokenizer conjugation classes.                                                                  |
| `*-grammar.ts` handlers | Establish linguistic roles from morphology, readings, neighboring words, and clause context.                                                  |
| `grammar-matcher.ts`    | Match exact text, require end boundaries, choose the longest valid form, and collect source spans/readings. Callers supply positioned starts. |
| `grammar-matches.ts`    | Resolve explicit overrides and containment independently of detection and rendering.                                                          |
| `breakdown-grammar.ts`  | Attach resolved spans and standalone-form fallbacks to breakdown entries and materialize lesson explanations.                                 |

`grammar-context.ts` holds shared word predicates and the human-role category
used by giving/passive recognition. Other lexical sets remain local when they
represent different evidence thresholds. For example, a valid comparison noun
does not automatically establish a passive agent or a location.

The construction catalogs are shared by verb and neighboring-word handlers.
A handler must not import another handler merely to obtain a table. The verb
catalog describes the required form; the verb matcher interprets that form once
per rule and then checks its suffixes and contextual restrictions.

## Detection and precedence

1. Detect verb constructions and voice independently.
2. Run the other handlers. Scope receives verb matches; contextual rules receive
   voice matches. These dependencies are explicit in `detect-grammar.ts`.
3. Detect emphatic wrappers from the combined initial matches.
4. Remove automatic guesses that overlap validated explicit annotations.
5. Prefer a containing construction over its component readings. Partially
   overlapping and equal-span readings remain eligible. Reciprocal/redo
   derivations remain meaningful inside an outer construction: both rewriting
   and advice explain 書き直したほうがいい.
6. Apply standalone-form fallbacks only to base words with no contextual match,
   then assign each explanation to the breakdown entry containing its start.

Explicit overrides are applied before containment, so a discarded outer guess
cannot hide a valid inner match. Precedence has dedicated tests independent of
particular Japanese formations.

## Evidence boundaries

Handlers match the original UTF-16 positions without stripping punctuation or
skipping characters. Each handler determines its own clause traversal and
semantic requirements; the shared matcher does not broaden those requirements.
Generated lexemes are accepted only when their sentence/reading snapshot is
current. A conjugation class establishes morphology, not a choice between
potential, passive, and respect.

Maintained occurrence annotations remain the mechanism for a reviewed reading
that cannot be inferred safely by a shared rule. Their English, Japanese, and
reading guards must remain valid. Unknown lesson IDs or misaligned spans reject
the maintained record rather than silently publishing stale links.

## Changing coverage

Add positive and nearby negative examples before expanding a handler. Keep
construction tables separate from runtime matching; add contextual code when a
formation needs more than exact suffix and prefix roles. Do not derive arbitrary
regexes from lesson display patterns.

Run `bun run grammar:audit` after formatting source changes. The audit scans
handler modules and `grammar-rules/` for lesson references and evaluates the
corpus separately; a rule reference is partial recognition, not proof of full
coverage. `bun run check` verifies lint, formatting, types, tests, reviewed corpus
cases, and report freshness. Changes to generated morphology also require
`bun run romaji:test` and `bun run romaji:check`.

Bump `answerDetailsVersion` when behavior or maintained interpretations change.
A behavior-preserving refactor does not need another version bump. See the
[coverage inventory](grammar-coverage.md) and
[reviewed evidence limits](../data/grammar-coverage/review-notes.md).
