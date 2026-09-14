/**
 * DSH -> Claw3D projection (V4 spec section 46). Hosts the Claw3D office
 * gateway protocol on the DSH web server's upgrade registry and projects
 * REAL DSH state into it. Projection only: no simulated agents, no task
 * engine, no second runtime. Methods whose DSH seam is not yet audited
 * answer an explicit not_implemented error instead of fake data.
 */

import { WebSocketServer } from "node:ws";

export const name = "dsh-office-adapter";

export const inject = ["webServer"];

const OFFICE_WS_PATH = "/api/gateway/ws";

/** Frame builders shared with the office client contract. */
const resOk = (id, payload) => ({ type: "res", id, ok: true, payload: payload ?? {} });
const resErr = (id, code, message) => ({ type: "res", id, ok: false, error: { code, message } });

/**
 * Read the real DSH agent view from the session-projection registry when
 * the runtime provides it. Returns null when the capability is absent -
 * the adapter then reports a capability error instead of pretending.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
function readAgentView(ctx) {
  const registry = ctx.sessionProjections;
  if (!registry || typeof registry.snapshot !== "function") return null;
  try {
    return registry.snapshot();
  } catch {
    return null;
  }
}

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {{routePath?: string}} config
 */
export function apply(ctx, config = {}) {
  const routePath = config.routePath ?? OFFICE_WS_PATH;
  const wss = new WebSocketServer({ noServer: true });
  /** @type {Set<(frame: object) => void>} */
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

  const dispatch = async (method, params, id) => {
    const p = params ?? {};
    switch (method) {
      case "status":
        return resOk(id, { adapter: "dsh-office-adapter", ok: true });
      case "agents.list": {
        const snapshot = readAgentView(ctx);
        if (!snapshot) {
          return resErr(id, "capability_missing", "session-projection registry does not expose a snapshot read face on this DSH build");
        }
        return resOk(id, { snapshot });
      }
      case "models.list":
        return resErr(id, "not_implemented", "models.list requires the DSH model-selection seam; see docs/upstream-reviews/office-adapter-seam-audit.md");
      default:
        return resErr(id, "not_implemented", method + " is not projected yet; the DSH seam is documented in docs/upstream-reviews/office-adapter-seam-audit.md");
    }
  };

  wss.on("connection", (socket) => {
    const send = (frame) => socket.send(JSON.stringify(frame));
    downlinks.add(send);
    send({ type: "event", event: "connect.challenge", payload: { nonce: "dsh-office-adapter" } });
    socket.on("message", async (raw) => {
      let frame;
      try {
        frame = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (frame?.type !== "req" || typeof frame.method !== "string") return;
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

  ctx.logger?.info?.(`dsh-office-adapter: office gateway protocol live at ${routePath}`);

  return () => {
    disposeUpgrade?.();
    for (const socket of wss.clients) socket.close();
    wss.close();
  };
}
