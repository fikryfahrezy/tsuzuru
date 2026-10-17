<script setup lang="ts">
import type { AnswerBreakdownPart } from "#shared/practice";
withDefaults(
  defineProps<{ parts: AnswerBreakdownPart[]; shuffled?: boolean }>(),
  { shuffled: true },
);
</script>

<template>
  <section class="answer-breakdown" aria-label="Answer breakdown">
    <h3>Answer breakdown</h3>
    <p class="breakdown-help">
      Words from the reference, in
      {{ shuffled ? "shuffled" : "sentence" }} order. Meanings may vary with
      context. Expand a grammar point for its formation and an example.
    </p>
    <ul tabindex="0" aria-label="Answer breakdown items">
      <li v-for="(part, index) in parts" :key="index">
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
        >
          <summary>
            <span class="grammar-label">
              Grammar ·
              <span lang="ja">{{ grammar.pattern }}</span>
            </span>
            <span class="grammar-meaning">{{ grammar.meaning }}</span>
          </summary>
          <p class="breakdown-base">
            In this answer:
            <span lang="ja">{{ grammar.japanese }}</span>
          </p>
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
