import { useRoute } from "#imports";
import {
  answerDetailsVersion,
  currentAnswerBreakdown,
  currentSpellingOptions,
} from "#shared/answer-entries";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { $fetch } from "ofetch";
import {
  PracticeDifficulty,
  PracticePermission,
  hasPracticePermission,
  isPracticeDifficulty,
} from "#shared/practice-difficulty";
import {
  isAlternativeMethod,
  Level,
  isLevel,
  isLength,
  isStrictness,
  isDifferenceKind,
  Length,
  Strictness,
  type Question,
  type Comparison,
  type AlternativeAnswer,
  type AnswerBreakdownPart,
  type SpellingOption,
} from "#shared/practice";
import {
  JournalOutcome,
  AnswerInput,
  PracticeTab,
  modes,
  latestJournalEntries,
  type JournalEntry,
} from "~/utils/practice";
import {
  readJournal,
  writeJournalEntry,
  clearJournal,
} from "~/utils/journal-storage";

export function usePracticeSession() {
  const level = ref<Level>(Level.N5);
  const length = ref<Length>(Length.Short);
  const mode = ref<Strictness>(Strictness.Flexible);
  const difficulty = ref<PracticeDifficulty>(PracticeDifficulty.Guided);
  const tab = ref<PracticeTab>(PracticeTab.Practice);
  const settingsOpen = ref(false);
  const showRomaji = ref(false);
  const answerInput = ref<AnswerInput>(AnswerInput.Type);
  const acceptAlternatives = ref(false);
  const route = useRoute();
  const sentence = computed(() =>
    typeof route.query.sentence === "string"
      ? route.query.sentence
      : route.query.sentence === undefined
        ? undefined
        : "",
  );
  const question = ref<Question | null>(null);
  const answer = ref("");
  const chipSelection = ref<number[]>([]);
  const typedDraft = ref("");
  const result = ref<Comparison | null>(null);
  const revealed = ref(false);
  const loading = ref(true);
  const checking = ref(false);
  const error = ref("");
  const storageNote = ref("");
  const journal = ref<JournalEntry[]>([]);
  const previousAttempt = ref<JournalEntry | null>(null);
  const retryEntry = ref<JournalEntry | null>(null);
  const ready = ref(false);
  const online = ref(true);
  function updateConnection() {
    online.value = navigator.onLine;
  }
  const writingCard = ref<{
    focusGrammar: () => void;
    focusAnswer: () => void;
    focusResult: () => void;
  } | null>(null);
  let request = 0;
  let disposed = false;

  function persist() {
    if (!ready.value) return;
    try {
      localStorage.setItem(
        "tsuzuru.practice.v1",
        JSON.stringify({
          level: level.value,
          length: length.value,
          mode: mode.value,
          difficulty: difficulty.value,
          showRomaji: showRomaji.value,
          answerInput: answerInput.value,
          acceptAlternatives: acceptAlternatives.value,
        }),
      );
    } catch {
      storageNote.value =
        "Your settings couldn’t be saved. Changes will last for this session only.";
    }
  }

  function saveEntry(entry: JournalEntry) {
    if (!ready.value) return;
    void writeJournalEntry(entry).catch(() => {
      storageNote.value =
        "Your latest journal changes couldn’t be saved. You can keep practicing in this session.";
    });
  }

  async function loadQuestion() {
    const sequence = ++request;
    const selectedSentence = retryEntry.value
      ? (retryEntry.value.sentenceId ??
        retryEntry.value.id.replace(/-\d+$/u, ""))
      : sentence.value;
    const previous = question.value?.id;
    question.value = null;
    previousAttempt.value = null;
    result.value = null;
    answer.value = "";
    chipSelection.value = [];
    typedDraft.value = "";
    revealed.value = false;
    error.value = "";
    loading.value = true;
    try {
      const next = await $fetch<Question>("/api/exercises", {
        query: {
          level: level.value,
          length: length.value,
          previous,
          sentence: selectedSentence,
        },
      });
      if (sequence !== request) return;
      question.value = next;
      previousAttempt.value =
        journal.value.find((entry) => entry.sentenceId === next.id) ?? null;
    } catch {
      if (sequence === request)
        error.value = retryEntry.value
          ? "We couldn’t load this journal sentence. Please try again; older sentences may no longer be available."
          : selectedSentence !== undefined
            ? "We couldn’t load the requested sentence. Check the sentence ID or return to random practice."
            : "We couldn’t load a sentence. Please try again.";
    } finally {
      if (sequence === request) loading.value = false;
    }
  }

  async function submit(reveal = false) {
    const current = question.value;
    const sequence = request;
    if (
      !current ||
      checking.value ||
      result.value ||
      (!reveal && !answer.value.trim())
    )
      return;
    checking.value = true;
    error.value = "";
    try {
      const comparison = await $fetch<Comparison>("/api/compare", {
        method: "POST",
        body: {
          id: current.id,
          answer: reveal ? "__reveal__" : answer.value,
          mode: mode.value,
          acceptAlternatives: acceptAlternatives.value,
        },
      });
      if (sequence !== request || current.id !== question.value?.id) return;
      result.value = comparison;
      revealed.value = reveal;
      const entry: JournalEntry = {
        id: `${current.id}-${Date.now()}`,
        sentenceId: current.id,
        answerBreakdown: current.answerBreakdown,
        spellingOptions: current.spellingOptions,
        answerDetailsVersion,
        english: current.english,
        answer: reveal ? "" : answer.value,
        reference: comparison.reference,
        outcome: reveal
          ? JournalOutcome.Revealed
          : comparison.matched
            ? JournalOutcome.Matched
            : JournalOutcome.Unmatched,
        date: new Date().toISOString(),
        level: retryEntry.value?.level ?? level.value,
        mode: mode.value,
        comparison: reveal
          ? { ...comparison, differences: null, explanations: [] }
          : comparison,
      };
      journal.value = latestJournalEntries([entry, ...journal.value]);
      saveEntry(entry);
      await nextTick();
      if (sequence === request) writingCard.value?.focusResult();
    } catch {
      error.value =
        "We couldn’t compare your answer. Your writing is still here; please try again.";
    } finally {
      checking.value = false;
    }
  }

  async function nextSentence() {
    retryEntry.value = null;
    await loadQuestion();
    await nextTick();
    writingCard.value?.focusAnswer();
  }
  async function retryJournalEntry(entry: JournalEntry) {
    if (checking.value) return;
    retryEntry.value = entry;
    tab.value = PracticeTab.Practice;
    settingsOpen.value = false;
    await loadQuestion();
    await nextTick();
    writingCard.value?.focusAnswer();
  }
  function shortcut(event: KeyboardEvent) {
    if (
      event.isComposing ||
      !(event.metaKey || event.ctrlKey) ||
      event.key !== "Enter"
    )
      return;
    event.preventDefault();
    if (result.value) void nextSentence();
    else void submit();
  }
  function resetJournal() {
    journal.value = [];
    if (!ready.value) return;
    void clearJournal().catch(() => {
      storageNote.value =
        "The saved journal couldn’t be cleared. Its entries may return when you reopen the app.";
    });
  }
  function saveJournalBreakdown(
    id: string,
    parts: AnswerBreakdownPart[],
    spellingOptions: SpellingOption[],
  ) {
    const entry = journal.value.find((entry) => entry.id === id);
    if (!entry) return;
    entry.answerBreakdown = parts;
    entry.spellingOptions = spellingOptions;
    entry.answerDetailsVersion = answerDetailsVersion;
    saveEntry(entry);
  }
  function restoreAlternative(value: unknown): AlternativeAnswer | null {
    if (!value || typeof value !== "object") return null;
    const alternative = value as AlternativeAnswer;
    if (
      typeof alternative.japanese !== "string" ||
      typeof alternative.kana !== "string" ||
      typeof alternative.provenance?.creator !== "string" ||
      typeof alternative.provenance.note !== "string" ||
      !isAlternativeMethod(alternative.provenance.method)
    )
      return null;
    return {
      japanese: alternative.japanese,
      kana: alternative.kana,
      provenance: { ...alternative.provenance },
    };
  }
  function restoreComparison(value: unknown): Comparison | null {
    if (!value || typeof value !== "object") return null;
    const saved = value as Comparison;
    if (
      typeof saved.matched !== "boolean" ||
      typeof saved.reference !== "string" ||
      typeof saved.kana !== "string"
    )
      return null;
    if (saved.differences !== null) {
      if (
        !saved.differences ||
        !Array.isArray(saved.differences.answer) ||
        !Array.isArray(saved.differences.expected)
      )
        return null;
      const valid = [
        ...saved.differences.answer,
        ...saved.differences.expected,
      ].every(
        (part) =>
          part &&
          typeof part.text === "string" &&
          isDifferenceKind(part.kind) &&
          (part.expected === undefined || typeof part.expected === "string"),
      );
      if (!valid) return null;
    }
    return {
      ...saved,
      explanations: Array.isArray(saved.explanations)
        ? saved.explanations.filter(
            (explanation) =>
              explanation &&
              typeof explanation.title === "string" &&
              typeof explanation.detail === "string" &&
              typeof explanation.actual === "string" &&
              typeof explanation.expected === "string" &&
              (explanation.context === undefined ||
                typeof explanation.context === "string"),
          )
        : [],
      acceptedAlternative: saved.matched
        ? (restoreAlternative(saved.acceptedAlternative) ?? undefined)
        : undefined,
      alternatives: Array.isArray(saved.alternatives)
        ? saved.alternatives.flatMap((value) => {
            const alternative = restoreAlternative(value);
            return alternative ? [alternative] : [];
          })
        : undefined,
      sourceUrl:
        typeof saved.sourceUrl === "string" &&
        /^https:\/\/tatoeba\.org\/sentences\/show\/\d+$/.test(saved.sourceUrl)
          ? saved.sourceUrl
          : null,
    };
  }
  onMounted(async () => {
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    try {
      const saved = JSON.parse(
        localStorage.getItem("tsuzuru.practice.v1") ?? "null",
      );
      if (saved && typeof saved === "object") {
        if (isLevel(saved.level)) level.value = saved.level;
        if (isLength(saved.length)) length.value = saved.length;
        if (isStrictness(saved.mode)) mode.value = saved.mode;
        if (isPracticeDifficulty(saved.difficulty))
          difficulty.value = saved.difficulty;
        if (typeof saved.showRomaji === "boolean")
          showRomaji.value = saved.showRomaji;
        if (Object.values(AnswerInput).includes(saved.answerInput))
          answerInput.value = saved.answerInput;
        if (typeof saved.acceptAlternatives === "boolean")
          acceptAlternatives.value = saved.acceptAlternatives;
      }
    } catch {
      storageNote.value =
        "Saved progress couldn’t be read. You can keep practicing in this session.";
    }
    try {
      const entries = await readJournal();
      journal.value = latestJournalEntries(
        entries
          .filter((entry: unknown): entry is JournalEntry => {
            if (!entry || typeof entry !== "object") return false;
            const row = entry as JournalEntry;
            return (
              typeof row.id === "string" &&
              typeof row.english === "string" &&
              typeof row.answer === "string" &&
              typeof row.reference === "string" &&
              typeof row.date === "string" &&
              Number.isFinite(Date.parse(row.date)) &&
              isLevel(row.level) &&
              Object.values(JournalOutcome).includes(row.outcome)
            );
          })
          .map((entry: JournalEntry) => ({
            ...entry,
            sentenceId:
              typeof entry.sentenceId === "string"
                ? entry.sentenceId
                : undefined,
            answerBreakdown: currentAnswerBreakdown(entry),
            spellingOptions: currentSpellingOptions(entry),
            mode: modes.some((item) => item.value === entry.mode)
              ? entry.mode
              : undefined,
            comparison: restoreComparison(entry.comparison),
          })),
      );
    } catch {
      storageNote.value =
        "Journal storage is unavailable. Your writing will last for this session only.";
    }
    if (disposed) return;
    ready.value = true;
    persist(); // Re-save settings without the discarded localStorage journal.
    void loadQuestion();
  });
  onUnmounted(() => {
    disposed = true;
    window.removeEventListener("online", updateConnection);
    window.removeEventListener("offline", updateConnection);
  });
  watch([level, length], () => {
    if (ready.value) {
      retryEntry.value = null;
      persist();
      void loadQuestion();
    }
  });
  watch(mode, () => {
    if (ready.value) {
      result.value = null;
      revealed.value = false;
      persist();
    }
  });
  watch(showRomaji, persist);
  watch(difficulty, () => {
    if (!hasPracticePermission(difficulty.value, PracticePermission.RomajiHint))
      showRomaji.value = false;
    persist();
  });
  watch(answerInput, persist);
  watch(acceptAlternatives, () => {
    if (ready.value) {
      result.value = null;
      revealed.value = false;
      persist();
    }
  });
  watch(sentence, () => {
    if (ready.value) {
      retryEntry.value = null;
      void loadQuestion();
    }
  });

  return {
    level,
    length,
    mode,
    difficulty,
    tab,
    settingsOpen,
    showRomaji,
    answerInput,
    acceptAlternatives,
    sentence,
    question,
    answer,
    chipSelection,
    typedDraft,
    result,
    revealed,
    loading,
    checking,
    error,
    storageNote,
    journal,
    previousAttempt,
    online,
    writingCard,
    loadQuestion,
    submit,
    nextSentence,
    shortcut,
    resetJournal,
    retryJournalEntry,
    saveJournalBreakdown,
  };
}
