# report-service

报告与训练计划建议服务。

当前实现包含训练处方生成逻辑：根据基线评估、最近一周训练记录、EEG趋势、治疗师目标和用户依从性，生成下一周辅助训练安排建议。输出只用于训练计划、记录和趋势追踪，不作为临床诊断、治疗处方或疗效保证。

## 开发命令

```bash
corepack pnpm --filter @neuro-cog-rehab/report-service typecheck
corepack pnpm --filter @neuro-cog-rehab/report-service test
corepack pnpm --filter @neuro-cog-rehab/report-service build
```
