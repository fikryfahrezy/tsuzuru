<script setup lang="ts">
import type { AlternativeAnswer } from "#shared/practice";

defineProps<{
  alternatives: AlternativeAnswer[];
  matchedJapanese?: string;
}>();
</script>

<template>
  <details class="alternative-answers">
    <summary>Alternative translations ({{ alternatives.length }})</summary>
    <p v-if="!alternatives.length" class="alternative-note">
      No additional translations are listed for this sentence.
    </p>
    <ul v-else>
      <li v-for="alternative in alternatives" :key="alternative.japanese">
        <p
          v-if="alternative.japanese === matchedJapanese"
          class="alternative-match"
        >
          ✓ Matched your answer
        </p>
        <p class="alternative-japanese" lang="ja">{{ alternative.japanese }}</p>
        <p class="alternative-reading" lang="ja">{{ alternative.kana }}</p>
        <p class="alternative-note">
          Source: {{ alternative.provenance.creator }}.
          {{ alternative.provenance.note }}
        </p>
      </li>
    </ul>
    <NuxtLink v-if="alternatives.length" to="/sources">
      Data &amp; credits
    </NuxtLink>
  </details>
</template>

<style scoped>
.alternative-answers {
  margin-top: 22px;
  border-top: 1px solid var(--line);
  padding-top: 16px;
}
summary {
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
}
ul {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
}
li + li {
  margin-top: 12px;
}
p {
  margin: 0 0 6px;
}
.alternative-japanese {
  font-family: "Yu Mincho", serif;
  font-size: 16px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.alternative-reading {
  color: var(--muted);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.alternative-note {
  margin-top: 8px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.6;
}
.alternative-match {
  color: var(--green);
  font-size: 12px;
}
a {
  color: var(--muted);
  font-size: 12px;
  text-underline-offset: 4px;
}
</style>
