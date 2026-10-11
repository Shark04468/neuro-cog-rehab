# 基础开发说明

## 环境要求

- Node.js 20 LTS 或更高版本
- pnpm 9 或更高版本
- Docker 与 Docker Compose，后续用于 PostgreSQL、Redis 和服务编排

## 初始化

```bash
corepack enable
pnpm install
cp .env.example .env.local
pnpm typecheck
pnpm test
```

## 模块边界

- 前端应用只能通过 API 或共享包访问数据模型，不直接耦合数据库结构。
- 后端服务之间通过明确的模块接口通信，不跨模块直接读写内部实现。
- EEG 数据、训练数据和用户档案默认视为敏感数据，读取、导出和权限变更需要审计。
- 报告只描述训练记录与趋势，不生成诊断、治愈或疗效保证类表述。

## 交互安全

面向儿童青少年训练场景，默认采用低刺激交互。训练游戏不得使用强闪烁、高频声音、强竞争排行榜或诱导沉迷的连续奖励机制。
