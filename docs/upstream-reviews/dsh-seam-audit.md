# DSH Seam 审计（Phase 2.0）

- 日期：2026-09-13
- 对象：本机安装的 @deepseek-ai/dsh 0.1.1-rc.2（Cordis 插件体系），源码/类型：C:\Users\84700\AppData\Roaming\npm\node_modules\@deepseek-ai\dsh\node_modules\@deepseek-ai\
- 方法：直接读取各包 lib/types/*.d.ts 与 lib/index.js（构建产物即运行真相）
- 结论：V4 规格 §12 的全部所需 seam 均真实存在，命名与规格一致；无需自研平行 Runtime。

## 1. tools/pre-execute（硬拦截点）✅

`@deepseek-ai/dsh-tools/lib/types/index.d.ts`:

```ts
interface Events {
  'tools/pre-execute'(this: Scoped<ToolRuntime>, exec: ToolExecution,
    next: () => Promise<PreToolDecision>): Promise<PreToolDecision>;  // @mode waterfall
}
type PreToolDecision = { kind: 'allow' }
                     | { kind: 'deny';  reason: string }
                     | { kind: 'ask';   reason?: string };
interface ToolExecution { callId; name; arguments; agent?; signal; ... }
```

语义（原文注释）："Allow, deny, or ask before dispatch. `next()` delegates to allow; missing approval support turns `ask` into denial." 参数已解析（parsed arguments）、已记录、已呈现，故 **pre-execute 不允许改写参数**（决策只读输入）。同一包还提供 `tools/execute`（around：超时/重试）与 `tools/result`（post：accept/replace/block + additionalContexts）。

## 2. ASK → DSH 原生 approval ✅

`@deepseek-ai/dsh-user-approval`：`ctx.approval: ApprovalService` + `approval/request` waterfall（answerers 链，fail-closed）。pre-execute 返回 `ask` 后由 runtime 自动走 approval 链（"ask runs only after an approval service returns allowed-once and otherwise denies"）。会话级策略 `'ask' | 'never'`。→ **AIOS 无需第二 approval DB**；Claw3D Approval UI 是 DSH approval 的呈现面。

## 3. 原生 Tool 注册 ✅

`ToolRuntime.register(definition): () => void`（返回精确 disposer）；工具定义用 `defineTool`（dsh-tools 导出，schemastery 参数 spec）。12 个 aios_* tools 用此注册。

## 4. Prompt Section 注入 ✅

`@deepseek-ai/dsh-system-prompt`：`ctx.systemPrompt` 注册表，`PromptSection = { name(唯一), order, text | (ctx)=>string }`；order 约定：-100 身份、0 persona、100–199 工具指引。治理入口短语（V4 §12.1）注册为一个低 order section（选 order 50，persona 之后、工具指引之前，内容极短）。

## 5. 插件装载（out-of-tree）✅

- 插件形态：标准 ESM 包（`"type":"module"`，`main` 指向编译产物），default export 为 Cordis 插件（参考 `dsh-user-approval`：`ApprovalService as default`，Service 子类，构造/配置经 schemastery）。
- 组合：profile `package.json` 的 `dsh.profile.bundles`（有序 bundle）+ 各 bundle `cordis.patch.yml`（insert 条目）+ 用户 `~/.dsh/profiles/<name>/cordis.patch.yml`（patch 语义：id 定位、整行 config 替换、insert 追加）。
- 安装：`dsh plugin --profile <name> <pnpm args>` 把 out-of-tree 包装进 profile node_modules。
- 参考 dsh-base 的 insert 条目形制：`- id: <stable-id> / name: '<package>' / config: {...}`。

## 6. Workspace ✅（用 config 钉扎）

`dsh-workspace` 有 WorkspaceRegistry 服务；为保持插件确定性且不依赖运行时会话上下文，**治理插件从 patch config 读取 `workspaceRoot`**（AIOS project root = DSH workspace root，profile 按 workspace 启动时注入），缺省回退 `process.cwd()`。

## 7. 对实现的决定

1. 包：`packages/dsh-aios-governance`（ESM、tsc 编译到 dist、default export 插件）。
2. 拦截：仅监听 `tools/pre-execute`（Phase 2 范围）；决策只读 `exec.name/arguments`，匹配 `governance/policy.yaml`（Python 内核共读的单源）。
3. ASK 直接返回 `{ kind:'ask', reason }`，审批链路全交 DSH。
4. tools：`ctx.tools.register(defineTool(...))` 注册 12 个 aios_* 最小集合；实现经 child_process spawn `aios` CLI（确定性内核），插件不含治理逻辑副本。
5. prompt：注册 `aios-governance-entry` section（§12.1 短文本）。
6. 卸载安全：全部 register 返回的 disposer 在插件停用/热更时生效（cordis 生命周期管理）。

## 8. 风险

- DSH 为 0.1.1-rc.2：seam 形态在升级时可能变化 → Phase 8 compatibility suite 覆盖 pre-execute/approval/prompt 三点。
- 本机 HTTPS 不通：profile 内 pnpm 安装本地包（file: 链接或 pnpm add <path>）不受影响；不引入外部 npm 依赖（仅 node: 内置 + workspace 内类型）。
