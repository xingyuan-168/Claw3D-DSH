/**
 * Deterministic ALLOW/DENY/ASK evaluation over governance/policy.yaml
 * (V4 spec section 12.2). Pure functions, no model calls, no side effects.
 *
 * Rule order:
 *   1. shell commands: permanent denies (force push, remote ref delete,
 *      update-ref -d, broad recursive delete, destructive docker volumes)
 *   2. shell commands: main-workspace destructive git -> ASK, unless the
 *      command targets only a registered disposable worktree
 *   3. file writes: protected paths (input/**, .git/**, .aios/state/**,
 *      .env, credentials/**) -> DENY everywhere
 *   4. file writes: governance paths -> ASK in the main workspace, allowed
 *      inside a registered disposable worktree (governance development is
 *      worktree work per the constitution; "ordinary task" intent is not
 *      determinizable, so the user decides via ASK)
 *   5. everything else -> allow (deny-by-exception, keep it lightweight)
 */

const WORKTREE_ROOT = ".worktrees/";

/** @param {string} s */
export function toPosix(s) {
  return String(s).replaceAll("\\", "/");
}

/**
 * Extract the command string from parsed shell-tool arguments.
 * @param {Record<string, unknown>} args
 */
export function commandOf(args) {
  if (typeof args?.command === "string") return args.command;
  if (typeof args?.script === "string") return args.script;
  if (typeof args?.cmd === "string") return args.cmd;
  return "";
}

/**
 * Extract a target file path from file-tool arguments, if any.
 * @param {Record<string, unknown>} args
 */
export function pathOf(args) {
  for (const key of ["file_path", "filePath", "path", "target_file", "filename"]) {
    if (typeof args?.[key] === "string" && args[key].trim()) return toPosix(args[key].trim());
  }
  return "";
}

/** True when the command line invokes git with the given subcommand. */
function gitCommand(command, sub) {
  return new RegExp(`(^|[;&|]\\s*|\\b)git\\s+[^;&|]*\\b${sub}\\b`).test(command);
}

/** True when a git push command carries a force flag. */
function hasForcePushFlag(command) {
  return /(^|\s)--force(-with-lease)?(\s|$|=)/.test(command) || /(^|\s)-f(\s|$)/.test(command);
}

/** True when a git push deletes a remote ref (":ref" token or --delete). */
function deletesRemoteRef(command) {
  return /(^|\s)--delete(\s|$)/.test(command) || /(^|\s):(?!\/)[^\s]*$/.test(command.replace(/\bpush\b[^;&|]*/, "push ").trimEnd()) || /\bpush\s+[^;&|]*\s:\S+/.test(command);
}

/** Broad recursive delete of root, home, or a whole drive. */
function broadRecursiveDelete(command) {
  // Collapse path-traversal segments (two passes) so "C:\\temp\\..\\"
  // style obfuscated roots are caught.
  let c = command;
  for (let i = 0; i < 2; i += 1) {
    c = c.replaceAll(/[^\\/]+\\\.\.\\|[^\\/]+\/\.\.\//g, "");
  }
  if (/(^|\s)rm\s+(-[a-zA-Z]*[rf][a-zA-Z]*\s+)+(\/|~|\$HOME|\$env:USERPROFILE|[A-Za-z]:\\?)(\s|$)/i.test(c)) return true;
  if (/Remove-Item[^;&|]*-Recurse[^;&|]*-Force[^;&|]*(\s|^)(\/|~|\$HOME|\$env:USERPROFILE|[A-Za-z]:\\?)(\s|$)/i.test(c)) return true;
  return false;
}

/** Destructive persistent docker volume operation. */
function destructiveDockerVolume(command) {
  return /\bdocker\s+volume\s+(rm|prune)\b/.test(command) || /\bdocker\s+system\s+prune\b.*--volumes/.test(command);
}

/** Permanent shell denies from the policy (V4 section 12.2 deny list). */
export function shellPermanentDeny(command) {
  const c = command;
  if (gitCommand(c, "push") && hasForcePushFlag(c)) return "force push is permanently denied by AI Engineering OS policy";
  if (gitCommand(c, "push") && deletesRemoteRef(c)) return "deleting remote refs is permanently denied by AI Engineering OS policy";
  if (gitCommand(c, "update-ref") && /(^|\s)-d(\s|$)|--delete/.test(c)) return "git update-ref -d is permanently denied by AI Engineering OS policy";
  if (broadRecursiveDelete(c)) return "broad recursive deletion of root/home/drive is permanently denied by AI Engineering OS policy";
  if (destructiveDockerVolume(c)) return "destructive persistent Docker volume operation is permanently denied by AI Engineering OS policy";
  return "";
}

/** Main-workspace destructive git operations that ask for approval. */
export function mainWorkspaceDestructive(command) {
  if (gitCommand(command, "reset") && /(^|\s)--hard(\s|$)/.test(command)) return "git reset --hard";
  if (gitCommand(command, "clean") && /(^|\s)-[a-zA-Z]*f/.test(command)) return "git clean -f";
  if (gitCommand(command, "branch") && /(^|\s)-D(\s|$)/.test(command)) return "git branch -D";
  return "";
}

/**
 * All worktree-relative paths a command touches (if any).
 * @param {string} command
 */
export function commandWorktreeTargets(command) {
  const targets = [];
  const re = /\.worktrees\/([A-Za-z0-9._-]+)/g;
  for (const match of toPosix(command).matchAll(re)) targets.push(match[1]);
  return targets;
}

/**
 * Compile one glob-ish policy pattern to an anchored RegExp: a trailing
 * "**" accepts any trailing depth, a leading double-star-slash any leading
 * (including none), a lone "**" anything, and a single "*" one segment.
 * @param {string} p
 */
function patternToRegex(p) {
  let out = "";
  let i = 0;
  while (i < p.length) {
    const ch = p[i];
    if (ch === "*" && p[i + 1] === "*") {
      if (p[i + 2] === "/") {
        out += "(?:[^/]*/)*";
        i += 3;
      } else {
        out += ".*";
        i += 2;
      }
    } else if (ch === "*") {
      out += "[^/]*";
      i += 1;
    } else {
      out += ch.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
      i += 1;
    }
  }
  return new RegExp("^" + out + "$");
}

/**
 * Resolve whether a relative path matches a glob-ish policy pattern.
 * @param {string} posixPath
 * @param {string} pattern
 */
export function pathMatches(posixPath, pattern) {
  const p = toPosix(pattern);
  const path = posixPath.replace(/^\.\//, "");
  if (p === path) return true;
  return patternToRegex(p).test(path);
}

/** @param {string[]} patterns @param {string} path */
export function matchesAny(patterns, path) {
  return patterns.some((pattern) => pathMatches(path, pattern));
}

/**
 * Decide for one pending tool call.
 * @param {{
 *   policy: Record<string, unknown>,
 *   toolName: string,
 *   args: Record<string, unknown>,
 *   registeredWorktrees: {name: string, disposable: boolean}[],
 * }} input
 * @returns {{kind: 'allow'} | {kind: 'deny', reason: string} | {kind: 'ask', reason?: string}}
 */
export function decide({ policy, toolName, args, registeredWorktrees }) {
  const shellTools = policy.shell_tools ?? ["bash", "pwsh", "shell"];
  const pathTools = policy.path_tools ?? ["write", "edit", "str_replace_editor"];
  const protectedPaths = policy.protected_paths ?? [];
  const governancePaths = policy.governance_paths ?? [];

  if (shellTools.includes(toolName)) {
    const command = commandOf(args);
    if (!command.trim()) return { kind: "allow" };
    const permanent = shellPermanentDeny(command);
    if (permanent) return { kind: "deny", reason: permanent };
    const destructive = mainWorkspaceDestructive(command);
    if (destructive) {
      const targets = commandWorktreeTargets(command);
      const registered = new Set(registeredWorktrees.filter((w) => w.disposable).map((w) => w.name));
      const touchesMain = targets.length === 0 || !targets.every((name) => registered.has(name));
      if (touchesMain) {
        return { kind: "ask", reason: destructive + " targets the main workspace (disposable worktree targets: " + (targets.join(", ") || "none") + "); AI Engineering OS asks before destructive operations outside registered worktrees" };
      }
    }
    return { kind: "allow" };
  }

  if (pathTools.includes(toolName)) {
    const target = pathOf(args);
    if (!target) return { kind: "allow" };
    if (matchesAny(protectedPaths, target)) {
      return { kind: "deny", reason: "path '" + target + "' is protected by AI Engineering OS policy (protected_paths)" };
    }
    if (matchesAny(governancePaths, target)) {
      const inWorktree = target.includes(WORKTREE_ROOT);
      if (!inWorktree) {
        return { kind: "ask", reason: "path '" + target + "' is AI OS governance source; modifications require explicit approval (develop governance changes in a disposable worktree)" };
      }
    }
    return { kind: "allow" };
  }

  return { kind: "allow" };
}