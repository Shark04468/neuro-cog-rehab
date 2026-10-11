# 认知康复一体化系统

面向 ADHD 等注意与执行功能障碍人群的辅助训练与效果追踪平台。首期聚焦 8-16 岁儿童青少年，系统用于辅助训练、状态评估、训练记录和趋势分析，不替代临床诊断或治疗。

## 工程定位

- `apps/user-web`: 训练用户端，承载基线评估、音乐疗愈、训练游戏和训练结果展示。
- `apps/therapist-web`: 治疗师端，承载授权用户查看、阶段报告和训练趋势分析。
- `apps/admin-web`: 管理端，承载账号、角色、机构和审计相关管理。
- `services/api-server`: 核心 API 服务，负责认证、建档、训练会话、结果记录和权限控制。
- `services/eeg-gateway`: EEG 模拟器与未来真实设备接入网关。
- `services/adaptive-engine`: 自适应难度规则与评估服务。
- `services/report-service`: 训练报告聚合与导出服务。
- `packages/shared-types`: 跨前后端共享 TypeScript 类型。
- `packages/ui-components`: 跨 Web 应用复用的低刺激 UI 组件。
- `packages/game-core`: 训练游戏共享事件模型和工具。
- `packages/eeg-features`: EEG 特征数据结构和状态计算扩展点。

## 开发原则

1. 所有功能限定在辅助训练、状态评估、训练记录和趋势分析范围内。
2. 不输出确诊、治愈、疗效保证等医疗化结论。
3. 用户数据、EEG 数据和训练数据均按隐私敏感数据处理。
4. 儿童青少年训练界面避免强闪烁、高频刺激和诱导沉迷机制。
5. 代码以模块化边界组织，便于后续扩展音乐疗愈、实时 EEG、训练游戏、自适应难度和治疗师端报告。

## 常用命令

```bash
corepack enable
pnpm install
pnpm typecheck
pnpm test
pnpm lint
pnpm format:check
```

## 当前状态

当前仓库只包含可维护工程骨架、基础配置、环境变量示例、开发说明和共享类型包。业务功能尚未实现。
