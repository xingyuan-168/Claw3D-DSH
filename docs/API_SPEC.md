# 接口契约

MCP 与 CLI 共享同一实现与响应封装（`{ok, data} / {ok:false, error:{code,message}}`）。全部为确定性治理用例，无模型推理。路径输入为项目根相对路径。

## MCP 工具（8）

| 工具 | 参数 | 语义 |
| --- | --- | --- |
| project_init | project_root, project_id, name, project_type, include[] | 幂等初始化：配置 + 最小文档 + 运行库；include 可选 api/database/test_plan/security/deployment/frontend_design/docker |
| governance_check | project_root, stage=start\|frontend\|finish, change_class?, requirement_id?, frontend_impact?, frontend_scope?, test_command?, memory_written?, memory_not_needed? | 无状态三 Gate 裁决，返回 allowed + findings；无布尔自证参数 |
| frontend_approval_record | project_root, subject, scope?, decision=approved\|rejected, decided_by, reason? | 记录持久 UI 审批工程事实：只写 docs/design/UI_SPEC.md 的 approval 块（V4 §9）；runtime approval 归 DSH ctx.approval |
| context_refresh | project_root | 重建 PROJECT_CONTEXT.md 派生缓存 |
| worktree_manage | project_root, action=prepare\|check\|finish\|cleanup\|list, name?, dsh_session_id?, dsh_agent_id?, base_ref? | disposable worktree 生命周期；DSH id 仅追踪；cleanup 需合并证明，无 force |
| memory_search | project_root, query, limit | 检索 memory_index |
| memory_record | project_root, record_type, title, summary, source, source_commit?, tags?, candidate? | 写 JSONL（主会话）或提交 candidate（子 Agent） |
| memory_candidate | project_root, action=list\|accept\|reject, candidate_id? | 主会话处理子 Agent candidate：列表 / 并入 JSONL / 丢弃 |

## CLI 命令（6）

`aios init / check / finish / memory search|record|reindex|candidates|candidate / worktree prepare|check|finish|cleanup|list / mcp（deprecated）/ doctor`。

- `check [--change-class --requirement-id]` = 仓库治理（GitHub 就绪 + 卫生 + output 纯净 + .gitignore 合规）+ docs 检查 + Code Start 预览（含调研分层），阻塞退出码 40。
- `finish [--test-command "..."] --memory-written|--memory-not-needed` = Finish Gate（薄真实检查）；退出码 40 表示阻塞。

## 错误码

配置类 CONFIG_INVALID；Gate 类返回 findings（code/message/path/blocking），决策本身不报错；Memory 类 MEMORY_*；Worktree 类 WORKTREE_*；数据库类 MIGRATION_*。
