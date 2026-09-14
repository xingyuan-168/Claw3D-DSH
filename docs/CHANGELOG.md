# 变更记录

## [1.0.0] - 2026-09-10

### governance-core 轻量化大重构（ADR-0016，breaking change）

版本定稿：Dogfood 四案例全部通过（无 GitHub 阻塞/放行、正常后端流程、前端批准与豁免、子 Agent worktree 隔离与清理），当次基线环境验证通过，复杂度预算达标（MCP 7/8、CLI 7+1/8、Skills 8/9、活跃 docs 13/10~15、Gate 3、SQLite 5/6 表）。

## Unreleased

### Phase 3 — Claw3D → DSH（进行中：feat，部分完成）

- fix: office adapter 重建——导出可直测的 createDispatch（apply 复用），修复半成品重构损坏；14/14 node:test（agents.list 真 store、chat.send→followup、presence、approval 桥接全直驱）。
- feat: chat.send 真桥接（ctx.agents.get + agent.followup + createUserMessage）、chat.abort（agent.cancel {kind:user}）、exec.approval.requested/resolved 交互审批事件桥（approval/request waterfall answerer，office 离线让位 fail-closed；allow-always 降级 allowed-once 已记录）。
- docs: upstream/VISUAL_REFS.md——Phase 5 五个视觉参考源 pin（SSH 可达性 + HEAD + 许可 + 提取策略）；office-adapter-seam-audit.md 增 approval 契约实测修正（exec.approvals.* 实为策略配置文件，非审批队列）。
- feat: subtree 方式接入 Claw3D 0565b78（MIT）至 apps/cq-office，上游尊重、不 fork。
- docs: office-adapter-seam-audit.md —— Office 网关契约（27 RPC 方法 + presence/chat 事件帧）与 DSH 接缝实证（webServer.registerUpgrade、HostConnectionRpc、sessionProjections 快照面、approval seam）。
- feat(plugin): @aios/dsh-office-adapter 0.1.0 —— 在 DSH webserver 原生承载 Office 网关协议（/api/gateway/ws upgrade 路由），agents.list/chat.history 从真实 sessions/surface 读取，未审计接缝显式 not_implemented（不造模拟数据）；已安装 profile 并经 --dump-config 验证组合。
- feat(architecture): IR v2 —— office-adapter 组件入图（+1 组件、+2/-1 连线、边界更新），archify showcase validate 9/9 0 警告、evidence 11 引用核实（revision 73f01bc）；**首个真实 Git base/head Delta**（e40d6d3→73f01bc，proofLevel revision-pinned，completeness complete，receipt 入库）。
- feat: todo 投影——`todo/write` 事件实时跟踪 → `tasks.list` 只读映射（todo/in_progress/done，source openclaw_event）；tasks.create/update 显式 not_implemented（写路径归 Agent todo 工具，宪法第 1 条）；16/16 node:test。
- 待续：多 Agent 活体验收（需 DSH 重启 + office dev server；Office 出现多个不同真实 Agent）。

### Phase 2A — Archify + Architecture Evidence 基线（feat）

- feat: 安装 pinned `@tt-a1i/archify-dsh@0.1.0`（profile bundle；DSH skill-filesystem 挂载 archify skill，--dump-config 已验证组合，重启后按需可调用）。
- feat(docs/architecture): system.architecture.json —— 本仓库真实 Typed JSON IR（showcase validate 9/9、evidence 9 引用全部核实、0 errors/0 warnings；IR 在 Git 为真源）。
- feat: `.aios/artifacts/archify/` —— system.html 自包含 HTML（可重建，gitignore）+ index.json（§47AC 契约结构，CQ Office 唯一发现入口）。
- docs(skills): governance-entry / document-impact / finish-checklist / open-source-research 接入架构证据规则（架构性变更要求 IR+artifact 更新；普通小修改豁免 Archify）；frontend-design-review / html-prototype 审批工具名同步 `aios_frontend_approval_record`。
- docs: OPEN_SOURCE_RESEARCH.md 增 REQ-AF-1.0（Archify use 决策，pin core 2.14 / bundle 0.1.0）。
- 待办：首个真实 Git base/head Architecture Delta 在 Phase 3 的 IR v2 变更时生成（空基线不满足 schema）。

### Phase 2 — DSH Governance Integration（feat）

- docs: dsh-seam-audit.md——实证确认 tools/pre-execute（Waterfall，ALLOW/DENY/ASK）、approval/request 原生审批链、ctx.tools.register、systemPrompt.section、bundle patch 组合机制（docs/upstream-reviews/）。
- feat(plugin): packages/dsh-aios-governance（@aios/dsh-governance 0.1.0，零依赖 ESM）——governance/policy.yaml 单源解析、pre-execute 硬拦截（永久 DENY：force push/删远端 ref/update-ref -d/广域递归删/docker 卷破坏；主工作区破坏性 git→ASK；protected_paths→DENY；governance_paths 主工作区→ASK、worktree 内放行）、12 个 aios_* 原生 tools（桥接 aios CLI）、§12.1 短 prompt section；bundle 声明自动成为 profile 层。
- feat(cli): `aios approval record`（UI_SPEC 审批事实唯一写入口）、`aios context refresh`；node:test 14 例全过；已安装进本机 web profile 并经 --dump-config 验证组合。
- 待活体验证（需重启 DSH）：force push/input 写入被实际拦截、ASK 进入原生 approval、Claw3D 可见（Phase 3）。

### Phase 1 — AI OS DSH-only 清理（refactor: breaking）

- refactor(rename): `codex_ai_os→ai_engineering_os`、CLI `codex-os→aios`、`.codex-os→.aios`、branch 前缀 `aios/wt-*`；pyproject 更名 `ai-engineering-os` + DSH 描述（ADR-0017）。
- refactor(host): 删除 Codex 宿主协议——`plugins/ai-engineering-os`（.codex-plugin/hooks/.mcp.json/launch_mcp.cmd）、`.codex/`、`.cq/`（已归档 `archive/cq-os`）、`hook_gateway.py`、CLI `authorize-hook`；Skills 迁至根 `skills/`，8 个 SKILL.md DSH 化，移除 legacy agents/openai.yaml；DSH 插件集成测试于 Phase 2 重建（ADR-0017 §4）。
- feat(db): schema 0001 瘦身为 worktrees（+dsh_session_id/dsh_agent_id 追踪列）+ memory_index（ADR-0023）；旧库自动导出重建。CLI/MCP worktree 参数 `--task-id`→`--dsh-session-id/--dsh-agent-id`。
- refactor(approval): 删除 approvals 表与写路径；MCP `approval_record`→`frontend_approval_record`，只写 `docs/design/UI_SPEC.md` 审批工程事实；runtime approval 归 DSH（V4 §9）。
- chore(doctor): `codex` CLI 检查→`dsh`（可选）；移除 plugin-hooks 检查与 tasks 表路径检查。
- docs: AGENTS.md 首条 DSH 化 + 最高优先级「DSH-first」规则；ARCHITECTURE/API_SPEC/REQUIREMENTS/SCOPE/WORKTREE/README 同步；新增 ADR-0017/0018/0023。

### Phase 0 — 冻结、建档与首次推送（V4 融合重构启动）

- chore: git init（main），初始提交 AI-OS(4) 治理基线（bbadbe0），推送 origin（git@github.com:xingyuan-168/Claw3D-DSH.git）；`archive/cq-os` 分支标记 CQ 快照（baseline-import tag）。
- docs: upstream/ 三份 pin（DSH c291e79 / 0.1.1-rc.2、Claw3D 0565b78、archify a07fa1d + @tt-a1i/archify-dsh@0.1.0，均 SSH 验证）。
- docs: THIRD_PARTY_NOTICES.md 拆分为 THIRD_PARTY_CODE.md + THIRD_PARTY_ASSETS.md（CQ-OS MIT 通知保留）。
- chore: governance/policy.yaml 单一事实源（§47）、docs/architecture/manifest.yaml、.aios/artifacts/archify/ 目录约定（HTML gitignore）。
- 环境事实：github.com HTTPS 不通，上游操作一律 SSH；git 身份暂用 xingyuan-168 + noreply 邮箱（repo-local）。

### governance-core 审计修复（fix/governance-hardening）

- fix(gates): Code Start 强制 GitHub remote + 复制式脏乱判定；开源调研文档要求 requirement_id 开头并给出 summary 与 Decision/reason，空模板/stale id/缺 reason 均阻塞，无布尔绕过。
- fix(frontend): 批准事实持久化为 docs/design/UI_SPEC.md 的 `approval:` 块（scope 精确匹配），删除调用方 approved 布尔绕过。
- fix(worktree): cleanup 先证明合并（`merge-base --is-ancestor <tip> <target>`），脏树与未合并一律拒绝；finish 置 ready（ready ≠ merged）；force 参数全面删除；Hook 只信任登记的真实 worktree，伪造 .worktrees/ 失败封闭，temp 判定跨平台。
- refactor(auth): 授权内核只判操作不判角色（principal/TRANSITION/policy_hash/RoleBoundary/GovernanceMode 删除）；output/ 可写，其纯净由卫生检查判定；OCI 话术改为"可能破坏项目持久数据"语义。
- fix(finish): 删除 --tests-passed/--docs-synced 自证；新增 core/checks.py 薄真实检查（声明的 --test-command、配置了 ruff 才跑 ruff、git diff --check、卫生、candidate 提醒非阻塞）。
- fix(memory): candidate 闭环——accept 校验并入/reject 丢弃/未知 id MEMORY_CANDIDATE_MISSING；CLI memory candidate 与 MCP 第 8 工具 memory_candidate。
- refactor(config): ProjectConfig 只保留运行时读取的字段（project_type 驱动模板，新增 code_paths），risk_level/环境/执行策略字段与 .codex/agents 角色档案删除。
- chore(repo): 删除 .codex-os/gates、environment.yaml、execution-policy.yaml、test-traceability.yaml；secret 扫描脚本晋升 scripts/secret_scan_incremental.py；.gitignore 合规检查（15 项运行时产物，等价写法允许）。
- docs: ADR 0001/0003/0009 随被删运行时退役；AGENTS.md/README/API_SPEC/GOVERNANCE_RULES/WORKTREE/MEMORY/DATABASE/TEST_PLAN/ARCHITECTURE 同步。
