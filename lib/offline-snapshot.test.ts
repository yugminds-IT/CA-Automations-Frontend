import { describe, expect, it } from "vitest";
import { KeyValueStore, loadSnapshot, saveSnapshot } from "./offline-snapshot";

function memoryStore(): KeyValueStore & { raw: Map<string, string> } {
  const raw = new Map<string, string>();
  return {
    raw,
    getItem: (k) => raw.get(k) ?? null,
    setItem: (k, v) => void raw.set(k, v),
  };
}

describe("offline snapshot", () => {
  it("round-trips data with its save time", () => {
    const store = memoryStore();
    saveSnapshot("tasks", [{ id: 1, title: "Call Aarav" }], store, 1000);
    expect(loadSnapshot<{ id: number; title: string }[]>("tasks", store)).toEqual({
      savedAt: 1000,
      data: [{ id: 1, title: "Call Aarav" }],
    });
  });

  it("returns null when nothing was saved", () => {
    expect(loadSnapshot("missing", memoryStore())).toBeNull();
  });

  it("ignores corrupt entries instead of throwing", () => {
    const store = memoryStore();
    store.raw.set("lekvya.snapshot.tasks", "{not json");
    expect(loadSnapshot("tasks", store)).toBeNull();
    store.raw.set("lekvya.snapshot.tasks", JSON.stringify({ data: [] }));
    expect(loadSnapshot("tasks", store)).toBeNull();
  });

  it("does nothing without a store (server render)", () => {
    expect(() => saveSnapshot("tasks", [1], null)).not.toThrow();
    expect(loadSnapshot("tasks", null)).toBeNull();
  });
});
