import { describe, expect, it } from "vitest";

import { createInformedConsentRecord } from "../src/informed-consent-model.js";
import {
  buildInformedConsentStorageKey,
  loadInformedConsentRecord,
  removeInformedConsentRecord,
  saveInformedConsentRecord,
  type ConsentStorageLike
} from "../src/informed-consent-storage.js";

class MemoryConsentStorage implements ConsentStorageLike {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  public removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("informed consent storage", () => {
  it("saves and loads the consent record by user id", () => {
    const storage = new MemoryConsentStorage();
    const record = createInformedConsentRecord({
      userId: "trainee-demo-001",
      accepted: true,
      acceptedAt: "2026-06-16T00:00:00.000Z"
    });

    expect(saveInformedConsentRecord(record, storage)).toEqual({ saved: true });
    expect(loadInformedConsentRecord("trainee-demo-001", storage)).toEqual(record);
  });

  it("keeps consent records scoped to the matching user id", () => {
    const storage = new MemoryConsentStorage();
    const record = createInformedConsentRecord({
      userId: "trainee-demo-001",
      accepted: true
    });

    saveInformedConsentRecord(record, storage);

    expect(loadInformedConsentRecord("other-user", storage)).toBeNull();
  });

  it("clears corrupted consent data and requires review again", () => {
    const storage = new MemoryConsentStorage();
    const key = buildInformedConsentStorageKey("trainee-demo-001");
    storage.setItem(key, "{not-json");

    expect(loadInformedConsentRecord("trainee-demo-001", storage)).toBeNull();
    expect(storage.getItem(key)).toBeNull();
  });

  it("can remove a saved consent record when the user withdraws consent later", () => {
    const storage = new MemoryConsentStorage();
    const record = createInformedConsentRecord({
      userId: "trainee-demo-001",
      accepted: true
    });

    saveInformedConsentRecord(record, storage);
    removeInformedConsentRecord("trainee-demo-001", storage);

    expect(loadInformedConsentRecord("trainee-demo-001", storage)).toBeNull();
  });

  it("reports unavailable storage without throwing", () => {
    const record = createInformedConsentRecord({
      userId: "trainee-demo-001",
      accepted: true
    });

    expect(saveInformedConsentRecord(record, null)).toEqual({
      saved: false,
      message: "Consent storage is not available."
    });
    expect(loadInformedConsentRecord("trainee-demo-001", null)).toBeNull();
  });
});
