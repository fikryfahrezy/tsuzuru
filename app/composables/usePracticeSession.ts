import { useRoute } from "#imports";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { $fetch } from "ofetch";
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
} from "#shared/practice";
import {
  JournalOutcome,
  PracticeTab,
  modes,
  type JournalEntry,
} from "~/utils/practice";

export function usePracticeSession() {
  const level = ref<Level>(Level.N5);
  const length = ref<Length>(Length.Short);
  const mode = ref<Strictness>(Strictness.Flexible);
  const tab = ref<PracticeTab>(PracticeTab.Practice);
  const settingsOpen = ref(false);
  const showRomaji = ref(false);
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
  const result = ref<Comparison | null>(null);
  const revealed = ref(false);
  const loading = ref(true);
  const checking = ref(false);
  const error = ref("");
  const storageNote = ref("");
  const journal = ref<JournalEntry[]>([]);
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

  function persist() {
    if (!ready.value) return;
    try {
      localStorage.setItem(
        "tsuzuru.practice.v1",
        JSON.stringify({
          level: level.value,
          length: length.value,
          mode: mode.value,
          showRomaji: showRomaji.value,
          acceptAlternatives: acceptAlternatives.value,
          journal: journal.value,
        }),
      );
    } catch {
      storageNote.value =
        "Browser storage is unavailable. Your progress will last for this session only.";
    }
  }

  async function loadQuestion() {
    const sequence = ++request;
    const previous = question.value?.id;
    question.value = null;
    result.value = null;
    answer.value = "";
    revealed.value = false;
    error.value = "";
    loading.value = true;
    try {
      const next = await $fetch<Question>("/api/exercises", {
        query: {
          level: level.value,
          length: length.value,
          previous,
          sentence: sentence.value,
        },
      });
      if (sequence !== request) return;
      question.value = next;
    } catch {
      if (sequence === request)
        error.value =
          sentence.value !== undefined
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
      journal.value = [
        {
          id: `${current.id}-${Date.now()}`,
          english: current.english,
          answer: reveal ? "" : answer.value,
          reference: comparison.reference,
          outcome: reveal
            ? JournalOutcome.Revealed
            : comparison.matched
              ? JournalOutcome.Matched
              : JournalOutcome.Unmatched,
          date: new Date().toISOString(),
          level: level.value,
          mode: mode.value,
          comparison: reveal
            ? { ...comparison, differences: null, explanations: [] }
            : comparison,
        },
        ...journal.value,
      ].slice(0, 100);
      persist();
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
    persist();
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
  onMounted(() => {
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
        if (typeof saved.showRomaji === "boolean")
          showRomaji.value = saved.showRomaji;
        if (typeof saved.acceptAlternatives === "boolean")
          acceptAlternatives.value = saved.acceptAlternatives;
        if (Array.isArray(saved.journal))
          journal.value = saved.journal
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
              mode: modes.some((item) => item.value === entry.mode)
                ? entry.mode
                : undefined,
              comparison: restoreComparison(entry.comparison),
            }))
            .slice(0, 100);
      }
    } catch {
      storageNote.value =
        "Saved progress couldn’t be read. You can keep practicing in this session.";
    }
    ready.value = true;
    void loadQuestion();
  });
  onUnmounted(() => {
    window.removeEventListener("online", updateConnection);
    window.removeEventListener("offline", updateConnection);
  });
  watch([level, length], () => {
    if (ready.value) {
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
  watch(acceptAlternatives, () => {
    if (ready.value) {
      result.value = null;
      revealed.value = false;
      persist();
    }
  });
  watch(sentence, () => {
    if (ready.value) void loadQuestion();
  });

  return {
    level,
    length,
    mode,
    tab,
    settingsOpen,
    showRomaji,
    acceptAlternatives,
    sentence,
    question,
    answer,
    result,
    revealed,
    loading,
    checking,
    error,
    storageNote,
    journal,
    online,
    writingCard,
    loadQuestion,
    submit,
    nextSentence,
    shortcut,
    resetJournal,
  };
}
