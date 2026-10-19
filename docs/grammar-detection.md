# Breakdown grammar architecture

Grammar detection consumes positioned Japanese words and returns lesson links for
exact source spans. It does not alter answer grading, English hint mappings, or
the upstream lesson definitions.

`data/grammar-supplements.json` supplies locally authored lessons for gaps in the
upstream library. These use the same reference lookup and coverage audit.

## Responsibilities

| Layer                   | Responsibility                                                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `answer-entries.ts`     | Build base words and validate maintained sentence snapshots, groupings, hints, and annotations.                                               |
| `detect-grammar.ts`     | Run semantic handlers in a defined order and pass verb/voice evidence to dependent handlers.                                                  |
| `grammar-rules/`        | Declare construction forms, suffixes, prefix requirements, and reviewed relation categories. No handler execution imports.                    |
| `verb-forms.ts`         | Generate inflections from verified dictionary/tokenizer conjugation classes.                                                                  |
| `potential-forms.ts`    | Share reviewed derived potential lemmas between voice recognition and construction morphology.                                                |
| `voice-analysis.ts`     | Define the typed handoff of predicate start, original/derived lemmas, voice role, supporting evidence, and optional lesson span.              |
| `rareru-context.ts`     | Normalize and bound source context, match cached English action patterns, inspect Japanese roles, and select a reading from the evidence.     |
| `*-grammar.ts` handlers | Establish linguistic roles from morphology, readings, neighboring words, and clause context.                                                  |
| `grammar-matcher.ts`    | Match exact text, require end boundaries, choose the longest valid form, and collect source spans/readings. Callers supply positioned starts. |
| `grammar-matches.ts`    | Resolve explicit overrides and containment independently of detection and rendering.                                                          |
| `grammar-policy.ts`     | Apply the separate lesson capabilities declared in `grammar-rules/lesson-policy.ts` to nesting and inflection enrichment.                     |
| `inflection-grammar.ts` | Detect complementary inflection lessons over resolved predicate spans and standalone base words, respecting construction precedence.          |
| `breakdown-grammar.ts`  | Validate maintained grammar annotations, coordinate detection/resolution/enrichment, and materialize explanations on breakdown entries.       |

`grammar-context.ts` holds shared word predicates and the human-role category
used by giving/passive recognition. Other lexical sets remain local when they
represent different evidence thresholds. For example, a valid comparison noun
does not automatically establish a passive agent or a location.

The construction catalogs are shared by verb and neighboring-word handlers.
A handler must not import another handler merely to obtain a table. The verb
catalog describes the required form; the verb matcher interprets that form once
per rule and then checks its suffixes and contextual restrictions.

## Detection and precedence

1. Analyze voice from reviewed morphology and contextual evidence. Pass typed
   `VoiceAnalysis` records to verb construction matching, including the derived
   lemma when the existing reviewed construction morphology permits it. Handlers
   do not reconstruct morphology from grammar lesson IDs. A reviewed potential
   can supply construction morphology even when its shorter lesson span does not
   end at a tokenizer boundary; the lesson match is optional in that analysis.
2. Run the other handlers. Scope receives verb matches; contextual rules receive
   voice matches. These dependencies are explicit in `detect-grammar.ts`.
3. Detect emphatic wrappers from the combined initial matches.
4. Remove automatic guesses that overlap validated explicit annotations.
5. Prefer a containing construction over its component readings. Partially
   overlapping and equal-span readings remain eligible. Reciprocal/redo
   and potential derivations remain meaningful inside an outer construction:
   rewriting and advice explain 書き直したほうがいい, while potential and
   becoming able to explain 読めるようになった.
6. Add inflection lessons over resolved voice/register spans (potential,
   passive, honorific, or humble), including maintained interpretations and
   predicates split across tokenizer words. A containing construction still
   suppresses its component inflections. Apply standalone-form fallbacks to
   words with no contextual match, then assign each explanation to the
   breakdown entry containing its start.

Nested-derivation retention and permission to explain predicate inflections are
independent capabilities in `grammar-rules/lesson-policy.ts`. This preserves the
existing distinction between potential, passive, and register lessons rather
than treating all voice lessons as interchangeable.

Inflected predicates retain complementary lessons: 読めない links potential and
negative, 読めました links potential and polite past, and 食べなかった links
negative and past. Negative できる forms also link potential, while affirmative
forms retain their lexical ambiguity. Ambiguous られる forms still need context
or maintained occurrence interpretations to distinguish potential from passive
and honorific readings.

`rareru-grammar.ts` coordinates candidate morphology, contextual evidence, and
lesson-span matching. `rareru-context.ts` keeps sentence eligibility, English
action evidence, Japanese role evidence, and reading selection separate; action
regexes are compiled once per reviewed action. The handler resolves reviewed
ichidan and 来る candidates when the source
English contains a unique aligned action and an explicit ability/passive cue.
Honorific られる additionally requires a Japanese respectful subject and an
aligned active translation. Generic "can" or a person's title alone is not
evidence. Conflicting readings, repeated actions, quotations, multiple candidates,
and separate sentences abstain; modal passives such as "can be eaten" also need
review. Explicit occurrence annotations retain precedence. This is bounded
bilingual context handling, not a general semantic parser or a guarantee that
every られる occurrence is resolved.

Reviewed potential lemmas use ichidan morphology for construction matching even
when the derived lemma is absent from the vocabulary bank. This covers
conditionals and larger constructions without broadening which verbs have an
unambiguous potential reading. `tests/potential-coverage-matrix.test.ts` checks
eight godan consonant groups, both original and derived dictionary metadata,
finite and conditional inflections, larger constructions, split-token words,
and ambiguous lexical counterexamples. This is a bounded regression matrix,
not a claim that every Japanese construction or ambiguity is handled.

Existential なくては before a negative verb links its conditional lesson across
なくて + は, suppressing the standalone topic-particle reading. This handler
allows commas between the condition and predicate, preserving the original
positions; sentence-ending punctuation still stops it.

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
