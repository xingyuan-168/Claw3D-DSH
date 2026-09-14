/**
 * DSH -> Claw3D projection (V4 spec section 46). Hosts the Claw3D office
 * gateway protocol on the DSH web server upgrade registry and projects
 * REAL DSH state into it:
 *
 *   - agents.list      <- ctx.sessions.list()  (live session store)
 *   - chat.history     <- session.surface fold (LLM message projection)
 *   - chat.send        <- ctx.agents.get(id).followup(createUserMessage(...))
 *   - chat final events<- session/event feed (assistant surface events)
 *   - presence events  <- real session activity tracking
 *   - status           <- adapter self-report
 *
 * Projection only: no simulated agents, no task engine, no second runtime.
 * Methods whose DSH seam is not yet audited answer an explicit
 * not_implemented error instead of fake data. Seam authority:
 * docs/upstream-reviews/office-adapter-seam-audit.md.
 */

import { WebSocketServer } from "ws";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import { randomUUID } from "node:crypto";

export const name = "dsh-office-adapter";

export const inject = ["webServer", "sessions", "agents"];

const OFFICE_WS_PATH = "/api/gateway/ws";
const MAIN_KEY = "main";

const resOk = (id, payload) => ({ type: "res", id, ok: true, payload: payload ?? {} });
const resErr = (id, code, message) => ({ type: "res", id, ok: false, error: { code, message } });

/** Office session key spelling: agent:<agentId>:<key>. */
export const sessionKeyFor = (agentId) => "agent:" + agentId + ":" + MAIN_KEY;

/**
 * Project one live DSH session into the office agent payload shape.
 * @param {object} session - a live Session from ctx.sessions.list().
 */
export function projectAgent(session) {
  const header = session.header ?? {};
  const id = String(session.id ?? header.id ?? "");
  const preset = typeof header.agentPreset === "string" ? header.agentPreset : "";
  const name = preset || id.slice(0, 12) || "session";
  const isSubagent = header.origin === "subagent" || typeof header.delegationDepth === "number";
  return {
    id,
    name,
    workspace: typeof header.cwd === "string" ? header.cwd : "",
    identity: { name, emoji: isSubagent ? "\u{1F6F0}\uFE0F" : "\u{1F916}" },
    role: isSubagent ? "Subagent" : "Session",
    createdAt: header.createdAt,
  };
}

/**
 * Extract plain text from one LLM message (string or content parts).
 * @param {object} message
 */
export function messageText(message) {
  if (!message) return "";
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .filter((part) => part && part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("");
  }
  return "";
}

/**
 * Extract assistant reply text from one committed session event, or null.
 * @param {object} event - a DSH SessionEvent carrying its message.
 */
export function deriveAssistantText(event) {
  const message = event && event.message;
  if (!message || message.role !== "assistant") return null;
  const text = messageText(message).trim();
  return text || null;
}

/**
 * Fold one session ordered surface into the office chat history payload.
 * @param {object} session - a live Session with a surface.
 */
export function projectHistory(session) {
  const surface = session.surface;
  const entries = Array.isArray(surface) ? surface : (surface && surface.entries) || [];
  const messages = [];
  for (const entry of entries) {
    const message = (entry && entry.message) || entry;
    const role = message && message.role;
    if (role !== "user" && role !== "assistant") continue;
    const text = messageText(message).trim();
    if (!text) continue;
    messages.push({ role, text, seq: (entry && entry.seq) ?? (message && message.seq) });
  }
  return { sessionId: String(session.id), messages };
}

/**
 * Map one office exec-approval decision onto the DSH ApprovalOutcome
 * vocabulary. DSH has no persistent grant, so allow-always degrades to a
 * one-shot allowance; persistent grants belong to governance policy.
 */
const OFFICE_DECISION_TO_OUTCOME = {
  "allow-once": "allowed-once",
  "allow-always": "allowed-once",
  "deny": "rejected",
};

/**
 * Bridge DSH approval asks to the office interactive-approval contract:
 * broadcasts exec.approval.requested frames, parks until the office resolves
 * via exec.approval.resolve (or the ask signal aborts), then answers the DSH
 * waterfall with the mapped ApprovalOutcome. Claims nothing when no office
 * client is connected - other answerers (or fail-closed) decide instead.
 * @param {object} ctx - cordis context (unused hook for future policy reads).
 * @param {(frame: object) => void} broadcast - downstream frame sink.
 * @param {() => boolean} hasDownlinks - whether an office client is listening.
 * @returns {{answerer: Function, resolveExternal: Function}}
 */
export function createApprovals(ctx, broadcast, hasDownlinks) {
  const pending = new Map();
  let seq = 0;

  const answerer = async (req, next) => {
    if (!hasDownlinks()) return next();
    const agentId = String(req && req.agent && req.agent.id ? req.agent.id : "");
    const id = "ap-" + (++seq) + "-" + randomUUID().slice(0, 8);
    const createdAtMs = Date.now();
    const expiresAtMs = createdAtMs + 5 * 60 * 1000;
    const command = String((req && req.reason) || (req && req.toolName) || "tool approval");
    const promise = new Promise((resolve) => {
      pending.set(id, { resolve });
      if (req && req.signal) {
        req.signal.addEventListener("abort", () => {
          if (pending.delete(id)) resolve("cancelled");
        }, { once: true });
      }
    });
    broadcast({
      type: "event",
      event: "exec.approval.requested",
      payload: {
        id,
        request: {
          command,
          cwd: null,
          host: null,
          security: null,
          ask: null,
          agentId: agentId || null,
          resolvedPath: null,
          sessionKey: agentId ? sessionKeyFor(agentId) : null,
        },
        createdAtMs,
        expiresAtMs,
      },
    });
    return promise;
  };

  const resolveExternal = (approvalId, decision, resolvedBy) => {
    const entry = pending.get(approvalId);
    if (!entry) return false;
    pending.delete(approvalId);
    entry.resolve(OFFICE_DECISION_TO_OUTCOME[decision] ?? "rejected");
    broadcast({
      type: "event",
      event: "exec.approval.resolved",
      payload: { id: approvalId, decision, resolvedBy: resolvedBy ?? "office", ts: Date.now() },
    });
    return true;
  };

  return { answerer, resolveExternal };
}

/**
 * Methods whose DSH seam is not yet audited; they must answer explicitly
 * instead of serving fake data (V4: no simulated success).
 */
const NOT_IMPLEMENTED = new Set([
  "agents.create", "agents.update", "agents.delete",
  "agents.files.get", "agents.files.set",
  "config.get", "config.patch", "config.set",
  "exec.approvals.get", "exec.approvals.set",
  "models.list", "skills.status",
  "cron.list", "cron.add", "cron.run", "cron.remove",
  "sessions.list", "sessions.preview", "sessions.patch", "sessions.reset",
  "agent.wait", "wake",
]);

/**
 * Build the office-protocol request dispatcher over a live ctx. Exported so
 * tests drive every method directly; apply() wires it to the WS route.
 * @param {object} ctx - carries sessions + agents services.
 * @param {(frame: object) => void} broadcast - downstream frame sink.
 * @param {{resolveExternal: Function}} [approvals] - interactive approvals bridge.
 * @returns {{dispatch: Function, onSessionCreated: Function, onSessionDisposed: Function, onSessionEvent: Function}}
 */
export function createDispatch(ctx, broadcast = () => {}, approvals = null) {
  /** sessionKey -> last activity epoch ms, grown from real session events. */
  const activity = new Map();
  /** agentId -> pending chat run id; one ordinary follow-up at a time. */
  const pendingRuns = new Map();
  let chatSeq = 0;

  const noteActivity = (session) => {
    activity.set(sessionKeyFor(String(session && session.id)), Date.now());
  };

  const broadcastPresence = () => {
    const recent = [];
    const byAgent = [];
    for (const [key, updatedAt] of activity) {
      recent.push({ key, updatedAt });
      const agentId = key.split(":")[1];
      let row = byAgent.find((entry) => entry.agentId === agentId);
      if (!row) {
        row = { agentId, recent: [] };
        byAgent.push(row);
      }
      row.recent.push({ key, updatedAt });
    }
    broadcast({ type: "event", event: "presence", payload: { sessions: { recent, byAgent } } });
  };

  const agentListPayload = () => {
    const agents = ctx.sessions.list().map(projectAgent);
    return { defaultId: agents[0] ? agents[0].id : null, mainKey: MAIN_KEY, agents };
  };

  const onSessionCreated = (session) => {
    noteActivity(session);
    broadcastPresence();
  };

  const onSessionDisposed = () => broadcastPresence();

  const onSessionEvent = (session, event) => {
    noteActivity(session);
    const agentId = String(session.id);
    const runId = pendingRuns.get(agentId);
    const message = deriveAssistantText(event);
    if (runId && message) {
      pendingRuns.delete(agentId);
      broadcast({
        type: "event",
        event: "chat",
        seq: chatSeq++,
        payload: {
          runId,
          sessionKey: sessionKeyFor(agentId),
          state: "final",
          stopReason: "end_turn",
          message: { role: "assistant", content: message },
        },
      });
    }
    broadcastPresence();
  };

  async function dispatch(method, params, id) {
    const p = params ?? {};
    switch (method) {
      case "status":
        return resOk(id, { adapter: "dsh-office-adapter", ok: true });
      case "agents.list":
        return resOk(id, agentListPayload());
      case "exec.approval.resolve": {
        const approvalId = typeof p.id === "string" ? p.id : "";
        const decision = typeof p.decision === "string" ? p.decision : "";
        if (!approvalId || !OFFICE_DECISION_TO_OUTCOME[decision]) {
          return resErr(id, "invalid", "id and decision (allow-once | allow-always | deny) are required");
        }
        if (!approvals) return resErr(id, "not_implemented", "approvals bridge is not mounted");
        const resolved = approvals.resolveExternal(approvalId, decision, typeof p.resolvedBy === "string" ? p.resolvedBy : null);
        if (!resolved) return resErr(id, "not_found", "no pending approval " + approvalId);
        return resOk(id, { resolved: true });
      }
      case "chat.history": {
        const sessionId = typeof p.sessionId === "string" ? p.sessionId : (typeof p.agentId === "string" ? p.agentId : "");
        const session = sessionId ? ctx.sessions.get(sessionId) : undefined;
        if (!session) return resErr(id, "not_found", "no live DSH session " + sessionId);
        return resOk(id, projectHistory(session));
      }
      case "chat.abort": {
        const agentId = typeof p.agentId === "string" ? p.agentId : (typeof p.sessionId === "string" ? p.sessionId : "");
        const keyAgentId = typeof p.sessionKey === "string" && p.sessionKey.startsWith("agent:") ? p.sessionKey.split(":")[1] : "";
        const target = agentId || keyAgentId;
        const agent = target ? ctx.agents.get(target) : undefined;
        if (!agent) return resErr(id, "not_found", "no live DSH agent " + target);
        try {
          agent.cancel({ kind: "user" });
        } catch (error) {
          return resErr(id, "abort_failed", String(error && error.message ? error.message : error));
        }
        return resOk(id, { aborted: 1 });
      }
      case "chat.send": {
        const agentId = typeof p.agentId === "string" ? p.agentId : (typeof p.sessionId === "string" ? p.sessionId : "");
        const agent = agentId ? ctx.agents.get(agentId) : undefined;
        if (!agent) return resErr(id, "not_found", "no live DSH agent " + agentId);
        const text = typeof p.message === "string" ? p.message.trim() : "";
        if (!text) return resErr(id, "invalid", "message is required");
        const runId = typeof p.idempotencyKey === "string" && p.idempotencyKey ? p.idempotencyKey : randomUUID().replace(/-/g, "");
        pendingRuns.set(agentId, runId);
        try {
          agent.followup(createUserMessage({ content: [{ type: "text", text }], source: { kind: "user" } }));
        } catch (error) {
          pendingRuns.delete(agentId);
          return resErr(id, "send_failed", String(error && error.message ? error.message : error));
        }
        if (agent.session) noteActivity(agent.session);
        broadcastPresence();
        return resOk(id, { status: "started", runId });
      }
      default:
        if (NOT_IMPLEMENTED.has(method)) {
          return resErr(id, "not_implemented", method + " projection requires its next audited DSH seam (docs/upstream-reviews/office-adapter-seam-audit.md)");
        }
        return resErr(id, "unknown_method", String(method));
    }
  }

  return { dispatch, onSessionCreated, onSessionDisposed, onSessionEvent };
}

/**
 * @param {object} ctx - cordis context carrying webServer + sessions + agents.
 * @param {{routePath?: string}} config
 */
export function apply(ctx, config = {}) {
  const routePath = (config && config.routePath) || OFFICE_WS_PATH;
  const wss = new WebSocketServer({ noServer: true });
  const downlinks = new Set();

  const broadcast = (frame) => {
    for (const send of downlinks) {
      try {
        send(frame);
      } catch {
        // a dead downlink is cleaned up on close
      }
    }
  };

  const approvals = createApprovals(ctx, broadcast, () => downlinks.size > 0);
  const io = createDispatch(ctx, broadcast, approvals);

  wss.on("connection", (socket) => {
    const send = (frame) => socket.send(JSON.stringify(frame));
    downlinks.add(send);
    send({ type: "event", event: "connect.challenge", payload: { nonce: "dsh-office-adapter" } });
    // initial presence is sent explicitly below; lifecycle events drive the rest
    send({ type: "event", event: "presence", payload: { sessions: { recent: [], byAgent: [] } } });
    socket.on("message", async (raw) => {
      let frame;
      try {
        frame = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (!frame || frame.type !== "req" || typeof frame.method !== "string") return;
      send(await io.dispatch(frame.method, frame.params, frame.id));
    });
    socket.on("close", () => downlinks.delete(send));
  });

  const disposeUpgrade = ctx.webServer.registerUpgrade({
    path: routePath,
    handler: (req, socket, head) => {
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
    },
  });

  const disposers = [
    ctx.on("session/created", io.onSessionCreated),
    ctx.on("session/disposed", io.onSessionDisposed),
    ctx.on("session/event", io.onSessionEvent),
    ctx.on("approval/request", approvals.answerer),
  ];

  ctx.logger?.info?.("dsh-office-adapter: office gateway protocol live at " + routePath);

  return () => {
    for (const dispose of disposers) {
      try {
        dispose?.();
      } catch {
        // teardown continues
      }
    }
    disposeUpgrade?.();
    for (const socket of wss.clients) socket.close();
    wss.close();
  };
}
