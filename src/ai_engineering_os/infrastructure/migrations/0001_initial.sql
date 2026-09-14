-- ADR-0016 + V4 spec section 8: governance-core runtime schema.
-- Two tables only. Memory facts live in the Git-tracked
-- docs/memory/memory.jsonl; memory_index is a locally rebuildable search
-- index refreshed by "aios memory reindex". DSH owns todo/task/approval
-- state; the runtime database stores worktree registration and the
-- rebuildable memory index, nothing else.

CREATE TABLE worktrees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    path TEXT NOT NULL UNIQUE,
    branch TEXT NOT NULL UNIQUE,
    target_branch TEXT NOT NULL DEFAULT 'main',
    dsh_session_id TEXT,
    dsh_agent_id TEXT,
    disposable INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'ready', 'cleaned')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE memory_index (
    id TEXT PRIMARY KEY,
    record_type TEXT NOT NULL
        CHECK (record_type IN ('decision', 'bug', 'lesson', 'pattern', 'project-summary')),
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    source TEXT NOT NULL,
    source_commit TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL CHECK (status IN ('active', 'superseded', 'invalid')),
    superseded_by TEXT,
    line_number INTEGER NOT NULL,
    indexed_at TEXT NOT NULL
);

CREATE INDEX ix_worktrees_status ON worktrees(status);
CREATE INDEX ix_memory_type_status ON memory_index(record_type, status);
