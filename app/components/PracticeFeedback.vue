<script setup lang="ts">
import { computed } from "vue";
import {
  normalize,
  type AnswerBreakdownPart,
  type Comparison,
  type SpellingOption,
} from "#shared/practice";
const props = defineProps<{
  result: Comparison;
  revealed: boolean;
  breakdown: AnswerBreakdownPart[];
  spellingOptions?: SpellingOption[];
}>();
const displayedReference = computed(() =>
  props.result?.differences && !props.revealed
    ? props.result.differences.expected.map((part) => part.text).join("")
    : (props.result?.reference ?? ""),
);
</script>

<template>
  <section
    class="feedback"
    :class="{ matched: result.matched && !revealed }"
    aria-live="polite"
  >
    <p class="eyebrow">
      {{
        !revealed && !result.matched ? "Expected writing" : "Reference answer"
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
        result.kana && normalize(result.kana) !== normalize(displayedReference)
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
    <details :key="result.reference" class="reference-breakdown">
      <summary>Answer breakdown</summary>
      <AnswerBreakdown :parts="breakdown" :shuffled="false" />
    </details>
    <WritingExplanations
      v-if="!revealed && !result.matched"
      :explanations="result.explanations ?? []"
    />
    <details
      v-if="spellingOptions?.length"
      :key="`${result.reference}-spellings`"
      class="reference-breakdown"
    >
      <summary>
        Accepted spelling variants ({{ spellingOptions.length }}
        {{ spellingOptions.length === 1 ? "word" : "words" }})
      </summary>
      <p class="feedback-note">
        Accepted in Kana + kanji mode, even when alternative translations are
        off.
      </p>
      <ul class="spelling-options">
        <li
          v-for="option in spellingOptions"
          :key="`${option.japanese}-${option.kana}`"
          lang="ja"
        >
          {{ option.japanese }} → {{ option.spellings.join(" / ") }}
          <span class="spelling-reading">（{{ option.kana }}）</span>
        </li>
      </ul>
    </details>
    <AlternativeAnswers
      v-if="result.alternatives"
      :alternatives="result.alternatives"
      :matched-japanese="
        !revealed ? result.acceptedAlternative?.japanese : undefined
      "
    />
  </section>
</template>

<style scoped>
.feedback {
  padding: 23px 32px;
  border-top: 1px solid var(--line);
  border-left: 3px solid var(--primary);
}
.feedback.matched {
  border-left-color: var(--green);
  background: rgba(64, 125, 101, 0.04);
}
.feedback.matched .eyebrow {
  color: var(--green);
}
.feedback .eyebrow {
  margin: 0 0 12px;
  text-transform: uppercase;
}
.reference-breakdown {
  margin-top: 22px;
  border-top: 1px solid var(--line);
  padding-top: 16px;
}
.reference-breakdown summary {
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
}
.feedback-note {
  font:
    12px/1.6 system-ui,
    sans-serif;
  color: var(--secondary);
}
.spelling-options {
  padding-left: 20px;
  font-size: 15px;
  line-height: 1.8;
}
.spelling-reading {
  color: var(--muted);
  font-size: 12px;
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
@media (max-width: 640px) {
  .feedback {
    padding: 20px;
  }
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
</style>
