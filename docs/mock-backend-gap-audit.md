# Mock / Backend Gap Audit

本清单用于标记当前系统中仍依赖演示数据、内存仓储、占位页面或尚未接入真实后端的位置。所有条目仅用于工程排期和风险边界梳理，不代表真实训练记录、诊断判断或效果结论。

## P0 - 影响真实运行闭环

| 模块           | 位置                                                                                                                                                 | 当前状态                                                                                                                                                                                                         | 建议处理                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| API 服务运行时 | `services/api-server/src/http-server.ts`、`services/api-server/src/server.ts`、`services/api-server/package.json`                                    | 已补充 Node HTTP runtime、`start/dev` 脚本和主流程接口测试。当前可访问 `/health`、`/auth/*`、`/profiles`、`/training-records`、`/training-data-exports/deidentified`、`/operation-logs`。                        | 下一步接入前端 typed API client，并在生产前替换内存仓储。                                                |
| API 数据持久化 | `services/api-server/src/**/InMemory*Repository.ts`、`services/api-server/src/training-records/postgres-training-record-repository.ts`               | `/training-records` 已支持可选 PostgreSQL 摘要持久化；认证、建档、导出审计、操作日志仍为内存仓储，服务重启后数据会丢失。                                                                                         | 继续实现认证、用户档案、操作日志和导出审计 PostgreSQL repository；保留内存仓储仅用于单元测试和演示模式。 |
| 前端业务 API   | `apps/user-web/src/App.tsx`、`apps/therapist-web/src/App.tsx`、`apps/admin-web/src/App.tsx`                                                          | 统一登录/注册已支持 `api-server`；用户端训练记录保存、最近 7 天训练历史读取和管理员操作日志读取已有 typed API client。报告、设备、管理端统计等业务数据仍主要通过本地 mock、sessionStorage 和 demo handoff 驱动。 | 继续新增 typed API client，按角色逐步替换 mock 数据源。                                                  |
| 登录认证对接   | `packages/ui-components/src/auth-api-client.ts`、`packages/ui-components/src/login-form.tsx`、`packages/ui-components/src/unified-auth-portal.tsx`   | 已支持配置 `VITE_API_BASE_URL` 后走 `/auth/login` 和 `/auth/me`；未配置时仍回退到现有 mock/demo 登录。                                                                                                           | 下一步接入 refresh/logout 生命周期，并在生产环境关闭演示入口或使用安全配置隔离。                         |
| 注册提交对接   | `packages/ui-components/src/auth-api-client.ts`、`packages/ui-components/src/register-flow.tsx`、`packages/ui-components/src/register-flow-model.ts` | 已支持配置 `VITE_API_BASE_URL` 后提交 `/auth/register`；未配置时仍使用 `mockSubmitRegisterFlow`。训练用户当前使用待建档 profileId 占位。                                                                         | 后续接入完整注册审核/建档流程；治疗师和机构管理员注册应进入机构审核流程。                                |

## P1 - 页面可见但数据仍为演示

| 模块             | 位置                                                                                                                           | 当前状态                                                                                                                                                                                                                                                    | 建议处理                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 用户端训练舱     | `apps/user-web/src/trainee-dashboard-mock.ts`、`apps/user-web/src/training-history-api-client.ts`、`apps/user-web/src/App.tsx` | 配置 `VITE_API_BASE_URL` 且登录态含 `userProfileId` 时，首页、设备页、设置页、家长记录/建议/风险页会读取 `/training-records` 最近 7 天摘要并覆盖周进度、注意趋势和上次反馈；今日任务、设备实时状态、音乐推荐和治疗师留言仍来自 `mockTraineeDashboardData`。 | 继续接 `/users/{id}/dashboard`、`/devices/status`、`/prescriptions/active`，保留训练历史 API 作为周进度数据源。 |
| 用户端处方任务   | `apps/user-web/src/prescription-home-config.ts`                                                                                | 今日任务由 `mockActiveTrainingPrescriptionForHome` 转换。                                                                                                                                                                                                   | 接治疗师处方 API，按授权用户读取。                                                                              |
| 单次训练记录保存 | `apps/user-web/src/training-record-api-client.ts`、`apps/user-web/src/TrainingEndFeedbackPage.tsx`                             | 有 API 会话和 `userProfileId` 时已可提交 `/training-records`；未配置 API 或缺少档案范围时仍生成页面内草稿。当前提交的是阶段摘要和趋势指标，不含真实游戏完整 trial 或实时 EEG 摘要。                                                                         | 接入真实训练模块结果、EEG 摘要和处方难度快照，补充完整端到端保存测试。                                          |
| 家长端简报       | `apps/user-web/src/parent-training-brief-model.ts`、`apps/user-web/src/ParentTrainingBriefPage.tsx`                            | 使用 `mockParentTrainingBriefInput`。                                                                                                                                                                                                                       | 接周报/简报 API，家长端只返回简化字段。                                                                         |
| 治疗师端工作区   | `apps/therapist-web/src/therapist-workspace-mock.ts`、`apps/therapist-web/src/therapist-dashboard-mock.ts`                     | 用户列表、提醒、统计概览均为 mock。                                                                                                                                                                                                                         | 接 `/therapist/users`、`/therapist/dashboard`、`/alerts`。                                                      |
| 治疗师用户详情   | `apps/therapist-web/src/therapist-user-detail-mock.ts`                                                                         | 趋势、训练记录、音乐适配记录为 mock。                                                                                                                                                                                                                       | 接用户详情、趋势、单次训练记录、音乐适配记录 API。                                                              |
| 治疗师报告中心   | `apps/therapist-web/src/App.tsx`、`services/report-service/src/weekly-training-report.mock.ts`                                 | 报告列表和周报示例为 demo/mock。                                                                                                                                                                                                                            | report-service 输出真实 HTML/PDF 后，治疗师端按 reportId 拉取。                                                 |
| 管理员端         | `apps/admin-web/src/App.tsx`、`apps/admin-web/src/operation-log-api-client.ts`                                                 | 配置 `VITE_API_BASE_URL` 且机构管理员 API 登录成功时，`/admin/logs` 会读取 `/operation-logs` 审计摘要；机构概览、用户、设备、统计、权限页面仍是静态演示视图。                                                                                               | 继续接机构统计、用户管理、设备管理和权限 API；操作日志后续补充筛选 UI。                                         |
| 音乐库           | `packages/ui-components/src/music-library-mock.ts`                                                                             | 音乐文件 URL 指向 `assets.example.test`，用户列表为 mock。                                                                                                                                                                                                  | 接音乐素材 API、授权用户 API，并补充真实可播放资源或对象存储地址。                                              |

## P1 - 实时能力尚未闭环

| 模块                 | 位置                                                                                                                     | 当前状态                                                                | 建议处理                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| EEG 前端实时连接     | `packages/ui-components/src/professional-eeg-visualization.tsx`、`packages/ui-components/src/training-session-shell.tsx` | 未传入真实帧时会生成 mock EEG frame。                                   | 增加前端 WebSocket client，连接 `eeg-gateway`，按 `userId/sessionId` 订阅。 |
| EEG gateway 摘要保存 | `services/eeg-gateway/src/eeg-gateway-server.ts`                                                                         | gateway 已支持 WebSocket 和摘要 endpoint 配置，但前端未形成端到端连接。 | 先接 user-web 训练页，再把摘要写入 api-server。                             |
| 音乐疗愈训练页       | `packages/ui-components/src/music-therapy-training-page.tsx`                                                             | EEG 快照由 `createMockMusicTherapyEegSnapshot` 生成。                   | 使用实时 EEG frames 和训练记录 API 保存 `MusicTherapySession`。             |

## P2 - 可保留为演示或测试资源

| 模块         | 位置                                                                                                             | 当前状态                                  | 建议处理                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------ |
| 演示模式     | `packages/ui-components/src/demo-mode.ts`、`docs/demo-mode.md`                                                   | 已明确标记为“演示数据 - 非真实训练记录”。 | 保留，但生产环境通过配置关闭入口。         |
| E2E mock     | `tests/e2e/mocks/**`                                                                                             | 端到端演示流程使用 mock 数据。            | 保留为 smoke/demo 测试；另增真实 API e2e。 |
| 设计系统示例 | `packages/ui-components/src/design-system-example.tsx`、`packages/ui-components/src/dynamic-effects-example.tsx` | 仅作为组件展示。                          | 保留，不进入生产路由。                     |
| 报告 mock    | `services/report-service/src/weekly-training-report.mock.ts`                                                     | 用于报告服务测试和展示。                  | 保留测试 fixture，避免被真实端误用。       |

## 已在本轮修复

- `apps/user-web/src/App.tsx` 现在识别 `/trainee/device`、`/trainee/settings`、`/parent/records`、`/parent/advice`、`/parent/risk`、`/parent/settings`。
- `apps/user-web/src/UserAuxiliaryPages.tsx` 新增非空白辅助页面，并明确显示演示数据边界。
- `apps/user-web/src/styles.css` 新增辅助页面医疗玻璃风样式。
- `apps/user-web/tests/user-auxiliary-routes.test.ts` 覆盖上述路径映射和非空白页面存在性。
- `packages/ui-components/src/role-based-sidebar.tsx` 为侧边栏按钮补充 `data-path`，便于自动化验证菜单路径不跨端跳转。
- `packages/ui-components/src/music-library-page.tsx` 为音乐库页面补充页面级 `h1`，治疗师端音乐库不再出现空主标题。
- `apps/admin-web/src/App.tsx` 当前已使用 `NeuroGlassCard`、`MedicalMetricCard`、`MedicalChartContainer`、`StatusDistributionChart`、`SystemHealthIndicator` 和 `DemoModeBadge`，管理员端视觉割裂问题已进入统一医疗平台壳层。
- 动态点击验证已覆盖治疗师端 8 个侧栏菜单和机构管理员端 7 个侧栏菜单，结果均停留在对应工作区端口，未复现跳转到用户端的问题。
- `services/api-server/src/http-server.ts` 新增 Node HTTP runtime，挂载认证、建档、训练记录、脱敏导出和操作日志模块。
- `services/api-server/src/server.ts` 新增启动入口；`services/api-server/package.json` 新增 `start` 和 `dev` 脚本。
- `services/api-server/tests/http-server.test.ts` 新增接口运行时测试，覆盖健康检查、鉴权保护、注册登录、建档、保存训练记录、分页查询和操作日志查询。
- `packages/ui-components/src/auth-api-client.ts` 新增正式模式认证 API client，支持 `/auth/login`、`/auth/me` 和 `/auth/register`。
- `packages/ui-components/src/unified-auth-portal.tsx` 支持向注册流程透传 `registerClient`，不再只有登录表单可注入真实 client。
- `apps/user-web/src/App.tsx`、`apps/therapist-web/src/App.tsx`、`apps/admin-web/src/App.tsx` 读取 `VITE_API_BASE_URL` 后接入 API-backed 登录/注册；未配置时保持现有 mock/demo 行为。
- `packages/ui-components/tests/auth-api-client.test.ts` 覆盖 API 登录、角色授权校验、注册提交、后端错误转换和环境变量解析。
- `packages/shared-types/src/roles.ts` 为前端共享 `AuthenticatedPrincipal` 补充 `userProfileId`，用于训练用户自己的训练记录保存范围。
- `apps/user-web/src/training-record-api-client.ts` 新增训练记录保存 client，可把 `TrainingRecordSaveDraft` 提交到 `/training-records`。
- `apps/user-web/src/TrainingEndFeedbackPage.tsx` 和 `apps/user-web/src/SessionTrainingFlowPage.tsx` 支持异步提交训练记录；无 API 会话时仍保持原草稿模式。
- `apps/user-web/tests/training-record-api-client.test.ts` 覆盖 API 保存成功、权限错误提示和缺少档案范围时阻止提交。
- `apps/user-web/src/training-history-api-client.ts` 新增训练历史读取 client，使用 `/training-records` 最近 7 天授权摘要更新用户端周进度、注意趋势和上次训练反馈，不读取原始 EEG。
- `apps/user-web/src/App.tsx` 在有 API 会话和 `userProfileId` 时把训练历史数据接入用户端首页、设备页、设置页和家长记录相关页面；接口失败或未配置 API 时回退演示数据。
- `apps/user-web/tests/training-history-api-client.test.ts` 覆盖训练历史读取成功、空记录回退、权限错误提示和缺少档案范围阻止请求。
- `apps/admin-web/src/operation-log-api-client.ts` 新增管理员操作日志读取 client，使用 `/operation-logs` 授权摘要更新 `/admin/logs` 的日志总数、权限变更、脱敏导出和异常暂停统计。
- `apps/admin-web/src/App.tsx` 在机构管理员 API 登录态下接入真实操作日志摘要；接口失败或未配置 API 时仍显示演示状态。
- `apps/admin-web/tests/operation-log-api-client.test.ts` 覆盖操作日志读取成功、权限错误提示和缺少登录态阻止请求。
- `services/api-server/src/training-records/postgres-training-record-repository.ts` 新增训练记录 PostgreSQL repository，配置 `API_STORAGE_MODE=postgres` 或 `API_DATABASE_URL` 后可把 `/training-records` 摘要写入 PostgreSQL。
- `services/api-server/sql/001_api_training_records.sql` 新增训练记录运行时表迁移；只保存行为指标、EEG 摘要、难度快照和异常事件，不保存原始脑电数据。
- `services/api-server/tests/postgres-training-record-repository.test.ts` 覆盖 PostgreSQL repository 的插入映射、筛选 SQL 和自动迁移开关。

## 接入真实后端建议顺序

1. 继续实现 `api-server` PostgreSQL repository：优先迁移认证、用户档案、操作日志和导出审计；训练记录摘要已完成第一段 PostgreSQL 适配。
2. 为前端业务数据补充统一 API client，并保留 demo provider。
3. 完成 auth refresh/logout 生命周期和生产环境演示入口隔离。
4. 替换 user-web 今日任务、设备状态、处方和音乐推荐 API。
5. 将单次训练真实游戏结果和 EEG 摘要写入训练记录保存 payload。
6. 替换 therapist-web 用户列表、详情、报告中心 API。
7. 接入 EEG WebSocket client，形成训练页实时数据闭环。
8. 替换 admin-web 机构、用户、设备、统计和权限 API，并为操作日志补充筛选 UI。
