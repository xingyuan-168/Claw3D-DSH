# ADR-0017：DSH 是唯一 Runtime，AI OS 只治理

- 状态：Accepted
- 日期：2026-09-13
- 来源：input/AI_OS_Claw3D_DSH_最终融合重构开发文档_V4.md（§0A–§0W、§1、§3–§12），只读

## 1. 上下文

V4 融合重构把系统固定为三层：Claw3D（3D Office UI）→ DeepSeek Harness（唯一执行 Runtime）→ AI Engineering OS（工程治理）。AI OS 原为 Codex 构建，存在 Codex 专用 hook 协议（SessionStart/PreToolUse/hookSpecificOutput）、Codex CLI 检查、Codex 命名与措辞。DSH 0.1.1-rc.2 已原生提供 Agent/Subagent/Workflow/Agent Teams/Todo/Goal/Session/Tool/Approval/Sandbox/Workspace 能力。

## 2. 选项

- A. 保持双宿主（Codex hook + 未来 DSH hook）双协议并存。
- B. DSH-only：删除 Codex 宿主协议与命名，治理硬边界改由 DSH 治理插件承载，DSH 原生能力不重复实现。
- C. AI OS 自建 Agent/Task/Approval Runtime 以摆脱宿主差异。

## 3. 决策

选 B：

1. DSH 是唯一 Runtime；AI OS 不创建 Agent Runtime、Task DB、Approval DB、Session Store、Scheduler（V4 §49 禁止清单）。
2. AI OS 四部分固定为：DSH Governance Plugin（硬拦截 + 原生 tools）、Governance Skills（软治理）、Python 确定性内核（三 Gate/Worktree/Memory）、Project Governance Assets。
3. 硬规则"能确定性计算的事情，不调用模型"维持不变。
4. Codex 插件 hooks（hooks.json/session_start.py/pre_tool_use.py）、`.codex/`、hook_gateway.py、authorize-hook CLI 一并删除；`codex_ai_os→ai_engineering_os`、`codex-os→aios`、`.codex-os→.aios` 一次性改名。
5. 任何 AI OS 新功能先检查 DSH 是否已提供该执行能力（AGENTS.md 最高优先级规则）。

## 4. 后果

- Codex hook 集成测试（test_plugin_hooks.py、test_hook_gateway.py）随宿主协议删除；Phase 2 以 DSH plugin integration tests 重建覆盖，不得留下无测试空窗。
- MCP server 标记 deprecated，Phase 2 原生 tools 完成后与 `mcp` 依赖一并删除。
- 治理强制在 DSH 侧为 tools/pre-execute ALLOW/DENY/ASK；ASK 走 DSH 原生 approval，AIOS 不设第二 approval DB。
