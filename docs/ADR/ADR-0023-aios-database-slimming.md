# ADR-0023：AI OS SQLite 瘦身——只存 Worktree 登记与可重建索引

- 状态：Accepted
- 日期：2026-09-13
- 来源：input/AI_OS_Claw3D_DSH_最终融合重构开发文档_V4.md（§8、§9、§50）

## 1. 上下文

运行库 0001 schema 含 tasks/approvals/worktrees/memory_index 四表。DSH 已原生提供 Todo/Goal/Team Task 与 ctx.approval runtime；AIOS 侧的 tasks 表与 approvals 表构成第二任务/审批真源，违反 §50 Source of Truth 总表。

## 2. 选项

- A. 保留四表，以同步任务对抗漂移。
- B. 瘦身：删除 tasks/approvals，worktrees 表改造为 DSH 追踪字段；runtime approval 全归 DSH，持久 UI 审批事实写入 docs/design/UI_SPEC.md。
- C. 换 PostgreSQL/服务端数据库。

## 3. 决策

选 B：

1. 最终本地 SQLite 只允许保存：worktree 生命周期登记 + memory 可重建索引。
2. worktrees 新 schema：id/name/path/branch/target_branch/dsh_session_id(nullable)/dsh_agent_id(nullable)/disposable/status/created_at/updated_at；DSH id 仅追踪，不成为任务真源。
3. 删除 approvals 表与 _record_approval 写路径；MCP approval_record 工具更名 frontend_approval_record，只写 UI_SPEC 审批工程事实；Frontend Gate 只验证该事实。
4. 按仓库既有迁移哲学（单迁移 0001 + 旧库自动导出重建）直接改写 0001 schema，不新增 0002；旧库首次打开自动备份为 SHA-256 sidecar 后重建。
5. SQLite 不是 Agent/Task/Approval Runtime；不引入服务端数据库。

## 4. 后果

- test_database/test_doctor/test_worktree 期望同步更新；doctor 的 tasks 路径编码检查随之移除。
- Phase 2 DSH 插件不得重新引入任务/审批表；`rg -i "tasks|approvals" src` 应仅剩注释级说明。
