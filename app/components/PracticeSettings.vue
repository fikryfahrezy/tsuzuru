<script setup lang="ts">
import { computed } from "vue";
import { levels, Level, Length, Strictness } from "#shared/practice";
import { lengthOptions, modes } from "~/utils/practice";
defineProps<{
  sentence?: string;
  settingsOpen: boolean;
  checking: boolean;
  alternativeCount?: number;
}>();
const emit = defineEmits<{ close: [] }>();
const level = defineModel<Level>("level", { required: true });
const length = defineModel<Length>("length", { required: true });
const mode = defineModel<Strictness>("mode", { required: true });
const acceptAlternatives = defineModel<boolean>("acceptAlternatives", {
  required: true,
});
const modeHelp = computed(
  () =>
    ({
      [Strictness.Kana]:
        "Write entirely in hiragana or katakana. Kanji is not accepted in this mode.",
      [Strictness.Flexible]:
        "Use the reference kanji, their kana readings, or a mixture of both.",
      [Strictness.Exact]: acceptAlternatives.value
        ? "Match the kanji and kana spelling of the reference or a pre-generated alternative."
        : "Match the reference’s kanji and kana spelling.",
    })[mode.value],
);
</script>

<template>
  <aside
    id="practice-settings"
    class="settings-panel"
    :class="{ 'settings-open': settingsOpen }"
    aria-label="Practice settings"
  >
    <div v-if="sentence !== undefined" class="selected-sentence-note">
      <p class="setting-note">
        Practicing a selected sentence. Level and length apply to random
        practice.
      </p>
      <NuxtLink to="/app" @click="emit('close')">
        Return to random practice
      </NuxtLink>
    </div>
    <fieldset v-if="sentence === undefined" :disabled="checking">
      <legend>Vocabulary level</legend>
      <div class="levels">
        <button
          v-for="item in levels"
          :key="item"
          :aria-pressed="level === item"
          :class="{ selected: level === item }"
          @click="level = item"
        >
          {{ item }}
        </button>
      </div>
    </fieldset>
    <fieldset v-if="sentence === undefined" :disabled="checking">
      <legend>Sentence length</legend>
      <div class="length-options">
        <button
          v-for="item in lengthOptions"
          :key="item.value"
          :aria-pressed="length === item.value"
          :class="{ selected: length === item.value }"
          @click="length = item.value"
        >
          <span>{{ item.label }}</span>
          <small>{{ item.note }}</small>
        </button>
      </div>
      <p class="setting-note">Measured in English words.</p>
    </fieldset>
    <fieldset :disabled="checking">
      <legend>Writing mode</legend>
      <div class="mode-options">
        <button
          v-for="item in modes"
          :key="item.value"
          :aria-pressed="mode === item.value"
          :class="{ selected: mode === item.value }"
          @click="mode = item.value"
        >
          <span class="mode-mark" lang="ja">{{ item.mark }}</span>
          <span>{{ item.label }}</span>
          <span class="radio-mark" aria-hidden="true">
            {{ mode === item.value ? "●" : "○" }}
          </span>
        </button>
      </div>
      <p class="setting-note">{{ modeHelp }}</p>
    </fieldset>
    <fieldset :disabled="checking">
      <legend>Accepted answers</legend>
      <button
        type="button"
        class="alternatives-toggle"
        :aria-pressed="acceptAlternatives"
        @click="acceptAlternatives = !acceptAlternatives"
      >
        <span>Pre-generated alternatives</span>
        <span>{{ acceptAlternatives ? "On" : "Off" }}</span>
      </button>
      <p class="setting-note">
        Accept additional answers from our pre-generated list. Unlisted wording
        can still be valid.
      </p>
      <p v-if="alternativeCount !== undefined" class="setting-note">
        {{ alternativeCount }} pre-generated
        {{ alternativeCount === 1 ? "alternative" : "alternatives" }}
        for this sentence.
      </p>
    </fieldset>
  </aside>
</template>

<style scoped>
.alternatives-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
  padding: 12px;
  border: 1px solid var(--line);
  background: transparent;
  font-size: 11px;
}
.alternatives-toggle > span:last-child {
  margin-left: auto;
  flex-shrink: 0;
  white-space: nowrap;
}
.alternatives-toggle[aria-pressed="true"] {
  color: var(--primary);
  border-color: var(--primary);
  background: rgba(185, 51, 39, 0.07);
}
.settings-panel {
  padding: 25px 22px;
  background: rgba(251, 247, 232, 0.34);
  border: 1px solid var(--line);
}
fieldset {
  min-width: 0;
  border: 0;
  padding: 0;
  margin: 0 0 28px;
}
legend {
  padding: 0;
  margin-bottom: 13px;
  font-size: 11px;
  font-weight: 600;
}
.levels {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
}
.levels button {
  padding: 12px 0;
  border: 1px solid var(--line);
  border-right: 0;
  background: transparent;
  font-size: 11px;
}
.levels button:last-child {
  border-right: 1px solid var(--line);
}
.levels button.selected {
  color: var(--surface);
  background: var(--primary);
  border-color: var(--primary);
}
.selected-sentence-note {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--line);
}
.selected-sentence-note .setting-note {
  margin-top: 0;
  margin-bottom: 12px;
}
.selected-sentence-note a {
  color: var(--secondary);
  font-size: 11px;
  line-height: 1.5;
}
.setting-note {
  margin: 11px 0 0;
  color: var(--secondary);
  font:
    12px/1.6 system-ui,
    sans-serif;
}
.length-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.length-options button {
  padding: 11px 3px;
  background: transparent;
  border: 1px solid var(--line);
  font-size: 10px;
}
.length-options button small {
  display: block;
  margin-top: 6px;
  color: var(--muted);
  font-size: 8px;
}
.length-options .selected {
  background: rgba(185, 51, 39, 0.07);
  border-color: var(--primary);
  color: var(--primary);
}
.mode-options {
  display: grid;
  gap: 7px;
}
.mode-options button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 10px;
  border: 1px solid var(--line);
  background: transparent;
  text-align: left;
  font-size: 10px;
}
.mode-options .selected {
  border-color: var(--primary);
  background: rgba(185, 51, 39, 0.055);
}
.mode-mark {
  width: 29px;
  font:
    16px "Hiragino Mincho ProN",
    "Yu Mincho",
    serif;
}
.radio-mark {
  margin-left: auto;
  color: var(--primary);
}
@media (max-width: 850px) {
  .settings-panel {
    padding: 22px 15px;
  }
}
@media (max-width: 640px) {
  .settings-panel {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    padding: 20px;
  }
  fieldset {
    margin: 0;
  }
  fieldset:last-of-type {
    grid-column: 1/-1;
  }
  .mode-options {
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
  .mode-options button {
    flex-direction: column;
    text-align: center;
    gap: 6px;
    padding: 10px 4px;
    font-size: 8px;
  }
  .radio-mark {
    display: none;
  }
  .mode-mark {
    width: auto;
  }
  .setting-note {
    font-size: 11px;
  }
  .length-options button {
    font-size: 8px;
  }
  .length-options button small {
    font-size: 7px;
  }
}
:global(.practice-shell) .settings-panel {
  display: block;
  overflow-y: auto;
  border: 0;
  border-right: 1px solid var(--line);
  padding: 24px 20px;
}
:global(.practice-shell) .mode-mark {
  white-space: nowrap;
}
@media (max-width: 640px) {
  :global(.practice-shell) .settings-panel {
    display: none;
  }
  :global(.practice-shell) .settings-panel.settings-open {
    display: block;
    position: absolute;
    z-index: 5;
    top: 0;
    bottom: 0;
    right: 0;
    width: min(300px, 100%);
    padding: 22px;
    background: var(--surface);
    border-left: 1px solid var(--line);
    box-shadow: -10px 0 30px rgba(31, 28, 23, 0.1);
  }
  :global(.practice-shell) .settings-panel fieldset {
    margin-bottom: 25px;
  }
}
</style>
