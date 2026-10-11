-- Runtime persistence tables for auth, profile, profile-access, operation-log,
-- and export-audit API contracts. These tables store operational and training
-- summary data only; raw EEG frames and diagnostic conclusions are out of scope.

CREATE TABLE IF NOT EXISTS api_auth_users (
  id TEXT PRIMARY KEY,
  email TEXT,
  phone TEXT,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  roles JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'archived')),
  organization_id TEXT,
  user_profile_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(roles) = 'array')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_auth_users_email_lower
  ON api_auth_users (lower(email))
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_auth_users_phone
  ON api_auth_users (phone)
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_api_auth_users_org
  ON api_auth_users (organization_id);

CREATE INDEX IF NOT EXISTS idx_api_auth_users_profile
  ON api_auth_users (user_profile_id);

CREATE TABLE IF NOT EXISTS api_auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  refresh_token_id TEXT NOT NULL UNIQUE,
  access_token_id TEXT NOT NULL UNIQUE,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_auth_sessions_user
  ON api_auth_sessions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS api_auth_revoked_tokens (
  token_id TEXT PRIMARY KEY,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_profile_access (
  user_profile_id TEXT PRIMARY KEY,
  organization_id TEXT,
  trainee_user_id TEXT,
  parent_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  therapist_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(parent_user_ids) = 'array'),
  CHECK (jsonb_typeof(therapist_user_ids) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_api_profile_access_org
  ON api_profile_access (organization_id);

CREATE TABLE IF NOT EXISTS api_user_profiles (
  id TEXT PRIMARY KEY,
  trainee_user_id TEXT NOT NULL,
  organization_id TEXT,
  basic_info JSONB NOT NULL,
  training_info JSONB NOT NULL,
  risk_screening JSONB NOT NULL,
  device_info JSONB NOT NULL,
  therapist_notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
  created_by_user_id TEXT NOT NULL,
  archived_by_user_id TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(basic_info) = 'object'),
  CHECK (jsonb_typeof(training_info) = 'object'),
  CHECK (jsonb_typeof(risk_screening) = 'object'),
  CHECK (jsonb_typeof(device_info) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_api_user_profiles_trainee
  ON api_user_profiles (trainee_user_id);

CREATE INDEX IF NOT EXISTS idx_api_user_profiles_org_status
  ON api_user_profiles (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_api_user_profiles_created_at
  ON api_user_profiles (created_at DESC);

CREATE TABLE IF NOT EXISTS api_operation_logs (
  id TEXT PRIMARY KEY,
  operation_type TEXT NOT NULL CHECK (
    operation_type IN (
      'auth.login',
      'profile.view_detail',
      'training_prescription.update',
      'training_data.export',
      'report.generate',
      'record.delete',
      'record.archive',
      'permission.update',
      'training.abnormal_pause'
    )
  ),
  actor_user_id TEXT NOT NULL,
  actor_roles JSONB NOT NULL,
  target JSONB NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  target_user_profile_id TEXT,
  organization_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  device_info TEXT,
  details JSONB,
  CHECK (jsonb_typeof(actor_roles) = 'array'),
  CHECK (jsonb_typeof(target) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_api_operation_logs_actor_time
  ON api_operation_logs (actor_user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_operation_logs_org_time
  ON api_operation_logs (organization_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_operation_logs_profile_time
  ON api_operation_logs (target_user_profile_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_operation_logs_type_time
  ON api_operation_logs (operation_type, occurred_at DESC);

CREATE TABLE IF NOT EXISTS api_training_data_export_audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  actor_roles JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'denied')),
  reason TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  query JSONB NOT NULL,
  exported_row_count INTEGER NOT NULL CHECK (exported_row_count >= 0),
  target_profile_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  denial_code TEXT,
  denial_message TEXT,
  CHECK (jsonb_typeof(actor_roles) = 'array'),
  CHECK (jsonb_typeof(query) = 'object'),
  CHECK (jsonb_typeof(target_profile_ids) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_api_training_data_export_audit_actor_time
  ON api_training_data_export_audit_logs (actor_user_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_training_data_export_audit_status_time
  ON api_training_data_export_audit_logs (status, requested_at DESC);

CREATE TABLE IF NOT EXISTS api_training_prescriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_profile_id TEXT NOT NULL,
  organization_id TEXT,
  therapist_user_id TEXT NOT NULL,
  weekly_session_count INTEGER NOT NULL CHECK (weekly_session_count BETWEEN 1 AND 5),
  session_duration_minutes INTEGER NOT NULL CHECK (session_duration_minutes BETWEEN 5 AND 30),
  module_combination JSONB NOT NULL,
  music_type TEXT NOT NULL CHECK (
    music_type IN ('focus', 'relax', 'rhythm', 'nature', 'white_noise', 'custom')
  ),
  initial_difficulty TEXT NOT NULL CHECK (
    initial_difficulty IN ('light', 'standard', 'advanced')
  ),
  adaptive_adjustment_enabled BOOLEAN NOT NULL,
  daily_max_training_minutes INTEGER NOT NULL CHECK (daily_max_training_minutes BETWEEN 10 AND 45),
  risk_reminder_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
  therapist_note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
  version INTEGER NOT NULL CHECK (version >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(module_combination) = 'array'),
  CHECK (jsonb_typeof(risk_reminder_keys) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_api_training_prescriptions_profile_status
  ON api_training_prescriptions (user_profile_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_training_prescriptions_org_updated
  ON api_training_prescriptions (organization_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS api_training_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_profile_id TEXT NOT NULL,
  therapist_user_id TEXT,
  organization_id TEXT,
  report_type TEXT NOT NULL CHECK (report_type IN ('single_session', 'weekly')),
  audience TEXT NOT NULL CHECK (audience IN ('therapist', 'parent')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  generated_by_user_id TEXT NOT NULL,
  session_count INTEGER NOT NULL CHECK (session_count >= 0),
  completed_session_count INTEGER NOT NULL CHECK (completed_session_count >= 0),
  average_completion_rate DOUBLE PRECISION NOT NULL CHECK (
    average_completion_rate >= 0 AND average_completion_rate <= 1
  ),
  metric_summaries JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_alerts JSONB NOT NULL DEFAULT '[]'::jsonb,
  narrative_summary TEXT NOT NULL,
  next_training_focus JSONB NOT NULL DEFAULT '[]'::jsonb,
  data_scope_notice TEXT NOT NULL,
  html_content TEXT,
  pdf_file_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(metric_summaries) = 'array'),
  CHECK (jsonb_typeof(risk_alerts) = 'array'),
  CHECK (jsonb_typeof(next_training_focus) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_api_training_reports_profile_generated
  ON api_training_reports (user_profile_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_training_reports_org_generated
  ON api_training_reports (organization_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_training_reports_type_audience
  ON api_training_reports (report_type, audience, generated_at DESC);
