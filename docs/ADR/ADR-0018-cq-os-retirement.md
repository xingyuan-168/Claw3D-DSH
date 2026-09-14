# ADR-0018：CQ OS 正式废弃

- 状态：Accepted
- 日期：2026-09-13
- 来源：input/AI_OS_Claw3D_DSH_最终融合重构开发文档_V4.md（§2、§0C）

## 1. 上下文

CQ OS 曾作为独立 Runtime/Preset/Agent 组织层存在（自有 Agent/Task/Runtime 管理）。V4 规格明确：CQ OS 正式废弃，不再作为任何 Runtime、Preset、Agent 组织层或治理层继续开发；其"AIOS Mode 里再管 Agent"的思路正是 §0C 禁止恢复的反模式。

## 2. 选项

- A. 保留 CQ OS 作为可选 Preset/模式。
- B. 彻底废弃：概念清单全部废弃，仓库内残留归档后移除，思想性改编（governance 策略组合、protected-path 匹配）已在 THIRD_PARTY_CODE.md 登记。

## 3. 决策

选 B：

1. CQ OS 不再进入本仓库依赖、文档事实或运行路径；外部 CQ OS 仓库不并入本仓库。
2. 本仓库 `.cq/` 残留（交付记录）在 `archive/cq-os` 分支归档（tag baseline-import），主分支删除。
3. `.codex/` Codex 宿主配置同样归档后从主分支删除。
4. README/架构文档/本 ADR 写明"AI OS 不是什么"清单（V4 §0C）：AI OS ≠ Preset、≠ 第五模式、≠ Agent、≠ Runtime、≠ Scheduler、≠ Task Engine、≠ Approval Engine、≠ LLM Gateway、≠ 单一 Plugin/Skill、≠ 常驻 Python Backend。

## 4. 后果

- 禁止恢复 `aios preset / aios mode / 第五模式` 架构；AI OS 对已初始化 workspace 恒为 ACTIVE，不依赖 DSH 某一模式。
- 若未来需要引用 CQ OS 思想，只允许经 THIRD_PARTY 登记的思想性改编，不允许代码回归。
