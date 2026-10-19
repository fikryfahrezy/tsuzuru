import { expect, test } from "bun:test";
import { IDBFactory } from "fake-indexeddb";
import { reactive } from "vue";
import {
  clearJournal,
  readJournal,
  writeJournalEntry,
} from "../app/utils/journal-storage";
import type { JournalEntry } from "../app/utils/practice";
import { Level } from "../shared/practice";

function entry(index: number): JournalEntry {
  return {
    id: `attempt-${index}`,
    sentenceId: `sentence-${index}`,
    english: "Water",
    answer: "水",
    reference: "水",
    outcome: "matched" as JournalEntry["outcome"],
    date: new Date(index * 1000).toISOString(),
    level: Level.N5,
  };
}

test("IndexedDB keeps more than 100 sentences, updates proxies, and clears in transaction order", async () => {
  const previous = globalThis.indexedDB;
  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    writable: true,
    value: undefined,
  });
  await expect(readJournal()).rejects.toThrow();
  globalThis.indexedDB = new IDBFactory();
  try {
    expect(await readJournal()).toEqual([]);
    await Promise.all(
      Array.from({ length: 125 }, (_, index) =>
        writeJournalEntry(entry(index)),
      ),
    );
    expect(await readJournal()).toHaveLength(125);
    const revised = reactive({ ...entry(0), id: "retry", answer: "みず" });
    const write = writeJournalEntry(revised);
    revised.answer = "unsaved";
    await write;
    const saved = await readJournal();
    expect(saved).toHaveLength(125);
    expect(saved.find((row) => row.sentenceId === "sentence-0")).toMatchObject({
      id: "retry",
      answer: "みず",
    });
    await Promise.all([writeJournalEntry(entry(126)), clearJournal()]);
    expect(await readJournal()).toEqual([]);
    await expect(
      writeJournalEntry({ ...entry(1), sentenceId: undefined }),
    ).rejects.toThrow();
    expect(await readJournal()).toEqual([]);
  } finally {
    const close = globalThis.indexedDB.deleteDatabase("tsuzuru.journal");
    await new Promise<void>((resolve, reject) => {
      close.onsuccess = () => resolve();
      close.onerror = () => reject(close.error);
    });
    globalThis.indexedDB = previous;
  }
});
