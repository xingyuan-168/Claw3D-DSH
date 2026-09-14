/**
 * The twelve native aios_* tools (V4 spec section 12.3) - the minimal set.
 * Each tool is a thin deterministic bridge to the aios CLI (the Python
 * governance kernel); no governance logic is duplicated here. No agent,
 * task, or scheduler tools are registered.
 */

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Resolve the aios executable: explicit config, project venv, or PATH.
 * @param {string} workspaceRoot
 * @param {string|undefined} configured
 */
export function resolveAiosCommand(workspaceRoot, configured) {
  if (configured) return configured;
  const win = join(workspaceRoot, ".venv", "Scripts", "aios.exe");
  const posix = join(workspaceRoot, ".venv", "bin", "aios");
  if (existsSync(win)) return win;
  if (existsSync(posix)) return posix;
  return "aios";
}

/**
 * Run one aios CLI command and return its JSON envelope.
 * @param {string} aiosCommand
 * @param {string} workspaceRoot
 * @param {string[]} argv
 */
export function runAios(aiosCommand, workspaceRoot, argv) {
  return new Promise((resolve, reject) => {
    execFile(aiosCommand, argv, { cwd: workspaceRoot, maxBuffer: 8 * 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
      if (stdout.trim().startsWith("{")) {
        try {
          resolve(JSON.parse(stdout));
          return;
        } catch {
          // fall through to envelope synthesis
        }
      }
      if (error) {
        reject(new Error(`aios ${argv[0]} failed: ${(stderr || error.message).trim()}`));
        return;
      }
      resolve({ ok: true, data: { raw: stdout.trim() } });
    });
  });
}

/**
 * Build the aios_* tool definitions.
 * @param {string} aiosCommand
 * @param {string} workspaceRoot
 * @returns {{name: string, description: string, parameters: object, execute: (args: object) => Promise<unknown>}[]}
 */
export function aiosToolDefinitions(aiosCommand, workspaceRoot) {
  const run = (argv) => runAios(aiosCommand, workspaceRoot, argv);
  const root = { project_root: { type: "string", description: "AIOS project root (the DSH workspace root)." } };
  const definitions = [
    {
      name: "aios_project_init",
      description: "Initialize AI Engineering OS in a workspace: config, minimal docs, runtime database (idempotent).",
      parameters: { type: "object", properties: { ...root, project_id: { type: "string" }, name: { type: "string" } } },
      execute: async (args) => {
        const argv = ["init", args.project_root ?? ".", "--json"];
        if (args.project_id) argv.push("--project-id", String(args.project_id));
        if (args.name) argv.push("--name", String(args.name));
        return run(argv);
      },
    },
    {
      name: "aios_governance_check",
      description: "Run the stateless governance gates (Code Start preview / repository governance). Returns allowed plus findings; exit 40 means blocked.",
      parameters: { type: "object", properties: { ...root, change_class: { type: "string" }, requirement_id: { type: "string" } } },
      execute: async (args) => {
        const argv = ["check", args.project_root ?? ".", "--json"];
        if (args.change_class) argv.push("--change-class", String(args.change_class));
        if (args.requirement_id) argv.push("--requirement-id", String(args.requirement_id));
        return run(argv);
      },
    },
    {
      name: "aios_finish_check",
      description: "Run the Finish gate: real in-place checks (tests, hygiene, docs, memory). Exit 40 means blocked.",
      parameters: { type: "object", properties: { ...root, test_command: { type: "string" }, memory_written: { type: "boolean" }, memory_not_needed: { type: "boolean" } } },
      execute: async (args) => {
        const argv = ["finish", args.project_root ?? ".", "--json"];
        if (args.test_command) argv.push("--test-command", String(args.test_command));
        if (args.memory_written) argv.push("--memory-written");
        if (args.memory_not_needed) argv.push("--memory-not-needed");
        return run(argv);
      },
    },
    {
      name: "aios_worktree_prepare",
      description: "Create a disposable worktree under .worktrees/ and register it. DSH session/agent ids are tracing only.",
      parameters: { type: "object", properties: { ...root, name: { type: "string" }, base_ref: { type: "string" }, dsh_session_id: { type: "string" }, dsh_agent_id: { type: "string" } } },
      execute: async (args) => {
        const argv = ["worktree", "prepare", "--json", "--project-root", args.project_root ?? "."];
        if (args.name) argv.push(args.name);
        if (args.base_ref) argv.push("--base-ref", String(args.base_ref));
        if (args.dsh_session_id) argv.push("--dsh-session-id", String(args.dsh_session_id));
        if (args.dsh_agent_id) argv.push("--dsh-agent-id", String(args.dsh_agent_id));
        return run(argv);
      },
    },
    {
      name: "aios_worktree_check",
      description: "Report registration, existence, and cleanliness of one registered worktree.",
      parameters: { type: "object", properties: { ...root, name: { type: "string", description: "Worktree name." } }, required: ["name"] },
      execute: async (args) => run(["worktree", "check", String(args.name), "--json", "--project-root", args.project_root ?? "."]),
    },
    {
      name: "aios_worktree_finish",
      description: "Mark a clean, merge-verified worktree as finished (ready is not merged).",
      parameters: { type: "object", properties: { ...root, name: { type: "string", description: "Worktree name." } }, required: ["name"] },
      execute: async (args) => run(["worktree", "finish", String(args.name), "--json", "--project-root", args.project_root ?? "."]),
    },
    {
      name: "aios_worktree_cleanup",
      description: "Remove and unregister a merged disposable worktree.",
      parameters: { type: "object", properties: { ...root, name: { type: "string", description: "Worktree name." } }, required: ["name"] },
      execute: async (args) => run(["worktree", "cleanup", String(args.name), "--json", "--project-root", args.project_root ?? "."]),
    },
    {
      name: "aios_memory_search",
      description: "Search the project engineering memory index (docs/memory/memory.jsonl derived).",
      parameters: { type: "object", properties: { ...root, query: { type: "string" }, limit: { type: "number" }, record_type: { type: "string" } } },
      execute: async (args) => {
        const argv = ["memory", "search", String(args.query ?? ""), "--json", "--project-root", args.project_root ?? "."];
        if (args.limit) argv.push("--limit", String(args.limit));
        if (args.record_type) argv.push("--type", String(args.record_type));
        return run(argv);
      },
    },
    {
      name: "aios_memory_record",
      description: "Record one engineering memory fact (decision/bug/lesson/pattern). Subagents must use candidate: true; the lead session writes the JSONL directly.",
      parameters: { type: "object", properties: { ...root, title: { type: "string" }, summary: { type: "string" }, source: { type: "string" }, record_type: { type: "string" }, tags: { type: "string" }, candidate: { type: "boolean" } }, required: ["title", "summary", "source"] },
      execute: async (args) => {
        const argv = ["memory", "record", "--title", String(args.title), "--summary", String(args.summary), "--source", String(args.source), "--json", "--project-root", args.project_root ?? "."];
        if (args.record_type) argv.push("--type", String(args.record_type));
        if (args.tags) argv.push("--tags", String(args.tags));
        if (args.candidate) argv.push("--candidate");
        return run(argv);
      },
    },
    {
      name: "aios_memory_candidate",
      description: "Lead-session candidate loop: list, accept, or reject memory candidates submitted by subagents.",
      parameters: { type: "object", properties: { ...root, action: { type: "string", description: "list | accept | reject" }, candidate_id: { type: "string" } }, required: ["action"] },
      execute: async (args) => {
        const argv = ["memory", "candidates", "--json", "--project-root", args.project_root ?? "."];
        if (args.action !== "list") {
          if (!args.candidate_id) throw new Error("candidate_id is required for accept/reject");
          return run(["memory", "candidate", String(args.candidate_id), args.action === "accept" ? "--accept" : "--reject", "--json", "--project-root", args.project_root ?? "."]);
        }
        return run(argv);
      },
    },
    {
      name: "aios_context_refresh",
      description: "Regenerate the derived PROJECT_CONTEXT.md cache from the docs/ tree (never a source of truth).",
      parameters: { type: "object", properties: { ...root } },
      execute: async (args) => run(["context", "refresh", "--json", "--project-root", args.project_root ?? "."]),
    },
    {
      name: "aios_frontend_approval_record",
      description: "Record one durable frontend UI approval fact into docs/design/UI_SPEC.md (V4 spec section 9). Runtime approvals belong to DSH; this writes only the Git-tracked engineering fact the Frontend gate verifies.",
      parameters: { type: "object", properties: { ...root, subject: { type: "string" }, scope: { type: "string", description: "Exact approval scope; scopes never inherit." }, decision: { type: "string", description: "approved | rejected" }, decided_by: { type: "string" } }, required: ["subject", "scope", "decision", "decided_by"] },
      execute: async (args) => run(["approval", "record", "--subject", String(args.subject), "--scope", String(args.scope), "--decision", String(args.decision), "--decided-by", String(args.decided_by), "--json", "--project-root", args.project_root ?? "."]),
    },
  ];
  return definitions;
}
