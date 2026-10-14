<script setup lang="ts">
import { DifferenceKind } from "#shared/practice";
import { JournalOutcome, modes, type JournalEntry } from "~/utils/practice";
defineProps<{ entry: JournalEntry }>();
</script>

<template>
  <article class="journal-entry">
    <div class="journal-meta">
      <span>
        {{ entry.level }}
        <template v-if="entry.mode">
          ·
          {{ modes.find((item) => item.value === entry.mode)?.label }}
        </template>
        ·
        {{
          new Date(entry.date).toLocaleDateString("en", {
            month: "short",
            day: "numeric",
          })
        }}
      </span>
      <span
        class="journal-outcome"
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
    </div>
    <h2>{{ entry.english }}</h2>
    <p v-if="entry.answer" class="journal-answer" lang="ja">
      <template
        v-if="
          entry.outcome === JournalOutcome.Unmatched &&
          entry.comparison?.differences
        "
      >
        <span
          v-for="(part, index) in entry.comparison.differences.answer"
          :key="index"
          :class="`difference-${part.kind}`"
          :title="
            part.kind === DifferenceKind.Missing
              ? `Missing: ${part.expected}`
              : part.kind === DifferenceKind.Extra
                ? 'Extra character'
                : part.kind === DifferenceKind.Changed
                  ? 'Different from reference'
                  : undefined
          "
        >
          {{ part.text }}
        </span>
      </template>
      <template v-else>{{ entry.answer }}</template>
    </p>
    <p class="journal-reference difference-reference">
      {{
        entry.outcome === JournalOutcome.Unmatched &&
        entry.comparison?.differences
          ? "Expected"
          : "Reference"
      }}
      <span class="journal-reference-text" lang="ja">
        <template
          v-if="
            entry.outcome === JournalOutcome.Unmatched &&
            entry.comparison?.differences
          "
        >
          <span
            v-for="(part, index) in entry.comparison.differences.expected"
            :key="index"
            :class="`difference-${part.kind}`"
          >
            {{ part.text }}
          </span>
        </template>
        <template v-else>{{ entry.reference }}</template>
      </span>
    </p>
    <p
      v-if="
        entry.outcome === JournalOutcome.Unmatched &&
        !entry.comparison?.differences
      "
      class="journal-legacy-note"
    >
      Character details weren’t saved for this older entry.
    </p>
    <a
      v-if="entry.comparison?.sourceUrl"
      class="journal-source"
      :href="entry.comparison.sourceUrl"
      target="_blank"
      rel="noopener noreferrer"
    >
      Tatoeba source ↗
    </a>
    <WritingExplanations
      v-if="entry.outcome === JournalOutcome.Unmatched"
      :explanations="entry.comparison?.explanations ?? []"
      :expanded="false"
    />
    <AlternativeAnswers
      v-if="entry.comparison?.alternatives"
      :alternatives="entry.comparison.alternatives"
      :matched-japanese="
        entry.outcome === JournalOutcome.Matched
          ? entry.comparison.acceptedAlternative?.japanese
          : undefined
      "
    />
  </article>
</template>

<style scoped>
.journal-entry {
  padding: 25px 30px;
  border-bottom: 1px solid var(--line);
}
.journal-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--muted);
  font-size: 10px;
  margin-bottom: 15px;
}
.journal-entry h2 {
  font:
    24px/1.4 Georgia,
    serif;
}
.journal-answer {
  font:
    22px/1.7 "Yu Mincho",
    serif;
  overflow-wrap: anywhere;
}
.journal-reference {
  font-size: 10px;
  color: var(--secondary);
  margin-bottom: 0;
}
.journal-reference span {
  margin-left: 10px;
  font:
    15px/1.8 system-ui,
    sans-serif;
  overflow-wrap: anywhere;
}
@media (max-width: 640px) {
  .journal-meta {
    font-size: 9px;
  }
  .journal-entry {
    padding: 22px 20px;
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

.journal-answer {
  white-space: pre-wrap;
}
.journal-reference .journal-reference-text span {
  margin-left: 0;
  font: inherit;
}
.journal-outcome.unmatched {
  color: var(--primary);
}
.journal-legacy-note {
  color: var(--muted);
  font:
    11px/1.6 system-ui,
    sans-serif;
  margin: 12px 0 0;
}
.journal-source {
  display: inline-block;
  margin-top: 14px;
  font-size: 9px;
  color: var(--muted);
}
@media (max-width: 640px) {
  .journal-meta {
    flex-wrap: wrap;
  }
}
</style>
