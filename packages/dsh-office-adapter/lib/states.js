/**
 * Deterministic DSH-event -> office-phase fold (V4 Phase 4).
 *
 * Nine phases: coding | research | plan | test | review | deploy | approval |
 * blocked | done (plus "idle" before any signal). The fold is pure: applying
 * events incrementally yields exactly the same phase sequence as replaying the
 * whole recorded stream, so replaying a recorded DSH event stream twice
 * produces the same office animation state.
 *
 * Classification is content-based and rule-table-driven; every rule below is
 * a deterministic function of (accumulated state, event).
 */

export const OFFICE_PHASES = [
  "idle",
  "coding", "research", "plan", "test", "review", "deploy",
  "approval", "blocked", "done",
];

/** Tool names whose call mutates files or runs arbitrary shell work. */
const CODING_TOOLS = /(^|[\w-])(edit|write|apply-patch|fs|bash|shell|pwsh|exec|cmd)([\w-]|$)/i;
/** Tool names that only gather information. */
const RESEARCH_TOOLS = /(^|[\w-])(read|grep|glob|web|search|fetch|browser|list)([\w-]|$)/i;
/** Shell command content that marks a test run. */
const TEST_CMD = /\b(vitest|jest|pytest|playwright|node --test|npm (run )?test|cargo test|go test|mvn test|gradle test)\b/i;
/** Shell command content that marks a review pass. */
const REVIEW_CMD = /\b(review|lint|eslint|prettier --check|tsc[^\n]*--noEmit|typecheck|ruff|clang-tidy)\b/i;
/** Shell command content that marks a deploy/release action. */
const DEPLOY_CMD = /\b(deploy|release|publish|docker push|git push(?!.*--force))\b/i;
/** Commands that must NOT be read as deploy even though they contain push-like verbs. */
const SAFE_FORCE_CMD = /git push[^\n]*--force/;

const firstMatch = (command, text) => {
  if (TEST_CMD.test(text)) return "test";
  if (REVIEW_CMD.test(text)) return "review";
  if (SAFE_FORCE_CMD.test(text)) return "coding";
  if (DEPLOY_CMD.test(text)) return "deploy";
  return command;
};

/**
 * Deterministically classify one tool call. Returns a phase or null (unknown
 * tool leaves the phase unchanged).
 * @param {string} name - the tool name from the tool/call event.
 * @param {string} argumentsJson - raw arguments JSON string.
 * @returns {string | null}
 */
export function classifyToolCall(name, argumentsJson) {
  const text = String(name) + " " + String(argumentsJson ?? "");
  if (TEST_CMD.test(text)) return "test";
  if (REVIEW_CMD.test(text)) return "review";
  if (SAFE_FORCE_CMD.test(text)) return "coding";
  if (DEPLOY_CMD.test(text)) return "deploy";
  if (CODING_TOOLS.test(name)) return "coding";
  if (RESEARCH_TOOLS.test(name)) return "research";
  return null;
}

/**
 * Create a fresh fold state for one session.
 */
export function initialPhaseState() {
  return { phase: "idle", lastToolPhase: null, approvalPending: false, todosKnown: false, hasOpenTodos: false };
}

/**
 * Apply one DSH session event to the fold. Pure: returns a new state object;
 * the input is never mutated.
 * @param {object} state - previous fold state.
 * @param {object} event - a DSH session event (type + payload fields).
 */
export function applyPhaseEvent(state, event) {
  const next = { ...state };
  const type = event && event.type;
  switch (type) {
    case "turn/start":
      next.approvalPending = false;
      break;
    case "user/message":
      next.approvalPending = false;
      break;
    case "tool/call": {
      const cls = classifyToolCall(event.name, event.arguments);
      if (cls) next.lastToolPhase = cls;
      next.phase = next.approvalPending ? "approval" : (cls ?? state.phase);
      break;
    }
    case "todo/write": {
      const items = Array.isArray(event.todos) ? event.todos : (event.payload && Array.isArray(event.payload.todos) ? event.payload.todos : []);
      next.todosKnown = items.length > 0;
      next.hasOpenTodos = items.some((item) => item && item.status !== "completed");
      next.phase = next.approvalPending ? "approval" : "plan";
      break;
    }
    case "approval/asked":
      next.approvalPending = true;
      next.phase = "approval";
      break;
    case "approval/decided":
      next.approvalPending = false;
      next.phase = state.lastToolPhase ?? "coding";
      break;
    case "turn/end": {
      const kind = event.reason && event.reason.kind;
      if (kind === "completed") {
        next.phase = next.todosKnown && !next.hasOpenTodos ? "done" : (state.lastToolPhase ?? state.phase);
      } else if (kind === "blocked" || kind === "error" || kind === "aborted" || kind === "interrupted" || kind === "max-tokens") {
        next.phase = "blocked";
      }
      break;
    }
    default:
      break;
  }
  return next;
}

/**
 * Fold a whole recorded event stream into its final state and the phase
 * sequence it produced (the office animation trace).
 * @param {readonly object[]} events
 */
export function replayPhaseStream(events) {
  let state = initialPhaseState();
  const trace = [];
  for (const event of events) {
    state = applyPhaseEvent(state, event);
    trace.push(state.phase);
  }
  return { state, trace };
}
