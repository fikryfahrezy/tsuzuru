import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as ts from "typescript";
import { grammarEntries, grammarById } from "../server/utils/grammar-reference";
import { exercises, exerciseById } from "../server/utils/exercises";
import {
  answerAnnotationRecords,
  baseAnswerEntries,
  sentenceAnswerEntries,
} from "../server/utils/answer-entries";
import { withBreakdownGrammar } from "../server/utils/breakdown-grammar";
import type { GrammarExplanation } from "../shared/grammar";
import regressionData from "../data/grammar-coverage/regressions.json";
import probes from "../data/grammar-coverage/probes.json";

export interface Regression {
  lessonId: string;
  sentenceId: string;
  japanese: string;
  expect: string;
  note: string;
}
export function checkRegression(
  regression: Regression,
  explanations: GrammarExplanation[],
) {
  const sentence = exerciseById.get(regression.sentenceId);
  if (!sentence || !grammarById.has(regression.lessonId))
    throw new Error(`Unknown regression ID: ${JSON.stringify(regression)}`);
  const start = sentence.reference.japanese.indexOf(regression.japanese);
  if (
    start < 0 ||
    start !== sentence.reference.japanese.lastIndexOf(regression.japanese)
  )
    throw new Error(
      `Missing or ambiguous regression snapshot: ${regression.sentenceId}`,
    );
  if (!["present", "absent"].includes(regression.expect))
    throw new Error("Invalid regression expectation");
  const end = start + regression.japanese.length;
  const actual = explanations.some(
    (g) => g.id === regression.lessonId && g.start < end && g.end > start,
  );
  return actual === (regression.expect === "present");
}

export function coverageStatus(rules: number, annotations: number) {
  return rules ? "automatic" : annotations ? "annotation-only" : "unsupported";
}

interface Example {
  sentenceId: string;
  japanese: string;
  english: string;
}
interface Evidence {
  sentences: Set<string>;
  occurrences: number;
  examples: Example[];
}
const empty = (): Evidence => ({
  sentences: new Set(),
  occurrences: 0,
  examples: [],
});
const snapshot = (s: (typeof exercises)[number]): Example => ({
  sentenceId: s.id,
  japanese: s.reference.japanese,
  english: s.english,
});
const count = (e: Evidence, s: (typeof exercises)[number]) => {
  e.occurrences++;
  if (!e.sentences.has(s.id) && e.examples.length < 2)
    e.examples.push(snapshot(s));
  e.sentences.add(s.id);
};
const serialize = (e: Evidence) => ({
  sentences: e.sentences.size,
  occurrences: e.occurrences,
  examples: e.examples,
});

export async function auditGrammar() {
  const root = resolve(import.meta.dirname, "..");
  const utils = resolve(root, "server/utils");
  const paths = [
    ...(await readdir(utils)).filter((path) => path.endsWith("-grammar.ts")),
    ...(await readdir(resolve(utils, "grammar-rules")))
      .filter((path) => path.endsWith(".ts"))
      .map((path) => `grammar-rules/${path}`),
  ].sort();
  const references = new Map<string, { file: string; line: number }[]>();
  // Syntax-tree references establish rule presence, not correctness or complete
  // recognition. Corpus observations and reviewed regression cases are separate.
  for (const path of paths) {
    const file = `server/utils/${path}`;
    const source = ts.createSourceFile(
      file,
      await readFile(resolve(root, file), "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function visit(node: ts.Node) {
      if (ts.isStringLiteral(node) && grammarById.has(node.text)) {
        const refs = references.get(node.text) ?? [];
        refs.push({
          file,
          line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        });
        references.set(node.text, refs);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  const automatic = new Map(grammarEntries.map((g) => [g.id, empty()]));
  const annotated = new Map(grammarEntries.map((g) => [g.id, empty()]));
  const annotations = new Map<string, GrammarExplanation[]>();
  for (const record of answerAnnotationRecords) {
    const s = exerciseById.get(record.sentenceId)!;
    const details = sentenceAnswerEntries(s);
    if (!details.validAnnotations)
      throw new Error(`Stale maintained annotations: ${record.sentenceId}`);
    const matches = details.entries
      .flatMap((part) => part.grammar ?? [])
      .filter((g) =>
        record.grammarAnnotations?.some(
          (a) =>
            a.start === g.start &&
            a.end === g.end &&
            a.grammarIds.includes(g.id),
        ),
      );
    annotations.set(s.id, matches);
    for (const g of matches) count(annotated.get(g.id)!, s);
  }
  for (const probe of probes)
    if (!grammarById.has(probe.lessonId))
      throw new Error(`Unknown probe: ${probe.lessonId}`);
  const patterns = probes.map((probe) => ({
    ...probe,
    regex: new RegExp(probe.pattern, "u"),
  }));
  const candidates = new Map<string, Example[]>();
  const regressions: (Regression & { passed: boolean })[] = [];
  const byJapanese = new Map(exercises.map((s) => [s.reference.japanese, s]));
  for (const s of exercises) {
    const base = baseAnswerEntries(s);
    const matches = withBreakdownGrammar(s, base, base).flatMap(
      (part) => part.grammar ?? [],
    );
    for (const g of matches) {
      if (!references.has(g.id))
        throw new Error(
          `Emitted lesson without a discoverable rule reference: ${g.id}`,
        );
      count(automatic.get(g.id)!, s);
    }
    for (const regression of regressionData.filter(
      (r) => r.sentenceId === s.id,
    ))
      regressions.push({
        ...regression,
        passed: checkRegression(regression, matches),
      });
    const linked = [...matches, ...(annotations.get(s.id) ?? [])];
    for (const probe of patterns) {
      const found = probe.regex.exec(s.reference.japanese);
      if (!found) continue;
      if (
        regressionData.some(
          (r) =>
            r.sentenceId === s.id &&
            r.lessonId === probe.lessonId &&
            r.expect === "absent",
        )
      )
        continue;
      if (
        linked.some(
          (g) =>
            g.id === probe.lessonId &&
            g.start < found.index + found[0].length &&
            g.end > found.index,
        )
      )
        continue;
      const list = candidates.get(probe.lessonId) ?? [];
      if (list.length < 2) list.push(snapshot(s));
      candidates.set(probe.lessonId, list);
    }
  }
  const lessons = grammarEntries.map((g) => {
    const a = automatic.get(g.id)!;
    const n = annotated.get(g.id)!;
    const sourceExamples = g.examples
      .map((example) => byJapanese.get(example.ja))
      .filter((s) => !!s);
    const suggestions = [
      ...(candidates.get(g.id) ?? []),
      ...sourceExamples
        .filter((s) => !a.sentences.has(s.id) && !n.sentences.has(s.id))
        .map(snapshot),
    ];
    return {
      id: g.id,
      level: g.level,
      pattern: g.pattern,
      status: coverageStatus(references.get(g.id)?.length ?? 0, n.occurrences),
      ruleReferences: references.get(g.id) ?? [],
      automatic: serialize(a),
      annotations: serialize(n),
      reviewedCases: regressions.filter((r) => r.lessonId === g.id),
      candidateReviewNote:
        probes.find((p) => p.lessonId === g.id)?.note ??
        "Only exact upstream example matches are suggested; no general candidate probe exists.",
      candidatesNeedingReview: [
        ...new Map(suggestions.map((s) => [s.sentenceId, s])).values(),
      ].slice(0, 2),
    };
  });
  const statuses = ["automatic", "annotation-only", "unsupported"] as const;
  const levels = ["N5", "N4", "N3", "N2", "N1"];
  const counts = (items: typeof lessons) =>
    Object.fromEntries(
      statuses.map((status) => [
        status,
        items.filter((g) => g.status === status).length,
      ]),
    );
  const report = {
    version: 1,
    lessons: grammarEntries.length,
    sentences: exercises.length,
    statusCounts: counts(lessons),
    byLevel: Object.fromEntries(
      levels.map((level) => [
        level,
        counts(lessons.filter((g) => g.level === level)),
      ]),
    ),
    regressionSummary: {
      total: regressions.length,
      passed: regressions.filter((r) => r.passed).length,
      failed: regressions.filter((r) => !r.passed).length,
    },
    entries: lessons,
  };
  const cell = (s: string) => s.replaceAll("|", "\\|").replaceAll("\n", " ");
  let md = `# Grammar coverage and backlog\n\nGenerated by \`bun run grammar:audit\`. Check with \`bun run grammar:check\`.\n\nThis inventory covers all ${report.lessons} lessons and ${report.sentences} eligible sentences.\n\n- **automatic**: a lesson ID is referenced by a handler. Recognition is partial; this is not a completeness or accuracy claim. The summary splits these by whether the handler matches at least one corpus sentence; a lesson with no match is tested only by unit fixtures and changes no breakdown today.\n- **annotation-only**: no automatic rule reference, but a valid maintained occurrence links this lesson.\n- **unsupported**: no rule reference or maintained occurrence. The lesson remains available in the grammar reference.\n- Corpus counts are observations, not language review. Regex candidates require review; they are not confirmed failures. Zero candidates does not prove a lesson is absent.\n- Reviewed cases are exact corpus snapshots with positive or negative expectations, tested without maintained annotations.\n\nLesson patterns retain the source library attribution in [the data disclosure](../DATA_DISCLOSURE.md).\n\n## Summary\n\n| Level | Automatic, found in corpus | Automatic, no corpus match | Annotation-only | Unsupported |\n| --- | --- | --- | --- | --- |\n`;
  for (const level of levels) {
    const c = report.byLevel[level]!;
    const found = lessons.filter(
      (g) =>
        g.level === level &&
        g.status === "automatic" &&
        g.automatic.sentences > 0,
    ).length;
    md += `| ${level} | ${found} | ${c.automatic - found} | ${c["annotation-only"]} | ${c.unsupported} |\n`;
  }
  md += `\n## Reviewed corpus checks\n\n${report.regressionSummary.passed}/${regressions.length} passing. Add reviewed cases in \`data/grammar-coverage/regressions.json\`.\n\n| Check | Lesson | Sentence ID | Japanese region | Expected |\n| --- | --- | --- | --- | --- |\n`;
  for (const r of regressions)
    md += `| ${r.passed ? "[x]" : "[ ]"} | ${r.lessonId} | \`${r.sentenceId}\` | ${cell(r.japanese)} | ${r.expect} |\n`;
  md +=
    "\n## Next batches\n\n1. Add reviewed positive and negative corpus cases for common unsupported N5/N4 lessons. Prioritize candidates below after language review.\n2. Extend existing automatic handlers where reviewed cases show missing variations.\n3. Generalize annotation-only lessons when sufficient context can distinguish their roles.\n4. Work through N3–N1 after the common N5/N4 backlog. Ambiguous uses can retain annotations.\n\n";
  for (const level of levels) {
    md += `## ${level} inventory\n\n| Lesson ID | Pattern | Status | Automatic sentences | Annotated sentences | Reviewed checks |\n| --- | --- | --- | --- | --- | --- |\n`;
    for (const g of lessons.filter((g) => g.level === level))
      md += `| ${g.id} | ${cell(g.pattern)} | ${g.status} | ${g.automatic.sentences} | ${g.annotations.sentences} | ${g.reviewedCases.filter((r) => r.passed).length}/${g.reviewedCases.length} |\n`;
    md += "\n";
  }
  md +=
    "## Candidate sentences needing review\n\nOpen a sentence with `/app?sentence=<id>`. These are search leads, not verified grammar annotations or confirmed failures. No handler or practice hint consumes these probes.\n\n";
  for (const g of lessons.filter((g) => g.candidatesNeedingReview.length)) {
    md += `### ${g.id}\n\n${g.candidateReviewNote}\n\n`;
    for (const s of g.candidatesNeedingReview)
      md += `- \`${s.sentenceId}\`: ${s.japanese} — ${s.english}\n`;
    md += "\n";
  }
  const formatted = Bun.spawnSync(
    [
      process.execPath,
      "--bun",
      "oxfmt",
      "--stdin-filepath=docs/grammar-coverage.md",
    ],
    { cwd: root, stdin: Buffer.from(md), stdout: "pipe", stderr: "pipe" },
  );
  if (formatted.exitCode !== 0) throw new Error(formatted.stderr.toString());
  const outputs = [
    [
      "data/grammar-coverage/report.json",
      JSON.stringify(report, null, 2) + "\n",
    ],
    ["docs/grammar-coverage.md", formatted.stdout.toString()],
  ];
  const check = process.argv.includes("--check");
  for (const [file, content] of outputs) {
    const path = resolve(root, file!);
    if (check) {
      if ((await readFile(path, "utf8").catch(() => "")) !== content)
        throw new Error(`Stale ${file}; run bun run grammar:audit`);
    } else {
      await mkdir(resolve(path, ".."), { recursive: true });
      await writeFile(path, content!);
    }
  }
  console.log(
    JSON.stringify(
      {
        statusCounts: report.statusCounts,
        byLevel: report.byLevel,
        regressions: report.regressionSummary,
      },
      null,
      2,
    ),
  );
  if (check && report.regressionSummary.failed)
    throw new Error("Reviewed grammar regressions are failing");
  return report;
}

if (import.meta.main) await auditGrammar();
