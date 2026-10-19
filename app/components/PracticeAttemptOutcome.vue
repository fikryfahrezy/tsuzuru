<script setup lang="ts">
import { JournalOutcome, type JournalEntry } from "~/utils/practice";

defineProps<{ entry: JournalEntry }>();
</script>

<template>
  <span
    class="attempt-outcome"
    :class="{
      'success-text': entry.outcome === JournalOutcome.Matched,
      unmatched: entry.outcome === JournalOutcome.Unmatched,
    }"
  >
    {{
      entry.outcome === JournalOutcome.Matched
        ? entry.comparison?.acceptedAlternative
          ? "✓ Matches a pre-generated alternative"
          : "✓ Matches the reference"
        : entry.outcome === JournalOutcome.Revealed
          ? "Reference viewed"
          : "× Does not match the reference"
    }}
  </span>
</template>

<style scoped>
.unmatched {
  color: var(--primary);
}
</style>
