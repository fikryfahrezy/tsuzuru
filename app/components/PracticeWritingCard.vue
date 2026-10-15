<script setup lang="ts">
import { ref } from "vue";
import {
  DifferenceKind,
  type Question,
  type Comparison,
} from "#shared/practice";
defineProps<{
  question: Question | null;
  result: Comparison | null;
  revealed: boolean;
  loading: boolean;
  checking: boolean;
  error: string;
}>();
const answer = defineModel<string>("answer", { required: true });
const showRomaji = defineModel<boolean>("showRomaji", { required: true });
const emit = defineEmits<{
  another: [];
  submit: [reveal: boolean];
  next: [];
  shortcut: [event: KeyboardEvent];
}>();
const field = ref<HTMLTextAreaElement | null>(null);
const resultStatus = ref<HTMLElement | null>(null);
defineExpose({
  focusAnswer: () => field.value?.focus(),
  focusResult: () => resultStatus.value?.focus(),
});
</script>

<template>
  <section
    class="writing-card"
    aria-label="Sentence practice"
    :aria-busy="loading || checking"
    @keydown="emit('shortcut', $event)"
  >
    <PracticePrompt
      :question="question"
      :loading="loading"
      :checking="checking"
      v-model:show-romaji="showRomaji"
      @another="emit('another')"
    />
    <form @submit.prevent="emit('submit', false)">
      <div class="writing-field">
        <label class="paper-label" for="answer">YOUR JAPANESE</label>
        <textarea
          v-if="!result || revealed"
          id="answer"
          ref="field"
          v-model="answer"
          lang="ja"
          placeholder="ここに書いてください。"
          :disabled="loading || !question || checking"
          :readonly="!!result"
          maxlength="2000"
          autocomplete="off"
          spellcheck="false"
          aria-describedby="writing-help"
        ></textarea>
        <div
          v-else
          class="answer-review"
          lang="ja"
          aria-label="Your checked answer"
        >
          <template v-if="result.matched">{{ answer }}</template>
          <template v-else>
            <span
              v-for="(part, index) in result.differences?.answer"
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
        </div>
      </div>
      <div class="card-actions">
        <p v-if="!result || revealed" id="writing-help">Ctrl / ⌘ + Enter</p>
        <p
          v-else
          class="writing-status"
          ref="resultStatus"
          tabindex="-1"
          :class="{ 'writing-status-matched': result.matched }"
          role="status"
        >
          {{
            result.matched
              ? result.acceptedAlternative
                ? "✓ Matches a pre-generated alternative"
                : "✓ Matches the reference"
              : "× Does not match the reference"
          }}
        </p>
        <button
          v-if="!result"
          class="primary-button"
          type="submit"
          :disabled="!question || !answer.trim() || loading || checking"
        >
          {{ checking ? "Comparing…" : "Check writing" }}
          <span>→</span>
        </button>
        <button
          v-else
          class="primary-button"
          type="button"
          @click="emit('next')"
        >
          Next sentence
          <span>→</span>
        </button>
      </div>
    </form>
    <div v-if="error" class="error-message" role="alert">
      {{ error }}
      <button v-if="!question" @click="emit('another')">Try again ↻</button>
    </div>
    <PracticeFeedback v-if="result" :result="result" :revealed="revealed" />
    <div v-else-if="question" class="below-paper">
      <button :disabled="checking" @click="emit('submit', true)">
        Show reference ↗
      </button>
    </div>
  </section>
</template>

<style scoped>
.writing-card {
  border: 1px solid var(--line);
  background: rgba(251, 247, 232, 0.87);
  box-shadow: 0 20px 50px rgba(53, 48, 39, 0.055);
  min-width: 0;
}
.paper-label {
  font-size: 9px;
  letter-spacing: 0.09em;
  color: var(--muted);
}
.below-paper button,
.error-message button {
  border: 0;
  background: transparent;
  padding: 5px 0;
  color: var(--secondary);
  font-size: 9px;
}
.writing-field {
  position: relative;
  margin: 0 32px;
  border-top: 1px solid var(--line);
}
.writing-field label {
  display: block;
  padding-top: 21px;
}
.writing-field textarea {
  display: block;
  width: 100%;
  min-height: 185px;
  resize: vertical;
  padding: 22px 8px 32px;
  border: 0;
  background: repeating-linear-gradient(
    transparent,
    transparent 47px,
    rgba(107, 135, 110, 0.13) 47px,
    rgba(107, 135, 110, 0.13) 48px
  );
  background-position: 0 14px;
  color: var(--ink);
  font:
    26px/48px "Hiragino Mincho ProN",
    "Yu Mincho",
    serif;
  caret-color: var(--primary);
}
.writing-field textarea::placeholder {
  color: #a39f90;
  font-size: 23px;
}
.writing-field textarea:focus-visible {
  outline-offset: -2px;
}
.card-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 20px 27px;
  border-top: 1px solid var(--line);
  background: rgba(227, 222, 208, 0.25);
}
.card-actions p {
  margin: 0;
  color: var(--secondary);
  font:
    11px/1.7 system-ui,
    sans-serif;
}
.card-actions p span {
  color: var(--muted);
  font-size: 10px;
}
.below-paper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  padding: 13px 27px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 9px;
}
.error-message {
  padding: 18px 25px;
  font:
    13px/1.6 system-ui,
    sans-serif;
  color: var(--primary);
}
@media (max-width: 850px) {
  .card-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
@media (max-width: 640px) {
  .card-actions {
    padding-inline: 20px;
  }
  .writing-field {
    margin-inline: 20px;
  }
  .writing-field textarea {
    font-size: 23px;
  }
  .writing-field textarea::placeholder {
    font-size: 19px;
  }
  .below-paper {
    padding-inline: 20px;
    font-size: 8px;
  }
}
.practice-shell .writing-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  border: 0;
  box-shadow: none;
}
.practice-shell .writing-card > * {
  flex-shrink: 0;
}
.practice-shell .writing-card > form {
  display: flex;
  flex-direction: column;
  flex: 1 0 auto;
  min-height: 240px;
}
.practice-shell .writing-field {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 180px;
}
.practice-shell .writing-field textarea {
  flex: 1;
  min-height: 150px;
  resize: none;
}
.practice-shell .card-actions {
  flex-shrink: 0;
}
@media (max-width: 640px) {
  .practice-shell .card-actions {
    padding-block: 14px;
    gap: 10px;
  }
  .practice-shell .card-actions p span {
    display: none;
  }
  .practice-shell .writing-card > form {
    min-height: 250px;
  }
}

.practice-shell .answer-review {
  flex: 1;
  min-height: 150px;
  padding: 22px 8px 32px;
  color: var(--ink);
  background: repeating-linear-gradient(
    transparent,
    transparent 47px,
    rgba(107, 135, 110, 0.13) 47px,
    rgba(107, 135, 110, 0.13) 48px
  );
  background-position: 0 14px;
  font:
    26px/48px "Hiragino Mincho ProN",
    "Yu Mincho",
    serif;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
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
.practice-shell .card-actions .writing-status {
  color: var(--primary);
  font-size: 13px;
  font-weight: 600;
}
.practice-shell .card-actions .writing-status-matched {
  color: var(--green);
}
@media (max-width: 640px) {
  .practice-shell .answer-review {
    font-size: 23px;
  }
}
</style>
