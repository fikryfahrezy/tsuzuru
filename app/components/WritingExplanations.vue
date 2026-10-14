<script setup lang="ts">
import type { WritingExplanation } from "#shared/practice";
const props = withDefaults(
  defineProps<{
    explanations: WritingExplanation[];
    expanded?: boolean;
  }>(),
  { expanded: true },
);
</script>

<template>
  <details
    v-if="props.explanations.length"
    class="writing-explanations"
    :open="props.expanded !== false"
  >
    <summary>Why it differs</summary>
    <ol>
      <li v-for="(explanation, index) in props.explanations" :key="index">
        <h3>{{ explanation.title }}</h3>
        <p>{{ explanation.detail }}</p>
        <dl>
          <div>
            <dt>You wrote</dt>
            <dd :lang="explanation.actual ? 'ja' : undefined">
              {{ explanation.actual || "Nothing" }}
            </dd>
          </div>
          <div>
            <dt>Expected</dt>
            <dd :lang="explanation.expected ? 'ja' : undefined">
              {{ explanation.expected || "Nothing" }}
            </dd>
          </div>
        </dl>
        <p v-if="explanation.context" class="explanation-context">
          Position in reference:
          <span lang="ja">{{ explanation.context }}</span>
        </p>
      </li>
    </ol>
  </details>
</template>

<style scoped>
.writing-explanations {
  margin-top: 22px;
  border-top: 1px solid var(--line);
  padding-top: 16px;
}
.writing-explanations summary {
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
}
.writing-explanations ol {
  padding-left: 22px;
  margin: 18px 0 0;
}
.writing-explanations li {
  padding: 0 0 18px 4px;
}
.writing-explanations li:last-child {
  padding-bottom: 0;
}
.writing-explanations h3 {
  margin: 0 0 8px;
  font:
    600 13px/1.5 system-ui,
    sans-serif;
}
.writing-explanations p {
  margin: 0 0 12px;
  font:
    12px/1.75 system-ui,
    sans-serif;
  color: var(--secondary);
}
.writing-explanations dl {
  margin: 0 0 12px;
  display: grid;
  gap: 8px;
}
.writing-explanations dl > div {
  display: grid;
  grid-template-columns: 85px minmax(0, 1fr);
  gap: 10px;
  align-items: baseline;
}
.writing-explanations dt {
  font-size: 10px;
  color: var(--muted);
}
.writing-explanations dd {
  margin: 0;
  font:
    16px/1.7 "Yu Mincho",
    serif;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.writing-explanations .explanation-context {
  margin: 0;
  font-size: 11px;
}
.explanation-context span {
  font:
    14px/1.8 system-ui,
    sans-serif;
  overflow-wrap: anywhere;
}
</style>
