<script setup lang="ts">
import type { AnswerBreakdownPart } from "#shared/practice";
import type { GrammarExplanation } from "#shared/grammar";
import { ref, watch } from "vue";

const props = withDefaults(
  defineProps<{ parts: AnswerBreakdownPart[]; shuffled?: boolean }>(),
  { shuffled: true },
);
const highlightedGrammar = ref<GrammarExplanation | null>(null);

function isSelected(grammar: GrammarExplanation) {
  const selected = highlightedGrammar.value;
  return (
    selected?.id === grammar.id &&
    selected.start === grammar.start &&
    selected.end === grammar.end
  );
}

function coversPart(grammar: GrammarExplanation, part: AnswerBreakdownPart) {
  return (
    typeof part.start === "number" &&
    typeof part.end === "number" &&
    part.start < grammar.end &&
    part.end > grammar.start
  );
}

function canHighlight(grammar: GrammarExplanation) {
  return props.parts.some((part) => coversPart(grammar, part));
}

function toggleHighlight(grammar: GrammarExplanation) {
  highlightedGrammar.value = isSelected(grammar) ? null : grammar;
}

watch(
  () => props.parts,
  () => {
    highlightedGrammar.value = null;
  },
);
</script>

<template>
  <section class="answer-breakdown" aria-label="Answer breakdown">
    <h3>Answer breakdown</h3>
    <p class="breakdown-help">
      Words from the reference, in
      {{ shuffled ? "shuffled" : "sentence" }} order. Meanings may vary with
      context. Grammar shows the full phrase it applies to. Expand a grammar
      point for its formation and an example. Tap “Applies to” to highlight the
      words it covers.
    </p>
    <p v-if="highlightedGrammar" class="highlight-status" role="status">
      Highlighted phrase:
      <span lang="ja">{{ highlightedGrammar.japanese }}</span>
      <button
        type="button"
        class="clear-highlight"
        @click="highlightedGrammar = null"
      >
        Clear highlight
      </button>
    </p>
    <ul tabindex="0" aria-label="Answer breakdown items">
      <li
        v-for="(part, index) in parts"
        :key="index"
        :class="{
          'is-highlighted':
            highlightedGrammar && coversPart(highlightedGrammar, part),
        }"
      >
        <div class="breakdown-heading">
          <span class="breakdown-word" lang="ja">{{ part.japanese }}</span>
          <span v-if="part.wordTypes.length" class="breakdown-type">
            {{ part.wordTypes.join(" · ") }}
          </span>
        </div>
        <p class="breakdown-reading">
          <span lang="ja">{{ part.kana }}</span>
          ·
          <span lang="ja-Latn">{{ part.romaji }}</span>
        </p>
        <p v-if="part.dictionaryForm" class="breakdown-base">
          Dictionary form:
          <span lang="ja">{{ part.dictionaryForm }}</span>
        </p>
        <p v-if="part.spellings?.length" class="breakdown-base">
          Accepted spellings:
          <span lang="ja">{{ part.spellings.join(" / ") }}</span>
        </p>
        <ul v-if="part.meanings.length" class="breakdown-meanings">
          <li v-for="meaning in part.meanings" :key="meaning">{{ meaning }}</li>
        </ul>
        <details
          v-if="part.dictionaryMeanings?.length"
          class="breakdown-dictionary"
        >
          <summary>Dictionary senses</summary>
          <ul class="breakdown-meanings">
            <li v-for="meaning in part.dictionaryMeanings" :key="meaning">
              {{ meaning }}
            </li>
          </ul>
          <p class="breakdown-note">
            General dictionary meanings; may not apply here.
          </p>
        </details>
        <p v-if="part.note" class="breakdown-note">{{ part.note }}</p>
        <details
          v-for="grammar in part.grammar ?? []"
          :key="`${grammar.id}-${grammar.start}-${grammar.end}`"
          class="breakdown-grammar"
          :class="{ 'is-selected': isSelected(grammar) }"
        >
          <summary>
            <span class="grammar-label">
              Grammar ·
              <span lang="ja">{{ grammar.pattern }}</span>
            </span>
            <button
              v-if="canHighlight(grammar)"
              type="button"
              class="grammar-scope grammar-scope-toggle"
              :aria-pressed="isSelected(grammar)"
              :aria-label="`${isSelected(grammar) ? 'Clear highlight for' : 'Highlight breakdown words for'} ${grammar.japanese}`"
              @click.stop="toggleHighlight(grammar)"
              @keydown.stop
            >
              Applies to:
              <span lang="ja">{{ grammar.japanese }}</span>
            </button>
            <span v-else class="grammar-scope">
              Applies to:
              <span lang="ja">{{ grammar.japanese }}</span>
            </span>
            <span class="grammar-meaning">{{ grammar.meaning }}</span>
          </summary>
          <p>
            <strong>Formation:</strong>
            {{ grammar.formation }}
          </p>
          <p v-if="grammar.notes">{{ grammar.notes }}</p>
          <div v-if="grammar.example" class="grammar-example">
            <p lang="ja">{{ grammar.example.ja }}</p>
            <p>{{ grammar.example.en }}</p>
          </div>
        </details>
        <p
          v-if="!part.meanings.length && !part.note && !part.grammar?.length"
          class="breakdown-note"
        >
          No contextual meaning available for this form.
        </p>
      </li>
    </ul>
    <p
      v-if="parts.some((part) => part.grammar?.length)"
      class="breakdown-credit"
    >
      Grammar lessons from OpenJLPT · CC BY-SA 4.0.
      <NuxtLink to="/sources" target="_blank">Data &amp; credits ↗</NuxtLink>
    </p>
    <p v-if="!parts.length" class="breakdown-help">
      No breakdown available for this sentence.
    </p>
  </section>
</template>

<style scoped>
.answer-breakdown {
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--line);
  background: rgba(251, 247, 232, 0.6);
  margin-block: 16px;
  font:
    13px/1.6 system-ui,
    sans-serif;
}
h3 {
  margin: 0 0 4px;
  font-size: 14px;
}
.breakdown-help {
  margin: 0 0 16px;
  color: var(--secondary);
  font-size: 12px;
}
.answer-breakdown > ul {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: min(280px, 100%);
  overflow-x: auto;
  gap: 12px;
  padding: 0 0 8px;
  margin: 0;
  list-style: none;
}
.answer-breakdown > ul:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
.answer-breakdown > ul > li {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--line);
  background: var(--surface);
  overflow-wrap: anywhere;
}
.answer-breakdown > ul > li.is-highlighted {
  border-color: var(--green);
  background: color-mix(in srgb, var(--green) 12%, var(--surface));
  box-shadow: inset 0 3px var(--green);
}
.highlight-status {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 12px;
  color: var(--green);
  font-size: 12px;
}
.clear-highlight {
  padding: 2px 4px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}
.breakdown-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}
.breakdown-word {
  font:
    23px/1.5 "Hiragino Mincho ProN",
    "Yu Mincho",
    serif;
}
.breakdown-type {
  font-size: 11px;
  color: var(--green);
}
.breakdown-reading,
.breakdown-base {
  margin: 5px 0;
  color: var(--secondary);
  font-size: 12px;
}
.breakdown-meanings {
  padding-left: 18px;
  margin: 10px 0 0;
}
.breakdown-note {
  margin: 10px 0 0;
  color: var(--secondary);
}
.breakdown-grammar {
  margin-top: 12px;
  border-top: 1px solid var(--line);
  padding-top: 10px;
}
.breakdown-grammar summary {
  cursor: pointer;
}
.grammar-label {
  color: var(--green);
  font-weight: 600;
}
.grammar-meaning {
  display: block;
  margin-top: 4px;
}
.grammar-scope {
  display: block;
  margin-top: 4px;
  color: var(--secondary);
  font-size: 12px;
}
.grammar-scope-toggle {
  width: 100%;
  padding: 5px 7px;
  border: 1px dashed var(--line);
  border-radius: 3px;
  background: transparent;
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}
.grammar-scope-toggle:hover,
.breakdown-grammar.is-selected .grammar-scope-toggle {
  border-color: var(--green);
  background: color-mix(in srgb, var(--green) 10%, var(--surface));
  color: var(--green);
}
.breakdown-grammar.is-selected .grammar-label {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.grammar-scope-toggle:focus-visible,
.clear-highlight:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 2px;
}
.breakdown-grammar p {
  margin: 8px 0;
}
.grammar-example {
  border-left: 2px solid var(--line);
  padding-left: 10px;
}
.breakdown-credit {
  color: var(--secondary);
  font-size: 11px;
  margin: 16px 0 0;
}
</style>
