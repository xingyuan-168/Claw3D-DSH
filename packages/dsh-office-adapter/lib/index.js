/**
 * DSH -> Claw3D projection (V4 spec section 46). Hosts the Claw3D office
 * gateway protocol on the DSH web server upgrade registry and projects
 * REAL DSH state into it:
 *
 *   - agents.list      <- ctx.sessions.list()  (live session store)
 *   - chat.history     <- session.surface fold (LLM message projection)
 *   - presence events  <- session/created + session/disposed broadcasts
 *   - status           <- adapter self-report
 *
 * Projection only: no simulated agents, no task engine, no second runtime.
 * Methods whose DSH seam is not yet audited (chat.send turn entry, approval
 * bridges, todos) answer an explicit not_implemented error instead of fake
 * data. Seam authority: docs/upstream-reviews/office-adapter-seam-audit.md.
 */

import { WebSocketServer } from "ws";

export const name = "dsh-office-adapter";

export const inject = ["webServer", "sessions"];

const OFFICE_WS_PATH = "/api/gateway/ws";
const MAIN_KEY = "main";

const resOk = (id, payload) => ({ type: "res", id, ok: true, payload: payload ?? {} });
const resErr = (id, code, message) => ({ type: "res", id, ok: false, error: { code, message } });

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
 * @param {object} ctx - cordis context carrying webServer + sessions services.
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

  const agentListPayload = () => ({
    defaultId: null,
    mainKey: MAIN_KEY,
    agents: ctx.sessions.list().map(projectAgent),
  });

  const broadcastPresence = () => {
    broadcast({ type: "event", event: "presence", payload: { sessions: { recent: [], byAgent: [] } } });
  };

  // Real presence feed: DSH session lifecycle drives office presence.
  const disposers = [
    ctx.on("session/created", () => broadcastPresence()),
    ctx.on("session/disposed", () => broadcastPresence()),
  ];

  const dispatch = async (method, params, id) => {
    const p = params ?? {};
    switch (method) {
      case "status":
        return resOk(id, { adapter: "dsh-office-adapter", ok: true, route: routePath });
      case "agents.list":
        return resOk(id, agentListPayload());
      case "chat.history": {
        const sessionId = typeof p.sessionId === "string" ? p.sessionId : (typeof p.agentId === "string" ? p.agentId : "");
        const session = sessionId ? ctx.sessions.get(sessionId) : undefined;
        if (!session) return resErr(id, "not_found", "no live DSH session " + sessionId);
        return resOk(id, projectHistory(session));
      }
      case "agents.create":
      case "agents.update":
      case "agents.delete":
      case "chat.send":
      case "chat.abort":
      case "sessions.list":
      case "sessions.preview":
      case "sessions.patch":
      case "sessions.reset":
      case "exec.approvals.get":
      case "exec.approvals.set":
      case "exec.approval.resolve":
      case "models.list":
      case "skills.status":
      case "config.get":
      case "config.patch":
      case "config.set":
      case "agents.files.get":
      case "agents.files.set":
      case "cron.list":
      case "cron.add":
      case "cron.run":
      case "cron.remove":
      case "agent.wait":
      case "wake":
        return resErr(id, "not_implemented", method + " projection requires its next audited DSH seam (docs/upstream-reviews/office-adapter-seam-audit.md)");
      default:
        return resErr(id, "unknown_method", String(method));
    }
  };

  wss.on("connection", (socket) => {
    const send = (frame) => socket.send(JSON.stringify(frame));
    downlinks.add(send);
    send({ type: "event", event: "connect.challenge", payload: { nonce: "dsh-office-adapter" } });
    send({ type: "event", event: "presence", payload: { sessions: { recent: [], byAgent: [] } } });
    socket.on("message", async (raw) => {
      let frame;
      try {
        frame = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (!frame || frame.type !== "req" || typeof frame.method !== "string") return;
      send(await dispatch(frame.method, frame.params, frame.id));
    });
    socket.on("close", () => downlinks.delete(send));
  });

  const disposeUpgrade = ctx.webServer.registerUpgrade({
    path: routePath,
    handler: (req, socket, head) => {
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
    },
  });

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
