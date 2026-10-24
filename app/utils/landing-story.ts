// Scroll timeline for the landing page walkthrough. Positions are in story
// units, where one unit is one viewport height of scrolling.

export const STORY_UNITS = 14;

export type StoryTarget =
  | "overview"
  | "prompt"
  | "hint"
  | "hintbox"
  | "settings"
  | "panel"
  | "difficulty"
  | "level"
  | "length"
  | "mode"
  | "writing"
  | "answer"
  | "chips"
  | "grammar"
  | "check"
  | "feedback"
  | "breakdown"
  | "tai"
  | "journal"
  | "rail";

export interface StoryChapter {
  id: string;
  start: number;
  end: number;
  kanji: string;
  eyebrow: string;
  title: string;
  body: string;
}

export const storyChapters: StoryChapter[] = [
  {
    id: "read",
    start: 1.1,
    end: 2.6,
    kanji: "読",
    eyebrow: "01 / READ",
    title: "Start with one English sentence.",
    body: "Each prompt is a real sentence, sized for a spare minute. Tap a word for a Japanese hint, or show the romaji when you need a nudge.",
  },
  {
    id: "pace",
    start: 2.6,
    end: 4.4,
    kanji: "級",
    eyebrow: "02 / SET YOUR PACE",
    title: "Begin where you feel comfortable.",
    body: "Vocabulary from N5 to N1. Short, medium, or long sentences. Kana only, kana with kanji, or the exact reference spelling.",
  },
  {
    id: "write",
    start: 4.4,
    end: 6.2,
    kanji: "字",
    eyebrow: "03 / WRITE",
    title: "Type it, or build it.",
    body: "Use your Japanese keyboard, or arrange word chips into order while you’re still finding your footing. Each mode keeps its own draft.",
  },
  {
    id: "lookup",
    start: 6.2,
    end: 7.6,
    kanji: "引",
    eyebrow: "04 / LOOK IT UP",
    title: "Grammar, right beside your draft.",
    body: "Search patterns in English, Japanese, or romaji without leaving the sentence. Close the reference and pick up where you left off.",
  },
  {
    id: "check",
    start: 7.6,
    end: 9,
    kanji: "較",
    eyebrow: "05 / COMPARE",
    title: "Check against the reference.",
    body: "See exactly which characters differ. Kana readings and verified spellings count, and you can opt in to listed alternative translations.",
  },
  {
    id: "breakdown",
    start: 9,
    end: 10.6,
    kanji: "解",
    eyebrow: "06 / UNDERSTAND",
    title: "See how the sentence fits together.",
    body: "Every word with its reading and meaning, plus the grammar that ties them together, like the ～たい that turns “drink” into “want to drink”.",
  },
  {
    id: "journal",
    start: 10.6,
    end: 12.1,
    kanji: "記",
    eyebrow: "07 / KEEP GOING",
    title: "A journal that remembers.",
    body: "Your latest attempt at every sentence stays in this browser. Revisit a breakdown or retry what didn’t land. No account. No streak to protect.",
  },
];

interface CameraKey {
  at: number;
  target: StoryTarget;
  // Fraction of the focus area the target should fill.
  fill: number;
  rotateX: number;
  rotateY: number;
  skew: number;
  // Multiplies the overview scale; only used for the "overview" target.
  zoom?: number;
}

const cameraKeys: CameraKey[] = [
  {
    at: 0,
    target: "overview",
    fill: 1,
    rotateX: 22,
    rotateY: -32,
    skew: 3,
    zoom: 1.12,
  },
  { at: 0.9, target: "overview", fill: 1, rotateX: 0, rotateY: 0, skew: 0 },
  { at: 1.5, target: "prompt", fill: 0.8, rotateX: 0, rotateY: -6, skew: 0 },
  { at: 2.2, target: "hintbox", fill: 0.8, rotateX: 4, rotateY: -8, skew: -1 },
  { at: 2.9, target: "panel", fill: 0.92, rotateX: 0, rotateY: 10, skew: 0 },
  { at: 3.3, target: "difficulty", fill: 0.6, rotateX: 0, rotateY: 8, skew: 1 },
  { at: 3.7, target: "level", fill: 0.62, rotateX: -4, rotateY: 6, skew: 1.5 },
  { at: 4.1, target: "mode", fill: 0.62, rotateX: -6, rotateY: 4, skew: 0 },
  { at: 4.7, target: "writing", fill: 0.84, rotateX: 0, rotateY: -4, skew: 0 },
  {
    at: 5.2,
    target: "answer",
    fill: 0.82,
    rotateX: 6,
    rotateY: -8,
    skew: -1.5,
  },
  { at: 5.8, target: "chips", fill: 0.82, rotateX: 4, rotateY: -6, skew: 0 },
  { at: 6.6, target: "grammar", fill: 0.82, rotateX: 0, rotateY: 6, skew: 0 },
  { at: 7.2, target: "grammar", fill: 0.92, rotateX: -4, rotateY: 3, skew: 1 },
  { at: 8, target: "check", fill: 0.6, rotateX: 0, rotateY: -6, skew: 0 },
  {
    at: 8.6,
    target: "feedback",
    fill: 0.82,
    rotateX: 4,
    rotateY: -4,
    skew: -1,
  },
  { at: 9.5, target: "breakdown", fill: 0.92, rotateX: 0, rotateY: 0, skew: 0 },
  { at: 10.2, target: "tai", fill: 0.66, rotateX: -4, rotateY: 10, skew: 1.5 },
  { at: 10.8, target: "rail", fill: 0.5, rotateX: 0, rotateY: 14, skew: 0 },
  {
    at: 11.5,
    target: "journal",
    fill: 0.9,
    rotateX: 6,
    rotateY: -10,
    skew: -1,
  },
  { at: 12.4, target: "overview", fill: 1, rotateX: 0, rotateY: 0, skew: 0 },
  {
    at: 13.2,
    target: "overview",
    fill: 1,
    rotateX: 52,
    rotateY: 0,
    skew: 0,
    zoom: 0.62,
  },
];

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Camera {
  x: number;
  y: number;
  scale: number;
  rotateX: number;
  rotateY: number;
  skew: number;
}

function ease(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

// Progress of `units` through [start, end], clamped to 0..1.
export function span(units: number, start: number, end: number) {
  return clamp((units - start) / (end - start));
}

function frame(
  key: CameraKey,
  measure: (target: StoryTarget) => Rect,
  stage: Rect,
  focus: Rect,
): Camera {
  const fit = Math.min(focus.width / stage.width, focus.height / stage.height);
  if (key.target === "overview") {
    return {
      x: stage.width / 2,
      y: stage.height / 2,
      scale: fit * 0.94 * (key.zoom ?? 1),
      rotateX: key.rotateX,
      rotateY: key.rotateY,
      skew: key.skew,
    };
  }
  const rect = measure(key.target);
  const scale = Math.min(
    (focus.width * key.fill) / rect.width,
    (focus.height * key.fill) / rect.height,
    fit * 4,
  );
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
    scale: Math.max(scale, fit),
    rotateX: key.rotateX,
    rotateY: key.rotateY,
    skew: key.skew,
  };
}

export function cameraAt(
  units: number,
  measure: (target: StoryTarget) => Rect,
  stage: Rect,
  focus: Rect,
  still = false,
): Camera {
  const next = cameraKeys.findIndex((key) => key.at > units);
  const from =
    cameraKeys[next === -1 ? cameraKeys.length - 1 : Math.max(next - 1, 0)]!;
  const to = cameraKeys[next === -1 ? cameraKeys.length - 1 : next]!;
  const a = frame(from, measure, stage, focus);
  if (from === to) return still ? flat(a) : a;
  const b = frame(to, measure, stage, focus);
  // Snap between keys when motion is reduced instead of travelling.
  const t = still
    ? Math.round(span(units, from.at, to.at))
    : ease(span(units, from.at, to.at));
  const mix = (p: number, q: number) => p + (q - p) * t;
  // Interpolate scale geometrically so zooms feel even.
  const camera = {
    x: mix(a.x, b.x),
    y: mix(a.y, b.y),
    scale: a.scale * (b.scale / a.scale) ** t,
    rotateX: mix(a.rotateX, b.rotateX),
    rotateY: mix(a.rotateY, b.rotateY),
    skew: mix(a.skew, b.skew),
  };
  return still ? flat(camera) : camera;
}

function flat(camera: Camera): Camera {
  return { ...camera, rotateX: 0, rotateY: 0, skew: 0 };
}

export const typedKana = "つめたいみずがのみたいです";
export const typedAnswer = "冷たい水が飲みたいです";
export const chipBank = ["です", "水", "飲みたい", "冷たい", "が"];
export const chipOrder = [3, 1, 4, 2, 0];

// Each entry holds its value until the story reaches `until`.
type Steps = [until: number, target: StoryTarget | null][];

const highlights: Steps = [
  [1.25, null],
  [1.85, "prompt"],
  [2.6, "hint"],
  [3.1, null],
  [3.5, "difficulty"],
  [3.9, "level"],
  [4.4, "mode"],
  [5.4, "answer"],
  [6.25, "chips"],
  [6.5, null],
  [7.6, "grammar"],
  [8.3, "check"],
  [9.1, "feedback"],
  [9.9, null],
  [10.6, "tai"],
  [11.1, "rail"],
  [12.1, "journal"],
];

const cursors: Steps = [
  [1.9, null],
  [2.6, "hint"],
  [3.6, "settings"],
  [3.95, "level"],
  [4.4, "mode"],
  [5.35, null],
  [6.2, "chips"],
  [7.6, "grammar"],
  [8.4, "check"],
  [10.65, null],
  [11.1, "rail"],
];

function stepAt(steps: Steps, units: number) {
  return steps.find(([until]) => units < until)?.[1] ?? null;
}

export interface ReplicaState {
  tab: "practice" | "journal";
  settingsOpen: boolean;
  level: string;
  mode: "kana" | "mixed" | "exact";
  hintOpen: boolean;
  romaji: boolean;
  input: "type" | "chips";
  typed: string;
  composing: boolean;
  chipsPlaced: number;
  grammarOpen: boolean;
  query: string;
  checked: boolean;
  breakdown: number;
  highlight: StoryTarget | null;
  cursor: StoryTarget | null;
  pressing: boolean;
}

export function replicaAt(units: number): ReplicaState {
  const u = units;
  const typing = span(u, 4.55, 5.2);
  const kanaCount = Math.round(typing * typedKana.length);
  const query = "want to";
  const queryCount = Math.round(span(u, 6.55, 6.95) * query.length);
  const highlight = stepAt(highlights, u);
  const cursor = stepAt(cursors, u);
  return {
    tab: u >= 10.95 ? "journal" : "practice",
    settingsOpen: u >= 2.75 && u < 4.4,
    level: u >= 3.75 ? "N5" : "N4",
    mode: u >= 4.15 ? "mixed" : "kana",
    hintOpen: u >= 2 && u < 2.75,
    romaji: u >= 2.3 && u < 4.4,
    input: u >= 5.4 ? "chips" : "type",
    typed:
      typing >= 1 && u >= 5.25 ? typedAnswer : typedKana.slice(0, kanaCount),
    composing: kanaCount > 0 && u < 5.25,
    chipsPlaced: Math.round(span(u, 5.55, 6.1) * chipOrder.length),
    grammarOpen: u >= 6.35 && u < 7.6,
    query: query.slice(0, queryCount),
    checked: u >= 8.15,
    breakdown: Math.round(span(u, 9.05, 9.7) * 5),
    highlight,
    cursor,
    pressing:
      [2.05, 2.8, 3.8, 4.15, 8.1, 10.95].some(
        (at) => Math.abs(u - at) < 0.06,
      ) ||
      (u > 5.55 && u < 6.1 && (u * 9) % 1 < 0.25),
  };
}
