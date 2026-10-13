import {
  hiragana,
  normalize,
  parts,
  validReadings,
  type Candidate,
  type DifferencePart,
  type Strictness,
  type DifferenceDetails,
  type WritingEdit,
} from "./practice";

type Edge = { from: number; character: string };
type Operation = {
  kind: DifferencePart["kind"];
  answerIndex: number;
  expected: string;
};

// A graph represents all accepted spellings without enumerating every kanji/kana combination.
function spellingGraph(candidate: Candidate, mode: Strictness): Edge[][] {
  const graph: Edge[][] = [[]];
  const fold = (text: string) =>
    mode === "exact" ? normalize(text) : hiragana(normalize(text));
  function append(start: number, options: string[]): number {
    const ends: number[] = [];
    for (const option of new Set(options.map(fold))) {
      let node = start;
      for (const character of option) {
        graph.push([{ from: node, character }]);
        node = graph.length - 1;
      }
      ends.push(node);
    }
    graph.push(ends.map((from) => ({ from, character: "" })));
    return graph.length - 1;
  }
  if (mode === "exact") append(0, [candidate.japanese]);
  else {
    const ends: number[] = [];
    for (const reading of validReadings(candidate)) {
      let node = 0;
      for (const part of parts(reading))
        node = append(
          node,
          mode === "kana" ? [part.reading] : [part.surface, part.reading],
        );
      ends.push(node);
    }
    // No annotated reading: still provide an informative reference difference.
    if (!ends.length) ends.push(append(0, [candidate.japanese]));
    graph.push(ends.map((from) => ({ from, character: "" })));
  }
  return graph;
}

export function writingDifferences(
  candidate: Candidate,
  answer: string,
  mode: Strictness,
): DifferenceDetails {
  const graphemes = [
    ...new Intl.Segmenter("ja", { granularity: "grapheme" }).segment(answer),
  ].map((segment) => segment.segment);
  const characters: { text: string; original: number }[] = [];
  graphemes.forEach((text, original) => {
    const normalized =
      mode === "exact" ? normalize(text) : hiragana(normalize(text));
    for (const character of normalized)
      characters.push({ text: character, original });
  });
  const graph = spellingGraph(candidate, mode);
  const width = characters.length + 1;
  const distances = graph.map(() => new Uint32Array(width));
  const previous = graph.map(() => new Int32Array(width));
  const steps = graph.map(() => new Uint8Array(width));
  const edgeCharacters = graph.map(() =>
    Array.from({ length: width }, () => ""),
  );
  // Steps: 1 extra input, 2 missing expected, 3 match/change, 4 epsilon.
  for (let j = 1; j < width; j++) {
    distances[0]![j] = j;
    steps[0]![j] = 1;
  }
  for (let node = 1; node < graph.length; node++) {
    for (let j = 0; j < width; j++) {
      let best = Infinity;
      for (const edge of graph[node]!) {
        const same = j > 0 && characters[j - 1]!.text === edge.character;
        const score = edge.character
          ? j > 0
            ? distances[edge.from]![j - 1]! + (same ? 0 : 1)
            : Infinity
          : distances[edge.from]![j]!;
        if (score < best) {
          best = score;
          previous[node]![j] = edge.from;
          steps[node]![j] = edge.character ? 3 : 4;
          edgeCharacters[node]![j] = edge.character;
        }
        if (edge.character && distances[edge.from]![j]! + 1 < best) {
          best = distances[edge.from]![j]! + 1;
          previous[node]![j] = edge.from;
          steps[node]![j] = 2;
          edgeCharacters[node]![j] = edge.character;
        }
      }
      if (j > 0 && distances[node]![j - 1]! + 1 < best) {
        best = distances[node]![j - 1]! + 1;
        previous[node]![j] = node;
        steps[node]![j] = 1;
        edgeCharacters[node]![j] = "";
      }
      distances[node]![j] = best;
    }
  }
  const operations: Operation[] = [];
  let node = graph.length - 1;
  let j = characters.length;
  while (node !== 0 || j !== 0) {
    const step = steps[node]![j];
    const from = previous[node]![j]!;
    const expected = edgeCharacters[node]![j]!;
    if (step === 4) node = from;
    else if (step === 1) {
      operations.push({ kind: "extra", answerIndex: j - 1, expected: "" });
      j--;
    } else if (step === 2) {
      operations.push({ kind: "missing", answerIndex: j, expected });
      node = from;
    } else if (step === 3) {
      operations.push({
        kind: characters[j - 1]!.text === expected ? "same" : "changed",
        answerIndex: j - 1,
        expected,
      });
      j--;
      node = from;
    } else throw new Error("Invalid spelling alignment");
  }
  operations.reverse();
  const edits: WritingEdit[] = [];
  for (let start = 0; start < operations.length;) {
    if (operations[start]!.kind === "same") {
      start++;
      continue;
    }
    let end = start;
    while (end < operations.length && operations[end]!.kind !== "same") end++;
    const run = operations.slice(start, end);
    const originalIndexes = new Set(
      run
        .filter((op) => op.kind !== "missing")
        .map((op) => characters[op.answerIndex]!.original),
    );
    const expected = run.map((op) => op.expected).join("");
    const before = [
      ...operations
        .slice(0, start)
        .map((op) => op.expected)
        .join(""),
    ]
      .slice(-8)
      .join("");
    const after = [
      ...operations
        .slice(end)
        .map((op) => op.expected)
        .join(""),
    ]
      .slice(0, 8)
      .join("");
    edits.push({
      actual: [...originalIndexes].map((index) => graphemes[index]).join(""),
      expected,
      context: `${before}〔${expected || "∅"}〕${after}`,
    });
    start = end;
  }
  const statuses = graphemes.map((): DifferencePart["kind"] => "same");
  const missing = new Map<number, string[]>();
  const expectedParts: DifferencePart[] = [];
  for (const operation of operations) {
    if (operation.kind === "missing") {
      const at =
        characters[operation.answerIndex]?.original ??
        (characters.at(-1)?.original ?? -1) + 1;
      missing.set(at, [...(missing.get(at) ?? []), operation.expected]);
    } else {
      const index = characters[operation.answerIndex]!.original;
      if (operation.kind !== "same") statuses[index] = operation.kind;
    }
    if (operation.expected)
      expectedParts.push({
        text: operation.expected,
        kind:
          operation.kind === "same"
            ? "same"
            : operation.kind === "missing"
              ? "missing"
              : "changed",
      });
  }
  const answerParts: DifferencePart[] = [];
  for (let index = 0; index <= graphemes.length; index++) {
    for (const expected of missing.get(index) ?? [])
      answerParts.push({ text: "□", kind: "missing", expected });
    if (index < graphemes.length)
      answerParts.push({ text: graphemes[index]!, kind: statuses[index]! });
  }
  return { answer: answerParts, expected: expectedParts, edits };
}
