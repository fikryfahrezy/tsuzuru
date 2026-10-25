<script setup lang="ts">
import { definePageMeta, useHead, useSeoMeta } from "#imports";
import { ref, nextTick, watch } from "vue";
import {
  PracticePermission,
  hasPracticePermission,
  difficultyOptions,
} from "#shared/practice-difficulty";
import { PracticeTab } from "~/utils/practice";
import { usePracticeSession } from "~/composables/usePracticeSession";
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

const {
  level,
  length,
  mode,
  difficulty,
  tab,
  settingsOpen,
  showRomaji,
  answerInput,
  acceptAlternatives,
  sentence,
  question,
  answer,
  chipSelection,
  typedDraft,
  result,
  revealed,
  loading,
  checking,
  error,
  storageNote,
  journal,
  previousAttempt,
  online,
  writingCard,
  loadQuestion,
  submit,
  nextSentence,
  retrySentence,
  shortcut,
  resetJournal,
  retryJournalEntry,
  saveJournalBreakdown,
} = usePracticeSession();
const grammarOpen = ref(false);
const grammarVisited = ref(false);
const settingsToggle = ref<HTMLButtonElement | null>(null);
async function closeSettings() {
  settingsOpen.value = false;
  await nextTick();
  settingsToggle.value?.focus();
}
async function toggleGrammar() {
  if (
    !hasPracticePermission(
      difficulty.value,
      PracticePermission.GrammarReference,
    )
  )
    return;
  if (grammarOpen.value) return closeGrammar();
  grammarVisited.value = true;
  grammarOpen.value = true;
  settingsOpen.value = false;
  await nextTick();
  (
    document.getElementById("grammar-sentence-scope") ??
    document.getElementById("grammar-search")
  )?.focus();
}
async function closeGrammar() {
  grammarOpen.value = false;
  await nextTick();
  writingCard.value?.focusGrammar();
}
function selectTab(value: PracticeTab) {
  tab.value = value;
  settingsOpen.value = false;
}
watch(difficulty, () => {
  if (
    !hasPracticePermission(
      difficulty.value,
      PracticePermission.GrammarReference,
    )
  )
    grammarOpen.value = false;
});
</script>

<template>
  <div class="practice-shell">
    <PracticeNavigation
      :tab="tab"
      :journal-count="journal.length"
      @select="selectTab"
    />
    <main class="workspace practice-workspace">
      <header class="workspace-heading">
        <div>
          <button
            v-if="tab === PracticeTab.Practice"
            ref="settingsToggle"
            type="button"
            class="settings-toggle"
            :aria-expanded="settingsOpen"
            aria-controls="practice-settings"
            @click="
              settingsOpen = !settingsOpen;
              grammarOpen = false;
            "
          >
            {{ settingsOpen ? "Close settings ×" : "Settings ☰" }}
          </button>
          <h1>
            {{
              tab === PracticeTab.Practice
                ? "Sentence practice"
                : "Practice journal"
            }}
          </h1>
          <span v-if="tab === PracticeTab.Practice" class="difficulty-label">
            {{
              difficultyOptions.find((item) => item.value === difficulty)?.label
            }}
          </span>
        </div>
      </header>
      <p v-if="storageNote" class="notice" role="status">{{ storageNote }}</p>
      <p v-if="!online" class="notice" role="status">
        You’re offline. Your saved journal is available. Connect to load
        sentences and check answers.
      </p>
      <div
        v-if="tab === PracticeTab.Practice"
        class="practice-layout"
        :class="{
          'with-reference': grammarOpen,
          'settings-hidden': !settingsOpen,
        }"
      >
        <button
          v-if="settingsOpen && !grammarOpen"
          class="settings-scrim"
          aria-label="Close settings"
          @click="closeSettings"
        ></button>
        <PracticeSettings
          v-show="settingsOpen && !grammarOpen"
          v-model:level="level"
          v-model:length="length"
          v-model:mode="mode"
          v-model:difficulty="difficulty"
          v-model:accept-alternatives="acceptAlternatives"
          :sentence="sentence"
          :settings-open="settingsOpen"
          :checking="checking"
          @close="closeSettings"
          @keydown.esc.stop.prevent="closeSettings"
        />
        <PracticeWritingCard
          ref="writingCard"
          v-model:answer="answer"
          v-model:chip-selection="chipSelection"
          v-model:typed-draft="typedDraft"
          v-model:show-romaji="showRomaji"
          v-model:answer-input="answerInput"
          :mode="mode"
          :difficulty="difficulty"
          :question="question"
          :previous-attempt="previousAttempt"
          :result="result"
          :revealed="revealed"
          :loading="loading"
          :checking="checking"
          :grammar-open="grammarOpen"
          :error="error"
          @grammar="toggleGrammar"
          @another="question ? nextSentence() : loadQuestion()"
          @submit="submit"
          @next="nextSentence"
          @retry="retrySentence"
          @shortcut="shortcut"
        />
        <GrammarReference
          v-show="
            grammarOpen &&
            hasPracticePermission(
              difficulty,
              PracticePermission.GrammarReference,
            )
          "
          v-if="grammarVisited"
          id="practice-grammar-reference"
          :initial-level="level"
          :sentence="question ?? undefined"
          :open="grammarOpen"
          closable
          @close="closeGrammar"
        />
      </div>
      <PracticeJournal
        v-else
        :journal="journal"
        :checking="checking"
        @clear="resetJournal"
        @retry="retryJournalEntry"
        @breakdown="saveJournalBreakdown"
        @practice="tab = PracticeTab.Practice"
      />
    </main>
  </div>
</template>

<style scoped>
.practice-layout {
  display: grid;
  grid-template-columns: 275px minmax(0, 1fr);
  gap: 30px;
  align-items: start;
}
.notice {
  padding: 18px 25px;
  font:
    13px/1.6 system-ui,
    sans-serif;
  color: var(--primary);
}
@media (max-width: 850px) {
  .practice-layout {
    grid-template-columns: 225px minmax(0, 1fr);
    gap: 18px;
  }
}
@media (max-width: 640px) {
  .practice-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
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
  justify-content: flex-start;
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
  flex-wrap: wrap;
  gap: 12px;
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
.settings-toggle {
  display: block;
  flex-shrink: 0;
  border: 1px solid var(--line);
  background: rgba(251, 247, 232, 0.6);
  padding: 9px;
  font-size: 11px;
}
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
    font-size: 10px;
  }
  .practice-shell .practice-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .settings-scrim {
    display: block;
    position: absolute;
    inset: 0;
    z-index: 4;
    background: rgba(31, 28, 23, 0.2);
    border: 0;
  }
}
</style>

<style scoped>
.practice-shell .practice-layout.settings-hidden {
  grid-template-columns: minmax(0, 1fr);
}
.practice-shell .practice-layout.with-reference {
  grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
}
.with-reference > .grammar-reference {
  border-left: 1px solid var(--line);
}
@media (max-width: 850px) {
  .practice-shell .practice-layout.with-reference {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(200px, 45%) minmax(0, 1fr);
  }
  .with-reference > .grammar-reference {
    border-left: 0;
    border-top: 1px solid var(--line);
  }
}
</style>
