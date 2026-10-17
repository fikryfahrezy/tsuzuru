import type { AnswerBreakdownPart, Level } from "./practice";

export interface GrammarEntry {
  id: string;
  pattern: string;
  romaji: string;
  level: Level;
  meaning: string;
  formation: string;
  notes?: string;
  tags: string[];
  examples: { ja: string; en: string; furigana?: string }[];
}

// A lesson linked to a particular occurrence in the reference answer.
export interface GrammarExplanation {
  id: string;
  japanese: string;
  start: number;
  end: number;
  pattern: string;
  meaning: string;
  formation: string;
  notes?: string;
  example?: { ja: string; en: string };
}

export function isGrammarExplanation(
  value: unknown,
): value is GrammarExplanation {
  if (!value || typeof value !== "object") return false;
  const entry = value as GrammarExplanation;
  return (
    [
      entry.id,
      entry.japanese,
      entry.pattern,
      entry.meaning,
      entry.formation,
    ].every((text) => typeof text === "string" && !!text.trim()) &&
    Number.isInteger(entry.start) &&
    entry.start >= 0 &&
    Number.isInteger(entry.end) &&
    entry.end > entry.start &&
    (entry.notes === undefined || typeof entry.notes === "string") &&
    (entry.example === undefined ||
      (!!entry.example &&
        typeof entry.example.ja === "string" &&
        typeof entry.example.en === "string"))
  );
}

// Preserve first occurrence order while showing each lesson only once.
export function grammarForBreakdown(
  entries: GrammarEntry[],
  parts: AnswerBreakdownPart[],
): GrammarEntry[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const ids = new Set(
    parts.flatMap((part) => (part.grammar ?? []).map((entry) => entry.id)),
  );
  return [...ids].flatMap((id) => {
    const entry = byId.get(id);
    return entry ? [entry] : [];
  });
}

// Tsuzuru browsing categories mapped from OpenJLPT's original topic tags.
// Entries may appear in several topics; upstream lesson text is unchanged.
export const grammarTopics = [
  {
    id: "structure",
    label: "Particles & sentence structure",
    tags: [
      "particle",
      "topic",
      "copula",
      "nominalization",
      "demonstrative",
      "relation",
    ],
  },
  {
    id: "time",
    label: "Time & sequence",
    tags: [
      "time",
      "sequence",
      "simultaneity",
      "tense",
      "completion",
      "experience",
      "recollection",
    ],
  },
  {
    id: "reason",
    label: "Reasons & purposes",
    tags: ["reason", "purpose", "result", "means"],
  },
  {
    id: "condition",
    label: "Conditions & contrast",
    tags: ["condition", "concession", "contrast"],
  },
  {
    id: "intention",
    label: "Wishes & intentions",
    tags: ["desire", "wish", "intention", "decision", "attempt"],
  },
  {
    id: "obligation",
    label: "Permission & obligation",
    tags: ["permission", "obligation", "necessity", "prohibition", "command"],
  },
  {
    id: "comparison",
    label: "Comparisons & degree",
    tags: [
      "comparison",
      "degree",
      "quantity",
      "range",
      "limitation",
      "exclusion",
      "emphasis",
      "addition",
      "example",
    ],
  },
  {
    id: "possibility",
    label: "Possibility & certainty",
    tags: ["possibility", "conjecture", "appearance", "hearsay", "ability"],
  },
  { id: "giving", label: "Giving & receiving", tags: ["giving-receiving"] },
  {
    id: "politeness",
    label: "Politeness & formal language",
    tags: ["politeness", "honorific", "humble", "formal", "written", "casual"],
  },
  {
    id: "requests",
    label: "Requests & suggestions",
    tags: ["request", "advice", "suggestion", "invitation"],
  },
  {
    id: "actions",
    label: "Actions, states & verb forms",
    tags: [
      "conjugation",
      "voice",
      "negation",
      "change",
      "state",
      "manner",
      "tendency",
    ],
  },
  {
    id: "expression",
    label: "Feelings, questions & opinions",
    tags: [
      "emotion",
      "surprise",
      "regret",
      "criticism",
      "question",
      "quotation",
      "standpoint",
      "exclamation",
    ],
  },
] as const;

export type GrammarTopic = (typeof grammarTopics)[number]["id"];

export function topicsForGrammar(entry: GrammarEntry) {
  return grammarTopics.filter((topic) =>
    topic.tags.some((tag) => entry.tags.includes(tag)),
  );
}

// Original search aids; source lesson text remains unchanged.
const aliases: Record<string, string> = {
  tai: "want to wish desire",
  "ga-hoshii": "want something wish desire",
  "te-hoshii": "want someone to",
  "kara-reason": "because since reason",
  node: "because since reason",
  "te-mo-ii": "allowed to permission may can",
  "te-mo-kamawanai": "allowed to permission may can",
  "te-wa-ikenai": "must not forbidden not allowed to",
  "nakereba-naranai-nakute-wa-ikenai": "must have to need to obligation",
  "nai-to-ikenai-nakucha": "must have to need to obligation",
  "nakute-mo-ii": "do not have to don't have to need not",
  "mou-ta": "already did already done finished",
  "ta-koto-ga-aru": "have done have ever experience",
  "mada-te-inai": "not yet haven't yet",
  "te-iru": "currently doing ongoing action",
  "te-kudasai": "please request",
  "koto-ga-dekiru": "can able to ability",
  "eru-rareru-potential": "can able to ability",
  "hou-ga-ii": "should advice ought to",
  tsumori: "going to intend plan to",
  nagara: "while doing at the same time",
};

export function normalizeGrammarSearch(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[〜~～]/g, "")
    .replace(/[’']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchGrammar(
  entries: GrammarEntry[],
  query: string,
  level: Level | "all",
  topic: GrammarTopic | "all" = "all",
): GrammarEntry[] {
  const terms = normalizeGrammarSearch(query).split(" ").filter(Boolean);
  return entries.filter((entry) => {
    if (level !== "all" && entry.level !== level) return false;
    if (
      topic !== "all" &&
      !topicsForGrammar(entry).some((group) => group.id === topic)
    )
      return false;
    const text = normalizeGrammarSearch(
      [
        entry.pattern,
        entry.romaji,
        entry.meaning,
        entry.formation,
        entry.notes,
        ...entry.tags,
        aliases[entry.id] ?? "",
      ].join(" "),
    );
    return terms.every((term) => text.includes(term));
  });
}

export function furiganaParts(text: string) {
  return text
    .split(/(\{[^{}]+\|[^{}]+\})/g)
    .filter(Boolean)
    .map((part) => {
      const match = /^\{([^{}]+)\|([^{}]+)\}$/.exec(part);
      return { text: match?.[1] ?? part, reading: match?.[2] };
    });
}
