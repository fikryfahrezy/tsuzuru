import type { JournalEntry } from "./practice";

let database: Promise<IDBDatabase> | undefined;

function openJournal(): Promise<IDBDatabase> {
  if (!database) {
    database = new Promise<IDBDatabase>((resolve, reject) => {
      let blocked = false;
      const request = indexedDB.open("tsuzuru.journal", 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("entries", { keyPath: "sentenceId" });
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        blocked = true;
        reject(new Error("Journal storage is blocked"));
      };
      request.onsuccess = () => {
        const db = request.result;
        if (blocked) {
          db.close();
          return;
        }
        db.onclose = () => {
          database = undefined;
        };
        db.onversionchange = () => {
          db.close();
          database = undefined;
        };
        resolve(db);
      };
    }).catch((error: unknown) => {
      database = undefined;
      throw error;
    });
  }
  return database;
}

async function transaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openJournal();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("entries", mode);
    const request = run(tx.objectStore("entries"));
    tx.oncomplete = () => resolve(request.result);
    tx.onabort = () => reject(tx.error ?? new Error("Journal storage failed"));
    tx.onerror = () => reject(tx.error ?? new Error("Journal storage failed"));
  });
}

export function readJournal(): Promise<JournalEntry[]> {
  return transaction("readonly", (store) => store.getAll());
}

export async function writeJournalEntry(
  entry: JournalEntry,
): Promise<IDBValidKey> {
  // Vue refs contain proxies, which IndexedDB cannot structured-clone.
  const snapshot = JSON.parse(JSON.stringify(entry)) as JournalEntry;
  return transaction("readwrite", (store) => store.put(snapshot));
}

export function clearJournal(): Promise<undefined> {
  return transaction("readwrite", (store) => store.clear());
}
