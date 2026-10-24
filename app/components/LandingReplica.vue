<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { chipBank, chipOrder, type ReplicaState } from "~/utils/landing-story";

const props = defineProps<{ state: ReplicaState; scroll: number }>();
const column = ref<HTMLElement | null>(null);

const promptWords = [
  { text: "I", hint: false },
  { text: "want", hint: true },
  { text: "to", hint: false },
  { text: "drink", hint: true },
  { text: "cold", hint: true },
  { text: "water", hint: true },
];
const levels = ["N5", "N4", "N3", "N2", "N1"];
const lengths = [
  ["Short", "1–7 words"],
  ["Medium", "8–12 words"],
  ["Long", "13+ words"],
  ["Random", "Any length"],
];
const modes = [
  { value: "kana", mark: "あ", label: "Kana only" },
  { value: "mixed", mark: "あ漢", label: "Kana + kanji" },
  { value: "exact", mark: "漢", label: "Exact writing" },
];
const grammarIdle = [
  { pattern: "～は", meaning: "as for; marks the topic", topic: "Particles" },
  { pattern: "～が", meaning: "marks the subject", topic: "Particles" },
  { pattern: "～を", meaning: "marks the direct object", topic: "Particles" },
];
const grammarResults = [
  { pattern: "～たい", meaning: "want to (do)", topic: "Desire", level: "N5" },
  {
    pattern: "～たがる",
    meaning: "(someone else) wants to",
    topic: "Desire",
    level: "N4",
  },
  { pattern: "～つもり", meaning: "intend to", topic: "Plans", level: "N4" },
];
const breakdown = [
  {
    word: "冷たい",
    reading: "つめたい · tsumetai",
    kind: "Adjective",
    meaning: "cold (to the touch)",
  },
  { word: "水", reading: "みず · mizu", kind: "Noun", meaning: "water" },
  {
    word: "が",
    reading: "が · ga",
    kind: "Particle",
    meaning: "marks what is wanted",
  },
  {
    word: "飲みたい",
    reading: "のみたい · nomitai",
    kind: "Verb",
    meaning: "want to drink",
    grammar: "～たい",
  },
  {
    word: "です",
    reading: "です · desu",
    kind: "Copula",
    meaning: "polite ending",
  },
];
const journal = [
  {
    level: "N5 · Kana + kanji",
    english: "I want to drink cold water.",
    japanese: "冷たい水が飲みたいです",
    matched: true,
    when: "Just now",
  },
  {
    level: "N5 · Kana only",
    english: "The station is near here.",
    japanese: "えきはこのちかくです",
    matched: true,
    when: "Yesterday",
  },
  {
    level: "N4 · Kana + kanji",
    english: "It might rain tomorrow.",
    japanese: "明日は雨がふるかも",
    matched: false,
    when: "Mon",
  },
  {
    level: "N5 · Exact writing",
    english: "I read a book last night.",
    japanese: "昨夜本を読みました",
    matched: true,
    when: "Sun",
  },
];

// Chip slots: every chip lives in the bank until its turn in chipOrder.
const chipSlots = computed(() => {
  const placed = chipOrder.slice(0, props.state.chipsPlaced);
  let bankX = 0;
  return chipBank.map((text, index) => {
    const width = 34 + text.length * 26;
    const slot = placed.indexOf(index);
    const position =
      slot === -1
        ? { x: bankX, y: 118 }
        : {
            x: chipBank
              .filter((_, i) => placed.slice(0, slot).includes(i))
              .reduce((sum, word) => sum + 34 + word.length * 26 + 10, 0),
            y: 18,
          };
    bankX += width + 10;
    return { text, width, ...position, placed: slot !== -1 };
  });
});

watch(
  () => props.scroll,
  (scroll) => {
    const el = column.value;
    if (el) el.scrollTop = scroll * (el.scrollHeight - el.clientHeight);
  },
);
</script>

<template>
  <div class="replica" aria-hidden="true" inert>
    <aside class="r-rail" data-target="rail">
      <span class="r-logo" lang="ja">綴</span>
      <span class="r-nav" :class="{ active: state.tab === 'practice' }">
        <b lang="ja">文</b>
        Practice
      </span>
      <span class="r-nav" :class="{ active: state.tab === 'journal' }">
        <b lang="ja">記</b>
        Journal
        <i>{{ state.checked ? 4 : 3 }}</i>
      </span>
      <span class="r-nav">
        <b lang="ja">引</b>
        Reference
      </span>
      <span class="r-nav r-credits">
        <b>ⓘ</b>
        Credits
      </span>
    </aside>
    <div class="r-main">
      <header class="r-head">
        <span
          v-if="state.tab === 'practice'"
          class="r-settings-toggle"
          data-target="settings"
        >
          {{ state.settingsOpen ? "Close settings ×" : "Settings ☰" }}
        </span>
        <span class="r-title">
          {{
            state.tab === "practice" ? "Sentence practice" : "Practice journal"
          }}
        </span>
        <small v-if="state.tab === 'practice'">Guided</small>
      </header>

      <div
        v-if="state.tab === 'practice'"
        class="r-layout"
        :class="{
          'settings-open': state.settingsOpen,
          'grammar-open': state.grammarOpen,
        }"
      >
        <section class="r-settings" data-target="panel">
          <div data-target="difficulty">
            <h4>Practice difficulty</h4>
            <div class="r-seg">
              <span class="on">Guided</span>
              <span>Challenge</span>
            </div>
            <p>
              Practice with breakdowns, grammar reference, romaji, and word
              hints.
            </p>
          </div>
          <div data-target="level">
            <h4>Vocabulary level</h4>
            <div class="r-levels">
              <span
                v-for="item in levels"
                :key="item"
                :class="{ on: state.level === item }"
              >
                {{ item }}
              </span>
            </div>
          </div>
          <div data-target="length">
            <h4>Sentence length</h4>
            <div class="r-lengths">
              <span
                v-for="([label, note], index) in lengths"
                :key="label"
                :class="{ on: index === 0 }"
              >
                {{ label }}
                <small>{{ note }}</small>
              </span>
            </div>
          </div>
          <div data-target="mode">
            <h4>Writing mode</h4>
            <span
              v-for="item in modes"
              :key="item.value"
              class="r-mode"
              :class="{ on: state.mode === item.value }"
            >
              <b lang="ja">{{ item.mark }}</b>
              {{ item.label }}
              <i>{{ state.mode === item.value ? "●" : "○" }}</i>
            </span>
          </div>
        </section>

        <div ref="column" class="r-column">
          <section class="r-prompt" data-target="prompt">
            <p class="r-label">TRANSLATE INTO JAPANESE</p>
            <h3>
              <span
                v-for="(word, index) in promptWords"
                :key="index"
                :class="{
                  'r-word': word.hint,
                  active: state.hintOpen && word.text === 'cold',
                }"
                :data-target="word.text === 'cold' ? 'hint' : undefined"
                v-text="word.text"
              />
              <span class="r-period" v-text="'.'" />
            </h3>
            <div
              class="r-hint"
              :class="{ open: state.hintOpen }"
              data-target="hintbox"
            >
              <small>JAPANESE HINT · “cold”</small>
              <span lang="ja">冷たい</span>
              つめたい · tsumetai — cold (to the touch)
            </div>
            <div class="r-prompt-tools">
              <span class="r-romaji" :class="{ open: state.romaji }">
                tsumetai mizu ga nomitai desu
              </span>
              <span>{{ state.romaji ? "Hide" : "Show" }} romaji hint</span>
              <span>Another sentence ↻</span>
            </div>
          </section>
          <p class="r-previous">No previous attempt in your journal.</p>

          <section class="r-writing" data-target="writing">
            <div class="r-writing-head">
              <span class="r-label">YOUR JAPANESE</span>
              <span class="r-chip-link">Answer breakdown ↗</span>
              <span class="r-chip-link" :class="{ on: state.grammarOpen }">
                Grammar reference ↗
              </span>
            </div>
            <div class="r-seg r-input-toggle">
              <span :class="{ on: state.input === 'type' }">Type</span>
              <span :class="{ on: state.input === 'chips' }">Word chips</span>
            </div>
            <div v-if="state.input === 'type'" class="r-paper">
              <span class="r-draft" data-target="answer">
                <span
                  v-if="state.typed"
                  lang="ja"
                  :class="{ composing: state.composing }"
                >
                  {{ state.typed }}
                </span>
                <span v-else class="r-placeholder" lang="ja">
                  ここに書いてください。
                </span>
                <i class="r-caret"></i>
              </span>
            </div>
            <div v-else class="r-chips" data-target="chips">
              <p v-if="!state.chipsPlaced">
                Tap or drag words below to build your sentence.
              </p>
              <span
                v-for="chip in chipSlots"
                :key="chip.text"
                class="r-chip"
                lang="ja"
                :class="{ placed: chip.placed, matched: state.checked }"
                :style="{
                  width: `${chip.width}px`,
                  transform: `translate(${chip.x}px, ${chip.y}px)`,
                }"
              >
                {{ chip.text }}
              </span>
            </div>
          </section>

          <div class="r-check" :class="{ checked: state.checked }">
            <span v-if="state.checked" class="r-outcome">
              ✓ Matches the reference
            </span>
            <span v-else>Ctrl / ⌘ + Enter</span>
            <span class="r-check-button" data-target="check">
              {{ state.checked ? "Next sentence" : "Check writing" }}
              <b>→</b>
            </span>
          </div>

          <section
            class="r-feedback"
            :class="{ shown: state.checked }"
            data-target="feedback"
          >
            <p class="r-label">REFERENCE ANSWER</p>
            <p class="r-reference" lang="ja">冷たい水が飲みたいです。</p>
            <p class="r-note">
              Your writing matches the reference. Spaces and punctuation are
              ignored.
            </p>
          </section>

          <section class="r-breakdown" data-target="breakdown">
            <h4>Answer breakdown</h4>
            <p>Words from the reference, in sentence order.</p>
            <div class="r-cards">
              <article
                v-for="(card, index) in breakdown"
                :key="card.word"
                :class="{ shown: index < state.breakdown }"
                :data-target="card.grammar ? 'tai' : undefined"
              >
                <header>
                  <span lang="ja">{{ card.word }}</span>
                  <small>{{ card.kind }}</small>
                </header>
                <p class="r-reading" lang="ja">{{ card.reading }}</p>
                <p>{{ card.meaning }}</p>
                <p v-if="card.grammar" class="r-grammar">
                  ▸ Grammar · {{ card.grammar }}
                  <small>飲む + たい → want to drink</small>
                </p>
              </article>
            </div>
          </section>
        </div>

        <section class="r-reference-panel" data-target="grammar">
          <header>
            <span class="r-label">LOOK IT UP</span>
            <b>Grammar reference</b>
            <i>×</i>
          </header>
          <small>Search in English, Japanese, or romaji</small>
          <div class="r-search">
            <span v-if="state.query">{{ state.query }}</span>
            <span v-else class="r-placeholder">
              “want to”, “because”, ～たい…
            </span>
            <i class="r-caret"></i>
          </div>
          <p class="r-count">
            {{
              state.query.length > 3 ? "3 grammar points" : "529 grammar points"
            }}
          </p>
          <article
            v-for="item in state.query.length > 3
              ? grammarResults
              : grammarIdle"
            :key="item.pattern"
            class="r-pattern"
            :class="{ top: item.pattern === '～たい' }"
          >
            <header>
              <b lang="ja">{{ item.pattern }}</b>
              <small>{{ "level" in item ? item.level : "N5" }}</small>
            </header>
            <p>{{ item.meaning }}</p>
            <span>{{ item.topic }}</span>
          </article>
        </section>
      </div>

      <section v-else class="r-journal" data-target="journal">
        <div class="r-journal-head">
          <p>4 sentences · latest attempt at each</p>
          <span>Practice ↗</span>
        </div>
        <article v-for="entry in journal" :key="entry.english">
          <span class="r-meta">{{ entry.level }} · {{ entry.when }}</span>
          <p>{{ entry.english }}</p>
          <p class="r-entry-ja" lang="ja">{{ entry.japanese }}</p>
          <span :class="entry.matched ? 'r-ok' : 'r-miss'">
            {{
              entry.matched
                ? "✓ Matches the reference"
                : "× Does not match the reference"
            }}
          </span>
          <span class="r-entry-actions">Breakdown · Retry ↻</span>
        </article>
      </section>
    </div>
  </div>
</template>

<style scoped>
.replica {
  position: relative;
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  width: 1280px;
  height: 800px;
  overflow: hidden;
  background: var(--paper);
  color: var(--ink);
  font:
    11px/1.5 ui-monospace,
    SFMono-Regular,
    Menlo,
    monospace;
  user-select: none;
}
[lang="ja"] {
  font-family: "Hiragino Mincho ProN", "Yu Mincho", serif;
}
.r-label {
  margin: 0;
  color: var(--muted);
  font-size: 9px;
  letter-spacing: 0.14em;
}
.r-placeholder {
  color: var(--muted);
  opacity: 0.7;
}
.r-rail {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  border-right: 1px solid var(--line);
  background: rgba(31, 28, 23, 0.035);
}
.r-logo {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  margin-bottom: 18px;
  background: var(--primary);
  color: var(--surface);
  font-size: 25px;
}
.r-nav {
  display: grid;
  justify-items: center;
  gap: 4px;
  width: 60px;
  padding: 9px 0;
  color: var(--secondary);
  font-size: 9px;
  transition:
    background 0.3s,
    color 0.3s;
}
.r-nav b {
  font-size: 22px;
  font-weight: 400;
}
.r-nav i {
  font-style: normal;
  margin-left: 3px;
}
.r-nav.active {
  background: rgba(185, 51, 39, 0.1);
  color: var(--primary);
  box-shadow: inset 0 0 0 1px rgba(185, 51, 39, 0.25);
}
.r-credits {
  margin-top: auto;
}
.r-main {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--surface);
}
.r-head {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
  height: 65px;
  padding: 0 24px;
  border-bottom: 1px solid var(--line);
  background: var(--paper);
}
.r-settings-toggle {
  position: relative;
  padding: 8px 10px;
  border: 1px solid var(--line);
  background: rgba(251, 247, 232, 0.7);
}
.r-title {
  font:
    500 21px Georgia,
    serif;
  letter-spacing: -0.02em;
}
.r-head small {
  color: var(--muted);
  font-size: 9px;
  letter-spacing: 0.08em;
}
.r-layout {
  position: relative;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 0 minmax(0, 1fr) 0;
  grid-template-rows: minmax(0, 1fr);
  transition: grid-template-columns 0.6s cubic-bezier(0.65, 0, 0.35, 1);
}
.r-layout.settings-open {
  grid-template-columns: 265px minmax(0, 1fr) 0;
}
.r-layout.grammar-open {
  grid-template-columns: 0 minmax(0, 1fr) 400px;
}
.r-settings {
  position: relative;
  overflow: hidden;
  min-width: 0;
  padding: 0;
  background: var(--paper);
  border-right: 1px solid var(--line);
}
.r-settings > div {
  position: relative;
  width: 265px;
  padding: 16px 20px 6px;
}
.r-settings h4 {
  margin: 0 0 9px;
  font:
    600 12px system-ui,
    sans-serif;
}
.r-settings p {
  margin: 8px 0 0;
  color: var(--secondary);
  font:
    11px/1.5 system-ui,
    sans-serif;
}
.r-seg {
  display: flex;
  gap: 4px;
}
.r-seg span,
.r-levels span,
.r-lengths span,
.r-mode {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--line);
  background: var(--surface);
  text-align: center;
  transition:
    background 0.3s,
    color 0.3s,
    border-color 0.3s;
}
.r-seg .on,
.r-lengths .on,
.r-mode.on {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(185, 51, 39, 0.06);
}
.r-levels {
  display: flex;
}
.r-levels span + span {
  border-left: 0;
}
.r-levels .on {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--surface);
}
.r-lengths {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}
.r-lengths small {
  display: block;
  color: var(--muted);
  font-size: 8px;
}
.r-mode {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 5px;
  text-align: left;
}
.r-mode b {
  width: 26px;
  font-size: 14px;
  font-weight: 400;
}
.r-mode i {
  margin-left: auto;
  font-style: normal;
  color: var(--primary);
}
.r-column {
  position: relative;
  min-width: 0;
  overflow: hidden;
}
.r-prompt {
  position: relative;
  padding: 18px 28px 14px;
}
.r-prompt h3 {
  margin: 12px 0 6px;
  font:
    400 38px/1.2 Georgia,
    serif;
  letter-spacing: -0.02em;
}
.r-prompt h3 > span {
  margin-right: 0.24em;
}
.r-prompt h3 > .r-period {
  margin-left: -0.24em;
}
.r-word {
  position: relative;
  border-bottom: 1.5px dotted rgba(31, 28, 23, 0.45);
  transition:
    color 0.3s,
    background 0.3s;
}
.r-word.active {
  color: var(--primary);
  background: rgba(185, 51, 39, 0.08);
  border-bottom-color: var(--primary);
}
.r-hint {
  position: absolute;
  z-index: 2;
  top: 104px;
  left: 300px;
  display: grid;
  gap: 2px;
  padding: 12px 16px;
  border: 1px solid var(--line);
  background: var(--surface);
  box-shadow: 0 18px 40px rgba(53, 48, 39, 0.16);
  color: var(--secondary);
  opacity: 0;
  transform: translateY(-8px);
  transition:
    opacity 0.35s,
    transform 0.35s;
}
.r-hint.open {
  opacity: 1;
  transform: none;
}
.r-hint small {
  color: var(--primary);
  font-size: 8px;
  letter-spacing: 0.12em;
}
.r-hint span {
  color: var(--ink);
  font-size: 24px;
}
.r-prompt-tools {
  display: flex;
  justify-content: flex-end;
  align-items: baseline;
  gap: 18px;
  font-size: 10px;
}
.r-romaji {
  margin-right: auto;
  color: var(--green);
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.4s;
}
.r-romaji.open {
  opacity: 1;
}
.r-previous {
  margin: 0;
  padding: 10px 28px 14px;
  border-bottom: 1px solid var(--line);
  color: var(--secondary);
  font-size: 10px;
}
.r-writing {
  position: relative;
  padding: 18px 28px 20px;
}
.r-writing-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.r-writing-head .r-label {
  margin-right: auto;
}
.r-chip-link {
  padding: 6px 9px;
  border: 1px solid rgba(185, 51, 39, 0.4);
  color: var(--primary);
  font-size: 10px;
  transition: background 0.3s;
}
.r-chip-link.on {
  background: rgba(185, 51, 39, 0.1);
}
.r-input-toggle {
  width: 180px;
  margin: 14px 0 12px;
}
.r-paper {
  position: relative;
  height: 160px;
  padding: 14px 6px;
  background: repeating-linear-gradient(
    transparent 0 39px,
    var(--line) 39px 40px
  );
  font-size: 30px;
  line-height: 40px;
  border-top: 1px solid var(--line);
}
.composing {
  text-decoration: underline 2px var(--action);
  text-underline-offset: 8px;
}
.r-caret {
  display: inline-block;
  width: 2px;
  height: 30px;
  margin-left: 2px;
  vertical-align: -6px;
  background: var(--primary);
  animation: caret 1s steps(1) infinite;
}
@keyframes caret {
  50% {
    opacity: 0;
  }
}
.r-draft {
  display: inline-block;
  min-width: 560px;
  height: 120px;
}
.r-chips {
  position: relative;
  width: 600px;
  height: 160px;
  border-top: 1px solid var(--line);
}
.r-chips::after {
  content: "";
  position: absolute;
  inset: 98px 0 auto;
  border-top: 1px solid var(--line);
}
.r-chips p {
  margin: 14px 0 0;
  color: var(--secondary);
  font:
    12px system-ui,
    sans-serif;
}
.r-chip {
  position: absolute;
  top: 0;
  left: 0;
  display: grid;
  place-items: center;
  height: 44px;
  border: 1px solid rgba(31, 28, 23, 0.25);
  background: var(--surface);
  box-shadow: 0 2px 0 rgba(31, 28, 23, 0.12);
  font-size: 20px;
  transition:
    transform 0.55s cubic-bezier(0.34, 1.4, 0.64, 1),
    border-color 0.3s,
    background 0.3s;
}
.r-chip.placed {
  border-color: rgba(185, 51, 39, 0.5);
}
.r-chip.placed.matched {
  border-color: var(--green);
  background: rgba(64, 125, 101, 0.1);
}
.r-check {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 28px;
  border-block: 1px solid var(--line);
  background: var(--paper);
  color: var(--secondary);
  font-size: 10px;
}
.r-check-button {
  display: inline-flex;
  gap: 40px;
  padding: 13px 18px;
  background: var(--action);
  color: var(--surface);
  transition: background 0.4s;
}
.r-check.checked .r-check-button {
  background: var(--ink);
}
.r-outcome {
  color: var(--green);
  font-size: 12px;
  font-weight: 600;
}
.r-feedback,
.r-breakdown {
  opacity: 0;
}
.r-feedback {
  padding: 22px 28px;
  border-left: 3px solid var(--green);
  transition: opacity 0.5s;
}
.r-feedback.shown,
.r-feedback.shown + .r-breakdown {
  opacity: 1;
}
.r-feedback .r-label {
  color: var(--green);
}
.r-reference {
  margin: 12px 0 8px;
  font-size: 32px;
}
.r-reference::selection {
  background: none;
}
.r-note {
  margin: 0;
  color: var(--secondary);
  font:
    12px system-ui,
    sans-serif;
}
.r-breakdown {
  transition: opacity 0.5s;
  margin: 0 28px 28px;
  padding: 18px;
  border: 1px solid var(--line);
}
.r-breakdown h4 {
  margin: 0;
  font:
    600 13px system-ui,
    sans-serif;
}
.r-breakdown > p {
  margin: 4px 0 14px;
  color: var(--secondary);
  font:
    11px system-ui,
    sans-serif;
}
.r-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}
.r-cards article {
  position: relative;
  padding: 12px;
  border: 1px solid var(--line);
  background: var(--surface);
  opacity: 0;
  transform: translateY(18px) rotate(-1.5deg);
  transition:
    opacity 0.45s,
    transform 0.6s cubic-bezier(0.34, 1.4, 0.64, 1);
}
.r-cards article.shown {
  opacity: 1;
  transform: none;
}
.r-cards header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.r-cards header span {
  font-size: 24px;
}
.r-cards header small {
  color: var(--green);
  font-size: 8px;
}
.r-cards p {
  margin: 6px 0 0;
  font:
    11px/1.4 system-ui,
    sans-serif;
  color: var(--secondary);
}
.r-cards .r-reading {
  font-size: 10px;
  color: var(--muted);
}
.r-cards .r-grammar {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--line);
  color: var(--green);
  font-weight: 600;
}
.r-grammar small {
  display: block;
  margin-top: 3px;
  color: var(--secondary);
  font-weight: 400;
}
.r-reference-panel {
  position: relative;
  overflow: hidden;
  min-width: 0;
  border-left: 1px solid var(--line);
  background: var(--paper);
}
.r-reference-panel > * {
  width: 400px;
  margin-inline: 0;
  padding-inline: 22px;
}
.r-reference-panel > header {
  display: grid;
  grid-template-columns: 1fr auto;
  padding-block: 18px 12px;
}
.r-reference-panel > header b {
  font:
    400 22px Georgia,
    serif;
}
.r-reference-panel > header i {
  grid-row: 1 / 3;
  grid-column: 2;
  align-self: center;
  font-style: normal;
  font-size: 16px;
}
.r-reference-panel > small {
  display: block;
  color: var(--secondary);
}
.r-search {
  width: calc(400px - 44px);
  margin: 6px 22px 10px;
  padding: 11px 12px;
  border: 1px solid var(--line);
  background: var(--surface);
  font:
    14px system-ui,
    sans-serif;
}
.r-search .r-caret {
  height: 16px;
  vertical-align: -3px;
}
.r-count {
  margin: 0 0 4px;
  color: var(--muted);
  font-size: 9px;
}
.r-pattern {
  width: calc(400px - 44px);
  margin: 0 22px;
  padding: 12px 0;
  border-top: 1px solid var(--line);
  animation: rise 0.5s both;
}
.r-pattern header {
  display: flex;
  justify-content: space-between;
}
.r-pattern b {
  font-size: 19px;
  font-weight: 400;
}
.r-pattern header small {
  padding: 1px 5px;
  border: 1px solid var(--line);
  font-size: 8px;
}
.r-pattern p {
  margin: 2px 0 6px;
  font:
    12px system-ui,
    sans-serif;
}
.r-pattern > span {
  padding: 2px 6px;
  border: 1px solid var(--line);
  color: var(--secondary);
  font-size: 9px;
}
.r-pattern.top b {
  color: var(--primary);
}
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
}
.r-journal {
  position: relative;
  padding: 22px 28px;
}
.r-journal-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 14px;
  color: var(--secondary);
}
.r-journal-head p {
  margin: 0;
}
.r-journal article {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 20px;
  padding: 16px 0;
  border-top: 1px solid var(--line);
  animation: rise 0.5s both;
}
.r-journal article:nth-of-type(2) {
  animation-delay: 0.08s;
}
.r-journal article:nth-of-type(3) {
  animation-delay: 0.16s;
}
.r-journal article:nth-of-type(4) {
  animation-delay: 0.24s;
}
.r-meta {
  grid-column: 1 / -1;
  color: var(--muted);
  font-size: 9px;
  letter-spacing: 0.08em;
}
.r-journal article p {
  margin: 0;
  font:
    18px Georgia,
    serif;
}
.r-journal .r-entry-ja {
  grid-row: span 2;
  align-self: center;
  font-size: 24px;
}
.r-ok,
.r-miss {
  font-size: 10px;
  color: var(--green);
}
.r-miss {
  color: var(--primary);
}
.r-entry-actions {
  grid-column: 1 / -1;
  color: var(--secondary);
  font-size: 10px;
}
@media (prefers-reduced-motion: reduce) {
  .replica *,
  .replica {
    animation: none !important;
    transition: none !important;
  }
}
</style>
