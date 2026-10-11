-- PostgreSQL schema for the Cognitive Rehabilitation Integrated System.
-- The schema supports auxiliary training, state assessment, training records,
-- and trend analysis. It must not be used to store diagnostic conclusions.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE organizations IS 'Organization workspace for authorized training review and administration.';

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT UNIQUE,
  phone TEXT UNIQUE,
  password_hash TEXT,
  display_name TEXT NOT NULL,
  primary_role TEXT NOT NULL CHECK (
    primary_role IN (
      'trainee',
      'parent',
      'therapist',
      'org_admin',
      'system_admin'
    )
  ),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

COMMENT ON TABLE users IS 'Base identity table for all platform users.';
COMMENT ON COLUMN users.password_hash IS 'Authentication secret hash. Never expose through application APIs.';

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  age_band TEXT NOT NULL CHECK (age_band IN ('8_10', '11_13', '14_16', 'other')),
  training_goals TEXT[] NOT NULL DEFAULT '{}',
  sensory_considerations TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  consent_version TEXT,
  consent_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE user_profiles IS 'Privacy-sensitive training user profile for auxiliary training personalization.';
COMMENT ON COLUMN user_profiles.training_goals IS 'Non-clinical training goals such as attention practice or reaction control practice.';

CREATE TABLE therapists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  professional_title TEXT,
  service_scopes TEXT[] NOT NULL DEFAULT '{}',
  contact_email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE therapists IS 'Therapist-side profile for reviewing authorized training records and trends.';

CREATE TABLE guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  display_name TEXT NOT NULL,
  relationship_to_user TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  is_primary_guardian BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE guardians IS 'Guardian or parent profile for authorized viewing and consent workflows.';

CREATE TABLE guardian_user_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  relationship_label TEXT NOT NULL,
  can_view_reports BOOLEAN NOT NULL DEFAULT true,
  can_manage_consent BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (guardian_id, user_profile_id)
);

COMMENT ON TABLE guardian_user_bindings IS 'Data-scope binding between guardians and training user profiles.';

CREATE TABLE user_therapist_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'revoked')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (user_profile_id, therapist_id)
);

COMMENT ON TABLE user_therapist_bindings IS 'Authorized relationship between a training user profile and a therapist.';

CREATE TABLE informed_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  guardian_id UUID REFERENCES guardians(id) ON DELETE SET NULL,
  consent_type TEXT NOT NULL CHECK (
    consent_type IN ('privacy', 'training_record', 'eeg_simulation', 'report_sharing', 'data_export')
  ),
  consent_version TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  withdrawn_at TIMESTAMPTZ,
  granted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE informed_consents IS 'Consent records for privacy-sensitive user, EEG, and training data flows.';
COMMENT ON COLUMN informed_consents.content_hash IS 'Hash of the accepted consent text version for auditability.';

CREATE TABLE baseline_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  assessed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  focus_self_rating SMALLINT NOT NULL CHECK (focus_self_rating BETWEEN 1 AND 5),
  fatigue_self_rating SMALLINT NOT NULL CHECK (fatigue_self_rating BETWEEN 1 AND 5),
  mood_self_rating SMALLINT NOT NULL CHECK (mood_self_rating BETWEEN 1 AND 5),
  environment_noise_rating SMALLINT NOT NULL CHECK (environment_noise_rating BETWEEN 1 AND 5),
  readiness_confirmed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE baseline_assessments IS 'Pre-training state assessment for trend comparison only.';

CREATE TABLE training_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES therapists(id) ON DELETE SET NULL,
  plan_name TEXT NOT NULL,
  plan_status TEXT NOT NULL DEFAULT 'draft' CHECK (plan_status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  training_types TEXT[] NOT NULL DEFAULT '{}',
  frequency_per_week SMALLINT NOT NULL CHECK (frequency_per_week BETWEEN 1 AND 14),
  session_duration_minutes SMALLINT NOT NULL CHECK (session_duration_minutes BETWEEN 1 AND 60),
  difficulty_min_level SMALLINT NOT NULL CHECK (difficulty_min_level BETWEEN 1 AND 10),
  difficulty_max_level SMALLINT NOT NULL CHECK (difficulty_max_level BETWEEN 1 AND 10),
  start_date DATE NOT NULL,
  end_date DATE,
  safety_notes TEXT,
  scope_notice TEXT NOT NULL DEFAULT 'Auxiliary training plan for state tracking and trend review only.',
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (difficulty_min_level <= difficulty_max_level),
  CHECK (
    training_types <@ ARRAY[
      'music_relaxation',
      'attention_training',
      'go_no_go',
      'rhythm_navigation'
    ]::TEXT[]
  )
);

COMMENT ON TABLE training_prescriptions IS 'Auxiliary training plan table. The product may call this a training prescription, but it is not a medical prescription.';

CREATE TABLE training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  training_prescription_id UUID REFERENCES training_prescriptions(id) ON DELETE SET NULL,
  baseline_assessment_id UUID REFERENCES baseline_assessments(id) ON DELETE SET NULL,
  training_type TEXT NOT NULL CHECK (
    training_type IN ('music_relaxation', 'attention_training', 'go_no_go', 'rhythm_navigation')
  ),
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'in_progress', 'paused', 'completed', 'abandoned')),
  flow_stage TEXT NOT NULL DEFAULT 'training' CHECK (flow_stage IN ('baseline', 'training', 'cool_down')),
  difficulty_level SMALLINT NOT NULL CHECK (difficulty_level BETWEEN 1 AND 10),
  eeg_enabled BOOLEAN NOT NULL DEFAULT false,
  data_sensitivity TEXT NOT NULL DEFAULT 'sensitive' CHECK (data_sensitivity IN ('standard', 'sensitive')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE training_sessions IS 'Lifecycle record for one auxiliary training session.';

CREATE TABLE music_therapy_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  track_title TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('pre_training_relaxation', 'training_support', 'cool_down')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),
  volume_level SMALLINT NOT NULL CHECK (volume_level BETWEEN 0 AND 100),
  completion_rate NUMERIC(5, 4) NOT NULL CHECK (completion_rate BETWEEN 0 AND 1),
  user_comfort_rating SMALLINT CHECK (user_comfort_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE music_therapy_sessions IS 'Music-based auxiliary training records for low-stimulation relaxation and transition flows.';

CREATE TABLE eeg_feature_frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  frame_timestamp TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('simulator', 'device')),
  window_seconds NUMERIC(6, 3) NOT NULL CHECK (window_seconds > 0),
  sampling_rate_hz INTEGER NOT NULL CHECK (sampling_rate_hz > 0),
  attention_index NUMERIC(6, 3) NOT NULL CHECK (attention_index BETWEEN 0 AND 100),
  relaxation_index NUMERIC(6, 3) NOT NULL CHECK (relaxation_index BETWEEN 0 AND 100),
  signal_quality NUMERIC(6, 3) NOT NULL CHECK (signal_quality BETWEEN 0 AND 100),
  quality_status TEXT NOT NULL CHECK (quality_status IN ('good', 'unstable', 'noisy', 'disconnected')),
  artifact_flag BOOLEAN NOT NULL DEFAULT false,
  band_power_delta NUMERIC(10, 6) NOT NULL CHECK (band_power_delta >= 0),
  band_power_theta NUMERIC(10, 6) NOT NULL CHECK (band_power_theta >= 0),
  band_power_alpha NUMERIC(10, 6) NOT NULL CHECK (band_power_alpha >= 0),
  band_power_beta NUMERIC(10, 6) NOT NULL CHECK (band_power_beta >= 0),
  band_power_gamma NUMERIC(10, 6) NOT NULL CHECK (band_power_gamma >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE eeg_feature_frames IS 'EEG feature frames for state tracking and data-quality review, not diagnostic interpretation.';

CREATE TABLE attention_training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_session_id UUID NOT NULL UNIQUE REFERENCES training_sessions(id) ON DELETE CASCADE,
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  total_trials INTEGER NOT NULL CHECK (total_trials >= 0),
  correct_trials INTEGER NOT NULL CHECK (correct_trials >= 0),
  error_count INTEGER NOT NULL CHECK (error_count >= 0),
  completion_rate NUMERIC(5, 4) NOT NULL CHECK (completion_rate BETWEEN 0 AND 1),
  accuracy_rate NUMERIC(5, 4) NOT NULL CHECK (accuracy_rate BETWEEN 0 AND 1),
  target_hit_rate NUMERIC(5, 4) NOT NULL CHECK (target_hit_rate BETWEEN 0 AND 1),
  distractor_error_rate NUMERIC(5, 4) NOT NULL CHECK (distractor_error_rate BETWEEN 0 AND 1),
  average_reaction_time_ms INTEGER CHECK (average_reaction_time_ms IS NULL OR average_reaction_time_ms >= 0),
  longest_continuous_correct_count INTEGER NOT NULL CHECK (longest_continuous_correct_count >= 0),
  focus_stability_score NUMERIC(6, 3) CHECK (focus_stability_score IS NULL OR focus_stability_score BETWEEN 0 AND 100),
  trial_summary JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE attention_training_records IS 'Summary record for attention training game sessions.';

CREATE TABLE go_no_go_training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_session_id UUID NOT NULL UNIQUE REFERENCES training_sessions(id) ON DELETE CASCADE,
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  total_trials INTEGER NOT NULL CHECK (total_trials >= 0),
  correct_trials INTEGER NOT NULL CHECK (correct_trials >= 0),
  error_count INTEGER NOT NULL CHECK (error_count >= 0),
  completion_rate NUMERIC(5, 4) NOT NULL CHECK (completion_rate BETWEEN 0 AND 1),
  accuracy_rate NUMERIC(5, 4) NOT NULL CHECK (accuracy_rate BETWEEN 0 AND 1),
  go_accuracy_rate NUMERIC(5, 4) NOT NULL CHECK (go_accuracy_rate BETWEEN 0 AND 1),
  no_go_inhibition_rate NUMERIC(5, 4) NOT NULL CHECK (no_go_inhibition_rate BETWEEN 0 AND 1),
  false_alarm_count INTEGER NOT NULL CHECK (false_alarm_count >= 0),
  omission_count INTEGER NOT NULL CHECK (omission_count >= 0),
  early_response_count INTEGER NOT NULL CHECK (early_response_count >= 0),
  average_go_reaction_time_ms INTEGER CHECK (average_go_reaction_time_ms IS NULL OR average_go_reaction_time_ms >= 0),
  trial_summary JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE go_no_go_training_records IS 'Summary record for Go/No-Go reaction and inhibition-control training sessions.';

CREATE TABLE rhythm_navigation_training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_session_id UUID NOT NULL UNIQUE REFERENCES training_sessions(id) ON DELETE CASCADE,
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  total_trials INTEGER NOT NULL CHECK (total_trials >= 0),
  correct_trials INTEGER NOT NULL CHECK (correct_trials >= 0),
  error_count INTEGER NOT NULL CHECK (error_count >= 0),
  completion_rate NUMERIC(5, 4) NOT NULL CHECK (completion_rate BETWEEN 0 AND 1),
  accuracy_rate NUMERIC(5, 4) NOT NULL CHECK (accuracy_rate BETWEEN 0 AND 1),
  rhythm_sync_rate NUMERIC(5, 4) NOT NULL CHECK (rhythm_sync_rate BETWEEN 0 AND 1),
  route_completion_rate NUMERIC(5, 4) NOT NULL CHECK (route_completion_rate BETWEEN 0 AND 1),
  task_switch_error_count INTEGER NOT NULL CHECK (task_switch_error_count >= 0),
  working_memory_step_accuracy NUMERIC(5, 4) NOT NULL CHECK (working_memory_step_accuracy BETWEEN 0 AND 1),
  average_beat_offset_ms INTEGER CHECK (average_beat_offset_ms IS NULL OR average_beat_offset_ms >= 0),
  route_summary JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE rhythm_navigation_training_records IS 'Summary record for rhythm navigation training sessions.';

CREATE TABLE adaptive_difficulty_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  training_type TEXT NOT NULL CHECK (training_type IN ('attention_training', 'go_no_go', 'rhythm_navigation')),
  previous_difficulty_level SMALLINT NOT NULL CHECK (previous_difficulty_level BETWEEN 1 AND 10),
  suggested_difficulty_level SMALLINT NOT NULL CHECK (suggested_difficulty_level BETWEEN 1 AND 10),
  applied_difficulty_level SMALLINT CHECK (applied_difficulty_level BETWEEN 1 AND 10),
  evaluation_window_size SMALLINT NOT NULL CHECK (evaluation_window_size >= 1),
  reason_code TEXT NOT NULL,
  input_metrics JSONB NOT NULL DEFAULT '{}'::JSONB,
  config_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE adaptive_difficulty_records IS 'Bounded adaptive difficulty decisions for training fit and safety review.';

CREATE TABLE weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES therapists(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  session_count INTEGER NOT NULL CHECK (session_count >= 0),
  completed_session_count INTEGER NOT NULL CHECK (completed_session_count >= 0),
  average_completion_rate NUMERIC(5, 4) NOT NULL CHECK (average_completion_rate BETWEEN 0 AND 1),
  metric_summaries JSONB NOT NULL DEFAULT '[]'::JSONB,
  risk_alerts JSONB NOT NULL DEFAULT '[]'::JSONB,
  narrative_summary TEXT NOT NULL,
  next_training_focus TEXT[] NOT NULL DEFAULT '{}',
  data_scope_notice TEXT NOT NULL DEFAULT 'Report data is privacy-sensitive and limited to authorized training review.',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  CHECK (period_start <= period_end)
);

COMMENT ON TABLE weekly_reports IS 'Weekly training report with records, trends, and non-diagnostic alerts.';

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  user_profile_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  data_sensitivity TEXT NOT NULL DEFAULT 'sensitive' CHECK (data_sensitivity IN ('standard', 'sensitive')),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit_logs IS 'Append-only audit log for sensitive data access, exports, and permission changes.';

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_org_status ON user_profiles(organization_id, status);
CREATE INDEX idx_therapists_user_id ON therapists(user_id);
CREATE INDEX idx_therapists_org_active ON therapists(organization_id, is_active);
CREATE INDEX idx_guardians_user_id ON guardians(user_id);
CREATE INDEX idx_guardian_bindings_profile ON guardian_user_bindings(user_profile_id, status);
CREATE INDEX idx_therapist_bindings_profile ON user_therapist_bindings(user_profile_id, status);
CREATE INDEX idx_therapist_bindings_therapist ON user_therapist_bindings(therapist_id, status);
CREATE INDEX idx_consents_profile_type ON informed_consents(user_profile_id, consent_type, granted_at DESC);
CREATE INDEX idx_baseline_profile_time ON baseline_assessments(user_profile_id, assessed_at DESC);
CREATE INDEX idx_prescriptions_profile_status ON training_prescriptions(user_profile_id, plan_status);
CREATE INDEX idx_training_sessions_profile_time ON training_sessions(user_profile_id, started_at DESC);
CREATE INDEX idx_training_sessions_type_status ON training_sessions(training_type, status);
CREATE INDEX idx_music_sessions_profile_time ON music_therapy_sessions(user_profile_id, started_at DESC);
CREATE INDEX idx_eeg_frames_session_time ON eeg_feature_frames(training_session_id, frame_timestamp DESC);
CREATE INDEX idx_eeg_frames_profile_time ON eeg_feature_frames(user_profile_id, frame_timestamp DESC);
CREATE INDEX idx_attention_records_profile ON attention_training_records(user_profile_id, created_at DESC);
CREATE INDEX idx_go_no_go_records_profile ON go_no_go_training_records(user_profile_id, created_at DESC);
CREATE INDEX idx_rhythm_records_profile ON rhythm_navigation_training_records(user_profile_id, created_at DESC);
CREATE INDEX idx_adaptive_records_profile ON adaptive_difficulty_records(user_profile_id, created_at DESC);
CREATE INDEX idx_weekly_reports_profile_period ON weekly_reports(user_profile_id, period_start DESC, period_end DESC);
CREATE INDEX idx_audit_logs_actor_time ON audit_logs(actor_user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_profile_time ON audit_logs(user_profile_id, created_at DESC);

CREATE INDEX idx_attention_trial_summary_gin ON attention_training_records USING GIN (trial_summary);
CREATE INDEX idx_go_no_go_trial_summary_gin ON go_no_go_training_records USING GIN (trial_summary);
CREATE INDEX idx_rhythm_route_summary_gin ON rhythm_navigation_training_records USING GIN (route_summary);
CREATE INDEX idx_weekly_reports_metric_summaries_gin ON weekly_reports USING GIN (metric_summaries);
CREATE INDEX idx_audit_logs_metadata_gin ON audit_logs USING GIN (metadata);
