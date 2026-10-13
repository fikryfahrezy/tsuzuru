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
