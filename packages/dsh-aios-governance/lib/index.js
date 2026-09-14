/**
 * AI Engineering OS governance plugin for the DeepSeek Harness (V4 spec
 * sections 11-12). Governance only: hard interception over the shared
 * policy file, twelve native aios_* tools bridging the deterministic
 * Python kernel, and one short prompt section. It never schedules agents,
 * runs tasks, stores approvals, or replaces any DSH runtime capability.
 */

import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { parsePolicyYaml, loadPolicy } from "./policy.js";
import { decide } from "./decisions.js";
import { aiosToolDefinitions, resolveAiosCommand } from "./tools.js";
import { GOVERNANCE_SECTION_NAME, GOVERNANCE_SECTION_ORDER, GOVERNANCE_SECTION_TEXT } from "./prompt.js";

export const name = "aios-governance";

/** Plugin dependencies: tool runtime, prompt registry, approval seam is used by DSH itself for ASK. */
export const inject = ["tools", "systemPrompt"];

/**
 * @param {import('node:child_process').NodeRequire} _unused
 * @param {{workspaceRoot?: string, policyPath?: string, aiosCommand?: string,
 *          enforce?: boolean, shellTools?: string[], pathTools?: string[]}} config
 */
export function apply(ctx, config = {}) {
  if (config.enforce === false) {
    ctx.logger?.info?.("aios-governance: enforcement disabled by config; tools and prompt section still active");
  }
  const workspaceRoot = config.workspaceRoot ?? process.cwd();
  const policyPath = config.policyPath
    ?? (existsSync(join(workspaceRoot, "governance", "policy.yaml"))
      ? join(workspaceRoot, "governance", "policy.yaml")
      : join(workspaceRoot, "governance", "policy.yaml"));

  /** @type {Record<string, unknown>} */
  let policy = {};
  try {
    policy = loadPolicy(policyPath);
    ctx.logger?.info?.(`aios-governance: policy loaded from ${policyPath}`);
  } catch (error) {
    // Fail closed for enforcement, stay useful for tools: without a policy
    // file the interception layer denies destructive main-workspace git ops
    // via the built-in defaults below.
    ctx.logger?.warn?.(`aios-governance: policy file unavailable (${error?.message ?? error}); using built-in defaults`);
    policy = {
      protected_paths: ["input/**", ".git/**", ".aios/state/**", "**/.env", "**/credentials/**"],
      governance_paths: ["AGENTS.md", "governance/**", "packages/dsh-aios-governance/**"],
      shell_tools: config.shellTools ?? ["bash", "pwsh", "shell"],
      path_tools: config.pathTools ?? ["write", "edit", "str_replace_editor"],
      git: { deny_force_push: true, deny_remote_ref_delete: true, deny_update_ref_delete: true },
      main_workspace: { deny_reset_hard: true, deny_clean_force: true, deny_branch_force_delete: true },
    };
  }
  if (config.shellTools) policy.shell_tools = config.shellTools;
  if (config.pathTools) policy.path_tools = config.pathTools;

  const aiosCommand = resolveAiosCommand(workspaceRoot, config.aiosCommand);

  // 1) Hard interception: tools/pre-execute ALLOW/DENY/ASK. The 'ask'
  //    decision is resolved by DSH's own approval service chain - AI OS
  //    keeps no approval database.
  const disposers = [];
  if (config.enforce !== false) {
    /** Registered disposable worktrees, refreshed at most once per 5s. */
    let worktreeCache = { at: 0, names: [] };
    const registeredWorktrees = () => {
      if (Date.now() - worktreeCache.at < 5000) return worktreeCache.names;
      try {
        const out = execFileSync(aiosCommand, ["worktree", "list", "--json", "--project-root", workspaceRoot], {
          cwd: workspaceRoot, timeout: 5000, windowsHide: true,
        });
        const envelope = JSON.parse(out.toString("utf8"));
        worktreeCache = { at: Date.now(), names: envelope?.data?.results ?? [] };
      } catch {
        worktreeCache = { at: Date.now() - 4000, names: [] };
      }
      return worktreeCache.names;
    };

    disposers.push(ctx.on("tools/pre-execute", async (exec, next) => {
      // Shell calls consult the disposable-worktree registry (5s TTL) so
      // worktree-local destructive operations can be told apart from
      // main-workspace ones before deciding.
      registeredWorktrees();
      const decision = decide({
        policy,
        toolName: exec.name,
        args: exec.arguments ?? {},
        registeredWorktrees: worktreeCache.names,
      });
      if (decision.kind !== "allow") {
        ctx.logger?.info?.(`aios-governance: ${decision.kind} ${exec.name}: ${decision.reason ?? ""}`);
        return decision;
      }
      return next();
    }));
  }

  // 2) The twelve native aios_* tools (thin CLI bridge).
  for (const definition of aiosToolDefinitions(aiosCommand, workspaceRoot)) {
    disposers.push(
      ctx.tools.register({
        name: definition.name,
        description: definition.description,
        parameters: definition.parameters,
        async execute(args) {
          return definition.execute(args ?? {});
        },
      }),
    );
  }

  // 3) The short governance prompt section.
  disposers.push(
    ctx.systemPrompt.section({
      name: GOVERNANCE_SECTION_NAME,
      order: GOVERNANCE_SECTION_ORDER,
      text: GOVERNANCE_SECTION_TEXT,
    }),
  );

  return () => {
    for (const dispose of disposers.reverse()) {
      try {
        dispose?.();
      } catch {
        // disposer failures must not block plugin teardown
      }
    }
  };
}
