<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { HintSource, type Question } from "#shared/practice";
import {
  PracticeDifficulty,
  PracticePermission,
  hasPracticePermission,
} from "#shared/practice-difficulty";
const props = defineProps<{
  question: Question | null;
  loading: boolean;
  checking: boolean;
  difficulty: PracticeDifficulty;
}>();
const emit = defineEmits<{ another: [] }>();
const showRomaji = defineModel<boolean>("showRomaji", { required: true });
const selectedWord = ref<number | null>(null);
const canUse = (permission: PracticePermission) =>
  hasPracticePermission(props.difficulty, permission);
const activeWord = computed(() =>
  !canUse(PracticePermission.WordHints) || selectedWord.value === null
    ? null
    : (props.question?.wordHints[selectedWord.value] ?? null),
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

watch(
  () => props.question,
  () => {
    selectedWord.value = null;
  },
);
watch(
  () => props.difficulty,
  () => {
    if (!canUse(PracticePermission.WordHints)) selectedWord.value = null;
  },
);
</script>

<template>
  <div class="prompt">
    <p class="paper-label">Translate into Japanese</p>
    <h2 v-if="question" class="english-prompt">
      <template v-for="(part, index) in question.wordHints" :key="index">
        <button
          v-if="part.isWord && canUse(PracticePermission.WordHints)"
          type="button"
          class="prompt-word"
          :id="`prompt-word-${index}`"
          :class="{ 'prompt-word-active': selectedWord === index }"
          :aria-expanded="selectedWord === index"
          aria-controls="word-hint"
          :aria-label="`Japanese hint for ${part.phrase ?? part.text}`"
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
        <p class="paper-label">
          {{
            activeWord.hintSource === HintSource.Reference
              ? "Possible reference vocabulary"
              : "Japanese hint"
          }}
          ·
          <span class="word-hint-phrase">
            {{ activeWord.phrase ?? activeWord.text }}
          </span>
        </p>
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
              <template v-for="spelling in hint.spellings" :key="spelling">
                <span aria-hidden="true">/</span>
                {{ spelling }}
              </template>
            </span>
            <span
              v-if="
                (hasKanji(hint.japanese) || hint.spellings?.some(hasKanji)) &&
                hint.reading
              "
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
        No vocabulary hint available for this word. It may be expressed through
        a phrase, grammar, or context in Japanese.
      </p>
      <p v-if="activeWord.hints.length" class="setting-note">
        {{
          activeWord.hintSource === HintSource.Sentence
            ? "Wording and reading from this sentence's Japanese reference."
            : activeWord.hintSource === HintSource.Reference
              ? "Vocabulary found in the Japanese reference, with dictionary meanings. The exact meaning and English word pairing are not confirmed."
              : "Dictionary forms and meanings; the wording used in this sentence may differ."
        }}
      </p>
    </section>
    <div v-if="question" class="prompt-meta">
      <button
        v-if="canUse(PracticePermission.RomajiHint)"
        type="button"
        :aria-pressed="showRomaji"
        aria-controls="romaji-hint"
        @click="showRomaji = !showRomaji"
      >
        {{ showRomaji ? "Hide romaji hint" : "Show romaji hint" }}
      </button>
      <button :disabled="checking" @click="emit('another')">
        Another sentence ↻
      </button>
    </div>
    <div
      v-if="question && canUse(PracticePermission.RomajiHint)"
      id="romaji-hint"
      class="romaji-hint"
      :hidden="!showRomaji"
    >
      <p class="paper-label">Reference in romaji</p>
      <p lang="ja-Latn">{{ question.romaji }}</p>
      <small>
        Kana spelling in Latin letters; other translations may also be valid.
      </small>
    </div>
  </div>
</template>

<style scoped>
.setting-note {
  margin: 11px 0 0;
  color: var(--secondary);
  font:
    12px/1.6 system-ui,
    sans-serif;
}
.paper-label {
  text-transform: uppercase;
  font-size: 9px;
  letter-spacing: 0.09em;
  color: var(--muted);
}
.word-hint-phrase {
  text-transform: none;
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
.prompt-word:hover {
  color: var(--primary);
  text-decoration-color: var(--primary);
}
.prompt-word:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 4px;
}
.word-hint {
  margin: 0 0 18px;
  padding: 14px 16px;
  background: var(--surface);
  border: 1px solid var(--line);
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
.prompt-meta button {
  border: 0;
  background: transparent;
  padding: 5px 0;
  color: var(--secondary);
  font-size: 9px;
}
@media (max-width: 640px) {
  .setting-note {
    font-size: 11px;
  }
  .prompt {
    padding: 24px 20px;
  }
}
.practice-shell .prompt {
  padding-block: 24px 20px;
}
.practice-shell .prompt-meta {
  justify-content: flex-end;
}
@media (max-width: 640px) {
  .practice-shell .prompt {
    padding-block: 18px 14px;
  }
  .practice-shell .prompt h2 {
    font-size: 24px;
    margin-bottom: 14px;
  }
}
</style>
