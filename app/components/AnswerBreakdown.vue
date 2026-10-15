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
      context.
    </p>
    <ul>
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
        <p v-if="!part.meanings.length && !part.note" class="breakdown-note">
          No contextual meaning available for this form.
        </p>
      </li>
    </ul>
    <p v-if="!parts.length" class="breakdown-help">
      No breakdown available for this sentence.
    </p>
  </section>
</template>

<style scoped>
.answer-breakdown {
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
  grid-template-columns: repeat(auto-fit, minmax(min(230px, 100%), 1fr));
  gap: 12px;
  padding: 0;
  margin: 0;
  list-style: none;
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
</style>
