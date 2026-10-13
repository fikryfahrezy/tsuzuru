<script setup lang="ts">
import { definePageMeta, useHead, useSeoMeta } from "#imports";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { $fetch } from "ofetch";
import {
  levels,
  normalize,
  type Level,
  type Length,
  type Strictness,
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

type Entry = {
  id: string;
  english: string;
  answer: string;
  reference: string;
  outcome: "matched" | "unmatched" | "revealed";
  date: string;
  level: Level;
  mode?: Strictness;
  comparison?: Comparison | null;
};
const level = ref<Level>("N5");
const length = ref<Length>("short");
const mode = ref<Strictness>("flexible");
const tab = ref<"practice" | "journal">("practice");
const settingsOpen = ref(false);
const question = ref<Question | null>(null);
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
      kana: "Write entirely in hiragana or katakana. Kanji is not accepted in this mode.",
      flexible:
        "Use the reference kanji, their kana readings, or a mixture of both.",
      exact: "Match the reference’s kanji and kana spelling.",
    })[mode.value],
);
const lengthOptions = [
  { value: "short", label: "Short", note: "1–7 words" },
  { value: "medium", label: "Medium", note: "8–12 words" },
  { value: "long", label: "Long", note: "13+ words" },
] as const;
const modes = [
  { value: "kana", label: "Kana only", mark: "あ" },
  { value: "flexible", label: "Kana + kanji", mark: "あ漢" },
  { value: "exact", label: "Exact writing", mark: "漢" },
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
  result.value = null;
  answer.value = "";
  revealed.value = false;
  error.value = "";
  loading.value = true;
  try {
    const next = await $fetch<Question>("/api/exercises", {
      query: { level: level.value, length: length.value, previous },
    });
    if (sequence !== request) return;
    question.value = next;
  } catch {
    if (sequence === request)
      error.value = "We couldn’t load a sentence. Please try again.";
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
          ? "revealed"
          : comparison.matched
            ? "matched"
            : "unmatched",
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
        ["same", "changed", "extra", "missing"].includes(part.kind) &&
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
      if (levels.includes(saved.level)) level.value = saved.level;
      if (["short", "medium", "long"].includes(saved.length))
        length.value = saved.length;
      if (["kana", "flexible", "exact"].includes(saved.mode))
        mode.value = saved.mode;
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
              levels.includes(row.level) &&
              ["matched", "unmatched", "revealed"].includes(row.outcome)
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
</script>

<template>
  <div class="practice-shell">
    <aside class="workspace-rail" aria-label="Workspace navigation">
      <NuxtLink
        class="workspace-home"
        to="/"
        aria-label="Tsuzuru home"
        title="Back to home"
        ><span class="brand-mark" lang="ja">綴</span></NuxtLink
      >
      <nav aria-label="Main navigation">
        <button
          :class="{ active: tab === 'practice' }"
          :aria-pressed="tab === 'practice'"
          @click="
            tab = 'practice';
            settingsOpen = false;
          "
        >
          <span class="rail-mark" lang="ja" aria-hidden="true">文</span
          ><span>Practice</span>
        </button>
        <button
          :class="{ active: tab === 'journal' }"
          :aria-pressed="tab === 'journal'"
          @click="
            tab = 'journal';
            settingsOpen = false;
          "
        >
          <span class="rail-mark" lang="ja" aria-hidden="true">記</span
          ><span
            >Journal <span class="nav-count">{{ journal.length }}</span></span
          >
        </button>
      </nav>
      <NuxtLink class="workspace-credits" to="/sources" title="Data and credits"
        ><span aria-hidden="true">ⓘ</span><span>Credits</span></NuxtLink
      >
    </aside>
    <main class="workspace practice-workspace">
      <header class="workspace-heading">
        <div>
          <h1>
            {{ tab === "practice" ? "Sentence practice" : "Practice journal" }}
          </h1>
        </div>
        <button
          v-if="tab === 'practice'"
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
      <div v-if="tab === 'practice'" class="practice-layout">
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
          <fieldset :disabled="checking">
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
          <fieldset :disabled="checking">
            <legend>Sentence length</legend>
            <div class="length-options">
              <button
                v-for="item in lengthOptions"
                :key="item.value"
                :aria-pressed="length === item.value"
                :class="{ selected: length === item.value }"
                @click="length = item.value"
              >
                <span>{{ item.label }}</span
                ><small>{{ item.note }}</small>
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
                <span class="mode-mark" lang="ja">{{ item.mark }}</span
                ><span>{{ item.label }}</span
                ><span class="radio-mark" aria-hidden="true">{{
                  mode === item.value ? "●" : "○"
                }}</span>
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
            <h2 v-if="question">{{ question.english }}</h2>
            <h2 v-else>
              {{ loading ? "Loading sentence…" : "Sentence unavailable." }}
            </h2>
            <div v-if="question" class="prompt-meta">
              <button :disabled="checking" @click="loadQuestion">
                Another sentence ↻
              </button>
            </div>
          </div>
          <form @submit.prevent="submit()">
            <div class="writing-field">
              <label class="paper-label" for="answer">YOUR JAPANESE</label
              ><textarea
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
                <template v-else
                  ><span
                    v-for="(part, index) in result.differences?.answer"
                    :key="index"
                    :class="`difference-${part.kind}`"
                    :title="
                      part.kind === 'missing'
                        ? `Missing: ${part.expected}`
                        : part.kind === 'extra'
                          ? 'Extra character'
                          : part.kind === 'changed'
                            ? 'Different from reference'
                            : undefined
                    "
                    >{{ part.text }}</span
                  ></template
                >
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
                <span>→</span></button
              ><button
                v-else
                class="primary-button"
                type="button"
                @click="nextSentence"
              >
                Next sentence <span>→</span>
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
                >{{ part.text }}</span
              >
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
              >Sentence &amp; contributors on Tatoeba ↗</a
            >
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
          <span class="eyebrow">YOUR LAST 100 SENTENCES</span
          ><button v-if="journal.length" @click="resetJournal">
            Clear journal
          </button>
        </div>
        <div v-if="!journal.length" class="empty-journal">
          <h2>No journal entries yet.</h2>
          <p>
            Your writing and references will appear here after you practice.
          </p>
          <button class="primary-button" @click="tab = 'practice'">
            Start writing →
          </button>
        </div>
        <article v-for="entry in journal" :key="entry.id" class="journal-entry">
          <div class="journal-meta">
            <span
              >{{ entry.level
              }}<template v-if="entry.mode">
                ·
                {{
                  modes.find((item) => item.value === entry.mode)?.label
                }}</template
              >
              ·
              {{
                new Date(entry.date).toLocaleDateString("en", {
                  month: "short",
                  day: "numeric",
                })
              }}</span
            ><span
              class="journal-outcome"
              :class="{
                'success-text': entry.outcome === 'matched',
                unmatched: entry.outcome === 'unmatched',
              }"
              >{{
                entry.outcome === "matched"
                  ? "✓ Matches the reference"
                  : entry.outcome === "revealed"
                    ? "Reference viewed"
                    : "× Does not match the reference"
              }}</span
            >
          </div>
          <h2>{{ entry.english }}</h2>
          <p v-if="entry.answer" class="journal-answer" lang="ja">
            <template
              v-if="
                entry.outcome === 'unmatched' && entry.comparison?.differences
              "
              ><span
                v-for="(part, index) in entry.comparison.differences.answer"
                :key="index"
                :class="`difference-${part.kind}`"
                :title="
                  part.kind === 'missing'
                    ? `Missing: ${part.expected}`
                    : part.kind === 'extra'
                      ? 'Extra character'
                      : part.kind === 'changed'
                        ? 'Different from reference'
                        : undefined
                "
                >{{ part.text }}</span
              ></template
            >
            <template v-else>{{ entry.answer }}</template>
          </p>
          <p class="journal-reference difference-reference">
            {{
              entry.outcome === "unmatched" && entry.comparison?.differences
                ? "Expected"
                : "Reference"
            }}
            <span class="journal-reference-text" lang="ja"
              ><template
                v-if="
                  entry.outcome === 'unmatched' && entry.comparison?.differences
                "
                ><span
                  v-for="(part, index) in entry.comparison.differences.expected"
                  :key="index"
                  :class="`difference-${part.kind}`"
                  >{{ part.text }}</span
                ></template
              ><template v-else>{{ entry.reference }}</template></span
            >
          </p>
          <p
            v-if="
              entry.outcome === 'unmatched' && !entry.comparison?.differences
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
            >Tatoeba source ↗</a
          >
          <WritingExplanations
            v-if="entry.outcome === 'unmatched'"
            :explanations="entry.comparison?.explanations ?? []"
            :expanded="false"
          />
        </article>
      </section>
    </main>
  </div>
</template>
