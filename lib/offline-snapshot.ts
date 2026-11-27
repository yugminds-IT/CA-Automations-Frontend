// Keeps the last good copy of a list in localStorage so a phone with no signal can still show it.
// Only plain data is stored. Never store tokens or secrets here.

export interface Snapshot<T> {
  savedAt: number;
  data: T;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const PREFIX = "lekvya.snapshot.";

function defaultStore(): KeyValueStore | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function saveSnapshot<T>(key: string, data: T, store: KeyValueStore | null = defaultStore(), now = Date.now()): void {
  if (!store) return;
  try {
    store.setItem(PREFIX + key, JSON.stringify({ savedAt: now, data } satisfies Snapshot<T>));
  } catch {
    // Storage full or blocked. The page still works online.
  }
}

export function loadSnapshot<T>(key: string, store: KeyValueStore | null = defaultStore()): Snapshot<T> | null {
  if (!store) return null;
  try {
    const raw = store.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Snapshot<T>>;
    if (typeof parsed.savedAt !== "number" || parsed.data === undefined) return null;
    return { savedAt: parsed.savedAt, data: parsed.data as T };
  } catch {
    return null;
  }
}
