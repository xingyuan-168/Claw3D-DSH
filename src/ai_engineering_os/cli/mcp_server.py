"""Deprecated MCP server for AI Engineering OS (governance-core, ADR-0016).

DEPRECATED (V4 spec section 10): DSH has a native plugin/tool runtime, so this
MCP surface is kept only until the DSH governance plugin ships its native
aios_* tools; it is then deleted together with the mcp dependency. Do not add
new capabilities here.

Governance tools: project_init, governance_check, frontend_approval_record,
context_refresh, worktree_manage, memory_search, memory_record, and
memory_candidate. The MCP server is a governance capability for DeepSeek
Harness agents, not an operating-system API; it never replaces DSH's own
engineering tools.
"""

from __future__ import annotations

import warnings
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from mcp.server import MCPServer

from ai_engineering_os.application.project import ProjectInitializer
from ai_engineering_os.core.gates import (
    GateError,
    evaluate_code_start,
    evaluate_finish,
    evaluate_frontend,
    write_frontend_approval,
)
from ai_engineering_os.core.worktree import WorktreeError, WorktreeManager, WorktreeRecord
from ai_engineering_os.domain.config import ProjectType
from ai_engineering_os.domain.versions import RUNTIME_VERSIONS
from ai_engineering_os.infrastructure.config import ConfigError, load_project_config
from ai_engineering_os.infrastructure.database import Database, MigrationError
from ai_engineering_os.infrastructure.documents import DocumentManager
from ai_engineering_os.infrastructure.memory import MemoryStore, MemoryStoreError
from ai_engineering_os.infrastructure.path_codec import configure_utf8_stdio
from ai_engineering_os.templates.project_docs import INCLUDE_CHOICES

mcp = MCPServer(
    "AI Engineering OS",
    version=RUNTIME_VERSIONS.software,
    instructions=(
        "Governance tools for DeepSeek Harness agents. Call governance_check at "
        "task start (stage=start), before frontend implementation "
        "(stage=frontend), and at task end (stage=finish); record durable UI "
        "approval facts with frontend_approval_record; keep DSH's native "
        "engineering workflow. These tools never replace DSH's own "
        "engineering capabilities."
    ),
)


@mcp.tool()
def project_init(
    project_root: str,
    project_id: str,
    name: str,
    project_type: str = "generic",
    include: list[str] | None = None,
) -> dict[str, Any]:
    """Initialize an idempotent local project, minimal documents, and runtime database."""

    def operation() -> dict[str, Any]:
        extras = set(include or ())
        unknown = extras - set(INCLUDE_CHOICES)
        if unknown:
            raise ValueError(f"unknown document extras: {sorted(unknown)}")
        result = ProjectInitializer().initialize(
            Path(project_root),
            project_id=project_id,
            name=name,
            project_type=ProjectType(project_type),
            include=frozenset(extras),
        )
        return _success(
            project_id=result.config.project_id,
            root=result.config.root.as_posix(),
            created_paths=list(result.created_paths),
            database=result.database_path.as_posix(),
            context=result.context_path.as_posix(),
            documents_ok=result.document_report.ok,
            repository_ready=result.repository_ready,
            repository_blockers=list(result.repository_blockers),
        )

    return _invoke(operation)


@mcp.tool()
def governance_check(
    project_root: str,
    stage: str,
    change_class: str = "small_change",
    requirement_id: str | None = None,
    frontend_impact: str = "none",
    frontend_scope: str = "default",
    test_command: str | None = None,
    memory_written: bool = False,
    memory_not_needed: bool = False,
) -> dict[str, Any]:
    """Evaluate one governance gate (stage=start|frontend|finish) for the project."""

    def operation() -> dict[str, Any]:
        root = Path(project_root).resolve()
        if stage == "start":
            decision = evaluate_code_start(
                root,
                change_class=change_class,
                requirement_id=requirement_id,
            )
        elif stage == "frontend":
            decision = evaluate_frontend(
                root,
                impact=frontend_impact,
                scope=frontend_scope,
            )
        elif stage == "finish":
            decision = evaluate_finish(
                root,
                test_command=test_command,
                change_class=change_class,
                requirement_id=requirement_id,
                memory_written=memory_written,
                memory_not_needed=memory_not_needed,
            )
        else:
            raise ValueError("stage must be one of: start, frontend, finish")
        return _success(
            gate=decision.gate.value,
            allowed=decision.allowed,
            blocked_by=list(decision.blocked_by),
            findings=[
                {
                    "code": finding.code,
                    "message": finding.message,
                    "path": finding.path,
                    "blocking": finding.blocking,
                }
                for finding in decision.findings
            ],
        )

    return _invoke(operation)


@mcp.tool()
def frontend_approval_record(
    project_root: str,
    subject: str,
    decision: str,
    decided_by: str,
    scope: str = "default",
    reason: str | None = None,
) -> dict[str, Any]:
    """Record one durable frontend UI approval fact (V4 spec section 9).

    Runtime approvals belong to DSH (ctx.approval); this tool only persists
    the engineering fact that the user formally approved a UI scope. The
    fact is written into the Git-tracked docs/design/UI_SPEC.md metadata so
    it survives database resets and moves with the repository. The Frontend
    gate reads this fact; a scope never inherits another scope's approval.
    """

    def operation() -> dict[str, Any]:
        root = Path(project_root).resolve()
        if decision not in {"approved", "rejected"}:
            raise ValueError("decision must be approved or rejected")
        if not decided_by.strip():
            raise ValueError("decided_by is required")
        if not scope.strip():
            raise ValueError("scope is required")
        if decision == "approved":
            write_frontend_approval(
                root / "docs" / "design" / "UI_SPEC.md",
                scope=scope,
                approved_by=decided_by,
                approved_on=datetime.now(UTC).date().isoformat(),
            )
        return _success(
            subject=subject, decision=decision, decided_by=decided_by, scope=scope
        )

    return _invoke(operation)


@mcp.tool()
def context_refresh(project_root: str) -> dict[str, Any]:
    """Regenerate the derived PROJECT_CONTEXT.md cache from the docs/ tree."""

    def operation() -> dict[str, Any]:
        root = Path(project_root).resolve()
        context_path = DocumentManager(root).generate_context()
        return _success(context=context_path.as_posix())

    return _invoke(operation)


@mcp.tool()
def worktree_manage(
    project_root: str,
    action: str,
    name: str | None = None,
    dsh_session_id: str | None = None,
    dsh_agent_id: str | None = None,
    base_ref: str = "HEAD",
) -> dict[str, Any]:
    """Manage disposable worktrees (action=prepare|check|finish|cleanup|list)."""

    def operation() -> dict[str, Any]:
        root = Path(project_root).resolve()
        config = load_project_config(root)
        database = Database(root / ".aios" / "state" / "state.db")
        database.migrate()
        manager = WorktreeManager(root, database=database)
        if action == "prepare":
            record = manager.prepare(
                name=name,
                dsh_session_id=dsh_session_id,
                dsh_agent_id=dsh_agent_id,
                base_ref=base_ref,
                target_branch=config.target_branch,
            )
            return _success(**_worktree_data(record))
        if action == "check":
            if name is None:
                raise ValueError("check requires name")
            return _success(**_worktree_data(manager.check(name=name)))
        if action == "finish":
            if name is None:
                raise ValueError("finish requires name")
            return _success(**_worktree_data(manager.finish(name=name)))
        if action == "cleanup":
            if name is None:
                raise ValueError("cleanup requires name")
            return _success(**_worktree_data(manager.cleanup(name=name)))
        if action == "list":
            return _success(results=[_worktree_data(item) for item in manager.list()])
        raise ValueError("action must be one of: prepare, check, finish, cleanup, list")

    return _invoke(operation)


def _worktree_data(record: WorktreeRecord) -> dict[str, Any]:
    return {
        "id": record.id,
        "name": record.name,
        "path": record.path,
        "branch": record.branch,
        "dsh_session_id": record.dsh_session_id,
        "dsh_agent_id": record.dsh_agent_id,
        "status": record.status,
        "clean": record.clean,
    }


@mcp.tool()
def memory_search(
    project_root: str,
    query: str = "",
    limit: int = 20,
) -> dict[str, Any]:
    """Search the project memory index rebuilt from docs/memory/memory.jsonl."""

    def operation() -> dict[str, Any]:
        root = Path(project_root).resolve()
        load_project_config(root)
        database = Database(root / ".aios" / "state" / "state.db")
        database.migrate()
        store = MemoryStore(database, root)
        records = store.search(query, statuses=("active",), limit=limit)
        return _success(
            results=[
                {
                    "id": record.id,
                    "type": record.record_type,
                    "title": record.title,
                    "summary": record.summary,
                    "source": record.source,
                    "source_commit": record.source_commit,
                    "tags": list(record.tags),
                    "status": record.status,
                }
                for record in records
            ]
        )

    return _invoke(operation)


@mcp.tool()
def memory_record(
    project_root: str,
    record_type: str,
    title: str,
    summary: str,
    source: str,
    source_commit: str | None = None,
    tags: list[str] | None = None,
    candidate: bool = False,
) -> dict[str, Any]:
    """Record one memory entry; subagents must set candidate=true."""

    def operation() -> dict[str, Any]:
        root = Path(project_root).resolve()
        load_project_config(root)
        database = Database(root / ".aios" / "state" / "state.db")
        database.migrate()
        store = MemoryStore(database, root)
        writer = store.record_candidate if candidate else store.record
        entry = writer(
            record_type=record_type,
            title=title,
            summary=summary,
            source=source,
            source_commit=source_commit,
            tags=tuple(tags or ()),
        )
        return _success(
            id=entry.id,
            type=entry.record_type,
            title=entry.title,
            status=entry.status,
            candidate=candidate,
        )

    return _invoke(operation)


@mcp.tool()
def memory_candidate(
    project_root: str,
    action: str,
    candidate_id: str | None = None,
) -> dict[str, Any]:
    """List, accept, or reject subagent memory candidates (main session only)."""

    def operation() -> dict[str, Any]:
        root = Path(project_root).resolve()
        load_project_config(root)
        database = Database(root / ".aios" / "state" / "state.db")
        database.migrate()
        store = MemoryStore(database, root)
        if action == "list":
            return _success(
                results=[
                    {
                        "id": record.id,
                        "type": record.record_type,
                        "title": record.title,
                        "summary": record.summary,
                        "source": record.source,
                        "tags": list(record.tags),
                    }
                    for record in store.candidates()
                ]
            )
        if action == "accept":
            if candidate_id is None:
                raise ValueError("accept requires candidate_id")
            entry = store.accept_candidate(candidate_id)
            return _success(id=entry.id, status=entry.status, accepted=True)
        if action == "reject":
            if candidate_id is None:
                raise ValueError("reject requires candidate_id")
            store.reject_candidate(candidate_id)
            return _success(id=candidate_id, rejected=True)
        raise ValueError("action must be one of: list, accept, reject")

    return _invoke(operation)


def run_server() -> None:
    warnings.warn(
        "aios mcp is deprecated (V4 spec section 10): use the DSH governance "
        "plugin's native aios_* tools instead; this server will be removed.",
        DeprecationWarning,
        stacklevel=2,
    )
    configure_utf8_stdio()
    mcp.run()


def _success(**data: Any) -> dict[str, Any]:
    return {"ok": True, "data": data}


def _invoke(operation: Callable[[], dict[str, Any]]) -> dict[str, Any]:
    try:
        return operation()
    except (
        ConfigError,
        GateError,
        MemoryStoreError,
        MigrationError,
        WorktreeError,
        ValueError,
        OSError,
    ) as exc:
        return {"ok": False, "error": {"code": "GOVERNANCE_CHECK_FAILED", "message": str(exc)}}
    except Exception as exc:  # pragma: no cover - defensive envelope
        return {"ok": False, "error": {"code": "INTERNAL_ERROR", "message": str(exc)}}


if __name__ == "__main__":
    run_server()
