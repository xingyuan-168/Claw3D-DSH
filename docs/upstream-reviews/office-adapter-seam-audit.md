# Office Adapter 接缝审计（Phase 3 P3-1）

日期：2026-09-14。证据全部来自本机安装的 dsh 0.1.1-rc.2 类型文件与 Claw3D subtree 源码（0565b78）。

## 1. Claw3D Office 网关契约（server/demo-gateway-adapter.js + server/gateway-proxy.js）

传输：WebSocket `/api/gateway/ws`（office 自带 same-origin proxy，upstream URL 由 studio-settings 解析，默认 `ws://localhost:18789`）。

帧形状：
- 请求 `{type:"req", id, method, params}` → 响应 `{type:"res", id, ok, payload|error:{code,message}}`
- 事件 `{type:"event", event:"presence"|"chat", payload}`；握手先发 `connect.challenge`（nonce）。

RPC 方法面（27 个）：agents.list/create/update/delete、agents.files.get/set、config.get/patch/set、exec.approvals.get/set/resolve、models.list、skills.status、cron.list/add/run/remove、sessions.list/preview/patch/reset、chat.send/abort/history、agent.wait、status、wake。

关键 payload（实证）：
- agents.list → { defaultId, mainKey, agents:[{id,name,workspace,identity:{name,emoji},role}] }
- presence → { sessions:{ recent:[], byAgent:[] } }

## 2. DSH 侧可用接缝（rc.2）

- **dsh-host-webserver**：`ctx.webServer.register(WebRoute)`（SSE 可持有响应）、`registerUpgrade({path,handler})`（exact-path WS upgrade，"Owns protocol negotiation and the upgraded socket after dispatch"）→ **office 协议可由 DSH 进程原生承载，无需翻译层**。
- **dsh-client-connection**：`ctx.connection.handle(channel,handler,{authority})` / `intercept('/api',matches,handler)` —— 浏览器 RPC 通道注册面；mux/host downlink 路径常量 /api/events.mux、/api/events.host。
- **dsh-session-projection**：`ctx.sessionProjections` registry，ProjectionDefinition = 纯同步 fold + client view；框架持有 per-session watermark 缓存与 change notification；carriers 消费 snapshot read face + change feed —— Office presence/agent 状态的正当数据源。
- **审批**：`ctx.approval` / `approval/request` waterfall（P2 已审计）→ exec.approvals.* 的实现接缝。
- **dsh-tool-todo / dsh-subagent(-control/-report)**：todo 与子代理状态的投影来源。

## 3. 设计决定（V4 §46：packages/dsh-office-adapter = DSH → Claw3D projection）

1. adapter 以 **cordis 插件**形态挂进 DSH profile（与 governance 插件同机制，bundle patch 声明），在 DSH webserver 上注册 office WS upgrade 路由。
2. Claw3D office 的 upstream URL 指向 DSH webserver，adapterType 走"直连"分支；OpenClaw/Hermes 主路径在配置上停用（subtree 不 fork，源码尊重上游）。
3. 会话/代理状态只从 sessionProjections 快照读取；审批走 approval seam；**不造模拟数据**（V4 §"不允许模拟数据假装成功"）。
4. chat.send 的桥接属下一接缝审计（client-connection 的 channel 语义 + 会话投递 API），方法面先以 `not_implemented` 显式报错。

## 3A. approval 契约实测修正（2026-09-14 深审计）

- `exec.approvals.get/set` 是**每 agent 的 exec 自动批准策略配置文件**（`{path,exists,hash,file:{version:1,agents:{...security/ask/allowlist}}}`，set 带 baseHash 乐观锁）——不是交互审批队列。DSH 无同构域（其对应物是 governance policy + permission-presets），v1 保持 not_implemented，归属 Phase 8 兼容矩阵议题。
- 交互审批走**事件对**：`exec.approval.requested {id,request:{command(必填),agentId,sessionKey,...},createdAtMs,expiresAtMs}` 与 `exec.approval.resolved {id,decision:'allow-once'|'allow-always'|'deny',resolvedBy?,ts}`；决议 RPC = `exec.approval.resolve {id,decision}`。
- DSH 桥接：adapter 以 `approval/request` waterfall **answerer** 身份挂载（仅在 office 在线时认领，否则 next() 交给其他 answerer / fail-closed）；parked → requested 帧；resolve RPC / signal abort（→'cancelled'，不广播 resolved，office 按 expiresAtMs 过期）；allow-always 降级为 allowed-once（DSH 无持久授权，持久许可归治理策略）。
- presence 形状实证：`runtimeEventBridge.ts` byAgent = `[{agentId, recent:[...]}]`，`gatewayPresence.ts` 按 agentId 取 recent——adapter 的真实 activity 跟踪输出与此一致。

## 3B. office upstream 指向 DSH 的配置路径（已核实）

- `gateway-proxy.js:333` 按**原样** `new WebSocket(upstreamUrl)` 拨号（路径保留），upstream URL 来自 studio 设置（`loadUpstreamGatewaySettings(process.env)`，默认 `ws://localhost:18789`，环境变量可覆盖）。
- 指向 DSH：把 office 的 gateway URL 设为 `ws://127.0.0.1:<DSH端口>/api/gateway/ws`（adapter 在 DSH webserver 上注册的 exact-path upgrade 路由）；adapterType 保持非 openclaw 分支即无需 token 握手（`requiresToken = adapterType === "openclaw"`）。
- 生产模式 `UPSTREAM_ALLOWLIST` 需含 DSH 主机名（127.0.0.1/localhost）。

## 3C. todo 投影接缝（2026-09-14 审计）

- DSH 真源：`TodoItem {content, status: pending|in_progress|completed}`；Agent 经 dsh-tool-todo 以 `todo/write` 事件**全列表替换**写会话日志（last-write-wins，无稳定 id）。
- Office 契约：`tasks.list {includeArchived}` → `{tasks: GatewayTaskRecord[]}`；status 联合 `todo|in_progress|blocked|review|done`；create/update 为写路径。
- 投影（只读）：adapter 挂主机级 `session/event`，实时跟踪每会话最新 `todo/write` 快照 → tasks.list 映射 pending→todo / in_progress→in_progress / completed→done，source 固定 `openclaw_event`（事件推导卡），assignedAgentId = 会话 id。限制：adapter 重启后历史 todo/write 不可见，须等下一次写入（与 approval 桥接同源限制）。
- `tasks.create/update` 显式 not_implemented：任务写路径归 Agent 的 todo 工具（宪法第 1 条——DSH 已有能力不重复实现；office 侧写入会伪造第二真源）。

## 4. 验收路径（Phase 3 收口）

同时启动多个 DSH Agent → Office 出现多个不同真实 Agent；Agent 完成 → UI 状态同步变化。前置：adapter live + office dev server + 多会话驱动。
