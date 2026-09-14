import { test } from "node:test";
import assert from "node:assert/strict";
import {
  projectAgent,
  projectHistory,
  messageText,
  deriveAssistantText,
  sessionKeyFor,
  createDispatch,
  createApprovals,
  apply,
} from "../lib/index.js";

function makeCtx(sessions = [], agents = []) {
  const listeners = {};
  const upgrades = [];
  return {
    ctx: {
      on: (event, fn) => {
        (listeners[event] ??= []).push(fn);
        return () => {};
      },
      logger: { info() {}, warn() {} },
      sessions: {
        list: () => sessions,
        get: (id) => sessions.find((s) => String(s.id) === id),
      },
      agents: {
        list: () => agents,
        get: (id) => agents.find((a) => String(a.id) === id),
      },
      webServer: {
        registerUpgrade: (route) => (upgrades.push(route.path), () => {}),
      },
    },
    listeners,
    upgrades,
  };
}

test("projectAgent maps a real session header to the office payload", () => {
  const agent = projectAgent({
    id: "sess-1a2b3c4d",
    header: { id: "sess-1a2b3c4d", createdAt: 1, cwd: "D:\\w", origin: "subagent", delegationDepth: 1 },
  });
  assert.equal(agent.id, "sess-1a2b3c4d");
  assert.equal(agent.role, "Subagent");
  assert.equal(agent.workspace, "D:\\w");
  assert.equal(agent.identity.emoji, "\u{1F6F0}\uFE0F");
});

test("messageText flattens string and part content", () => {
  assert.equal(messageText({ content: "hi" }), "hi");
  assert.equal(messageText({ content: [{ type: "text", text: "a" }, { type: "image" }, { type: "text", text: "b" }] }), "ab");
  assert.equal(messageText(null), "");
});

test("deriveAssistantText answers assistant events only", () => {
  assert.equal(deriveAssistantText({ message: { role: "assistant", content: "done" } }), "done");
  assert.equal(deriveAssistantText({ message: { role: "user", content: "no" } }), null);
  assert.equal(deriveAssistantText({ message: { role: "assistant", content: "" } }), null);
});

test("projectHistory folds only user/assistant surface text", () => {
  const history = projectHistory({
    id: "s1",
    surface: [
      { seq: 1, message: { role: "user", content: "hello" } },
      { seq: 2, message: { role: "tool", content: "noise" } },
      { seq: 3, message: { role: "assistant", content: [{ type: "text", text: "reply" }] } },
    ],
  });
  assert.equal(history.sessionId, "s1");
  assert.deepEqual(history.messages.map((m) => m.role), ["user", "assistant"]);
  assert.deepEqual(history.messages.map((m) => m.text), ["hello", "reply"]);
});

test("apply registers the office upgrade route and lifecycle listeners", () => {
  const { ctx, listeners, upgrades } = makeCtx();
  const dispose = apply(ctx, {});
  assert.deepEqual(upgrades, ["/api/gateway/ws"]);
  assert.equal(listeners["session/created"]?.length, 1);
  assert.equal(listeners["session/disposed"]?.length, 1);
  assert.equal(listeners["session/event"]?.length, 1);
  assert.equal(typeof dispose, "function");
});

test("dispatch: agents.list serves the real session store", async () => {
  const { ctx } = makeCtx([{ id: "sess-a", header: { id: "sess-a", createdAt: 5 } }]);
  const frames = [];
  const io = createDispatch(ctx, (frame) => frames.push(frame));
  const res = await io.dispatch("agents.list", {}, "r1");
  assert.equal(res.ok, true);
  assert.equal(res.payload.mainKey, "main");
  assert.equal(res.payload.agents[0].id, "sess-a");
});

test("dispatch: chat.send drives a real agent.followup with a user message", async () => {
  const recorded = [];
  const fakeAgent = {
    id: "sess-live",
    session: { id: "sess-live", header: { id: "sess-live" } },
    followup: (message) => recorded.push(message),
  };
  const { ctx } = makeCtx([], [fakeAgent]);
  const frames = [];
  const io = createDispatch(ctx, (frame) => frames.push(frame));
  const res = await io.dispatch("chat.send", { agentId: "sess-live", message: "  hi there  " }, "r2");
  assert.equal(res.ok, true);
  assert.equal(res.payload.status, "started");
  assert.ok(res.payload.runId);
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0].role, "user");
  assert.equal(recorded[0].source.kind, "user");
  assert.equal(recorded[0].content[0].type, "text");
  assert.equal(recorded[0].content[0].text, "hi there");
  const presence = frames.find((f) => f.event === "presence");
  assert.ok(presence, "presence broadcast after send");
  assert.ok(presence.payload.sessions.byAgent.some((row) => row.agentId === "sess-live"));
});

test("dispatch: chat.send to a missing agent is not_found", async () => {
  const { ctx } = makeCtx();
  const io = createDispatch(ctx);
  const res = await io.dispatch("chat.send", { agentId: "ghost", message: "x" }, "r3");
  assert.equal(res.ok, false);
  assert.equal(res.error.code, "not_found");
});

test("dispatch: session/event with pending run emits chat final", async () => {
  const fakeAgent = { id: "sess-x", session: { id: "sess-x" }, followup() {} };
  const { ctx } = makeCtx([], [fakeAgent]);
  const frames = [];
  const io = createDispatch(ctx, (frame) => frames.push(frame));
  await io.dispatch("chat.send", { agentId: "sess-x", message: "go", idempotencyKey: "run-9" }, "r4");
  io.onSessionEvent({ id: "sess-x" }, { type: "message", message: { role: "assistant", content: "all done" } });
  const chat = frames.find((f) => f.event === "chat");
  assert.ok(chat, "chat final frame emitted");
  assert.equal(chat.payload.runId, "run-9");
  assert.equal(chat.payload.state, "final");
  assert.equal(chat.payload.message.content, "all done");
  assert.equal(chat.payload.sessionKey, sessionKeyFor("sess-x"));
});

test("dispatch: unaudited seams answer not_implemented, unknown methods named", async () => {
  const { ctx } = makeCtx();
  const io = createDispatch(ctx);
  const abort = await io.dispatch("chat.abort", {}, "r5");
  assert.equal(abort.error.code, "not_found");
  const unknown = await io.dispatch("definitely.not.a.method", {}, "r6");
  assert.equal(unknown.error.code, "unknown_method");
});

test("approvals: answerer parks, broadcasts requested, resolves through resolveExternal", async () => {
  const frames = [];
  const ctx = { on: () => () => {} };
  const approvals = createApprovals(ctx, (frame) => frames.push(frame), () => true);
  const outcomePromise = approvals.answerer(
    { agent: { id: "sess-a" }, toolName: "pwsh", reason: "git reset --hard targets the main workspace", signal: new AbortController().signal },
    async () => "unavailable",
  );
  const requested = frames.find((f) => f.event === "exec.approval.requested");
  assert.ok(requested, "requested frame emitted");
  assert.match(requested.payload.request.command, /git reset --hard/);
  assert.equal(requested.payload.request.sessionKey, sessionKeyFor("sess-a"));
  assert.equal(approvals.resolveExternal(requested.payload.id, "allow-once", "office"), true);
  assert.equal(await outcomePromise, "allowed-once");
  const resolvedFrame = frames.find((f) => f.event === "exec.approval.resolved");
  assert.ok(resolvedFrame, "resolved frame emitted");
  assert.equal(resolvedFrame.payload.decision, "allow-once");
});

test("approvals: deny maps to rejected, unknown id false, abort cancels", async () => {
  const frames = [];
  const ctx = { on: () => () => {} };
  const approvals = createApprovals(ctx, (frame) => frames.push(frame), () => true);
  const controller = new AbortController();
  const p2 = approvals.answerer({ agent: { id: "b" }, toolName: "t2", signal: new AbortController().signal }, async () => "unavailable");
  assert.equal(approvals.resolveExternal("nope", "deny", null), false);
  const id2 = frames.filter((f) => f.event === "exec.approval.requested").map((f) => f.payload.id)[0];
  assert.equal(approvals.resolveExternal(id2, "deny", "tester"), true);
  assert.equal(await p2, "rejected");
  const p3 = approvals.answerer({ agent: { id: "c" }, toolName: "t3", signal: controller.signal }, async () => "unavailable");
  controller.abort();
  assert.equal(await p3, "cancelled");
});

test("approvals: no downlinks delegates to next", async () => {
  const ctx = { on: () => () => {} };
  const approvals = createApprovals(ctx, () => {}, () => false);
  let nextCalled = false;
  const out = await approvals.answerer({ agent: { id: "a" }, toolName: "t" }, async () => { nextCalled = true; return "unavailable"; });
  assert.equal(nextCalled, true);
  assert.equal(out, "unavailable");
});

test("dispatch: exec.approval.resolve routes into the approvals bridge", async () => {
  const frames = [];
  const ctx = {
    on: () => () => {},
    sessions: { list: () => [], get: () => undefined },
    agents: { list: () => [], get: () => undefined },
    webServer: { registerUpgrade: () => () => {} },
    logger: { info() {}, warn() {} },
  };
  const approvals = createApprovals(ctx, (frame) => frames.push(frame), () => true);
  const io = createDispatch(ctx, (frame) => frames.push(frame), approvals);
  const outcomePromise = approvals.answerer(
    { agent: { id: "sess-r" }, toolName: "pwsh", reason: "needs approval", signal: new AbortController().signal },
    async () => "unavailable",
  );
  const requested = frames.find((f) => f.event === "exec.approval.requested");
  const bad = await io.dispatch("exec.approval.resolve", { id: "missing", decision: "allow-once" }, "rx");
  assert.equal(bad.error.code, "not_found");
  const res = await io.dispatch("exec.approval.resolve", { id: requested.payload.id, decision: "deny" }, "ry");
  assert.equal(res.ok, true);
  assert.equal(await outcomePromise, "rejected");
});
