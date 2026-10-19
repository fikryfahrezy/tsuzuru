<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { JournalOutcome, type JournalEntry } from "~/utils/practice";
import type { AnswerBreakdownPart, SpellingOption } from "#shared/practice";
const props = defineProps<{ journal: JournalEntry[]; checking: boolean }>();
const visibleCount = ref(50);
const unmatchedOnly = ref(false);
const filteredEntries = computed(() =>
  unmatchedOnly.value
    ? props.journal.filter(
        (entry) => entry.outcome === JournalOutcome.Unmatched,
      )
    : props.journal,
);
const visibleEntries = computed(() =>
  filteredEntries.value.slice(0, visibleCount.value),
);
watch(unmatchedOnly, () => {
  visibleCount.value = 50;
});
const emit = defineEmits<{
  clear: [];
  practice: [];
  retry: [entry: JournalEntry];
  breakdown: [
    id: string,
    parts: AnswerBreakdownPart[],
    spellings: SpellingOption[],
  ];
}>();
</script>

<template>
  <section class="journal-panel">
    <div class="card-heading">
      <span class="eyebrow">Your sentences</span>
      <div v-if="journal.length" class="journal-actions">
        <label class="journal-filter">
          <input v-model="unmatchedOnly" type="checkbox" />
          Unmatched only
        </label>
        <button @click="emit('clear')">Clear journal</button>
      </div>
    </div>
    <div v-if="!journal.length" class="empty-journal">
      <h2>No journal entries yet.</h2>
      <p>Your writing and references will appear here after you practice.</p>
      <button class="primary-button" @click="emit('practice')">
        Start writing →
      </button>
    </div>
    <div v-else-if="!filteredEntries.length" class="empty-journal">
      <h2>No unmatched sentences.</h2>
      <p>There are no unmatched attempts in your journal.</p>
      <button class="primary-button" @click="unmatchedOnly = false">
        Show all sentences
      </button>
    </div>
    <PracticeJournalEntry
      v-for="entry in visibleEntries"
      :key="entry.id"
      :entry="entry"
      :checking="checking"
      @retry="emit('retry', entry)"
      @breakdown="
        (id, parts, spellings) => emit('breakdown', id, parts, spellings)
      "
    />
    <button
      v-if="visibleCount < filteredEntries.length"
      class="load-more"
      @click="visibleCount += 50"
    >
      Show more sentences
    </button>
  </section>
</template>

<style scoped>
.load-more {
  display: block;
  margin: 20px auto;
}
.journal-panel {
  border: 1px solid var(--line);
  background: rgba(251, 247, 232, 0.87);
  box-shadow: 0 20px 50px rgba(53, 48, 39, 0.055);
  min-width: 0;
}
.card-heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  padding: 19px 27px;
  border-bottom: 1px solid var(--line);
}
.journal-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 15px;
}
.journal-filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--secondary);
  font-size: 11px;
  cursor: pointer;
}
.journal-filter input {
  accent-color: var(--primary);
}
.card-heading .eyebrow {
  margin: 0;
  font-size: 9px;
  text-transform: uppercase;
}
.journal-panel .card-heading button {
  border: 0;
  background: transparent;
  padding: 5px 0;
  color: var(--secondary);
  font-size: 9px;
}
.empty-journal {
  padding: 55px 25px;
  text-align: center;
}
.empty-journal > span {
  color: var(--primary);
  font:
    50px "Yu Mincho",
    serif;
}
.empty-journal h2 {
  margin: 22px 0 15px;
  font:
    30px Georgia,
    serif;
}
.empty-journal p {
  color: var(--secondary);
  font:
    14px/1.7 system-ui,
    sans-serif;
}
@media (max-width: 640px) {
  .card-heading {
    padding-inline: 20px;
  }
}
.practice-shell .journal-panel {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border: 0;
  box-shadow: none;
}
.practice-shell .journal-panel .card-heading {
  position: sticky;
  top: 0;
  background: var(--surface);
  z-index: 1;
}
@media (max-width: 640px) {
  .practice-shell .card-heading {
    padding-block: 13px;
  }
}
</style>
