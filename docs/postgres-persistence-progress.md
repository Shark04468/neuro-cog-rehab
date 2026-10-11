# PostgreSQL Persistence Progress

This document tracks the backend persistence cutover for the cognitive
rehabilitation support platform. The data scope remains auxiliary training,
state assessment, training records, and trend review. No table or adapter stores
diagnosis, cure claims, or guaranteed outcome statements.

## Completed in This Round

- `api_auth_users`: account records for login and role identity.
- `api_auth_sessions`: refresh/access token session state.
- `api_auth_revoked_tokens`: logout and refresh-token revocation tracking.
- `api_profile_access`: trainee, parent, and therapist profile-access bindings.
- `api_user_profiles`: training user profile and training-safety screening data.
- `api_training_records`: per-session training summary records.
- `api_training_prescriptions`: active therapist-authored auxiliary training arrangements.
- `api_training_reports`: generated report metadata, trend summaries, and restrained narrative summaries.
- `api_operation_logs`: append-only operational audit records.
- `api_training_data_export_audit_logs`: deidentified export attempt audit records.

All PostgreSQL adapters preserve existing repository interfaces so services and
controllers continue to work in memory mode for tests and demo mode.

## Still Mock or Not Yet Backed by api-server

- Therapist workspace user lists, dashboard aggregates, and user detail trends still use generated/mock data.
- Report-service HTML/PDF rendering still needs to write generated report metadata into api-server in a real workflow.
- Music library data still uses frontend mock fixtures.
- Frontend EEG views still generate mock frames when no real WebSocket frames are supplied.
- Organization statistics, device management, and several admin dashboards still use static/demo data.

## Recommended Next Order

1. Replace therapist-web dashboard, user detail, and report detail mock reads with typed api-server clients.
2. Connect report-service HTML/PDF generation to the api-server report metadata API.
3. Replace music library fixtures with a real music-material API.
4. Connect user-web EEG visualizations to `eeg-gateway` WebSocket streams by `userId` and `sessionId`.
5. Persist EEG gateway summaries through `/training-records` or a dedicated summary endpoint.
6. Replace organization statistics, device management, and permission views with real admin APIs.
