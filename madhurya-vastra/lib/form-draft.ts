// Keeps a form's typed input (photos included) when a session ends mid-form, so it comes back
// after signing in. Browser only. Stored in IndexedDB: photos are Files, too big for sessionStorage.
// Every call fails quietly — keeping a draft is a convenience, never a reason to block the person.

const DB = "mv-drafts";
const STORE = "drafts";
/** A kept draft older than this is dropped instead of restored. */
export const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type FormDraft<T> = { userId: string; savedAt: number; value: T };

/** The draft may come back only for the same person, and only while it is fresh. */
export function usableDraft<T>(draft: FormDraft<T> | null | undefined, userId: string, now = Date.now()): T | null {
  if (!draft || draft.userId !== userId) return null;
  if (!(now - draft.savedAt >= 0 && now - draft.savedAt <= DRAFT_MAX_AGE_MS)) return null;
  return draft.value;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<R>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<R>): Promise<R> {
  const db = await open();
  try {
    return await new Promise<R>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function saveDraft<T>(key: string, userId: string, value: T): Promise<void> {
  try {
    await run("readwrite", (s) => s.put({ userId, savedAt: Date.now(), value } satisfies FormDraft<T>, key));
  } catch {}
}

/** Reads and removes the draft; returns its value only if `userId` may have it back. */
export async function takeDraft<T>(key: string, userId: string): Promise<T | null> {
  try {
    const draft = await run<FormDraft<T> | undefined>("readonly", (s) => s.get(key));
    if (draft) await run("readwrite", (s) => s.delete(key));
    return usableDraft(draft, userId);
  } catch {
    return null;
  }
}
