<script setup lang="ts">
import { computed, ref, watch, nextTick } from "vue";
import { useFetch } from "#imports";
import { Level, type Question } from "#shared/practice";
import { GrammarScope } from "~/utils/grammar";
import {
  grammarTopics,
  grammarForBreakdown,
  topicsForGrammar,
  type GrammarTopic,
  furiganaParts,
  searchGrammar,
  type GrammarEntry,
} from "#shared/grammar";
const props = withDefaults(
  defineProps<{
    initialLevel?: Level;
    closable?: boolean;
    sentence?: Pick<Question, "id" | "answerBreakdown">;
    open?: boolean;
  }>(),
  { open: true },
);
const emit = defineEmits<{ close: [] }>();
const query = ref("");
const scope = ref<GrammarScope>(
  props.sentence ? GrammarScope.Sentence : GrammarScope.All,
);
const level = ref<Level | "all">(
  props.sentence ? "all" : (props.initialLevel ?? "all"),
);
const topic = ref<GrammarTopic | "all">("all");
const selected = ref<GrammarEntry | null>(null);
const scrollArea = ref<HTMLElement | null>(null);
const lessonHeading = ref<HTMLElement | null>(null);
watch(selected, async (entry) => {
  await nextTick();
  scrollArea.value?.scrollTo({ top: 0 });
  if (entry) lessonHeading.value?.focus({ preventScroll: true });
  else
    document
      .getElementById(
        scope.value === GrammarScope.Sentence
          ? "grammar-sentence-scope"
          : "grammar-search",
      )
      ?.focus({ preventScroll: true });
});
const { data, status, error, refresh } = useFetch<GrammarEntry[]>(
  "/api/grammar",
  { lazy: true },
);
const sentenceGrammar = computed(() =>
  grammarForBreakdown(data.value ?? [], props.sentence?.answerBreakdown ?? []),
);
const results = computed(() =>
  scope.value === GrammarScope.Sentence
    ? sentenceGrammar.value
    : searchGrammar(data.value ?? [], query.value, level.value, topic.value),
);
function changeScope(value: GrammarScope) {
  scope.value = value;
  query.value = "";
  level.value = "all";
  topic.value = "all";
  selected.value = null;
}
watch([() => props.sentence?.id, () => props.open], () => {
  if (props.open)
    changeScope(props.sentence ? GrammarScope.Sentence : GrammarScope.All);
});
const related = computed(() =>
  selected.value
    ? (data.value ?? [])
        .filter(
          (entry) =>
            entry.id !== selected.value?.id &&
            entry.tags.some((tag) => selected.value?.tags.includes(tag)),
        )
        .slice(0, 4)
    : [],
);
</script>

<template>
  <aside
    class="grammar-reference"
    aria-label="Grammar reference"
    @keydown.esc.stop="emit('close')"
  >
    <header class="reference-heading">
      <div>
        <span class="eyebrow">LOOK IT UP</span>
        <h2>Grammar reference</h2>
      </div>
      <button
        v-if="closable"
        class="text-button"
        aria-label="Close grammar reference"
        @click="emit('close')"
      >
        Close ×
      </button>
    </header>
    <div ref="scrollArea" class="reference-scroll">
      <template v-if="!selected">
        <p class="intro">
          <template v-if="sentence && scope === GrammarScope.Sentence">
            Explore grammar identified in your current sentence.
          </template>
          <template v-else>Find a way to say what you mean.</template>
          <template v-if="closable">
            Your writing stays right where you left it.
          </template>
        </p>
        <div
          v-if="sentence"
          class="reference-scopes"
          role="group"
          aria-label="Grammar scope"
        >
          <button
            id="grammar-sentence-scope"
            class="scope-button"
            :aria-pressed="scope === GrammarScope.Sentence"
            @click="changeScope(GrammarScope.Sentence)"
          >
            This sentence
            <span v-if="status === 'success'">
              ({{ sentenceGrammar.length }})
            </span>
          </button>
          <button
            class="scope-button"
            :aria-pressed="scope === GrammarScope.All"
            @click="changeScope(GrammarScope.All)"
          >
            All grammar
          </button>
        </div>
        <template v-if="scope === GrammarScope.All">
          <label class="search-label" for="grammar-search">
            Search in English or Japanese
          </label>
          <input
            id="grammar-search"
            v-model="query"
            type="search"
            placeholder="“want to”, “because”, 〜たい…"
          />
          <div class="reference-filters">
            <div>
              <label class="search-label" for="grammar-level">
                Browse by level
              </label>
              <select id="grammar-level" v-model="level">
                <option value="all">All levels</option>
                <option v-for="item in Level" :key="item" :value="item">
                  {{ item }}
                </option>
              </select>
            </div>
            <div>
              <label class="search-label" for="grammar-topic">
                Browse by topic
              </label>
              <select id="grammar-topic" v-model="topic">
                <option value="all">All topics</option>
                <option
                  v-for="group in grammarTopics"
                  :key="group.id"
                  :value="group.id"
                >
                  {{ group.label }}
                </option>
              </select>
            </div>
          </div>
          <p class="search-tip">
            Patterns can belong to more than one topic. Try all topics or all
            levels to broaden your search.
          </p>
        </template>
        <p v-if="status === 'pending'" role="status">Loading grammar…</p>
        <div v-else-if="error" role="alert">
          <p>Couldn’t load the reference. Check your connection.</p>
          <button class="text-button" @click="refresh()">Try again ↻</button>
        </div>
        <template v-else>
          <p class="result-count" role="status">
            {{ results.length }} grammar
            {{ results.length === 1 ? "point" : "points" }}
          </p>
          <p v-if="!results.length" class="intro">
            <template
              v-if="scope === GrammarScope.Sentence && !sentenceGrammar.length"
            >
              No grammar points have been linked to this sentence yet.
              <button
                class="text-button"
                @click="changeScope(GrammarScope.All)"
              >
                Browse all grammar
              </button>
            </template>
            <template v-else>
              No matching patterns. Try a shorter phrase, all topics, or all
              levels.
            </template>
            <button
              v-if="scope === GrammarScope.All"
              class="text-button"
              @click="
                query = '';
                level = 'all';
                topic = 'all';
              "
            >
              Clear filters
            </button>
          </p>
          <ul class="reference-list">
            <li v-for="entry in results" :key="`${entry.level}-${entry.id}`">
              <button @click="selected = entry">
                <span class="entry-top">
                  <strong lang="ja">{{ entry.pattern }}</strong>
                  <span class="level-badge">{{ entry.level }}</span>
                </span>
                <span class="entry-meaning">{{ entry.meaning }}</span>
                <span class="entry-topics" aria-label="Topics">
                  <span
                    v-for="group in topicsForGrammar(entry)"
                    :key="group.id"
                  >
                    {{ group.label }}
                  </span>
                </span>
                <span class="entry-romaji">
                  {{ entry.romaji }}
                  <span aria-hidden="true">↗</span>
                </span>
              </button>
            </li>
          </ul>
        </template>
      </template>
      <article v-else class="grammar-lesson">
        <button class="text-button back-button" @click="selected = null">
          ← Back to
          {{ scope === GrammarScope.Sentence ? "this sentence" : "results" }}
        </button>
        <span class="level-badge">{{ selected.level }}</span>
        <h3 ref="lessonHeading" tabindex="-1" lang="ja">
          {{ selected.pattern }}
        </h3>
        <p class="romaji">{{ selected.romaji }}</p>
        <p class="meaning">{{ selected.meaning }}</p>
        <div class="lesson-topics" aria-label="Topics">
          <span v-for="group in topicsForGrammar(selected)" :key="group.id">
            {{ group.label }}
          </span>
        </div>
        <h4>How to form it</h4>
        <p class="formation">{{ selected.formation }}</p>
        <template v-if="selected.notes">
          <h4>When to use it</h4>
          <p>{{ selected.notes }}</p>
        </template>
        <h4>Examples</h4>
        <div
          v-for="(example, index) in selected.examples"
          :key="index"
          class="grammar-example"
        >
          <p lang="ja">
            <template
              v-for="(part, partIndex) in furiganaParts(
                example.furigana ?? example.ja,
              )"
              :key="partIndex"
            >
              <ruby v-if="part.reading">
                {{ part.text }}
                <rt>{{ part.reading }}</rt>
              </ruby>
              <template v-else>{{ part.text }}</template>
            </template>
          </p>
          <p>{{ example.en }}</p>
        </div>
        <template v-if="related.length">
          <h4>Related patterns</h4>
          <div class="related-patterns">
            <button
              v-for="entry in related"
              :key="`${entry.level}-${entry.id}`"
              class="text-button"
              @click="selected = entry"
            >
              {{ entry.pattern }}
              <span class="level-badge">{{ entry.level }}</span>
            </button>
          </div>
        </template>
      </article>
      <footer class="reference-credit">
        Material from
        <a
          href="https://github.com/evanclan/OpenJLPT"
          target="_blank"
          rel="noreferrer"
        >
          OpenJLPT
        </a>
        ·
        <a
          href="https://creativecommons.org/licenses/by-sa/4.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC BY-SA 4.0
        </a>
        .
        <br />
        Level labels are unofficial. Material has not been independently
        reviewed.
        <NuxtLink to="/sources" target="_blank">Data & credits ↗</NuxtLink>
      </footer>
    </div>
  </aside>
</template>

<style scoped>
.grammar-reference {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  height: 100%;
  background: var(--surface);
  color: var(--ink);
}
.reference-scopes {
  display: flex;
  gap: 8px;
  margin: 18px 0;
}
.scope-button {
  border: 1px solid var(--line);
  background: transparent;
  color: var(--secondary);
  padding: 9px 12px;
  font:
    12px system-ui,
    sans-serif;
  cursor: pointer;
}
.scope-button[aria-pressed="true"] {
  color: var(--primary);
  border-color: var(--primary);
  background: var(--paper);
}
.reference-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--line);
}
.eyebrow {
  font-size: 9px;
  letter-spacing: 0.12em;
  color: var(--primary);
}
h2 {
  font:
    500 23px/1.3 Georgia,
    serif;
  margin: 7px 0 0;
}
.reference-scroll {
  overflow-y: auto;
  padding: 24px;
  flex: 1;
  min-height: 0;
}
.intro,
.search-tip {
  color: var(--secondary);
  font:
    13px/1.7 system-ui,
    sans-serif;
}
.search-label {
  display: block;
  font-size: 11px;
  margin: 18px 0 9px;
}
input,
select {
  width: 100%;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--ink);
  padding: 12px;
  font:
    14px system-ui,
    sans-serif;
  border-radius: 0;
}
input:focus-visible,
select:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
.search-tip {
  font-size: 12px;
  margin-top: 12px;
}
.result-count {
  margin-top: 24px;
  font-size: 10px;
  color: var(--muted);
}
.reference-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.reference-list li {
  border-top: 1px solid var(--line);
}
.reference-list button {
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  padding: 16px 4px;
}
.entry-top {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 12px;
}
.entry-top strong {
  font:
    500 18px/1.6 system-ui,
    sans-serif;
}
.level-badge {
  display: inline-block;
  font:
    10px/1.5 ui-monospace,
    monospace;
  padding: 3px 7px;
  border: 1px solid var(--line);
  color: var(--secondary);
  flex-shrink: 0;
}
.entry-meaning,
.entry-romaji {
  display: block;
  margin-top: 7px;
  font:
    13px/1.5 system-ui,
    sans-serif;
  color: var(--secondary);
}
.entry-romaji {
  font-size: 11px;
  color: var(--muted);
}
.entry-romaji span {
  float: right;
  color: var(--primary);
}
.text-button {
  border: 0;
  background: transparent;
  color: var(--primary);
  padding: 5px 0;
  font-size: 12px;
}
.back-button {
  display: block;
  margin-bottom: 25px;
}
h3 {
  font:
    500 28px/1.5 system-ui,
    sans-serif;
  margin: 16px 0 5px;
}
.grammar-lesson {
  font:
    14px/1.8 system-ui,
    sans-serif;
  overflow-wrap: anywhere;
}
.romaji {
  font-size: 12px;
  color: var(--muted);
}
.meaning {
  font-size: 17px;
}
h4 {
  font:
    600 11px/1.4 ui-monospace,
    monospace;
  letter-spacing: 0.03em;
  margin: 28px 0 14px;
  color: var(--primary);
}
.formation {
  padding: 16px;
  background: var(--paper);
}
.grammar-example {
  border-top: 1px solid var(--line);
  padding: 18px 0 0;
}
.grammar-example p[lang] {
  font-size: 19px;
  line-height: 2.5;
  margin-bottom: 8px;
}
.grammar-example rt {
  font-size: 10px;
}
.grammar-example p + p {
  color: var(--secondary);
}
.related-patterns {
  display: flex;
  flex-direction: column;
  align-items: start;
  gap: 8px;
}
.reference-credit {
  border-top: 1px solid var(--line);
  margin-top: 28px;
  padding-top: 18px;
  font:
    11px/1.8 system-ui,
    sans-serif;
  color: var(--muted);
}
</style>

<style scoped>
.reference-filters {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0 16px;
}
.reference-filters > div {
  min-width: 0;
}
.reference-filters select {
  max-width: 100%;
  text-overflow: ellipsis;
}
.lesson-topics,
.entry-topics {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.lesson-topics span,
.entry-topics > span {
  border: 1px solid var(--line);
  padding: 4px 8px;
  color: var(--secondary);
  font:
    11px/1.5 system-ui,
    sans-serif;
}
.entry-topics {
  margin-top: 10px;
  gap: 5px;
}
.entry-topics > span {
  padding: 3px 7px;
  font-size: 10px;
}
@media (min-width: 641px) {
  .library-shell .reference-filters {
    grid-template-columns: 130px minmax(0, 1fr);
  }
}
</style>
