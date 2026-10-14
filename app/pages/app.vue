<script setup lang="ts">
import { definePageMeta, useHead, useSeoMeta, useRoute } from "#imports";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { $fetch } from "ofetch";
import {
  levels,
  normalize,
  Level,
  isLevel,
  isLength,
  isStrictness,
  isDifferenceKind,
  DifferenceKind,
  Length,
  Strictness,
  type Question,
  type Comparison,
} from "#shared/practice";

definePageMeta({ alias: ["/practice"] });
useHead({
  link: [
    { rel: "manifest", href: "/app/manifest.webmanifest" },
    { rel: "apple-touch-icon", href: "/app/icons/apple-touch-icon.png" },
  ],
  meta: [
    { name: "theme-color", content: "#b93327" },
    { name: "apple-mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-title", content: "Tsuzuru" },
  ],
});
useSeoMeta({
  title: "Practice Japanese — Tsuzuru",
  description:
    "Choose a vocabulary level and sentence length, write in Japanese, and compare your writing with a reference.",
});

enum JournalOutcome {
  Matched = "matched",
  Unmatched = "unmatched",
  Revealed = "revealed",
}

enum PracticeTab {
  Practice = "practice",
  Journal = "journal",
}

type Entry = {
  id: string;
  english: string;
  answer: string;
  reference: string;
  outcome: JournalOutcome;
  date: string;
  level: Level;
  mode?: Strictness;
  comparison?: Comparison | null;
};
const level = ref<Level>(Level.N5);
const length = ref<Length>(Length.Short);
const mode = ref<Strictness>(Strictness.Flexible);
const tab = ref<PracticeTab>(PracticeTab.Practice);
const settingsOpen = ref(false);
const showRomaji = ref(false);
const route = useRoute();
const sentence = computed(() =>
  typeof route.query.sentence === "string"
    ? route.query.sentence
    : route.query.sentence === undefined
      ? undefined
      : "",
);
const question = ref<Question | null>(null);
const selectedWord = ref<number | null>(null);
const activeWord = computed(() =>
  selectedWord.value === null
    ? null
    : (question.value?.wordHints[selectedWord.value] ?? null),
);
function closeWordHint() {
  const previous = selectedWord.value;
  selectedWord.value = null;
  if (previous !== null)
    void nextTick(() =>
      document.getElementById(`prompt-word-${previous}`)?.focus(),
    );
}
function hasKanji(text: string): boolean {
  return /\p{Script=Han}/u.test(text);
}
const answer = ref("");
const result = ref<Comparison | null>(null);
const revealed = ref(false);
const loading = ref(true);
const checking = ref(false);
const error = ref("");
const storageNote = ref("");
const journal = ref<Entry[]>([]);
const ready = ref(false);
const online = ref(true);
function updateConnection() {
  online.value = navigator.onLine;
}
const field = ref<HTMLTextAreaElement | null>(null);
const resultStatus = ref<HTMLElement | null>(null);
const displayedReference = computed(() =>
  result.value?.differences && !revealed.value
    ? result.value.differences.expected.map((part) => part.text).join("")
    : (result.value?.reference ?? ""),
);
let request = 0;
const modeHelp = computed(
  () =>
    ({
      [Strictness.Kana]:
        "Write entirely in hiragana or katakana. Kanji is not accepted in this mode.",
      [Strictness.Flexible]:
        "Use the reference kanji, their kana readings, or a mixture of both.",
      [Strictness.Exact]: "Match the reference’s kanji and kana spelling.",
    })[mode.value],
);
const lengthOptions = [
  { value: Length.Short, label: "Short", note: "1–7 words" },
  { value: Length.Medium, label: "Medium", note: "8–12 words" },
  { value: Length.Long, label: "Long", note: "13+ words" },
] as const;
const modes = [
  { value: Strictness.Kana, label: "Kana only", mark: "あ" },
  { value: Strictness.Flexible, label: "Kana + kanji", mark: "あ漢" },
  { value: Strictness.Exact, label: "Exact writing", mark: "漢" },
] as const;

function persist() {
  if (!ready.value) return;
  try {
    localStorage.setItem(
      "tsuzuru.practice.v1",
      JSON.stringify({
        level: level.value,
        length: length.value,
        mode: mode.value,
        showRomaji: showRomaji.value,
        journal: journal.value,
      }),
    );
  } catch {
    storageNote.value =
      "Browser storage is unavailable. Your progress will last for this session only.";
  }
}

async function loadQuestion() {
  const sequence = ++request;
  const previous = question.value?.id;
  question.value = null;
  selectedWord.value = null;
  result.value = null;
  answer.value = "";
  revealed.value = false;
  error.value = "";
  loading.value = true;
  try {
    const next = await $fetch<Question>("/api/exercises", {
      query: {
        level: level.value,
        length: length.value,
        previous,
        sentence: sentence.value,
      },
    });
    if (sequence !== request) return;
    question.value = next;
  } catch {
    if (sequence === request)
      error.value =
        sentence.value !== undefined
          ? "We couldn’t load the requested sentence. Check the sentence ID or return to random practice."
          : "We couldn’t load a sentence. Please try again.";
  } finally {
    if (sequence === request) loading.value = false;
  }
}

async function submit(reveal = false) {
  const current = question.value;
  const sequence = request;
  if (
    !current ||
    checking.value ||
    result.value ||
    (!reveal && !answer.value.trim())
  )
    return;
  checking.value = true;
  error.value = "";
  try {
    const comparison = await $fetch<Comparison>("/api/compare", {
      method: "POST",
      body: {
        id: current.id,
        answer: reveal ? "__reveal__" : answer.value,
        mode: mode.value,
      },
    });
    if (sequence !== request || current.id !== question.value?.id) return;
    result.value = comparison;
    revealed.value = reveal;
    journal.value = [
      {
        id: `${current.id}-${Date.now()}`,
        english: current.english,
        answer: reveal ? "" : answer.value,
        reference: comparison.reference,
        outcome: reveal
          ? JournalOutcome.Revealed
          : comparison.matched
            ? JournalOutcome.Matched
            : JournalOutcome.Unmatched,
        date: new Date().toISOString(),
        level: level.value,
        mode: mode.value,
        comparison: reveal
          ? { ...comparison, differences: null, explanations: [] }
          : comparison,
      },
      ...journal.value,
    ].slice(0, 100);
    persist();
    await nextTick();
    if (sequence === request) resultStatus.value?.focus();
  } catch {
    error.value =
      "We couldn’t compare your answer. Your writing is still here; please try again.";
  } finally {
    checking.value = false;
  }
}

async function nextSentence() {
  await loadQuestion();
  await nextTick();
  field.value?.focus();
}
function shortcut(event: KeyboardEvent) {
  if (
    event.isComposing ||
    !(event.metaKey || event.ctrlKey) ||
    event.key !== "Enter"
  )
    return;
  event.preventDefault();
  if (result.value) void nextSentence();
  else void submit();
}
function resetJournal() {
  journal.value = [];
  persist();
}
function restoreComparison(value: unknown): Comparison | null {
  if (!value || typeof value !== "object") return null;
  const saved = value as Comparison;
  if (
    typeof saved.matched !== "boolean" ||
    typeof saved.reference !== "string" ||
    typeof saved.kana !== "string"
  )
    return null;
  if (saved.differences !== null) {
    if (
      !saved.differences ||
      !Array.isArray(saved.differences.answer) ||
      !Array.isArray(saved.differences.expected)
    )
      return null;
    const valid = [
      ...saved.differences.answer,
      ...saved.differences.expected,
    ].every(
      (part) =>
        part &&
        typeof part.text === "string" &&
        isDifferenceKind(part.kind) &&
        (part.expected === undefined || typeof part.expected === "string"),
    );
    if (!valid) return null;
  }
  return {
    ...saved,
    explanations: Array.isArray(saved.explanations)
      ? saved.explanations.filter(
          (explanation) =>
            explanation &&
            typeof explanation.title === "string" &&
            typeof explanation.detail === "string" &&
            typeof explanation.actual === "string" &&
            typeof explanation.expected === "string" &&
            (explanation.context === undefined ||
              typeof explanation.context === "string"),
        )
      : [],
    sourceUrl:
      typeof saved.sourceUrl === "string" &&
      /^https:\/\/tatoeba\.org\/sentences\/show\/\d+$/.test(saved.sourceUrl)
        ? saved.sourceUrl
        : null,
  };
}
onMounted(() => {
  updateConnection();
  window.addEventListener("online", updateConnection);
  window.addEventListener("offline", updateConnection);
  try {
    const saved = JSON.parse(
      localStorage.getItem("tsuzuru.practice.v1") ?? "null",
    );
    if (saved && typeof saved === "object") {
      if (isLevel(saved.level)) level.value = saved.level;
      if (isLength(saved.length)) length.value = saved.length;
      if (isStrictness(saved.mode)) mode.value = saved.mode;
      if (typeof saved.showRomaji === "boolean")
        showRomaji.value = saved.showRomaji;
      if (Array.isArray(saved.journal))
        journal.value = saved.journal
          .filter((entry: unknown): entry is Entry => {
            if (!entry || typeof entry !== "object") return false;
            const row = entry as Entry;
            return (
              typeof row.id === "string" &&
              typeof row.english === "string" &&
              typeof row.answer === "string" &&
              typeof row.reference === "string" &&
              typeof row.date === "string" &&
              Number.isFinite(Date.parse(row.date)) &&
              isLevel(row.level) &&
              Object.values(JournalOutcome).includes(row.outcome)
            );
          })
          .map((entry: Entry) => ({
            ...entry,
            mode: modes.some((item) => item.value === entry.mode)
              ? entry.mode
              : undefined,
            comparison: restoreComparison(entry.comparison),
          }))
          .slice(0, 100);
    }
  } catch {
    storageNote.value =
      "Saved progress couldn’t be read. You can keep practicing in this session.";
  }
  ready.value = true;
  void loadQuestion();
});
onUnmounted(() => {
  window.removeEventListener("online", updateConnection);
  window.removeEventListener("offline", updateConnection);
});
watch([level, length], () => {
  if (ready.value) {
    persist();
    void loadQuestion();
  }
});
watch(mode, () => {
  if (ready.value) {
    result.value = null;
    revealed.value = false;
    persist();
  }
});
watch(showRomaji, persist);
watch(sentence, () => {
  if (ready.value) void loadQuestion();
});
</script>

<template>
  <div class="practice-shell">
    <aside class="workspace-rail" aria-label="Workspace navigation">
      <NuxtLink
        class="workspace-home"
        to="/"
        aria-label="Tsuzuru home"
        title="Back to home"
      >
        <span class="brand-mark" lang="ja">綴</span>
      </NuxtLink>
      <nav aria-label="Main navigation">
        <button
          :class="{ active: tab === PracticeTab.Practice }"
          :aria-pressed="tab === PracticeTab.Practice"
          @click="
            tab = PracticeTab.Practice;
            settingsOpen = false;
          "
        >
          <span class="rail-mark" lang="ja" aria-hidden="true">文</span>
          <span>Practice</span>
        </button>
        <button
          :class="{ active: tab === PracticeTab.Journal }"
          :aria-pressed="tab === PracticeTab.Journal"
          @click="
            tab = PracticeTab.Journal;
            settingsOpen = false;
          "
        >
          <span class="rail-mark" lang="ja" aria-hidden="true">記</span>
          <span>
            Journal
            <span class="nav-count">{{ journal.length }}</span>
          </span>
        </button>
      </nav>
      <NuxtLink
        class="workspace-credits"
        to="/sources"
        title="Data and credits"
      >
        <span aria-hidden="true">ⓘ</span>
        <span>Credits</span>
      </NuxtLink>
    </aside>
    <main class="workspace practice-workspace">
      <header class="workspace-heading">
        <div>
          <h1>
            {{
              tab === PracticeTab.Practice
                ? "Sentence practice"
                : "Practice journal"
            }}
          </h1>
        </div>
        <button
          v-if="tab === PracticeTab.Practice"
          class="settings-toggle"
          :aria-expanded="settingsOpen"
          aria-controls="practice-settings"
          @click="settingsOpen = !settingsOpen"
        >
          {{ settingsOpen ? "Close settings ×" : "Settings ☰" }}
        </button>
      </header>
      <p v-if="storageNote" class="notice" role="status">{{ storageNote }}</p>
      <p v-if="!online" class="notice" role="status">
        You’re offline. Your saved journal is available. Connect to load
        sentences and check answers.
      </p>
      <div v-if="tab === PracticeTab.Practice" class="practice-layout">
        <button
          v-if="settingsOpen"
          class="settings-scrim"
          aria-label="Close settings"
          @click="settingsOpen = false"
        ></button>
        <aside
          id="practice-settings"
          class="settings-panel"
          :class="{ 'settings-open': settingsOpen }"
          aria-label="Practice settings"
        >
          <div v-if="sentence !== undefined" class="selected-sentence-note">
            <p class="setting-note">
              Practicing a selected sentence. Level and length apply to random
              practice.
            </p>
            <NuxtLink to="/app" @click="settingsOpen = false">
              Return to random practice
            </NuxtLink>
          </div>
          <fieldset v-if="sentence === undefined" :disabled="checking">
            <legend>Vocabulary level</legend>
            <div class="levels">
              <button
                v-for="item in levels"
                :key="item"
                :aria-pressed="level === item"
                :class="{ selected: level === item }"
                @click="level = item"
              >
                {{ item }}
              </button>
            </div>
          </fieldset>
          <fieldset v-if="sentence === undefined" :disabled="checking">
            <legend>Sentence length</legend>
            <div class="length-options">
              <button
                v-for="item in lengthOptions"
                :key="item.value"
                :aria-pressed="length === item.value"
                :class="{ selected: length === item.value }"
                @click="length = item.value"
              >
                <span>{{ item.label }}</span>
                <small>{{ item.note }}</small>
              </button>
            </div>
            <p class="setting-note">Measured in English words.</p>
          </fieldset>
          <fieldset :disabled="checking">
            <legend>Writing mode</legend>
            <div class="mode-options">
              <button
                v-for="item in modes"
                :key="item.value"
                :aria-pressed="mode === item.value"
                :class="{ selected: mode === item.value }"
                @click="mode = item.value"
              >
                <span class="mode-mark" lang="ja">{{ item.mark }}</span>
                <span>{{ item.label }}</span>
                <span class="radio-mark" aria-hidden="true">
                  {{ mode === item.value ? "●" : "○" }}
                </span>
              </button>
            </div>
            <p class="setting-note">{{ modeHelp }}</p>
          </fieldset>
        </aside>
        <section
          class="writing-card"
          aria-label="Sentence practice"
          :aria-busy="loading || checking"
          @keydown="shortcut"
        >
          <div class="prompt">
            <p class="paper-label">TRANSLATE INTO JAPANESE</p>
            <h2 v-if="question" class="english-prompt">
              <template
                v-for="(part, index) in question.wordHints"
                :key="index"
              >
                <button
                  v-if="part.isWord"
                  type="button"
                  class="prompt-word"
                  :id="`prompt-word-${index}`"
                  :class="{ 'prompt-word-active': selectedWord === index }"
                  :aria-expanded="selectedWord === index"
                  aria-controls="word-hint"
                  :aria-label="`Japanese hint for ${part.text}`"
                  @click="selectedWord = selectedWord === index ? null : index"
                  @keydown.esc="closeWordHint"
                >
                  {{ part.text }}
                </button>
                <template v-else>{{ part.text }}</template>
              </template>
            </h2>
            <h2 v-else>
              {{ loading ? "Loading sentence…" : "Sentence unavailable." }}
            </h2>
            <section
              v-if="activeWord"
              id="word-hint"
              class="word-hint"
              aria-label="Japanese word hint"
              aria-live="polite"
              @keydown.esc="closeWordHint"
            >
              <div class="word-hint-heading">
                <p class="paper-label">JAPANESE HINT · {{ activeWord.text }}</p>
                <button
                  type="button"
                  aria-label="Close word hint"
                  @click="closeWordHint"
                >
                  ×
                </button>
              </div>
              <ul v-if="activeWord.hints.length">
                <li v-for="hint in activeWord.hints" :key="hint.japanese">
                  <span class="word-hint-word">
                    <span class="word-hint-japanese" lang="ja">
                      {{ hint.japanese }}
                    </span>
                    <span
                      v-if="hasKanji(hint.japanese) && hint.reading"
                      class="word-hint-reading"
                    >
                      <span lang="ja">{{ hint.reading }}</span>
                      <span aria-hidden="true">·</span>
                      <span lang="ja-Latn">{{ hint.romaji }}</span>
                    </span>
                  </span>
                  <span>{{ hint.meaning }}</span>
                </li>
              </ul>
              <p v-else class="word-hint-empty">
                No vocabulary hint available for this word. It may be expressed
                through a phrase, grammar, or context in Japanese.
              </p>
              <p v-if="activeWord.hints.length" class="setting-note">
                Dictionary meanings; the wording used in this sentence may
                differ.
              </p>
            </section>
            <div v-if="question" class="prompt-meta">
              <button
                type="button"
                :aria-pressed="showRomaji"
                aria-controls="romaji-hint"
                @click="showRomaji = !showRomaji"
              >
                {{ showRomaji ? "Hide romaji hint" : "Show romaji hint" }}
              </button>
              <button :disabled="checking" @click="loadQuestion">
                Another sentence ↻
              </button>
            </div>
            <div
              v-if="question"
              id="romaji-hint"
              class="romaji-hint"
              :hidden="!showRomaji"
            >
              <p class="paper-label">REFERENCE IN ROMAJI</p>
              <p lang="ja-Latn">{{ question.romaji }}</p>
              <small>
                Kana spelling in Latin letters; other translations may also be
                valid.
              </small>
            </div>
          </div>
          <form @submit.prevent="submit()">
            <div class="writing-field">
              <label class="paper-label" for="answer">YOUR JAPANESE</label>
              <textarea
                v-if="!result || revealed"
                id="answer"
                ref="field"
                v-model="answer"
                lang="ja"
                placeholder="ここに書いてください。"
                :disabled="loading || !question || checking"
                :readonly="!!result"
                maxlength="2000"
                autocomplete="off"
                spellcheck="false"
                aria-describedby="writing-help"
              ></textarea>
              <div
                v-else
                class="answer-review"
                lang="ja"
                aria-label="Your checked answer"
              >
                <template v-if="result.matched">{{ answer }}</template>
                <template v-else>
                  <span
                    v-for="(part, index) in result.differences?.answer"
                    :key="index"
                    :class="`difference-${part.kind}`"
                    :title="
                      part.kind === DifferenceKind.Missing
                        ? `Missing: ${part.expected}`
                        : part.kind === DifferenceKind.Extra
                          ? 'Extra character'
                          : part.kind === DifferenceKind.Changed
                            ? 'Different from reference'
                            : undefined
                    "
                  >
                    {{ part.text }}
                  </span>
                </template>
              </div>
            </div>
            <div class="card-actions">
              <p v-if="!result || revealed" id="writing-help">
                Ctrl / ⌘ + Enter
              </p>
              <p
                v-else
                class="writing-status"
                ref="resultStatus"
                tabindex="-1"
                :class="{ 'writing-status-matched': result.matched }"
                role="status"
              >
                {{
                  result.matched
                    ? "✓ Matches the reference"
                    : "× Does not match the reference"
                }}
              </p>
              <button
                v-if="!result"
                class="primary-button"
                type="submit"
                :disabled="!question || !answer.trim() || loading || checking"
              >
                {{ checking ? "Comparing…" : "Check writing" }}
                <span>→</span>
              </button>
              <button
                v-else
                class="primary-button"
                type="button"
                @click="nextSentence"
              >
                Next sentence
                <span>→</span>
              </button>
            </div>
          </form>
          <div v-if="error" class="error-message" role="alert">
            {{ error }}
            <button v-if="!question" @click="loadQuestion">Try again ↻</button>
          </div>
          <section
            v-if="result"
            class="feedback"
            :class="{ matched: result.matched && !revealed }"
            aria-live="polite"
          >
            <p class="eyebrow">
              {{
                !revealed && !result.matched
                  ? "EXPECTED WRITING"
                  : "REFERENCE ANSWER"
              }}
            </p>
            <p v-if="!result.matched && !revealed" class="feedback-note">
              Highlighted characters differ; □ marks missing characters. Other
              translations may still be valid.
            </p>
            <p
              v-if="!revealed && !result.matched"
              class="reference-text difference-reference"
              lang="ja"
            >
              <span
                v-for="(part, index) in result.differences?.expected"
                :key="index"
                :class="`difference-${part.kind}`"
              >
                {{ part.text }}
              </span>
            </p>
            <p v-else class="reference-text" lang="ja">
              {{ result.reference }}
            </p>
            <p
              v-if="
                result.kana &&
                normalize(result.kana) !== normalize(displayedReference)
              "
              class="reading-text"
              lang="ja"
            >
              {{ result.kana }}
            </p>
            <a
              v-if="result.sourceUrl"
              :href="result.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              Sentence &amp; contributors on Tatoeba ↗
            </a>
            <WritingExplanations
              v-if="!revealed && !result.matched"
              :explanations="result.explanations ?? []"
            />
          </section>
          <div v-else-if="question" class="below-paper">
            <button :disabled="checking" @click="submit(true)">
              Show reference ↗
            </button>
          </div>
        </section>
      </div>
      <section v-else class="journal-panel">
        <div class="card-heading">
          <span class="eyebrow">YOUR LAST 100 SENTENCES</span>
          <button v-if="journal.length" @click="resetJournal">
            Clear journal
          </button>
        </div>
        <div v-if="!journal.length" class="empty-journal">
          <h2>No journal entries yet.</h2>
          <p>
            Your writing and references will appear here after you practice.
          </p>
          <button class="primary-button" @click="tab = PracticeTab.Practice">
            Start writing →
          </button>
        </div>
        <article v-for="entry in journal" :key="entry.id" class="journal-entry">
          <div class="journal-meta">
            <span>
              {{ entry.level }}
              <template v-if="entry.mode">
                ·
                {{ modes.find((item) => item.value === entry.mode)?.label }}
              </template>
              ·
              {{
                new Date(entry.date).toLocaleDateString("en", {
                  month: "short",
                  day: "numeric",
                })
              }}
            </span>
            <span
              class="journal-outcome"
              :class="{
                'success-text': entry.outcome === JournalOutcome.Matched,
                unmatched: entry.outcome === JournalOutcome.Unmatched,
              }"
            >
              {{
                entry.outcome === JournalOutcome.Matched
                  ? "✓ Matches the reference"
                  : entry.outcome === JournalOutcome.Revealed
                    ? "Reference viewed"
                    : "× Does not match the reference"
              }}
            </span>
          </div>
          <h2>{{ entry.english }}</h2>
          <p v-if="entry.answer" class="journal-answer" lang="ja">
            <template
              v-if="
                entry.outcome === JournalOutcome.Unmatched &&
                entry.comparison?.differences
              "
            >
              <span
                v-for="(part, index) in entry.comparison.differences.answer"
                :key="index"
                :class="`difference-${part.kind}`"
                :title="
                  part.kind === DifferenceKind.Missing
                    ? `Missing: ${part.expected}`
                    : part.kind === DifferenceKind.Extra
                      ? 'Extra character'
                      : part.kind === DifferenceKind.Changed
                        ? 'Different from reference'
                        : undefined
                "
              >
                {{ part.text }}
              </span>
            </template>
            <template v-else>{{ entry.answer }}</template>
          </p>
          <p class="journal-reference difference-reference">
            {{
              entry.outcome === JournalOutcome.Unmatched &&
              entry.comparison?.differences
                ? "Expected"
                : "Reference"
            }}
            <span class="journal-reference-text" lang="ja">
              <template
                v-if="
                  entry.outcome === JournalOutcome.Unmatched &&
                  entry.comparison?.differences
                "
              >
                <span
                  v-for="(part, index) in entry.comparison.differences.expected"
                  :key="index"
                  :class="`difference-${part.kind}`"
                >
                  {{ part.text }}
                </span>
              </template>
              <template v-else>{{ entry.reference }}</template>
            </span>
          </p>
          <p
            v-if="
              entry.outcome === JournalOutcome.Unmatched &&
              !entry.comparison?.differences
            "
            class="journal-legacy-note"
          >
            Character details weren’t saved for this older entry.
          </p>
          <a
            v-if="entry.comparison?.sourceUrl"
            class="journal-source"
            :href="entry.comparison.sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            Tatoeba source ↗
          </a>
          <WritingExplanations
            v-if="entry.outcome === JournalOutcome.Unmatched"
            :explanations="entry.comparison?.explanations ?? []"
            :expanded="false"
          />
        </article>
      </section>
    </main>
  </div>
</template>

<style scoped>
.nav-count {
  margin-left: 6px;
  font-size: 9px;
}
.intro {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 32px;
  margin-bottom: 34px;
}
.lede {
  max-width: 510px;
  margin: 0;
  color: var(--secondary);
  font:
    15px/1.7 system-ui,
    sans-serif;
}
.intro-seal {
  margin-right: 50px;
  width: 110px;
  color: var(--primary);
  text-align: center;
}
.intro-seal > span {
  display: grid;
  place-items: center;
  width: 94px;
  height: 104px;
  border: 1px solid var(--primary);
  outline: 1px solid var(--primary);
  outline-offset: -6px;
  font:
    65px "Hiragino Mincho ProN",
    "Yu Mincho",
    serif;
  transform: rotate(-4deg);
}
.intro-seal small {
  display: block;
  margin-top: 15px;
  letter-spacing: 0.45em;
  font-size: 11px;
}
.session-strip {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--line);
  padding: 16px 0 22px;
  color: var(--secondary);
  font-size: 9px;
  line-height: 1.5;
  letter-spacing: 0.03em;
}
.session-strip i {
  display: inline-block;
  width: 5px;
  height: 5px;
  background: var(--green);
  margin-right: 6px;
}
.session-strip b {
  margin: 0 9px;
  color: var(--muted);
  font-weight: normal;
}
.practice-layout {
  display: grid;
  grid-template-columns: 275px minmax(0, 1fr);
  gap: 30px;
  align-items: start;
}
.settings-panel {
  padding: 25px 22px;
  background: rgba(251, 247, 232, 0.34);
  border: 1px solid var(--line);
}
.settings-panel > .eyebrow {
  margin-bottom: 27px;
}
fieldset {
  min-width: 0;
  border: 0;
  padding: 0;
  margin: 0 0 28px;
}
legend {
  padding: 0;
  margin-bottom: 13px;
  font-size: 11px;
  font-weight: 600;
}
.levels {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
}
.levels button {
  padding: 12px 0;
  border: 1px solid var(--line);
  border-right: 0;
  background: transparent;
  font-size: 11px;
}
.levels button:last-child {
  border-right: 1px solid var(--line);
}
.levels button.selected {
  color: var(--surface);
  background: var(--primary);
  border-color: var(--primary);
}
.range-label {
  display: flex;
  justify-content: space-between;
  font-size: 7px;
  color: var(--muted);
  letter-spacing: 0.08em;
  margin-top: 8px;
}
.selected-sentence-note {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--line);
}
.selected-sentence-note .setting-note {
  margin-top: 0;
  margin-bottom: 12px;
}
.selected-sentence-note a {
  color: var(--secondary);
  font-size: 11px;
  line-height: 1.5;
}
.setting-note {
  margin: 11px 0 0;
  color: var(--secondary);
  font:
    12px/1.6 system-ui,
    sans-serif;
}
.length-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.length-options button {
  padding: 11px 3px;
  background: transparent;
  border: 1px solid var(--line);
  font-size: 10px;
}
.length-options button small {
  display: block;
  margin-top: 6px;
  color: var(--muted);
  font-size: 8px;
}
.length-options .selected {
  background: rgba(185, 51, 39, 0.07);
  border-color: var(--primary);
  color: var(--primary);
}
.mode-options {
  display: grid;
  gap: 7px;
}
.mode-options button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 10px;
  border: 1px solid var(--line);
  background: transparent;
  text-align: left;
  font-size: 10px;
}
.mode-options .selected {
  border-color: var(--primary);
  background: rgba(185, 51, 39, 0.055);
}
.mode-mark {
  width: 29px;
  font:
    16px "Hiragino Mincho ProN",
    "Yu Mincho",
    serif;
}
.radio-mark {
  margin-left: auto;
  color: var(--primary);
}
.writing-card,
.journal-panel {
  border: 1px solid var(--line);
  background: rgba(251, 247, 232, 0.87);
  box-shadow: 0 20px 50px rgba(53, 48, 39, 0.055);
  min-width: 0;
}
.card-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  padding: 19px 27px;
  border-bottom: 1px solid var(--line);
}
.card-heading .eyebrow {
  margin: 0;
  font-size: 9px;
}
.paper-label {
  font-size: 9px;
  letter-spacing: 0.09em;
  color: var(--muted);
}
.prompt {
  padding: 28px 32px 22px;
}
.prompt > .paper-label {
  margin-bottom: 15px;
}
.prompt h2 {
  font:
    500 clamp(23px, 2.5vw, 32px)/1.3 Iowan Old Style,
    Georgia,
    serif;
  margin-bottom: 20px;
  overflow-wrap: anywhere;
}
.prompt-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 15px;
  align-items: center;
  color: var(--muted);
  font-size: 9px;
}
.prompt-word {
  display: inline;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: inherit;
  text-decoration: underline dashed;
  text-decoration-color: var(--muted);
  text-decoration-thickness: 1px;
  text-underline-offset: 6px;
  cursor: pointer;
}
.prompt-word:hover,
.prompt-word-active {
  color: var(--primary);
  text-decoration-color: var(--primary);
}
.prompt-word:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 4px;
  border-radius: 2px;
}
.word-hint {
  margin: 0 0 18px;
  padding: 14px 16px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 4px;
}
.word-hint-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.word-hint-heading button {
  border: 0;
  background: transparent;
  color: var(--secondary);
  font-size: 18px;
  padding: 2px 6px;
}
.word-hint ul {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
}
.word-hint li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 16px;
  padding: 5px 0;
  color: var(--secondary);
  font-size: 12px;
}
.word-hint-word {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.word-hint-japanese {
  font-size: 20px;
  color: var(--ink);
}
.word-hint-reading {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
}
.word-hint-empty {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--secondary);
}
.romaji-hint {
  margin-top: 16px;
  padding: 14px 16px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 4px;
  overflow-wrap: anywhere;
}
.romaji-hint > p[lang] {
  margin: 8px 0;
  color: var(--secondary);
  font-size: 16px;
  line-height: 1.6;
}
.romaji-hint small {
  color: var(--muted);
  font-size: 10px;
}
.prompt-meta button,
.below-paper button,
.journal-panel .card-heading button,
.error-message button {
  border: 0;
  background: transparent;
  padding: 5px 0;
  color: var(--secondary);
  font-size: 9px;
}
.writing-field {
  position: relative;
  margin: 0 32px;
  border-top: 1px solid var(--line);
}
.writing-field label {
  display: block;
  padding-top: 21px;
}
.writing-field textarea {
  display: block;
  width: 100%;
  min-height: 185px;
  resize: vertical;
  padding: 22px 0 32px;
  border: 0;
  background: repeating-linear-gradient(
    transparent,
    transparent 47px,
    rgba(107, 135, 110, 0.13) 47px,
    rgba(107, 135, 110, 0.13) 48px
  );
  background-position: 0 14px;
  color: var(--ink);
  font:
    26px/48px "Hiragino Mincho ProN",
    "Yu Mincho",
    serif;
  caret-color: var(--primary);
}
.writing-field textarea::placeholder {
  color: #a39f90;
  font-size: 23px;
}
.writing-field textarea:focus-visible {
  outline-offset: -2px;
}
.character-count {
  display: block;
  color: var(--muted);
  text-align: right;
  font-size: 9px;
  margin: 7px 0 21px;
}
.card-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 20px 27px;
  border-top: 1px solid var(--line);
  background: rgba(227, 222, 208, 0.25);
}
.card-actions p {
  margin: 0;
  color: var(--secondary);
  font:
    11px/1.7 system-ui,
    sans-serif;
}
.card-actions p span {
  color: var(--muted);
  font-size: 10px;
}
.below-paper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  padding: 13px 27px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 9px;
}
.feedback {
  padding: 23px 32px;
  border-top: 1px solid var(--line);
  border-left: 3px solid var(--primary);
}
.feedback.matched {
  border-left-color: var(--green);
  background: rgba(64, 125, 101, 0.04);
}
.feedback.matched .eyebrow,
.success-text {
  color: var(--green);
}
.feedback .eyebrow {
  margin-bottom: 12px;
}
.feedback-note {
  font:
    12px/1.6 system-ui,
    sans-serif;
  color: var(--secondary);
}
.reference-text {
  font:
    24px/1.6 "Yu Mincho",
    serif;
  margin-bottom: 8px;
  overflow-wrap: anywhere;
}
.reading-text {
  font:
    13px/1.8 system-ui,
    sans-serif;
  color: var(--secondary);
  overflow-wrap: anywhere;
}
.feedback a {
  font-size: 9px;
  color: var(--muted);
}
.error-message,
.notice {
  padding: 18px 25px;
  font:
    13px/1.6 system-ui,
    sans-serif;
  color: var(--primary);
}
.practice-note {
  margin: 25px 0 0;
  color: var(--secondary);
  font:
    11px/1.7 system-ui,
    sans-serif;
  text-align: center;
}
.practice-note a {
  white-space: nowrap;
  margin-left: 5px;
}
.empty-journal {
  padding: 55px 25px;
  text-align: center;
}
.empty-journal > span {
  color: var(--primary);
  font:
    50px "Yu Mincho",
    serif;
}
.empty-journal h2 {
  margin: 22px 0 15px;
  font:
    30px Georgia,
    serif;
}
.empty-journal p {
  color: var(--secondary);
  font:
    14px/1.7 system-ui,
    sans-serif;
}
.journal-entry {
  padding: 25px 30px;
  border-bottom: 1px solid var(--line);
}
.journal-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--muted);
  font-size: 10px;
  margin-bottom: 15px;
}
.journal-entry h2 {
  font:
    24px/1.4 Georgia,
    serif;
}
.journal-answer {
  font:
    22px/1.7 "Yu Mincho",
    serif;
  overflow-wrap: anywhere;
}
.journal-reference {
  font-size: 10px;
  color: var(--secondary);
  margin-bottom: 0;
}
.journal-reference span {
  margin-left: 10px;
  font:
    15px/1.8 system-ui,
    sans-serif;
  overflow-wrap: anywhere;
}
.journal-privacy {
  margin: 0;
  padding: 18px 30px;
  font-size: 10px;
  color: var(--muted);
}
@media (max-width: 850px) {
  .practice-layout {
    grid-template-columns: 225px minmax(0, 1fr);
    gap: 18px;
  }
  .settings-panel {
    padding: 22px 15px;
  }
  .intro-seal {
    margin-right: 15px;
  }
  .card-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
@media (max-width: 640px) {
  .intro {
    gap: 10px;
  }
  .intro-seal {
    width: 48px;
    margin: 0;
  }
  .intro-seal > span {
    width: 44px;
    height: 54px;
    font-size: 32px;
    outline-offset: -4px;
  }
  .intro-seal small {
    font-size: 8px;
    letter-spacing: 0.12em;
  }
  .lede {
    font-size: 13px;
  }
  .practice-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }
  .settings-panel {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    padding: 20px;
  }
  .settings-panel > .eyebrow {
    grid-column: 1/-1;
    margin: 0;
  }
  fieldset {
    margin: 0;
  }
  fieldset:last-of-type {
    grid-column: 1/-1;
  }
  .mode-options {
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
  .mode-options button {
    flex-direction: column;
    text-align: center;
    gap: 6px;
    padding: 10px 4px;
    font-size: 8px;
  }
  .radio-mark {
    display: none;
  }
  .mode-mark {
    width: auto;
  }
  .setting-note {
    font-size: 11px;
  }
  .length-options button {
    font-size: 8px;
  }
  .length-options button small {
    font-size: 7px;
  }
  .card-heading,
  .card-actions {
    padding-inline: 20px;
  }
  .prompt {
    padding: 24px 20px;
  }
  .writing-field {
    margin-inline: 20px;
  }
  .writing-field textarea {
    font-size: 23px;
  }
  .writing-field textarea::placeholder {
    font-size: 19px;
  }
  .below-paper {
    padding-inline: 20px;
    font-size: 8px;
  }
  .feedback {
    padding: 20px;
  }
  .journal-meta {
    font-size: 9px;
  }
  .journal-entry {
    padding: 22px 20px;
  }
}
.practice-shell {
  height: 100dvh;
  min-height: 0;
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  overflow: hidden;
  background: var(--paper);
}
.workspace-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 18px 6px;
  border-right: 1px solid var(--line);
  background: rgba(251, 247, 232, 0.45);
}
.workspace-home {
  text-decoration: none;
}
.workspace-home .brand-mark {
  width: 40px;
  height: 40px;
}
.workspace-rail nav {
  display: grid;
  gap: 10px;
  width: 100%;
}
.workspace-rail nav button,
.workspace-credits {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 12px 3px;
  min-height: 65px;
  border: 1px solid transparent;
  background: none;
  font-size: 9px;
  color: var(--secondary);
  text-decoration: none;
}
.workspace-rail nav button.active {
  color: var(--primary);
  border-color: rgba(185, 51, 39, 0.25);
  background: rgba(185, 51, 39, 0.07);
}
.rail-mark {
  font:
    24px/1 "Yu Mincho",
    serif;
}
.workspace-rail .nav-count {
  margin-left: 2px;
  font-size: 8px;
}
.workspace-credits {
  margin-top: auto;
}
.workspace-credits > span:first-child {
  font-size: 22px;
}
.practice-workspace {
  width: 100%;
  min-width: 0;
  min-height: 0;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.workspace-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  flex-shrink: 0;
  padding: 15px 24px;
  min-height: 65px;
  border-bottom: 1px solid var(--line);
}
.workspace-heading > div {
  display: flex;
  align-items: center;
  gap: 20px;
}
.workspace-heading h1 {
  margin: 0;
  font:
    500 20px/1.2 Georgia,
    serif;
  letter-spacing: -0.02em;
}
.workspace-heading span {
  color: var(--muted);
  font-size: 9px;
  letter-spacing: 0.08em;
}
.practice-shell .session-strip {
  flex-shrink: 0;
  border-top: 0;
  padding: 12px 24px;
  margin: 0;
  border-bottom: 1px solid var(--line);
}
.practice-shell .notice {
  margin: 0;
  padding: 10px 24px;
}
.practice-shell .practice-layout {
  position: relative;
  flex: 1;
  min-height: 0;
  grid-template-columns: 265px minmax(0, 1fr);
  gap: 0;
  align-items: stretch;
}
.practice-shell .settings-panel {
  display: block;
  overflow-y: auto;
  border: 0;
  border-right: 1px solid var(--line);
  padding: 24px 20px;
}
.practice-shell .writing-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  border: 0;
  box-shadow: none;
}
.practice-shell .writing-card > form {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 240px;
}
.practice-shell .writing-field {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 180px;
}
.practice-shell .writing-field textarea {
  flex: 1;
  min-height: 150px;
  resize: none;
}
.practice-shell .prompt {
  padding-block: 24px 20px;
}
.practice-shell .prompt-meta {
  justify-content: flex-end;
}
.practice-shell .card-actions {
  flex-shrink: 0;
}
.practice-shell .practice-note {
  flex-shrink: 0;
  margin: 0;
  padding: 10px 20px;
  border-top: 1px solid var(--line);
  background: rgba(251, 247, 232, 0.3);
  font-size: 10px;
}
.practice-shell .journal-panel {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border: 0;
  box-shadow: none;
}
.practice-shell .journal-panel .card-heading {
  position: sticky;
  top: 0;
  background: var(--surface);
  z-index: 1;
}
.practice-shell .mode-mark {
  white-space: nowrap;
}
.settings-toggle,
.settings-scrim {
  display: none;
}
@media (max-width: 850px) and (min-width: 641px) {
  .practice-shell .practice-layout {
    grid-template-columns: 225px minmax(0, 1fr);
  }
}
@media (max-width: 640px) {
  .practice-shell {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) 64px;
  }
  .workspace-rail {
    grid-row: 2;
    flex-direction: row;
    justify-content: space-around;
    gap: 8px;
    padding: 5px max(8px, env(safe-area-inset-right))
      max(5px, env(safe-area-inset-bottom));
    border-right: 0;
    border-top: 1px solid var(--line);
  }
  .workspace-home .brand-mark {
    width: 34px;
    height: 34px;
    font-size: 23px;
  }
  .workspace-rail nav {
    display: flex;
    width: auto;
    flex: 1;
    justify-content: space-evenly;
    gap: 8px;
  }
  .workspace-rail nav button,
  .workspace-credits {
    min-height: 49px;
    min-width: 64px;
    padding: 5px 10px;
    gap: 4px;
  }
  .rail-mark {
    font-size: 19px;
  }
  .workspace-credits {
    margin: 0;
  }
  .workspace-credits > span:first-child {
    font-size: 18px;
  }
  .workspace-heading {
    min-height: 55px;
    padding: 12px 16px;
  }
  .workspace-heading h1 {
    font-size: 19px;
  }
  .workspace-heading > div > span {
    display: none;
  }
  .settings-toggle {
    display: block;
    flex-shrink: 0;
    border: 1px solid var(--line);
    background: rgba(251, 247, 232, 0.6);
    padding: 9px;
    font-size: 10px;
  }
  .practice-shell .session-strip {
    padding: 10px 16px;
    font-size: 8px;
    gap: 6px;
  }
  .practice-shell .practice-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .practice-shell .settings-panel {
    display: none;
  }
  .practice-shell .settings-panel.settings-open {
    display: block;
    position: absolute;
    z-index: 5;
    top: 0;
    bottom: 0;
    right: 0;
    width: min(300px, 100%);
    padding: 22px;
    background: var(--surface);
    border-left: 1px solid var(--line);
    box-shadow: -10px 0 30px rgba(31, 28, 23, 0.1);
  }
  .settings-scrim {
    display: block;
    position: absolute;
    inset: 0;
    z-index: 4;
    background: rgba(31, 28, 23, 0.2);
    border: 0;
  }
  .practice-shell .settings-panel fieldset {
    margin-bottom: 25px;
  }
  .practice-shell .practice-note {
    font-size: 9px;
    padding: 8px 12px;
  }
  .practice-shell .card-heading {
    padding-block: 13px;
  }
  .practice-shell .prompt {
    padding-block: 18px 14px;
  }
  .practice-shell .prompt h2 {
    font-size: 24px;
    margin-bottom: 14px;
  }
  .practice-shell .card-actions {
    padding-block: 14px;
    gap: 10px;
  }
  .practice-shell .card-actions p span {
    display: none;
  }
  .practice-shell .writing-card > form {
    min-height: 250px;
  }
}

.practice-shell .answer-review {
  flex: 1;
  min-height: 150px;
  padding: 22px 0 32px;
  color: var(--ink);
  background: repeating-linear-gradient(
    transparent,
    transparent 47px,
    rgba(107, 135, 110, 0.13) 47px,
    rgba(107, 135, 110, 0.13) 48px
  );
  background-position: 0 14px;
  font:
    26px/48px "Hiragino Mincho ProN",
    "Yu Mincho",
    serif;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.difference-changed,
.difference-extra,
.difference-missing {
  color: #a5271e;
  background: rgba(185, 51, 39, 0.1);
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 5px;
}
.difference-extra {
  text-decoration: line-through;
}
.difference-reference .difference-changed,
.difference-reference .difference-missing {
  color: #285940;
  background: rgba(64, 125, 101, 0.12);
}
.practice-shell .card-actions .writing-status {
  color: var(--primary);
  font-size: 13px;
  font-weight: 600;
}
.practice-shell .card-actions .writing-status-matched {
  color: var(--green);
}
@media (max-width: 640px) {
  .practice-shell .answer-review {
    font-size: 23px;
  }
}

.journal-answer {
  white-space: pre-wrap;
}
.journal-reference .journal-reference-text span {
  margin-left: 0;
  font: inherit;
}
.journal-outcome.unmatched {
  color: var(--primary);
}
.journal-legacy-note {
  color: var(--muted);
  font:
    11px/1.6 system-ui,
    sans-serif;
  margin: 12px 0 0;
}
.journal-source {
  display: inline-block;
  margin-top: 14px;
  font-size: 9px;
  color: var(--muted);
}
@media (max-width: 640px) {
  .journal-meta {
    flex-wrap: wrap;
  }
}
</style>
