# adaptive-engine

规则可配置的自适应难度建议模块。

本服务只根据最近训练表现、EEG 数据质量和用户主观反馈生成下一轮训练参数建议，用于辅助训练配置和趋势追踪，不输出诊断结论、治疗结论或疗效保证。

## 主要能力

- 评估下一轮难度等级
- 建议目标呈现时间、干扰物数量、刺激间隔和训练时长
- 根据疲劳、信号质量和主观反馈建议音乐使用方式
- 在信号质量差、疲劳较高或用户反馈不适时建议暂停
- 输出每条规则的触发原因，避免黑箱判断

## 开发命令

```bash
corepack pnpm --filter @neuro-cog-rehab/adaptive-engine typecheck
corepack pnpm --filter @neuro-cog-rehab/adaptive-engine test
corepack pnpm --filter @neuro-cog-rehab/adaptive-engine build
```
