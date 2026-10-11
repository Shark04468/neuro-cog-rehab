import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const schemaSql = readFileSync(join(process.cwd(), "docs", "postgresql-schema.sql"), "utf8");

const requiredTables = [
  "users",
  "therapists",
  "guardians",
  "user_therapist_bindings",
  "baseline_assessments",
  "training_prescriptions",
  "music_therapy_sessions",
  "eeg_feature_frames",
  "attention_training_records",
  "go_no_go_training_records",
  "rhythm_navigation_training_records",
  "adaptive_difficulty_records",
  "weekly_reports",
  "audit_logs",
  "informed_consents"
] as const;

describe("PostgreSQL schema documentation", () => {
  it("defines all required domain tables", () => {
    for (const tableName of requiredTables) {
      expect(schemaSql).toContain(`CREATE TABLE ${tableName}`);
    }
  });

  it("keeps report and EEG wording inside non-diagnostic training boundaries", () => {
    expect(schemaSql.toLowerCase()).toContain("not diagnostic interpretation");
    expect(schemaSql.toLowerCase()).not.toContain("cure");
    expect(schemaSql.toLowerCase()).not.toContain("guarantee");
  });
});
