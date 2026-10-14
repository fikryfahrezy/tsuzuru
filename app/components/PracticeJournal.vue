<script setup lang="ts">
import type { JournalEntry } from "~/utils/practice";
defineProps<{ journal: JournalEntry[] }>();
const emit = defineEmits<{ clear: []; practice: [] }>();
</script>

<template>
  <section class="journal-panel">
    <div class="card-heading">
      <span class="eyebrow">YOUR LAST 100 SENTENCES</span>
      <button v-if="journal.length" @click="emit('clear')">
        Clear journal
      </button>
    </div>
    <div v-if="!journal.length" class="empty-journal">
      <h2>No journal entries yet.</h2>
      <p>Your writing and references will appear here after you practice.</p>
      <button class="primary-button" @click="emit('practice')">
        Start writing →
      </button>
    </div>
    <PracticeJournalEntry
      v-for="entry in journal"
      :key="entry.id"
      :entry="entry"
    />
  </section>
</template>

<style scoped>
.journal-panel {
  border: 1px solid var(--line);
  background: rgba(251, 247, 232, 0.87);
  box-shadow: 0 20px 50px rgba(53, 48, 39, 0.055);
  min-width: 0;
}
.card-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  padding: 19px 27px;
  border-bottom: 1px solid var(--line);
}
.card-heading .eyebrow {
  margin: 0;
  font-size: 9px;
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
