<script setup lang="ts">
import type { SpellingOption } from "#shared/practice";
defineProps<{
  options?: SpellingOption[];
  loading?: boolean;
  error?: string;
}>();
const emit = defineEmits<{ load: [] }>();
function toggle(event: Event) {
  if ((event.currentTarget as HTMLDetailsElement).open) emit("load");
}
</script>

<template>
  <details class="accepted-spellings" @toggle="toggle">
    <summary>
      {{
        options
          ? `Accepted spelling variants (${options.length} ${options.length === 1 ? "word" : "words"})`
          : "Accepted spelling variants"
      }}
    </summary>
    <p v-if="loading" class="spelling-note" role="status">Loading spellings…</p>
    <div v-else-if="error" class="spelling-note" role="status">
      <p>{{ error }}</p>
      <button type="button" @click="emit('load')">Try again ↻</button>
    </div>
    <template v-else-if="options">
      <p class="spelling-note">
        Includes kana readings and verified kanji spellings. In Kana + kanji
        mode, you can combine these choices to form accepted answers, even when
        alternative translations are off.
      </p>
      <ul v-if="options.length" class="spelling-options">
        <li
          v-for="option in options"
          :key="`${option.japanese}-${option.kana}`"
          lang="ja"
        >
          {{ option.japanese }} → {{ option.spellings.join(" / ") }}
          <span class="spelling-reading">（{{ option.kana }}）</span>
        </li>
      </ul>
      <p v-else class="spelling-note">
        No spelling variants for this reference.
      </p>
    </template>
  </details>
</template>

<style scoped>
.accepted-spellings {
  margin-top: 22px;
  border-top: 1px solid var(--line);
  padding-top: 16px;
}
summary {
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
}
.spelling-note {
  font:
    12px/1.6 system-ui,
    sans-serif;
  color: var(--secondary);
}
.spelling-note button {
  border: 1px solid var(--line);
  background: transparent;
  padding: 8px 10px;
  color: var(--primary);
}
.spelling-options {
  padding-left: 20px;
  font-size: 15px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}
.spelling-reading {
  color: var(--muted);
  font-size: 12px;
}
</style>
