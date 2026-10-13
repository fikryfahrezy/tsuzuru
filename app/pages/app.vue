<script setup lang="ts">
import { definePageMeta, useSeoMeta } from "#imports";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { $fetch } from "ofetch";
import {
  levels,
  type Level,
  type Length,
  type Strictness,
  type Question,
  type Comparison,
} from "#shared/practice";

definePageMeta({ alias: ["/practice"] });
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
};
const level = ref<Level>("N5");
const length = ref<Length>("short");
const mode = ref<Strictness>("flexible");
const tab = ref<"practice" | "journal">("practice");
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
const field = ref<HTMLTextAreaElement | null>(null);
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
const attempts = computed(() =>
  journal.value.filter((entry) => entry.outcome !== "revealed"),
);
const matches = computed(
  () => attempts.value.filter((entry) => entry.outcome === "matched").length,
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
      },
      ...journal.value,
    ].slice(0, 100);
    persist();
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
onMounted(() => {
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
          .slice(0, 100);
    }
  } catch {
    storageNote.value =
      "Saved progress couldn’t be read. You can keep practicing in this session.";
  }
  ready.value = true;
  void loadQuestion();
});
watch([level, length], () => {
  if (ready.value) {
    persist();
    void loadQuestion();
  }
});
watch(mode, () => {
  if (ready.value) {
    persist();
    void loadQuestion();
  }
});
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <NuxtLink class="brand" to="/" aria-label="Tsuzuru home"
        ><span class="brand-mark" lang="ja">綴</span
        ><span
          >tsuzuru<span class="brand-caption"
            >JAPANESE WRITING PRACTICE</span
          ></span
        ></NuxtLink
      >
      <nav aria-label="Main navigation">
        <button
          :class="{ active: tab === 'practice' }"
          @click="tab = 'practice'"
        >
          Practice
        </button>
        <button :class="{ active: tab === 'journal' }" @click="tab = 'journal'">
          Journal <span class="nav-count">{{ journal.length }}</span>
        </button>
        <NuxtLink to="/sources">Data &amp; credits ↗</NuxtLink>
      </nav>
    </header>
    <main class="workspace">
      <section class="intro">
        <div>
          <p class="eyebrow">
            {{
              tab === "practice"
                ? "一文ずつ / ONE SENTENCE AT A TIME"
                : "学習記録 / YOUR PRACTICE JOURNAL"
            }}
          </p>
          <h1>
            {{
              tab === "practice"
                ? "Find your words."
                : "Every sentence counts."
            }}<br v-if="tab === 'practice'" /><em v-if="tab === 'practice'"
              >Write in Japanese.</em
            >
          </h1>
          <p class="lede">
            {{
              tab === "practice"
                ? "A little thought. A little ink. Turn an English sentence into Japanese, at your own pace."
                : "Revisit what you wrote, compare your references, and keep going."
            }}
          </p>
        </div>
        <div class="intro-seal" aria-hidden="true" lang="ja">
          <span>綴</span><small>つづる</small>
        </div>
      </section>
      <div class="session-strip">
        <span><i></i> REFERENCE PRACTICE · BETA</span
        ><span
          >{{ attempts.length }} attempts <b>/</b> {{ matches }} reference
          matches <b>/</b> saved in this browser</span
        >
      </div>
      <p v-if="storageNote" class="notice" role="status">{{ storageNote }}</p>
      <div v-if="tab === 'practice'" class="practice-layout">
        <aside class="settings-panel" aria-label="Practice settings">
          <p class="eyebrow">01 / SET YOUR PACE</p>
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
            <div class="range-label">
              <span>BEGINNER</span><span>ADVANCED</span>
            </div>
            <p class="setting-note">
              {{ level }} vocabulary focus. Sentence difficulty is estimated;
              grammar may be harder.
            </p>
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
          <div class="margin-note">
            <span lang="ja">続</span>
            <p>Small sentences.<br />Steady progress.</p>
          </div>
        </aside>
        <section
          class="writing-card"
          aria-label="Sentence practice"
          :aria-busy="loading || checking"
        >
          <div class="card-heading">
            <span class="eyebrow">02 / READ &amp; WRITE</span
            ><span class="paper-label"
              >{{ level }} · {{ length.toUpperCase() }}</span
            >
          </div>
          <div class="prompt">
            <p class="paper-label">TRANSLATE INTO JAPANESE</p>
            <h2 v-if="question">{{ question.english }}</h2>
            <h2 v-else>
              {{
                loading ? "Opening a fresh page…" : "Let’s try another page."
              }}
            </h2>
            <div v-if="question" class="prompt-meta">
              <span>{{ question.wordCount }} English words</span
              ><button :disabled="checking" @click="loadQuestion">
                Another sentence ↻
              </button>
            </div>
          </div>
          <form @submit.prevent="submit()">
            <div class="writing-field">
              <label class="paper-label" for="answer">YOUR JAPANESE</label
              ><textarea
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
                @keydown="shortcut"
              ></textarea
              ><span class="character-count"
                >{{ [...answer].length }} characters</span
              >
            </div>
            <div class="card-actions">
              <p id="writing-help">
                Spaces and common sentence punctuation are ignored.<br /><span
                  >Use your Japanese keyboard · Ctrl / ⌘ + Enter to
                  continue</span
                >
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
                revealed
                  ? "A REFERENCE TO LEARN FROM"
                  : result.matched
                    ? "✓ MATCHES THE REFERENCE"
                    : "COMPARE YOUR WRITING"
              }}
            </p>
            <p v-if="!result.matched && !revealed" class="feedback-note">
              Your answer differs from this reference. It may still be a valid
              translation.
            </p>
            <p class="reference-text" lang="ja">{{ result.reference }}</p>
            <p class="reading-text" lang="ja">{{ result.kana }}</p>
            <a
              v-if="result.sourceUrl"
              :href="result.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              >Sentence &amp; contributors on Tatoeba ↗</a
            >
          </section>
          <div v-else-if="question" class="below-paper">
            <span
              >{{ question.poolSize.toLocaleString() }} sentences in this
              selection</span
            ><button :disabled="checking" @click="submit(true)">
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
          <span lang="ja">始</span>
          <h2>Your first sentence is waiting.</h2>
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
              >{{ entry.level }} ·
              {{
                new Date(entry.date).toLocaleDateString("en", {
                  month: "short",
                  day: "numeric",
                })
              }}</span
            ><span :class="{ 'success-text': entry.outcome === 'matched' }">{{
              entry.outcome === "matched"
                ? "Reference matched"
                : entry.outcome === "revealed"
                  ? "Reference viewed"
                  : "Reference differs"
            }}</span>
          </div>
          <h2>{{ entry.english }}</h2>
          <p v-if="entry.answer" class="journal-answer" lang="ja">
            {{ entry.answer }}
          </p>
          <p class="journal-reference">
            Reference <span lang="ja">{{ entry.reference }}</span>
          </p>
        </article>
        <p v-if="journal.length" class="journal-privacy">
          Stored only in this browser. Clearing browser data removes your
          journal.
        </p>
      </section>
      <p class="practice-note">
        Practice with open sentence data. Reference matching checks writing
        forms, not every possible translation.
        <NuxtLink to="/sources">About the data ↗</NuxtLink>
      </p>
    </main>
    <footer class="page-footer">
      <span>綴る · TSUZURU</span><span>A LITTLE PRACTICE, EVERY DAY.</span
      ><NuxtLink to="/sources">OPEN DATA · OPEN POSSIBILITIES ↗</NuxtLink>
    </footer>
  </div>
</template>
