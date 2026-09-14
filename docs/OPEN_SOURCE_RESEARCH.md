# Open Source Research

## Requirement

requirement_id: REQ-GC-1.0
summary: governance-core 轻量化重构（ADR-0016）：把过度工程化的治理运行时收敛为无状态三 Gate + 轻量 Memory/Worktree，删除自有执行平台。
scope:
  - gates
  - memory
  - worktree
updated_at: 2026-09-11

## Candidates

### LangGraph / CrewAI / MetaGPT / OpenHands
- URL: https://github.com/langchain-ai/langgraph 等
- License: MIT 系
- 解决什么：多 Agent 编排、状态图运行时。
- 可直接复用：否——本层只做治理，不做 Agent 运行时。
- 可二开：否——引入即违反架构边界（ADR-0016 §2.12）。
- 值得学习：状态机的显式建模思想；本项目刻意反其道用无状态评估器。
- 风险：依赖膨胀、把 AIOS 重新拉回 Agent 平台。

### detect-secrets
- URL: https://github.com/Yelp/detect-secrets
- License: Apache-2.0
- 解决什么：Secret 检测。
- 可直接复用：是——作为轻依赖，只扫本次修改/staged diff。
- 可二开：否。值得学习：插件式规则。风险：低。
- 备注：AGENTS.md 的仓库 Secret Scan 封装。

### SQLite FTS5（标准库/编译选项）
- 解决什么：Memory 全文检索。
- 决策相关：放弃——单项目记忆量小，LIKE 检索 + reindex 足够，避免 FTS 维护与构建门槛。


---

## Requirement（REQ-AF-1.0：架构证据能力）

requirement_id: REQ-AF-1.0
summary: 为融合仓库提供架构证据（Architecture Evidence）与工程可视化能力；DSH 按需调用，不构成第四 Runtime。
scope:
  - architecture-evidence
  - visualization
updated_at: 2026-09-14

## Candidates（REQ-AF-1.0）

### Archify（@tt-a1i/archify-dsh / Cocoon-AI archify core）
- URL: https://www.npmjs.com/package/@tt-a1i/archify-dsh
- License: MIT（基于 Cocoon-AI/architecture-diagram-generator，MIT）
- 解决什么：五类图（architecture/workflow/sequence/dataflow/lifecycle）的 Typed JSON IR、validate/deliver/compare 与 self-contained HTML。
- 可直接复用：是——作为 DSH pinned 能力安装（profile bundle），不 fork、不 vendor 源码。
- 可二开：否——V4 §0V 第一阶段明确不 fork；CQ Office 只读 index.json 发现 artifact，不自绘。
- 值得学习：IR（JSON）为真源、HTML 为可重建 artifact 的两分离；schema 驱动的 validate 收据。
- 风险：上游版本漂移——以精确版本 pin（upstream/ARCHIFY.md：core 2.14 / bundle 0.1.0），升级走 Verified Stack 流程。

### 自研 SVG/HTML 图表生成器
- 解决什么：同上。
- 决策相关：放弃——Archify 已有 Renderer/Viewer/Delta，重写违反不重复造轮子原则。

## Decision（REQ-AF-1.0）

decision: use
reason: Archify 以 pinned 能力直接复用（bundle 0.1.0 / core 2.14）；IR 进 Git（docs/architecture/*.json），HTML 为可重建 artifact（.aios/artifacts/archify/），Delta 用 Git base/head 临时生成不落第二版本历史。
