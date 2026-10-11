# PostgreSQL 数据库 Schema 设计

本设计用于“认知康复一体化系统”的 MVP 与后续扩展，数据边界限定为辅助训练、状态评估、训练记录和趋势分析。所有用户数据、EEG 数据和训练数据均按隐私敏感数据处理。

## 1. SQL 建表语句

完整 SQL 位于 [postgresql-schema.sql](./postgresql-schema.sql)。

## 2. 字段说明

| 表                                   | 用途                                                               | 关键字段                                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `organizations`                      | 机构工作区，支持治疗师和管理员按机构隔离数据                       | `id`、`name`、`status`                                                                                                                   |
| `users`                              | 用户身份基础表，覆盖训练用户、家长、治疗师、机构管理员和系统管理员 | `id`、`email`、`phone`、`password_hash`、`display_name`、`primary_role`、`status`                                                        |
| `user_profiles`                      | 训练用户档案表，保存年龄段、训练目标、低刺激注意事项和同意状态     | `user_id`、`organization_id`、`age_band`、`training_goals`、`sensory_considerations`、`consent_version`                                  |
| `therapists`                         | 治疗师资料表，用于授权查看训练记录和阶段趋势                       | `user_id`、`organization_id`、`professional_title`、`service_scopes`、`contact_email`                                                    |
| `guardians`                          | 家长/监护人资料表                                                  | `user_id`、`relationship_to_user`、`contact_phone`、`contact_email`、`is_primary_guardian`                                               |
| `guardian_user_bindings`             | 家长与训练用户的数据访问关系                                       | `guardian_id`、`user_profile_id`、`can_view_reports`、`can_manage_consent`、`status`                                                     |
| `user_therapist_bindings`            | 训练用户与治疗师绑定关系                                           | `user_profile_id`、`therapist_id`、`organization_id`、`status`、`assigned_at`、`revoked_at`                                              |
| `informed_consents`                  | 知情同意记录，覆盖隐私、训练记录、EEG 模拟、报告共享和导出         | `user_profile_id`、`guardian_id`、`consent_type`、`consent_version`、`content_hash`、`granted_at`、`withdrawn_at`                        |
| `baseline_assessments`               | 基线评估表，用于训练前状态记录和后续趋势对比                       | `focus_self_rating`、`fatigue_self_rating`、`mood_self_rating`、`environment_noise_rating`、`readiness_confirmed`                        |
| `training_prescriptions`             | 训练处方表，对应辅助训练计划，不代表医疗处方                       | `training_types`、`frequency_per_week`、`session_duration_minutes`、`difficulty_min_level`、`difficulty_max_level`、`scope_notice`       |
| `training_sessions`                  | 单次训练会话表，统一串联音乐、EEG 和游戏记录                       | `training_type`、`status`、`flow_stage`、`difficulty_level`、`eeg_enabled`、`data_sensitivity`                                           |
| `music_therapy_sessions`             | 音乐疗愈记录表                                                     | `track_id`、`track_title`、`purpose`、`duration_seconds`、`volume_level`、`completion_rate`、`user_comfort_rating`                       |
| `eeg_feature_frames`                 | EEG 特征记录表，记录状态参考与信号质量                             | `source`、`window_seconds`、`sampling_rate_hz`、`attention_index`、`relaxation_index`、`quality_status`、`band_power_*`                  |
| `attention_training_records`         | 注意力训练记录表                                                   | `total_trials`、`correct_trials`、`target_hit_rate`、`distractor_error_rate`、`average_reaction_time_ms`、`focus_stability_score`        |
| `go_no_go_training_records`          | Go/No-Go 训练记录表                                                | `go_accuracy_rate`、`no_go_inhibition_rate`、`false_alarm_count`、`omission_count`、`early_response_count`                               |
| `rhythm_navigation_training_records` | 节律导航训练记录表                                                 | `rhythm_sync_rate`、`route_completion_rate`、`task_switch_error_count`、`working_memory_step_accuracy`、`average_beat_offset_ms`         |
| `adaptive_difficulty_records`        | 自适应难度记录表，保存建议与实际应用难度                           | `previous_difficulty_level`、`suggested_difficulty_level`、`applied_difficulty_level`、`reason_code`、`input_metrics`、`config_snapshot` |
| `weekly_reports`                     | 周报记录表，保存训练记录摘要、趋势和非诊断风险提示                 | `period_start`、`period_end`、`metric_summaries`、`risk_alerts`、`narrative_summary`、`next_training_focus`                              |
| `audit_logs`                         | 操作日志表，记录敏感数据访问、导出和权限变更                       | `actor_user_id`、`action`、`resource_type`、`resource_id`、`user_profile_id`、`metadata`                                                 |

## 3. 主键和外键关系

- 所有主表使用 `UUID PRIMARY KEY DEFAULT gen_random_uuid()`。
- `user_profiles.user_id -> users.id`，训练用户身份与档案一对一。
- `therapists.user_id -> users.id`，治疗师身份与资料一对一。
- `guardians.user_id -> users.id`，家长身份与资料一对一。
- `guardian_user_bindings.guardian_id -> guardians.id`，`guardian_user_bindings.user_profile_id -> user_profiles.id`。
- `user_therapist_bindings.user_profile_id -> user_profiles.id`，`user_therapist_bindings.therapist_id -> therapists.id`。
- `informed_consents.user_profile_id -> user_profiles.id`，可选 `guardian_id -> guardians.id`。
- `baseline_assessments.user_profile_id -> user_profiles.id`。
- `training_prescriptions.user_profile_id -> user_profiles.id`，可选 `therapist_id -> therapists.id`。
- `training_sessions.user_profile_id -> user_profiles.id`，可选关联 `training_prescription_id` 与 `baseline_assessment_id`。
- 音乐、EEG、注意力、Go/No-Go、节律导航、自适应难度记录均关联 `training_sessions.id` 和 `user_profiles.id`。
- `weekly_reports.user_profile_id -> user_profiles.id`，可选 `therapist_id -> therapists.id`。
- `audit_logs` 可关联操作者、训练用户档案、机构和具体资源。

## 4. 索引建议

- 身份与角色查询：`users.email`、`users.phone` 使用唯一索引。
- 权限范围查询：`user_profiles(organization_id, status)`、`user_therapist_bindings(user_profile_id, status)`、`guardian_user_bindings(user_profile_id, status)`。
- 时间序列查询：`training_sessions(user_profile_id, started_at DESC)`、`baseline_assessments(user_profile_id, assessed_at DESC)`。
- EEG 高频数据：`eeg_feature_frames(training_session_id, frame_timestamp DESC)`，后续数据量增大后建议按月或按周对 `frame_timestamp` 分区。
- 报告查询：`weekly_reports(user_profile_id, period_start DESC, period_end DESC)`。
- 审计追踪：`audit_logs(actor_user_id, created_at DESC)`、`audit_logs(resource_type, resource_id)`、`audit_logs(user_profile_id, created_at DESC)`。
- JSONB 摘要字段：对 `trial_summary`、`route_summary`、`metric_summaries`、`metadata` 使用 GIN 索引，方便后续检索。

## 5. 数据保留与脱敏建议

- 用户身份、家长、治疗师、绑定关系：账号有效期内保留；账号注销后应软删除或归档，并对展示名、联系方式做不可逆脱敏。
- 训练用户档案：按隐私敏感数据处理，默认最小权限访问；停用后保留必要审计引用，业务字段脱敏。
- 基线评估与训练记录：建议保留 3 年或按机构协议配置；导出时移除联系方式、账号标识和自由文本中的敏感内容。
- EEG 特征记录：MVP 只保存特征帧，不保存原始脑电波形；建议默认保留 180 天到 1 年，超过期限聚合为会话摘要后删除明细。
- 周报记录：可长期保留趋势摘要，但应与身份标识解耦；用于分析时使用 `user_profile_id` 的脱敏映射。
- 操作日志：建议至少保留 3 年，日志中避免存储完整敏感数据正文，只记录资源标识、动作和必要元数据。
- 知情同意记录：应随审计周期保留，不建议物理删除；撤回同意时记录 `withdrawn_at`。
- 脱敏策略：对邮箱、手机号、展示名、自由文本备注进行脱敏；对导出文件加水印、过期链接和访问审计。
- 访问控制：应用层执行 RBAC + 数据范围校验；数据库层可在后续启用 Row Level Security 作为加强控制。
