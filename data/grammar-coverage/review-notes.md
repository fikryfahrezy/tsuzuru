# Reviewed candidate limits

These are development review notes for the current sentence bank, not an
exhaustive linguistic audit. Search matches alone do not establish an omission.
Use lesson formation, supplied reading, whole sentence, and translation together.

The latest implementation extends shared verb constructions, noun relations,
reading-sensitive fused words, conditional/purpose/reason clauses, voice, and
honorifics. `regressions.json` records the reviewed automatic examples and
counterexamples. `reviewed-occurrences.json` records contextual decisions stored
as snapshot-validated annotations, including causative-passive and action phase.

The following search leads did not justify adding the requested lesson:

| Lesson | Observed lookalike or other sense | Review decision |
| --- | --- | --- |
| nuku | 撃ち抜いた; 朝飯を抜いた | Physical penetration and skipping a meal do not establish persevering to completion. |
| gatai | 聞き取り難い (ききとりにくい); ありがたい | The supplied reading selects にくい; grateful is a lexical adjective. |
| wake-da | 言いわけだ | Excuse is a noun, not an explanatory conclusion. |
| mono-de-wa-nai | Literal “not a thing” predicates | Does not establish the lesson's prohibition/advice sense. |
| mono-dakara | もので followed by す or ある | Nominal copula, not a causal connective. |
| koto-da | Nominalized predicates | Does not establish advice. |
| mono-no | いれもの; 友情というものの | Lexical noun or nominal genitive, not concessive ものの. |
| bakari-da | たばかり; んばかり | Different larger constructions, not an ongoing worsening trend. |
| ni-atatte | Light hitting a stadium | Literal 当たる, not the occasion of an event. |
| o-hajime | 調査をはじめた | Starting an investigation, not a representative list. |
| ka-to-iu-to | どちらかというと | “Rather” does not establish the referenced explanatory question formation. |
| to-wa-ie | とはいえない | Negated “cannot be called,” not concessive “although.” |
| ni-shiro | ようにしろ; なにしろ | Command and fixed “after all,” not the lesson's concessive alternative. |
| wa-oroka | 彼はおろかにも | Foolishness, not “let alone.” |
| gotoki | ことごとく | Lexical “all,” not classical simile. |
| nakushite | 財布をなくして | Losing a wallet, not “without.” |
| o-motte | 持って | Ordinary holding/taking does not establish formal means. |
| to-atte | うんとあって; もっとあって | Substring boundaries do not establish causal とあって. |
| kakeru | 出かける; 微笑みかける | Going out and directing a smile do not establish an unfinished action. |
| dokoro-dewa-nai | 近視どころではない | “Far from nearsighted” differs from the reference lesson's “no time for.” |
| amari-ni | Bare あまりに | Does not establish the source formation emotion + のあまり. |
| toka-toka | Single nominal とか examples | Current rule requires the repeated listing formation specified by this lesson. |

These findings justify leaving these particular occurrences unlinked to those
lesson IDs. They do not prove the constructions are absent elsewhere. Short
markers, alternate kanji, inflections, and missing lexical metadata require
further searching; a zero literal-match count is not a hard limit.

For ambiguous passive/potential/respect, action phase versus physical location,
and lexical versus grammatical uses, add a reviewed occurrence annotation when
the whole sentence resolves the reading. An automatic rule should require
reusable evidence and nearby negative examples rather than choose a reading
from the suffix alone. Unknown or contradictory evidence remains a real limit
for that occurrence until metadata or a reviewed interpretation is available.

A further N3 pass confirmed unchanged-state まま, contingency 場合, only-after
て初めて, tendency がち, audience 向き／向け, reciprocal 合う, and redo 直す.
The corresponding corpus regressions include lexical negatives: わがまま,
雨がちょうど, physical 後ろ向き, 似合う, and reassessment 見直す.
Reciprocal and redo derivations remain visible inside larger constructions;
書き直したほうがいい links both rewriting and advice.
