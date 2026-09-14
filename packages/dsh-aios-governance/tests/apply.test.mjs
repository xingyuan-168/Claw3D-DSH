import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { apply } from "../lib/index.js";

function makeCtx() {
  const listeners = {};
  const tools = [];
  const sections = [];
  return {
    ctx: {
      on: (event, fn) => {
        (listeners[event] ??= []).push(fn);
        return () => {};
      },
      logger: { info() {}, warn() {} },
      tools: { register: (definition) => (tools.push(definition.name), () => {}) },
      systemPrompt: { section: (section) => (sections.push(section), () => {}) },
    },
    listeners,
    tools,
    sections,
  };
}

test("apply registers pre-execute listener, 12 aios tools, and the prompt section", () => {
  const workspace = mkdtempSync(join(tmpdir(), "aios-gov-"));
  mkdirSync(join(workspace, "governance"));
  writeFileSync(join(workspace, "governance", "policy.yaml"), "protected_paths:\n  - \"input/**\"\n");
  const { ctx, listeners, tools, sections } = makeCtx();
  const dispose = apply(ctx, { workspaceRoot: workspace, aiosCommand: "missing-aios-on-purpose" });
  assert.ok(Array.isArray(listeners["tools/pre-execute"]) && listeners["tools/pre-execute"].length === 1);
  const expected = [
    "aios_project_init", "aios_governance_check", "aios_finish_check",
    "aios_worktree_prepare", "aios_worktree_check", "aios_worktree_finish",
    "aios_worktree_cleanup", "aios_memory_search", "aios_memory_record",
    "aios_memory_candidate", "aios_context_refresh", "aios_frontend_approval_record",
  ];
  assert.deepEqual(tools.slice().sort(), expected.slice().sort());
  assert.equal(sections.length, 1);
  assert.match(sections[0].text, /AI Engineering OS is active/);
  assert.equal(typeof dispose, "function");
});

test("pre-execute denies force push without consulting the registry", async () => {
  const workspace = mkdtempSync(join(tmpdir(), "aios-gov-"));
  const { ctx, listeners } = makeCtx();
  apply(ctx, { workspaceRoot: workspace, aiosCommand: "missing-aios-on-purpose", enforce: true });
  const listener = listeners["tools/pre-execute"][0];
  const decision = await listener(
    { name: "pwsh", arguments: { command: "git push --force origin main" } },
    async () => ({ kind: "allow" }),
  );
  assert.equal(decision.kind, "deny");
  assert.match(decision.reason, /force push/);
});

test("pre-execute delegates ordinary calls to next", async () => {
  const workspace = mkdtempSync(join(tmpdir(), "aios-gov-"));
  const { ctx, listeners } = makeCtx();
  apply(ctx, { workspaceRoot: workspace, aiosCommand: "missing-aios-on-purpose" });
  const listener = listeners["tools/pre-execute"][0];
  const decision = await listener(
    { name: "pwsh", arguments: { command: "git status" } },
    async () => ({ kind: "allow" }),
  );
  assert.equal(decision.kind, "allow");
});

test("enforce=false keeps tools and prompt but skips interception", () => {
  const workspace = mkdtempSync(join(tmpdir(), "aios-gov-"));
  const { ctx, listeners, tools } = makeCtx();
  apply(ctx, { workspaceRoot: workspace, aiosCommand: "missing-aios-on-purpose", enforce: false });
  assert.equal(listeners["tools/pre-execute"], undefined);
  assert.equal(tools.length, 12);
});
