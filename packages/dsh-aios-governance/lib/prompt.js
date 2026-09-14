/**
 * The governance prompt section (V4 spec section 12.1): deliberately short.
 * Complete rules load on demand through the governance skills; the system
 * prompt never carries the full governance body.
 */

export const GOVERNANCE_SECTION_NAME = "aios-governance-entry";
export const GOVERNANCE_SECTION_ORDER = 50;

export const GOVERNANCE_SECTION_TEXT = [
  "AI Engineering OS is active for this workspace.",
  "",
  "Do not replace DSH native agent, workflow, task, approval, sandbox,",
  "workspace, session, or model capabilities.",
  "",
  "Before formal implementation:",
  "- satisfy the Code Start Gate (aios_governance_check)",
  "- perform OSS research when applicable and record the decision",
  "- use worktree isolation (aios_worktree_prepare) for concurrent writes",
  "",
  "Before major frontend implementation:",
  "- prototype + UI spec + explicit user approval",
  "",
  "Before declaring completion:",
  "- satisfy the Finish Gate (aios_finish_check)",
].join("\n");
