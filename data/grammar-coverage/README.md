# Grammar coverage maintenance

`bun run grammar:audit` rebuilds `report.json` and
[`docs/grammar-coverage.md`](../../docs/grammar-coverage.md) for every library
lesson. `bun run grammar:check` checks the generated files and fails for a reviewed
regression that no longer passes. The standard `bun run check` includes this check.

The generated report records current rule references, corpus observations,
validated annotations, and reviewed regressions. These are different kinds of
evidence; rule presence does not establish full language coverage. Synthetic
tests cover valid formations absent from the current sentence bank, while the
report retains zero observations for those rules. See the
[architecture guide](../../docs/grammar-detection.md) for the detection pipeline
and precedence policy.

## Limits and remaining work

No global hard limit has been reached. A rule reference means only partial
recognition. Remaining work includes unsupported lessons, unhandled inflections,
missing lexical categories, and review of further automatic matches. Do not infer
completeness from the number of automatic lesson IDs or passing fixtures.

Some occurrences do have a limit with the present evidence:

- 食べたそうだ can report that someone ate or describe someone looking as though
  they want to eat. Past-verb hearsay remains unlinked automatically rather than
  choosing a sense from that surface alone.
- られる can express potential, passive, or respect. Knowing the conjugation
  class does not select the lesson. These still need reliable context or an
  occurrence annotation.
- 手にとって, 仕事についている, and 駅によって can be literal actions rather
  than standpoint, topic, or causal constructions. Relation handlers use limited
  semantic categories and leave unfamiliar nouns for review.
- A bare ませんか can be an invitation, factual negative question, or request.
  Invitations currently require a shared-action cue; requests retain their
  more specific constructions.
- 何か can be indefinite or part of an embedded question. Only clearly
  case-marked indefinite uses are handled; full sentence interpretation is not
  inferred from the spelling.
- Missing tokenizer classes, transitivity, or noun categories leave valid
  occurrences unmatched. Repair verified metadata or add reviewed categories;
  never compensate with unrestricted suffix matching.

Use maintained occurrence annotations for decisions that remain ambiguous after
review. The continuing review adds shared N4 and N3–N1 handlers and validated
annotations for resolved contextual readings. See [candidate review notes](review-notes.md)
for lexical lookalikes, source-lesson sense differences, and evidence limits.
Unsupported library IDs are not a count of confirmed sentence omissions.
Further review remains possible; reviewed ambiguity is an occurrence-specific
limit, not a global hard limit on improving the system.

## Evidence

- Automatic rule references come from TypeScript syntax trees in the grammar
  handler modules and `server/utils/grammar-rules/`. The audit fails if runtime output references a lesson with
  no discoverable source reference. A reference alone does not prove correctness.
- Automatic corpus observations run with positioned words and no maintained
  meanings, phrase grouping, or grammar annotations. This separates shared rules
  from individual sentence overrides.
- Annotation counts include only validated, explicit occurrence links. A lesson
  with no rule or annotation is unsupported in breakdowns, but remains browsable
  in the grammar library.
- `regressions.json` contains development-reviewed corpus regions and positive
  or negative expectations. These are not independently reviewed translations.
  The Japanese region must occur exactly once in its sentence. A matching lesson
  must overlap that region, so a match elsewhere does not pass. Unit tests also
  check full spans, conjugations, and misleading lookalikes.
- `probes.json` contains conservative search leads and review notes. Matches
  are unverified candidates, not confirmed missing or incorrect grammar. Exact
  upstream lesson examples found in the corpus are also suggested for review.
  Probes never influence practice output, hints, sentence grading, or annotations.

Add a reviewed failing case before implementing a new lesson or variation. Add
negative examples for nearby constructions, make the shared handler pass both,
and regenerate the reports. Missing probes and zero corpus observations remain
explicit gaps rather than evidence of complete coverage. Lesson patterns and
source sentences retain their attribution and terms in the
[data disclosure](../../DATA_DISCLOSURE.md).
