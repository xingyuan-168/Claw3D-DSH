# 架构

Windows 本地、可审计的 DeepSeek Harness（DSH）工程治理层（V4：DSH 是唯一 Runtime，AI OS 只治理）。Python 3.12，自研自持（Gate、审批、SQLite），无第二模型客户端；LangGraph 等仅作设计参考，禁止作为依赖引入。

## 分层

- `cli/` — Typer 命令（init/check/finish/memory/worktree/mcp/doctor）；mcp 为 deprecated stdio server（8 工具），DSH 原生 aios_* tools 落地后删除。输出统一 ok/error envelope。
- `application/` — 用例：project 初始化、repository 治理检查、doctor 诊断、授权内核（ADR-0011）、最小路径策略内核（governance_policy）。
- `core/` — 无状态治理核心：`gates.py`（三 Gate 评估器）、`checks.py`（Finish 薄真实检查）、`worktree.py`（disposable worktree 生命周期）。
- `infrastructure/` — SQLite（单迁移 0001：worktrees/memory_index；task/approval 状态归 DSH）、JSONL Memory、文档管理、配置、路径编解码。
- `adapters/` — 外部系统：GitRunner（唯一 Git 子进程封装）。
- `domain/` — 配置模型、治理值对象、版本常量。
- `templates/` — 新项目最小文档集（baseline + 条件生成）。
- `skills/` — 8 个 DSH 治理 Skills（SKILL.md，按需加载）。
- `packages/dsh-aios-governance/` — DSH 治理插件（Phase 2）：tools/pre-execute 决策 ALLOW/DENY/ASK，注册原生 aios_* tools，接 DSH 原生 approval。

## 边界

- Markdown/Git 保存项目事实；SQLite 保存运行状态与可重建索引；`.aios/` 是运行状态目录（project.yaml、state.db、派生 context），全部 Git 忽略。
- AIOS 暴露确定性 CLI/MCP 用例，永远不做模型推理、不做 Agent/工具运行时、不做 DAG 调度。
- Docker/Podman 不是 AIOS 的执行引擎：project_init 仅提供可选的项目开发环境模板（Dockerfile + compose.yaml）。
- 治理强制由 DSH 治理插件承载（Phase 2）：`tools/pre-execute` 对受管 workspace 施加 ALLOW/DENY/ASK；Python CLI 用例始终是确定性权威，插件桥接失败即 fail-closed。
