-- Runtime persistence table for the current /training-records API contract.
-- Stores summary metrics only; raw EEG frames are intentionally not persisted here.

CREATE TABLE IF NOT EXISTS api_training_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_profile_id TEXT NOT NULL,
  organization_id TEXT,
  training_type TEXT NOT NULL CHECK (
    training_type IN (
      'baseline_assessment',
      'music_therapy',
      'attention_game',
      'go_nogo_game',
      'rhythm_navigation',
      'mixed_session'
    )
  ),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),
  behavior_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  eeg_summary_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  difficulty_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  abnormal_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  completion_status TEXT NOT NULL CHECK (
    completion_status IN ('completed', 'partial', 'abandoned', 'interrupted')
  ),
  created_by_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_training_records_profile_time
  ON api_training_records (user_profile_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_training_records_user_time
  ON api_training_records (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_training_records_org_time
  ON api_training_records (organization_id, started_at DESC);
