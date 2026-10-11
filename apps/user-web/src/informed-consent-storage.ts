import type { InformedConsentRecord } from "./informed-consent-model.js";

export interface ConsentStorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export interface ConsentStorageResult {
  saved: boolean;
  message?: string;
}

const CONSENT_STORAGE_PREFIX = "neuro-cog-rehab:informed-consent:";

export class InformedConsentStorageError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "InformedConsentStorageError";
  }
}

export function buildInformedConsentStorageKey(userId: string): string {
  const normalizedUserId = userId.trim();
  if (normalizedUserId.length === 0) {
    throw new InformedConsentStorageError("userId is required for consent storage.");
  }

  return `${CONSENT_STORAGE_PREFIX}${normalizedUserId}`;
}

export function loadInformedConsentRecord(
  userId: string,
  storage: ConsentStorageLike | null = getBrowserSessionStorage()
): InformedConsentRecord | null {
  if (storage === null) {
    return null;
  }

  const storageKey = buildInformedConsentStorageKey(userId);
  const rawRecord = storage.getItem(storageKey);
  if (rawRecord === null) {
    return null;
  }

  try {
    const parsedRecord: unknown = JSON.parse(rawRecord);
    if (!isInformedConsentRecord(parsedRecord) || parsedRecord.userId !== userId) {
      storage.removeItem(storageKey);
      return null;
    }

    return parsedRecord;
  } catch {
    // Clear unreadable consent data so the user can review the current protocol again.
    storage.removeItem(storageKey);
    return null;
  }
}

export function saveInformedConsentRecord(
  record: InformedConsentRecord,
  storage: ConsentStorageLike | null = getBrowserSessionStorage()
): ConsentStorageResult {
  if (!isInformedConsentRecord(record)) {
    return { saved: false, message: "Consent record is incomplete." };
  }

  if (storage === null) {
    return { saved: false, message: "Consent storage is not available." };
  }

  try {
    storage.setItem(buildInformedConsentStorageKey(record.userId), JSON.stringify(record));
    return { saved: true };
  } catch {
    return { saved: false, message: "Consent record could not be saved." };
  }
}

export function removeInformedConsentRecord(
  userId: string,
  storage: ConsentStorageLike | null = getBrowserSessionStorage()
): void {
  if (storage === null) {
    return;
  }

  storage.removeItem(buildInformedConsentStorageKey(userId));
}

function getBrowserSessionStorage(): ConsentStorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isInformedConsentRecord(value: unknown): value is InformedConsentRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.userId === "string" &&
    typeof record.consentVersion === "string" &&
    typeof record.consentedAt === "string" &&
    record.acceptedByRole === "guardian" &&
    record.dataSensitivity === "sensitive" &&
    Array.isArray(record.acceptedSectionIds) &&
    record.acceptedSectionIds.every((sectionId) => typeof sectionId === "string")
  );
}
