import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePolicyYaml } from "../lib/policy.js";
import { decide, shellPermanentDeny, mainWorkspaceDestructive, commandWorktreeTargets, pathMatches } from "../lib/decisions.js";

const basePolicy = {
  protected_paths: ["input/**", ".git/**", ".aios/state/**", "**/.env", "**/credentials/**"],
  governance_paths: ["AGENTS.md", "governance/**", "packages/dsh-aios-governance/**"],
  shell_tools: ["bash", "pwsh", "shell"],
  path_tools: ["write", "edit", "str_replace_editor"],
};

const registered = [{ name: "demo", disposable: true }];

test("parsePolicyYaml reads the shipped policy file", () => {
  const policy = parsePolicyYaml(
    [
      "protected_paths:",
      "  - \"input/**\"",
      "  - \".git/**\"",
      "git:",
      "  deny_force_push: true",
      "  deny_remote_ref_delete: true",
    ].join("\n"),
  );
  assert.deepEqual(policy.protected_paths, ["input/**", ".git/**"]);
  assert.equal(policy.git.deny_force_push, true);
});

test("force push is permanently denied", () => {
  assert.ok(shellPermanentDeny("git push --force origin main"));
  assert.ok(shellPermanentDeny("git push -f origin main"));
  assert.ok(shellPermanentDeny("git push --force-with-lease origin main"));
  assert.equal(shellPermanentDeny("git push origin main"), "");
  assert.equal(shellPermanentDeny("git push origin feature/file-format"), "");
});

test("remote ref deletion and update-ref -d are permanently denied", () => {
  assert.ok(shellPermanentDeny("git push origin --delete feature/x"));
  assert.ok(shellPermanentDeny("git push origin :refs/heads/feature/x"));
  assert.ok(shellPermanentDeny("git update-ref -d refs/heads/x"));
});

test("broad recursive delete and docker volume destruction are denied", () => {
  assert.ok(shellPermanentDeny("rm -rf /"));
  assert.ok(shellPermanentDeny("Remove-Item -Recurse -Force C:\\temp\\..\\"));
  assert.ok(shellPermanentDeny("docker volume rm data"));
  assert.equal(shellPermanentDeny("rm -rf build/"), "");
});

test("main-workspace destructive git asks, worktree-targeted passes", () => {
  assert.ok(mainWorkspaceDestructive("git reset --hard"));
  assert.ok(mainWorkspaceDestructive("git clean -fd"));
  assert.ok(mainWorkspaceDestructive("git branch -D demo"));
  const decision = decide({
    policy: basePolicy,
    toolName: "pwsh",
    args: { command: "git reset --hard" },
    registeredWorktrees: registered,
  });
  assert.equal(decision.kind, "ask");
  const worktreeDecision = decide({
    policy: basePolicy,
    toolName: "pwsh",
    args: { command: "git reset --hard .worktrees/demo" },
    registeredWorktrees: registered,
  });
  assert.equal(worktreeDecision.kind, "allow");
});

test("protected paths deny everywhere", () => {
  for (const target of ["input/new.md", ".git/config", ".aios/state/state.db", ".env", "credentials/key.pem", "config/.env"]) {
    const decision = decide({ policy: basePolicy, toolName: "write", args: { file_path: target }, registeredWorktrees: [] });
    assert.equal(decision.kind, "deny", target);
  }
});

test("governance paths ask in main workspace, pass inside worktrees", () => {
  const main = decide({ policy: basePolicy, toolName: "edit", args: { file_path: "AGENTS.md" }, registeredWorktrees: [] });
  assert.equal(main.kind, "ask");
  const inside = decide({ policy: basePolicy, toolName: "edit", args: { file_path: ".worktrees/gov/AGENTS.md" }, registeredWorktrees: registered });
  assert.equal(inside.kind, "allow");
});

test("ordinary writes allow", () => {
  const decision = decide({ policy: basePolicy, toolName: "write", args: { file_path: "src/feature.ts" }, registeredWorktrees: [] });
  assert.equal(decision.kind, "allow");
});

test("pathMatches patterns", () => {
  assert.equal(pathMatches("input/a.md", "input/**"), true);
  assert.equal(pathMatches("nested/input/a.md", "input/**"), false);
  assert.equal(pathMatches("deep/nested/.env", "**/.env"), true);
  assert.equal(pathMatches("governance/policy.yaml", "governance/**"), true);
  assert.equal(pathMatches("AGENTS.md", "AGENTS.md"), true);
});

test("commandWorktreeTargets extracts slugs", () => {
  assert.deepEqual(commandWorktreeTargets("git -C .worktrees/demo status"), ["demo"]);
  assert.deepEqual(commandWorktreeTargets("git status"), []);
});
