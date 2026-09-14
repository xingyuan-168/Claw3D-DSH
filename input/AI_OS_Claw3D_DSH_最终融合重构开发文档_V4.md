# AI Engineering OS + Claw3D + DeepSeek Harness
# 最终融合重构开发规格 V4（DSH 专用定型版）

> 文档状态：**可直接交给 DeepSeek Harness 执行的工程规格；仅适用于 DSH，不适配 Codex**
>
> 日期：2026-09-13
>
> 文档版本：V4
>
> 目标产品版本：v1.0 Fusion
>
> 适用宿主：**仅 DeepSeek Harness（DSH）**
>
> 重要决定：**CQ OS 正式废弃，不再作为任何 Runtime、Preset、Agent 组织层或治理层继续开发。**
>
> 本文使用“CQ Office”作为 3D 前端工作名；如最终产品需要改名，可仅修改品牌，不改变架构。

---

# 0. 最终结论



最终系统固定为三层：

```text
┌─────────────────────────────────────────────────────────────┐
│                   CQ Office / Claw3D                         │
│                                                             │
│  3D Office / Agent View / Task View / Chat / Approval UI    │
│  QA Lab / Review Room / DevOps Room / Dashboard / Builder   │
│                                                             │
│              只负责“看见、交互、呈现”                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                  DSH UI / Projection Adapter
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    DeepSeek Harness                          │
│                                                             │
│ Agent / Subagent / Agent Teams / Workflow / Parallel        │
│ Todo / Goal / Team Task / Session / Tools / Approval        │
│ User Questions / Plan / Sandbox / Workspace / Model         │
│ Provider / Persistence / Plugin Runtime                     │
│                                                             │
│                     唯一执行 Runtime                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                       Governance
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   AI Engineering OS                         │
│                                                             │
│ Code Start Gate / OSS First / Git Governance               │
│ Worktree Isolation / Frontend Approval / Finish Gate        │
│ Memory / ADR / Document Impact / Repo Hygiene               │
│ Secret / User Asset Protection / Delivery Rules             │
│                                                             │
│             只规定“能否做、何时做、做完留什么”               │
└─────────────────────────────────────────────────────────────┘
```

一句话：

> **Claw3D 负责前端 UI；AI OS 负责工程治理；DeepSeek Harness 使用自身原生能力完成全部工作；Archify 作为 DSH 按需调用的“架构证据与工程可视化能力”，不构成第四个 Runtime 或第四个产品层。**


---

# 0A. 系统形态与职责边界——架构合同，不可修改

本章优先级高于本文其余所有实现章节。

如果后续实现与本章冲突：

> **以本章为准，停止实现并重新设计。**

本项目最终只允许存在三类产品职责：

```text
┌──────────────────────────────────────────────────────┐
│ CQ Office / Claw3D                                  │
│                                                      │
│ 独立 Web UI / 3D Visualization / Human Interaction  │
│                                                      │
│ 看见 DSH；操作 DSH；不成为 Runtime                   │
└───────────────────────┬──────────────────────────────┘
                        │
                 DSH UI / Projection
                        │
┌───────────────────────▼──────────────────────────────┐
│ DeepSeek Harness                                     │
│                                                      │
│ 唯一 Agent / Workflow / Session / Tool Runtime       │
│                                                      │
│ 真正创建 Agent、并行执行、运行工具、调用模型          │
└───────────────────────┬──────────────────────────────┘
                        │
                 Governance Hooks
                        │
┌───────────────────────▼──────────────────────────────┐
│ AI Engineering OS                                   │
│                                                      │
│ 工程治理体系                                         │
│                                                      │
│ 规定能否做、何时做、完成标准、工程事实如何沉淀         │
└──────────────────────────────────────────────────────┘
```

任何实现都不得再增加第四个 Runtime、第四个状态真源或第四个调度层。

---

# 0B. AI Engineering OS 的正式产品形态

AI Engineering OS **不是单一 Plugin，也不是单一 Skill**。

完整 AI OS 固定由以下四部分组成：

```text
AI Engineering OS
│
├── 1. DSH Governance Plugin
│      @aios/dsh-governance
│
├── 2. Governance Skills
│      governance-entry
│      open-source-research
│      frontend-design-review
│      html-prototype
│      worktree-protocol
│      memory-protocol
│      document-impact
│      finish-checklist
│
├── 3. Deterministic Core
│      Python / deterministic library + CLI
│      Git / Worktree / Gate / Memory / Repository Check
│
└── 4. Project Governance Assets
       AGENTS.md
       governance/policy.yaml
       docs/ADR/
       docs/design/
       docs/memory/
       OPEN_SOURCE_RESEARCH.md
       其他项目级工程事实
```

**四部分共同组成 AI OS。**

任何一部分都不得被描述为“完整 AI OS”。

---

# 0C. AI OS 明确“不是什么”

以下定义必须写入 README、架构文档和主要 ADR：

```text
AI OS ≠ DeepSeek Harness Preset
AI OS ≠ 第五模式
AI OS ≠ Agent
AI OS ≠ Agent Team
AI OS ≠ Runtime
AI OS ≠ Scheduler
AI OS ≠ Task Engine
AI OS ≠ Session Manager
AI OS ≠ Approval Engine
AI OS ≠ LLM Gateway
AI OS ≠ 单一 Plugin
AI OS ≠ 单一 Skill
AI OS ≠ 常驻 Python Backend
```

尤其禁止恢复旧 CQ OS 思路：

```text
DSH
└── CQ/AIOS Mode
    └── 自己管理 Agent / Task / Runtime
```

最终必须是：

```text
DSH 使用任意自身运行方式
+
AI OS 对 AIOS-managed workspace 施加工程治理
```

---

# 0D. AI OS 不是 Preset，且不得依赖某个 DSH 模式才能生效

AI OS 必须作为 **工程治理层** 存在。

无论 DSH 当前使用：

```text
Standard
PTC
其他正式模式
未来新模式
```

只要当前 workspace 已初始化 AI OS：

```text
AI OS Governance = ACTIVE
```

不得要求用户“切换到 AI OS 模式”才能得到治理。

因此禁止：

```text
aios preset
aios mode
aios fifth mode
```

作为正式架构。

---

# 0E. AI OS 四部分的严格职责

| 层 | 负责什么 | 不负责什么 |
|---|---|---|
| **DSH Governance Plugin** | 硬拦截、ALLOW/DENY/ASK、接 DSH Approval、接 Tool/FS 事件 | Agent调度、Task执行、模型调用 |
| **Governance Skills** | 工程方法、操作流程、软治理、按需指导 | 安全边界、Runtime强制权限 |
| **Deterministic Core** | Git检查、Worktree、Gate evaluator、Memory索引、Repository检查 | 常驻Agent、Session、Task、LLM |
| **Project Governance Assets** | ADR、Memory、UI审批事实、Research结果、Policy | Runtime状态、聊天历史、工具日志 |

硬规则：

> **能确定性计算的事情，不调用模型。**

---

# 0F. Plugin / Skill / Core / Asset 选择规则

实现任何 AI OS 功能前必须先按下表分类：

| 需求 | 正确实现位置 |
|---|---|
| 禁止 `git push --force` | DSH Governance Plugin |
| 禁止修改 `input/**` | DSH Governance Plugin |
| 生产部署必须人工确认 | Plugin + DSH native Approval |
| 新项目优先调研开源 | Skill + Code Start Gate |
| 如何进行 OSS Research | Skill |
| 如何进行 Review | Skill |
| 前端先做 Prototype | Skill + Frontend Gate |
| 如何使用 Worktree | Skill |
| Worktree 是否安全删除 | Deterministic Core |
| Git Repository 是否干净 | Deterministic Core |
| Finish Gate 是否满足 | Deterministic Core + Plugin入口 |
| UI 是否已有正式批准记录 | Deterministic Core |
| ADR / 技术决策 | Project Asset |
| 长期工程 Memory | Project Asset + Deterministic Core |
| Agent 当前状态 | DSH |
| Agent 数量 | DSH |
| Agent 并行 | DSH |
| Task DAG | DSH |
| Session Persistence | DSH |
| 模型执行 | DSH |
| 3D 状态显示 | Claw3D |

如果一个能力需要同时跨多个层：

> 只把每个部分放在其正确层，不得为了方便把整个能力塞进一个 Plugin 或 Skill。

---

# 0G. Deterministic Core 不是第二个后端

当前 AI OS Python Core 必须继续保持：

```text
Library / CLI / deterministic helper
```

允许的调用方式：

```text
DSH Plugin
   │
   ├── 调用 TypeScript 本地治理逻辑
   │
   └── 调用 Python deterministic core
             │
             ├── Git check
             ├── Worktree
             ├── Gate evaluation
             ├── Memory
             └── Repository validation
```

禁止将 Python Core 改造成：

```text
常驻 AIOS Server
Agent Runtime
Task Server
Approval Server
Session Backend
LLM Service
```

如果需要进程调用，可以使用 CLI/subprocess。

除非有明确、无法通过 DSH Plugin / library / CLI 满足的需求，否则不建立长期驻留 Python 服务。

---

# 0H. Skills 必须按需加载

AI OS Skills 不得全部塞入 DSH system prompt。

正确方式：

```text
DSH System Prompt
      ↓
极短的 Governance Entry
      ↓
识别当前工程问题
      ↓
按需加载对应 Skill
```

例如：

```text
需要开源调研
→ open-source-research

需要并行写代码
→ worktree-protocol

需要前端设计
→ frontend-design-review + html-prototype

进入结束阶段
→ finish-checklist
```

禁止：

```text
启动 Session
→ 一次性注入所有 AI OS 完整 Skill
```

目标：

- 减少 Token；
- 避免限制 DSH 原生能力；
- 只在真正需要时加载方法论。

---

# 0I. Claw3D 的正式存在形态

Claw3D / CQ Office 固定为：

> **独立 Web UI 应用。**

第一版：

```text
Next.js / React / Three.js
local web server
browser
```

它**不是 DSH Plugin 本体**。

DSH 中只允许存在一个薄的 UI Adapter / Projection Adapter，例如：

```text
@cq-office/dsh-ui-adapter
```

职责：

```text
DSH state/events
→ Office View Model
```

以及：

```text
Office user action
→ DSH native API
```

未来如需桌面版：

```text
Tauri
└── CQ Office Web UI
```

桌面壳不得改变系统边界。

---

# 0J. Claw3D 与 AI OS 禁止直接通信

这是 V2 新增的硬边界。

禁止：

```text
Claw3D
   ↓
AI OS API
   ↓
DSH
```

禁止：

```text
Claw3D
→ AIOS Approval DB
→ AIOS Runtime
→ 恢复 DSH Agent
```

唯一正确方向：

```text
                 ┌───────────────┐
                 │   Claw3D      │
                 │  CQ Office    │
                 └───────┬───────┘
                         │
                  UI / Projection
                         │
                         ▼
                 ┌───────────────┐
                 │      DSH      │
                 │    Runtime    │
                 └───────┬───────┘
                         │
                 Governance Hooks
                         │
                         ▼
                 ┌───────────────┐
                 │    AI OS      │
                 │  Governance   │
                 └───────────────┘
```

Claw3D 只与 DSH 交互。

AI OS 只通过 DSH Governance seam 参与运行。

---

# 0K. Approval 的正确调用链

例如生产部署：

```text
DSH Agent
   ↓ tool request
AI OS Governance Plugin
   ↓
判断：ASK
   ↓
DSH ctx.approval
   ↓
Claw3D 显示 Approval UI
   ↓
用户 Approve / Reject
   ↓
DSH 原生 Approval outcome
   ↓
DSH 继续或终止
```

AI OS 可以提供：

```text
reason
policy id
risk level
```

供 Claw3D 展示。

但 AI OS 不拥有 Approval 生命周期。

---

# 0L. Source of Truth 不得重叠

以下为 V2 强制真源：

```text
DSH
├ Agent
├ Agent Team
├ Session
├ Workflow
├ Todo
├ Goal
├ Team Task
├ Tool Call / Result
├ Approval Runtime
├ User Question
├ Workspace
├ Provider / Model
└ Runtime Events

AI OS
├ Engineering Governance Policy
├ Gate Rules
├ Worktree Governance
├ ADR
├ UI Approval Fact
├ OSS Research Fact
└ Engineering Memory

Claw3D
├ Office Layout
├ Camera Preference
├ UI Preference
└ Derived View State
```

任何代码如果试图把同一事实永久保存到两个层：

> 默认判定为架构错误。

---

# 0M. V2 禁止的数据复制

不得创建：

```text
AIOS agents table
AIOS tasks runtime table
AIOS approvals runtime table
AIOS sessions table
AIOS workspace registry
AIOS model registry
Claw3D runtime task database
Claw3D agent registry database
Claw3D session database
Claw3D approval database
```

允许缓存：

```text
ephemeral UI cache
derived projection
rebuildable memory index
worktree registry
```

缓存必须可从真源重建。

---

# 0N. DSH 原生能力优先审计

任何新功能开始前，必须执行：

```text
1. 查 DSH 当前版本
2. 查 DSH 官方文档
3. 查 DSH Source
4. 判断是否已有正式/实验能力
5. 有 → 复用
6. 没有 → 再判断是否属于 AI OS 治理或 Claw3D UI
7. 仍缺失 → ADR 后最小实现
```

硬规则：

> **“不知道 DSH 有没有”不能成为自研理由。**

---

# 0O. V2 架构违规即失败

以下任一情况出现，必须立即停止当前实现：

- AI OS 被实现成第五 Preset；
- AI OS 开始自己 Spawn/调度 Agent；
- AI OS 增加自己的 Task Runtime；
- AI OS 建立自己的 Approval Runtime；
- Python Core 变成新的常驻 Agent Backend；
- Claw3D 直接调用 LLM Provider；
- Claw3D 直接管理 AI OS；
- Claw3D 创建 Agent 真源；
- UI 状态通过 LLM 轮询获取；
- DSH 已有执行能力却在 AI OS 中重新实现；
- 所有 AI OS Skill 被永久塞进 system prompt。

以上均视为 V2 架构验收失败。

---


# 0P. Archify 的正式定位——V4 新增，不可修改

Archify：

```text
https://github.com/tt-a1i/archify
```

License：

```text
MIT
```

V4 对 Archify 的正式定义：

> **Archify 是 DeepSeek Harness 按需调用的“架构证据（Architecture Evidence）与工程可视化能力”。**

它不是：

```text
Archify ≠ Runtime
Archify ≠ Agent Framework
Archify ≠ Task Engine
Archify ≠ Session Store
Archify ≠ Workflow Runtime
Archify ≠ DSH 替代品
Archify ≠ AI OS Core
Archify ≠ CQ Office Runtime
Archify ≠ 实时执行状态真源
```

它负责：

```text
真实仓库证据
        ↓
DSH Agent 理解与作者化
        ↓
Typed JSON IR
        ↓
Archify Schema / Validation
        ↓
Deterministic Renderer
        ↓
Architecture / Workflow / Sequence / Data Flow / Lifecycle
        ↓
Interactive HTML / Export / Delta
```

Archify 的加入**不改变 V2/V3 三层架构合同**。

正确关系：

```text
                    CQ Office / Claw3D
                    3D UI / Sidebar / Rooms
                              │
                              │ 展示
                              ▼
                    DeepSeek Harness
                     唯一 Runtime
                   /       |        \
                  /        |         \
                 ▼         ▼          ▼
             AI OS      Archify     Native DSH
           Governance    Skill      Agent/Task/etc.
```

其中：

```text
AI OS
= 规定“何时需要架构证据”

DSH
= 负责调用 Skill、读仓库、组织 Agent 工作

Archify
= 把工程理解变成可验证的结构化可视化

CQ Office
= 展示 Archify 结果
```

---

# 0Q. Archify 与 AI OS 的边界

禁止：

```text
AI OS Core
└── Fork / 内嵌 Archify renderer 源码
```

禁止：

```text
AI OS
└── 自己重新实现 Architecture Renderer
```

正确：

```text
AI OS Governance
       │
       │ policy / gate
       ▼
      DSH
       │
       │ invoke skill
       ▼
    Archify
```

AI OS 只增加一个治理概念：

> **Architecture Evidence**

示例：

```yaml
architecture_evidence:
  required: true
  reason: "service topology changed"
  status: verified
  sources:
    - docs/architecture/system.architecture.json
```

这个状态是工程治理事实，不是 Runtime 状态。

---

# 0R. Archify 与 DSH Trajectory 的边界

必须严格区分：

## DSH Trajectory

回答：

> **Agent 做了什么？**

例如：

```text
Read
→ Search
→ Edit
→ Test
→ Result
```

属于：

```text
实时执行轨迹
Session / Tool / Turn / Step
```

Source of Truth：

```text
DSH
```

## Archify

回答：

> **系统是什么结构？系统结构发生了什么变化？**

例如：

```text
Frontend
→ API
→ Redis
→ Worker
→ PostgreSQL
```

属于：

```text
Architecture Evidence
Engineering Visualization
Architecture Delta
```

Source of Truth：

```text
Git 中的 Archify Typed JSON IR
```

因此禁止：

```text
用 Archify 代替 Trajectory
```

也禁止：

```text
用 Trajectory 推断架构图
```

---

# 0S. Archify 的五类图正式进入工程能力目录

V4 支持：

| Archify 图类型 | AI Engineering OS / CQ Office 用途 |
|---|---|
| `architecture` | 系统组件、服务、存储、边界、部署关系 |
| `workflow` | CI/CD、工程流程、审批、runbook、工具流程 |
| `sequence` | API 调用链、认证、缓存、异步调用、关键请求 |
| `dataflow` | 数据流、PII、ETL/ELT、消息流、存储与消费者 |
| `lifecycle` | 状态机、等待、重试、失败、恢复、终止状态 |

第一优先级：

```text
architecture
sequence
dataflow
```

第二优先级：

```text
workflow
lifecycle
```

原因：

第一版最需要解决的是：

> 系统架构、关键调用链和数据边界是否真实可见。

---

# 0T. Archify Typed JSON IR 是架构可视化真源

项目中新增：

```text
docs/architecture/
├── manifest.yaml
├── system.architecture.json
├── auth.sequence.json
├── data.dataflow.json
├── release.workflow.json
└── service.lifecycle.json
```

注意：

> **不是要求每个项目必须同时拥有五种图。**

只创建真正有工程价值的图。

Typed JSON IR：

- 进入 Git；
- 接受 Review；
- 通过 Schema validation；
- 作为 Architecture Delta 的输入；
- 作为长期工程事实。

生成 HTML：

```text
.aios/artifacts/archify/
```

属于：

> 可重建生成产物。

默认不作为架构 Source of Truth。

---

# 0U. 禁止 Architecture v1/v2/final 副本

继续遵守 Git 唯一版本原则。

禁止：

```text
system-v1.architecture.json
system-v2.architecture.json
system-final.architecture.json
system-final2.architecture.json
```

只维护：

```text
system.architecture.json
```

历史：

```text
Git
```

Architecture Delta 应通过 Git 基线生成：

```text
git show <BASE>:docs/architecture/system.architecture.json
```

然后使用 Archify compare。

---

# 0V. Archify 第一阶段不 Fork

与 Claw3D 不同：

```text
Claw3D
→ 深度 UI 二开
→ Fork

Archify
→ 能力完整、边界清晰
→ 第一阶段不 Fork
```

优先使用官方 DSH 集成：

```text
@tt-a1i/archify-dsh
```

V4 编写时公开稳定参考：

```text
Archify core: v2.16.0
Archify DSH community bundle: v0.1.0
```

这些版本只作为 V4 编写时的参考。

真正实施时必须：

```text
1. 重新检查最新 release
2. 检查当前 DSH compatibility
3. pin exact version
4. 写入 VERIFIED_STACK.md
5. 不自动升级
```

只有出现明确、无法通过上游贡献或 Adapter 解决的需求，才允许提出 Fork，并必须先 ADR。

---

# 0W. Archify 不进入常驻 System Prompt

Archify 与 AI OS Skills 一样：

> **按需加载。**

禁止：

```text
所有 Session 永久注入 Archify 全部规则
```

正确：

```text
任务涉及 Architecture Evidence
↓
DSH 按需调用 Archify Skill
↓
生成 / 更新 IR
↓
validate / deliver / compare
```

普通：

- 文案修改；
- CSS 小修；
- 小 Bug；
- 单元测试调整；

不应触发 Archify。

---


# 1. 最高优先级铁律

以下条目必须作为本次重构的不可修改规则。

## 1.1 DSH 是唯一 Runtime

禁止新增或保留第二套：

- Agent Runtime
- Subagent Runtime
- Team Runtime
- Workflow Engine
- Parallel Scheduler
- Task DAG Engine
- Agent Registry
- Session Store
- Task Runtime DB
- Approval Runtime
- Tool Runtime
- Sandbox Runtime
- Workspace Registry
- Model Runtime / LLM Gateway
- Plugin Runtime

如果 DSH 已有对应能力，**AI OS 和 Claw3D 一律只调用、约束、展示，不重新实现。**

---

## 1.2 AI OS 只治理，不执行

AI OS 只回答：

```text
这件事是否允许？
现在是否允许？
是否需要先调研？
是否需要人工确认？
是否需要 Worktree 隔离？
项目是否满足结束条件？
哪些工程事实需要沉淀？
```

AI OS 不回答：

```text
应该启动几个 Agent？
Agent 如何并行？
谁来执行？
任务 DAG 如何运行？
Session 怎么保存？
工具如何执行？
模型如何调用？
```

这些都属于 DSH。

---

## 1.3 Claw3D 只展示真实状态

Claw3D 不得创建自己的“真实 Agent 状态”。

禁止：

```text
Claw3D 自己判断 Agent 正在工作
Claw3D 自己创建 Task 真源
Claw3D 自己保存 Approval 真源
Claw3D 自己维护 Agent Registry
Claw3D 自己维护 Session History
```

正确方式：

```text
DSH authoritative state
        ↓
Projection / Adapter
        ↓
Claw3D View State
        ↓
动画、房间、HUD、面板
```

---

## 1.4 3D UI 正常运行不得额外消耗 LLM Token

硬规则：

> **事实由 Runtime 获取；状态由事件计算；动画由前端规则驱动；只有理解/推理/生成才调用模型。**

以下行为必须做到 **0 LLM token**：

- Agent 出现/消失
- Agent idle / working / blocked / testing / reviewing
- Tool start / finish
- Task 状态展示
- Todo 状态展示
- Approval 等待展示
- Git branch / worktree 展示
- 测试通过/失败展示
- Agent 从工位走到 QA Lab
- Agent 进入 Review Room
- Agent 进入 Server Room
- Dashboard 数字更新
- 服务器机柜 LED 状态变化
- 白板显示当前任务
- Office Builder
- Camera / day-night / lighting / UI animation

只有这些行为允许调用模型：

- 编码
- 分析
- 调研
- Review
- 重新规划
- 解释失败原因
- AI 总结
- 智能 Standup
- 用户自然语言交互需要推理时

---

# 2. CQ OS 处置方案

## 2.1 CQ OS 正式停止开发

原仓库：

```text
https://github.com/xingyuan-168/CQ-OS.git
```

处理方式：

1. 保留 Git 历史；
2. 标记 Archived / Deprecated；
3. README 顶部注明：
   - CQ OS 已被 AI Engineering OS + DSH 架构替代；
   - 不再维护；
4. 不再把任何 CQ OS 代码当 Source of Truth；
5. 只允许迁移其中已经验证过、且 AI OS 缺失的 DSH 接入经验；
6. 迁移完成后禁止新功能继续提交到 CQ OS。

---

## 2.2 CQ OS 以下概念全部废弃

- 第五模式作为产品主体
- CQ Core Agent
- 9 个固定角色 Agent
- 9 个 Role Runtime
- CQ Parallel Scheduler
- CQ Task DAG Runtime
- CQ Agent Registry
- CQ Runtime State Store
- CQ Approval Runtime
- CQ Project Registry
- CQ Plugin Runtime
- CQ Marketplace
- CQ Model Runtime
- cq-os-maint
- CQ 自己的 Agent Dashboard
- CQ 自己的 Session 管理
- CQ 自己的 Task DB
- CQ 自己的 Runtime Gateway

---

# 3. DeepSeek Harness 原生能力边界

开发前必须先阅读 DSH 当前官方文档，禁止凭旧版本印象实现。

重点能力：

## 3.1 Agent / Subagent

DSH 自己拥有：

- Agent 生命周期
- Session identity
- Subagent provider
- Subagent spawn
- Follow-up
- Interrupt
- 独立 Session
- 后台 continuable subagent

AI OS 不创建 Agent Runtime。

---

## 3.2 Workflow / Parallel

DSH Workflow 原生承担：

```text
agent()
parallel()
pipeline()
phase()
```

因此禁止新增：

```text
AIOS Parallel Engine
AIOS Worker Pool
AIOS Thread Manager
AIOS DAG Executor
```

AI OS 最多定义：

> 哪些工程条件下允许并行、何时应使用 Worktree、何时必须串行。

真正并行执行由 DSH 完成。

---

## 3.3 Agent Teams

DSH 当前已有实验性 Agent Teams，包括：

- Team roster
- teammate identity
- mailbox
- team task
- owner
- blockedBy
- shared task DAG
- followup / interrupt / wait

要求：

1. 第一版不要把 AI OS 硬绑定实验 API；
2. UI Adapter 做能力检测；
3. Agent Teams 可用时读取它；
4. 不可用时读取稳定 Subagent / Workflow；
5. 绝对禁止 AI OS 自己做 Team Runtime。

---

## 3.4 Todo / Goal / Team Task

实时任务状态归 DSH。

因此：

```text
DSH Todo / Goal / Team Task
= 当前真实工作状态

AI OS Memory
= 跨会话工程事实
```

禁止把 AI OS 的 Memory 或 Markdown 变成实时任务数据库。

---

## 3.5 Approval / User Questions

DSH 原生：

- `ctx.approval`
- `ctx.userQuestions`
- `tools/pre-execute -> ask`

职责：

```text
AI OS：
判断 ALLOW / DENY / ASK

DSH：
等待用户、处理 approval 生命周期、恢复执行

Claw3D：
显示 Approve / Reject UI
```

不得建立第二个 Approval Queue。

---

## 3.6 Plan Mode

规划协作优先使用 DSH Plan Mode。

AI OS 不建立规划状态机。

AI OS 只额外规定：

- 新项目必须完成 OSS research；
- 前端重大变化必须有 prototype/UI spec；
- 特定高风险节点必须 ASK；
- Finish 时必须满足工程事实。

---

## 3.7 Tool Runtime

治理接入 DSH 正式工具流水线：

```text
tool/call
↓
tools/pre-execute
↓
monotonic guards
↓
tools/execute
↓
tools/post-execute
↓
tools/result
↓
tool/result
```

AI OS DSH Plugin 主要使用：

- `tools/pre-execute`
- `tools/result`
- 必要时 `fs/write-intent`
- 必要时 `fs/edit-intent`

不要修改 DSH Agent loop。

---

## 3.8 Sandbox

文件系统、Shell confinement 使用 DSH：

- `ctx.sandbox`
- workspace-write
- read-only
- danger-full-access

AI OS 不实现第二个 sandbox。

AI OS 只做更高层工程语义：

```text
input/** 只读
AI OS policy 不允许普通任务修改
主工作区禁止破坏用户资产
Worktree 内允许局部破坏性 Git 操作
生产发布需要 ASK
```

---

## 3.9 Workspace

项目列表和 canonical workspace 归：

```text
ctx.workspaceRegistry
```

禁止建立 AIOS Project Registry。

AI OS 只判断：

```text
当前 DSH workspace 是否已初始化 AI OS
```

---

## 3.10 Session / Persistence

DSH Session event log 是 Runtime 真源。

Claw3D 的历史、工具运行、agent status 优先从 DSH projection/session event 获取。

AI OS Memory 绝不复制：

- 聊天
- tool logs
- reasoning
- full terminal output
- session history

---

# 4. AI Engineering OS：现有版本审计结论

当前输入版本：

```text
AI-OS(4).zip
```

现有代码已经具备正确的轻量治理方向：

- Code Start Gate
- Frontend Approval Gate
- Finish Gate
- OSS Research
- Git 卫生
- Worktree
- Memory
- Document Impact
- User Asset Protection
- Secret Scan
- deterministic CLI/MCP core

这部分是最终系统的治理基础。

但当前版本存在明显 Codex 专用耦合，必须改为 **DSH-only**。

---

# 5. AI OS 需要保留的模块

以下模块原则上保留核心行为：

```text
src/.../core/gates.py
src/.../core/checks.py
src/.../core/worktree.py
src/.../application/authorization.py
src/.../application/governance_policy.py
src/.../application/project.py
src/.../application/repository.py
src/.../infrastructure/memory.py
src/.../infrastructure/documents.py
src/.../adapters/git.py
docs/OPEN_SOURCE_RESEARCH.md
docs/WORKTREE.md
docs/MEMORY.md
docs/FRONTEND_GATE.md
docs/GOVERNANCE_RULES.md
docs/ADR/
plugins/.../skills/*
```

但是名称、宿主接口、运行时状态必须清理。

---

# 6. AI OS 必须删除的 Codex 专用部分

当前这些路径不应进入最终 DSH-only 版本：

```text
.codex/
plugins/ai-engineering-os/.codex-plugin/
plugins/ai-engineering-os/hooks/hooks.json
plugins/ai-engineering-os/hooks/session_start.py
plugins/ai-engineering-os/hooks/pre_tool_use.py
plugins/ai-engineering-os/scripts/launch_mcp.cmd
```

Codex 的：

```text
SessionStart
PreToolUse
Bash
Write
Edit
apply_patch
hookSpecificOutput
```

全部不再作为宿主协议。

相应测试：

```text
tests/integration/test_plugin_hooks.py
```

必须重写为 DSH plugin integration tests，而不是删除后没有覆盖。

---

# 7. AI OS 名称与目录清理

因为最终只支持 DSH，不需要继续带 Codex 品牌。

建议一次性迁移：

```text
Python package:
codex_ai_os
→ ai_engineering_os

CLI:
codex-os
→ aios

runtime directory:
.codex-os/
→ .aios/

branch prefix:
codex/wt-*
→ aios/wt-*
```

`pyproject.toml`：

```text
name = "ai-engineering-os"

description =
"DeepSeek Harness engineering governance layer:
stateless gates, worktree isolation, engineering memory"
```

命令：

```text
aios init
aios check
aios finish
aios worktree ...
aios memory ...
aios doctor
```

---

# 8. AI OS SQLite 必须瘦身

当前数据库包含：

```text
tasks
approvals
worktrees
memory_index
```

重构后：

## 删除 `tasks`

原因：

> DSH Todo / Goal / Team Task 已经负责实时任务状态。

Worktree 不应该需要一套 AIOS task runtime。

Worktree 表改成：

```text
worktree_id
name
path
branch
target_branch
dsh_session_id nullable
dsh_agent_id nullable
disposable
status
created_at
updated_at
```

关联 DSH ID 只用于追踪，不成为任务真源。

---

## 删除 `approvals`

原因：

> DSH `ctx.approval` 才是 Runtime approval 真源。

Frontend UI 的“已获得用户正式批准”属于**工程事实**，继续记录到：

```text
docs/design/UI_SPEC.md
```

不需要 AIOS approvals runtime table。

---

## 保留

```text
worktrees
memory_index
```

最终本地数据库只允许保存：

1. Worktree 生命周期登记；
2. Memory 可重建索引。

SQLite 不是 Agent/Task/Approval Runtime。

---

# 9. AI OS Frontend Approval 重构

当前 `approval_record` 同时承担 runtime approval 与 UI_SPEC 事实记录。

需要拆开。

## Runtime Approval

完全使用 DSH：

```text
tools/pre-execute
→ ask
→ ctx.approval
→ Claw3D Approval UI
```

## 持久 UI 审批事实

AI OS 只提供：

```text
aios_record_frontend_approval
```

写入：

```text
docs/design/UI_SPEC.md
```

记录：

```yaml
approval:
  scope: admin-dashboard-v1
  decision: approved
  approved_by: user
  approved_on: 2026-09-12
```

Frontend Gate 只验证这个工程事实。

---

# 10. AI OS MCP 处理建议

最终 DSH-only 版本**不要求 MCP 作为主接入层**。

DSH 已经有原生 Plugin / Tool Runtime。

推荐：

## 保留 Python deterministic core

负责：

- Gate evaluator
- Worktree manager
- Memory
- Repository checks
- Project init
- Docs generation

## 新增 DSH TypeScript Plugin

负责：

- 接入 `tools/pre-execute`
- 接入 `tools/result`
- 接入 DSH UI/approval seam
- 注册少量 AI OS 原生工具
- 映射 DSH workspace → AI OS project root

第一版 MCP server 可标记 deprecated。

完成所有 DSH native tools 后删除：

```text
src/.../cli/mcp_server.py
mcp dependency
.mcp.json
```

除非 DSH 实现过程中发现某项确实只能通过 MCP 复用，否则禁止因为“已经有 MCP”而保留重复接口。

---

# 11. AI OS 的 DSH Governance Plugin 设计

> 本章只描述 AI OS 四部分中的 **DSH Governance Plugin**，不得将本 Plugin 等同于完整 AI OS。

建议包名：

```text
@aios/dsh-governance
```

目录：

```text
packages/dsh-aios-governance/
├── package.json
├── src/
│   ├── index.ts
│   ├── policy/
│   ├── gates/
│   ├── tools/
│   ├── projections/
│   └── bridge/
└── tests/
```

---

# 12. DSH Plugin 必须实现的能力

## 12.1 Governance Prompt Section

给当前 Lead Agent 注入极短治理入口：

```text
AI Engineering OS is active.

Do not replace DSH native agent, workflow, task, approval,
sandbox, workspace, session, or model capabilities.

Before formal implementation:
- satisfy Code Start Gate
- perform OSS research when applicable
- use worktree isolation for concurrent writes

Before major frontend implementation:
- prototype + UI spec + user approval

Before declaring completion:
- satisfy Finish Gate
```

不要把几十页规则全部塞 system prompt。

完整规则通过 Skill 按需加载。

---

## 12.2 tools/pre-execute

负责硬限制。

决策结构：

```text
ALLOW
DENY(reason)
ASK(reason)
```

需要覆盖：

### 永久 DENY

- force push
- 删除 remote ref
- `git update-ref -d`
- 修改 `input/**`
- 修改 `.git/**`
- 普通任务修改 AI OS governance source
- broad root/home recursive delete
- destructive persistent Docker volume operation
- Secret 明文写入受保护位置

### Context-aware

在主工作区：

- `git reset --hard` → DENY/ASK
- `git clean -f` → DENY/ASK
- `git branch -D` → DENY/ASK
- 递归强删 → DENY/ASK

在已登记 disposable worktree：

- 针对该 worktree 自身局部操作允许
- 不得越界到主 workspace

---

## 12.3 DSH Native Tools

建议只注册以下最小集合：

```text
aios_project_init
aios_governance_check
aios_finish_check
aios_worktree_prepare
aios_worktree_check
aios_worktree_finish
aios_worktree_cleanup
aios_memory_search
aios_memory_record
aios_memory_candidate
aios_context_refresh
aios_frontend_approval_record
```

禁止增加 Agent / Task / Scheduler 工具。

---

# 13. AI OS Skill 迁移

现有 8 个治理 Skill 保留并改为 DSH Skill 格式。

当前：

```text
governance-entry
open-source-research
frontend-design-review
html-prototype
worktree-protocol
memory-protocol
document-impact
finish-checklist
```

必须修改 Codex 专用措辞。

例如：

```text
"Codex 原生子 Agent"
→
"DeepSeek Harness 原生 Agent/Subagent/Workflow/Agent Teams"
```

```text
"Codex stays in charge"
→
"DeepSeek Harness remains the execution authority"
```

open-source-research 中：

```text
"不要引入 LangGraph/CrewAI，因为 Codex 已有 Agent"
```

改为：

```text
"不要引入第二 Agent Runtime；DeepSeek Harness 已经提供
Agent/Subagent/Workflow/Agent Teams 能力。"
```

---

# 14. AGENTS.md 重写

现有十条宪法大部分保留。

首条改为：

> **不改变 DeepSeek Harness 原生工程方式。AI OS 只治理“能否做、何时做、做完留什么”；Agent、Subagent、Workflow、Team、Task、Session、Tool、Approval、Sandbox、Workspace、Model 都归 DSH。**

并新增最高优先级规则：

> **任何 AI OS 新功能开发前必须先检查 DSH 是否已经提供该执行能力；DSH 已有能力禁止重复实现。**

---

# 15. Claw3D 定位

项目：

```text
https://github.com/iamlukethedev/Claw3D
License: MIT
```

Claw3D 作为最终 UI 主体。

它已经拥有：

- `/office`
- `/office/builder`
- Agent Fleet UI
- Chat
- Approval surfaces
- runtime event-driven office
- navigation
- room system
- animations
- standup / QA / review / monitoring surfaces
- same-origin proxy
- React / Next.js / Three.js / R3F / Drei / Phaser

必须保留它的 UI 架构思想：

> Runtime 是 Source of Truth；UI 只存偏好和 derived state。

---

# 16. Claw3D 必须删除或禁用的部分

最终产品只支持 DSH，因此删除或隐藏：

- OpenClaw 默认 Runtime
- OpenClaw config editor
- OpenClaw agent file editing
- OpenClaw SSH management
- Hermes Adapter
- Hermes runtime selector
- OpenClaw device pairing flow
- OpenClaw marketplace workflow
- 创建“Claw3D 自有 Agent”的入口
- 修改 Agent brain/config 的 Claw3D 专用入口
- 与 DSH 重复的 Runtime state
- 与 DSH 重复的 Agent registry
- 与 DSH 重复的 Task/Approval source
- 任何以 OpenClaw 为核心的文案与品牌

Demo mode 可保留，用于前端开发。

---

# 17. Claw3D 推荐保留的关键源码区域

根据当前 Claw3D 代码结构，优先保留和二开：

```text
src/app/office/page.tsx
src/features/office/screens/OfficeScreen.tsx

src/features/retro-office/RetroOffice3D.tsx
src/features/retro-office/core/navigation.ts
src/features/retro-office/core/furnitureDefaults.ts

src/lib/office/eventTriggers.ts
src/lib/office/deskDirectives.ts

src/features/office/components/OfficeBuilderPanel.tsx
src/features/office/components/OfficePhaserCanvas.tsx
src/features/office/phaser/OfficeBuilderScene.ts
src/features/office/phaser/OfficeViewerScene.ts
src/lib/office/schema.ts
```

当前 OpenClaw-oriented runtime event 模块：

```text
src/features/agents/state/gatewayRuntimeEventHandler.ts
src/features/agents/state/runtimeEventCoordinatorWorkflow.ts
...
```

不直接删除设计思想，而是：

> 保留“event → derived UI state → office animation”模式，替换 transport 和 event schema 为 DSH。

---

# 18. Claw3D → DSH Adapter

建议名称：

```text
@cq-office/dsh-ui-adapter
```

注意：

> 这不是第二个 Backend，也不是 CQ Runtime。

它只负责：

```text
DSH state/event
→ CQ Office View Model
```

以及：

```text
CQ Office 用户操作
→ DSH native API
```

---

# 19. DSH → Office View Model

前端统一使用：

```ts
interface OfficeAgentView {
  agentId: string
  sessionId?: string
  displayName: string

  phase:
    | "idle"
    | "thinking"
    | "working"
    | "researching"
    | "coding"
    | "testing"
    | "reviewing"
    | "deploying"
    | "waiting_user"
    | "blocked"
    | "done"
    | "failed"

  workspaceId?: string
  cwd?: string

  currentTask?: string
  currentTool?: string

  worktree?: {
    path: string
    branch: string
  }

  approval?: {
    pending: boolean
    summary?: string
  }

  lastEventAt: string
}
```

这是 UI projection，不是持久 Runtime DB。

---

# 20. DSH 事件到办公室动作的确定性映射

禁止 LLM 判断“人物应该去哪”。

使用规则。

| DSH 状态/行为 | 3D 表现 |
|---|---|
| idle | 工位休息 / 轻度随机活动 |
| model thinking / assistant stream | 工位思考动画 |
| fs edit/write/apply | Development Floor 打字 |
| code runtime | Development Floor |
| search/grep/read docs | Research Area |
| Plan Mode | Architecture Room；如涉及正式架构证据则打开 Archify Viewer |
| tests started | QA Lab |
| test failure | QA Lab 红色提示 |
| code review / git diff | Review Room |
| git merge / branch | Integration Area |
| docker/build/deploy | DevOps / Server Room |
| approval pending | Approval/Meeting Room + 黄色标记 |
| ask user | Meeting Room |
| blocked | 原位置 + 红色状态 |
| agent/subagent end | 返回 idle / 结果区 |
| failure | 红色提示 + incident panel |

未知工具：

```text
generic_working
```

不得为未知工具调用 LLM 分类。

---

# 21. Agent 不再固定为九个“员工”

完全废弃：

```text
Product Agent
Research Agent
UX Agent
UI Agent
Architect Agent
Developer Agent
Tester Agent
DevOps Agent
Review Agent
```

Claw3D 展示**真实 DSH Agent 实例**。

例如：

```text
Agent #A12
当前任务：登录模块
当前活动：coding

Agent #A13
当前任务：调研开源权限框架
当前活动：researching

Agent #A14
当前任务：回归测试
当前活动：testing
```

办公室区域按当前活动动态映射。

---

# 22. 现代科技办公室视觉目标

最终美术风格：

> **Stylized Modern Tech Company**
>
> 不是写实 3A 游戏，也不是复古像素办公室。

视觉关键词：

- 深灰 / 黑色结构
- 玻璃隔断
- 蓝青色状态光
- 少量紫色 accent
- 金属 / 木质办公桌
- 双屏 / 三屏
- 大型实时状态屏
- 现代服务器机柜
- 半透明 HUD
- PBR 地面
- 可控 Bloom
- 暗色科技风
- 不过度赛博朋克
- 保持企业级软件观感

---

# 23. 开源项目提取矩阵

---

## 23.1 Claw3D —— 主体骨架

URL:

```text
https://github.com/iamlukethedev/Claw3D
```

License：

```text
MIT
```

### 提取/保留

- 整体 Next.js 产品结构
- `/office`
- `/office/builder`
- React Three Fiber 场景架构
- Agent avatar rendering
- navigation/pathfinding
- desk assignment
- room activity
- event-triggered animation
- Fleet/Chat/Approval UI 结构
- Monitoring/Review/QA 的现有 UI 思路
- Studio same-origin proxy
- local UI preferences
- security hardening 思路
- multi-floor 如稳定可保留

### 删除

- OpenClaw runtime dependency
- Hermes runtime dependency
- runtime selector
- SSH-oriented OpenClaw operations
- OpenClaw config source
- OpenClaw Agent brain editor
- marketplace-specific backend

### 原则

> Claw3D 提供身体，不提供大脑。

---

## 23.2 Gaurav2693/ai-office —— 现代办公室视觉主参考

URL:

```text
https://github.com/Gaurav2693/ai-office
```

License：

```text
MIT
```

当前结构重点：

```text
src/components/HUD.jsx
src/components/Ticker.jsx
src/scene/OfficeScene.js
```

### 重点提取

#### 玻璃会议室

- glass partition
- conference table
- chairs
- whiteboard
- meeting status lighting

#### 多显示器工位

- dual monitor design
- canvas texture screen
- screen glow
- keyboard / mouse / mug props
- pendant desk lighting

#### 现代办公细节

- reception
- sofa
- coffee area
- bookshelves
- plants
- printer
- water cooler
- HVAC details

#### 动态显示器

可改造显示：

```text
code
test status
deploy progress
task board
review diff
runtime logs
```

#### LIGHTS OFF / Cyber Mode

提取：

- 日夜灯光切换
- screen face-light
- underglow
- 暗色科技模式

### 不提取

- 固定 9 个 Agent
- RONIN 品牌
- 模拟对话
- 固定行为 Agent 状态机
- 定时虚假 standup
- demo deployment status 数据

所有行为必须由 DSH 状态驱动。

---


# 23A. Archify —— 架构证据与工程可视化能力

URL：

```text
https://github.com/tt-a1i/archify
```

License：

```text
MIT
```

存在形态：

```text
DSH Skill-only capability
```

优先接入：

```text
@tt-a1i/archify-dsh
```

## 直接复用

- Typed JSON IR
- JSON Schema validation
- Architecture renderer
- Workflow renderer
- Sequence renderer
- Data Flow renderer
- Lifecycle renderer
- Viewer Runtime
- Route / relationship exploration
- Architecture Delta
- deterministic delivery
- artifact validation
- repository evidence
- standalone HTML
- SVG / image / presentation export 能力

## 不自研替代

CQ Office 不再自研：

- Architecture SVG layout engine
- architecture zoom/search/navigation
- route explorer
- architecture relationship inspector
- generic diagram renderer
- architecture delta renderer
- architecture presentation viewer

## 不提取成 AI OS Core

AI OS 不复制 Archify renderer。

AI OS 只增加：

```text
Architecture Evidence policy
Architecture Impact rule
Finish Gate integration
Review integration
```

## 上游策略

第一阶段：

```text
不 Fork
pin exact package version
```

如果 Archify 更新：

```text
Upstream Radar
→ Compatibility
→ Artifact regression
→ Human Gate
→ VERIFIED
```

---


# 24. VirtOffice —— 办公空间细节与人物动画参考

URL:

```text
https://github.com/OneByJorah/VirtOffice
```

License：

```text
MIT
```

### 重点提取

- Server Room 的空间布局
- glass server room
- blinking LED
- whiteboard
- meeting area
- workstation details
- phone booth
- lounge
- kitchen
- plants
- typing animation
- walking cycle
- idle breathing
- meeting gesture
- click-to-inspect 交互思路
- chat bubble 视觉

### 不提取

- Python server
- Hermes bridge
- agents.json
- SSE backend
- polling runtime
- webhook runtime

原因：

> DSH 已经是 Runtime，不能引入第二个状态服务器。

可以提取 UI/动画实现，不能提取 backend 架构。

---

# 25. cyberpunk-room —— 光照 / PBR / 后处理技术参考

URL:

```text
https://github.com/klmtseng/cyberpunk-room
```

License：

```text
Code: MIT
第三方资产：各自独立许可，必须逐项检查 THIRD_PARTY_ASSETS.md
```

### 重点提取

- Three.js postprocessing pipeline
- PBR material methodology
- emissive screen
- neon / LED lighting
- automatic quality presets
- low quality mode
- WebGL performance策略
- interactive screen / projector 思路
- HDR / ambient lighting
- Bloom 使用方式

### 不直接批量复制资产

任何：

- model
- texture
- artwork
- video
- image

必须先检查原始 license。

建议优先使用：

```text
Poly Haven CC0
```

或自行程序化生成办公室家具。

---

# 26. thingraph/server-room —— 服务器机房功能参考

URL:

```text
https://github.com/thingraph/server-room
```

当前公开仓库没有明确可确认 LICENSE。

因此：

> **禁止直接复制源码或资产。**

仅允许作为设计/交互参考。

### 借鉴内容

- rack layout
- rack door animation
- server slot visualization
- status LED
- live monitoring surface
- alert visualization
- immersive rack inspection
- drag/drop builder 思路

最终 Server Room 代码需：

1. 自研；
2. 或寻找明确 MIT/Apache/CC0 的同类资产；
3. 或使用 procedural geometry 构建。

---

# 27. Tremor —— 实时 Dashboard UI

推荐替代此前 license 不明确的小型 dashboard 示例。

URL：

```text
https://github.com/tremorlabs/tremor
```

License：

```text
Apache-2.0
```

### 提取

- Card
- AreaChart
- ProgressBar
- KPI cards
- table
- badge
- dark dashboard layout

用途：

```text
项目总进度
Active Agents
Running Tasks
Tests
Build
Approval Queue
Token Usage
Cost
Tool Calls
Error Rate
Deployment
```

注意：

Tremor 是 2D Dashboard 元素，不负责 3D Scene。

---

# 28. cyberpunk-dashboard —— 只做视觉参考

URL:

```text
https://github.com/marvinisawall/cyberpunk-dashboard
```

当前无法确认明确 LICENSE。

因此：

> 不复制代码，不复制资产。

只参考：

- ticker
- bento layout
- glass-card aesthetic
- neon HUD
- animated status panel

实际实现优先用：

```text
Tremor + 自己的 Tailwind/CSS
```

---

# 29. 第三方资产治理

新增：

```text
THIRD_PARTY_ASSETS.md
THIRD_PARTY_CODE.md
```

每次提取必须记录：

```yaml
name:
source_url:
source_repo:
source_commit:
license:
files_imported:
modifications:
attribution_required:
reviewed_by:
reviewed_on:
```

硬规则：

> 没有明确 license 的仓库，不复制代码或资产。

---

# 30. 现代办公室区域规划

最终建议默认 Office：

```text
┌─────────────────────────────────────────────────────────┐
│ Core / Project Command Center                           │
│ 大屏：项目、Agent、任务、测试、风险、Approval            │
├───────────────────┬─────────────────────────────────────┤
│ Research Zone     │ Architecture / Whiteboard Room      │
│ 搜索/读文档       │ Plan / ADR / Architecture           │
├───────────────────┼─────────────────────────────────────┤
│ Development Floor                                       │
│ 多显示器工位，可动态生成任意数量 Agent 工位             │
├───────────────────┬─────────────────────────────────────┤
│ QA Lab            │ Review Room                         │
│ Test Runner       │ Git Diff / PR / Findings            │
├───────────────────┼─────────────────────────────────────┤
│ DevOps Room       │ Server Room                         │
│ Build/Deploy      │ Rack / Health / Logs                │
├───────────────────┴─────────────────────────────────────┤
│ Glass Meeting / Approval Room                          │
│ Human Gate / Plan Review / User Questions              │
└─────────────────────────────────────────────────────────┘
```

房间不代表固定角色。

房间代表：

> **当前工程活动类型。**

---

# 31. Core Room 大屏

显示 DSH 真实数据：

```text
Workspace
Current Sessions
Active Agents
Running Tools
Todo
Goal
Team Tasks
Approval Pending
Tests
Git Branches
AI OS Gate State
Worktrees
Recent Errors
```

V4 新增 Architecture Evidence 摘要：

```text
Architecture Evidence
├ status
├ current architecture revision
├ last validated
├ affected diagrams
└ architecture delta available
```

这些信息来自：

```text
Git + AI OS governance facts + Archify artifact index
```

不得每隔 N 秒问模型“总结状态”。

状态通过 projection 或确定性文件读取更新。

---

# 32. Archify Architecture Room

V4 删除“自己开发复杂 Architecture Whiteboard”的方向。

Architecture Room 正式改为：

> **Archify Architecture Room**

默认提供以下 Tab：

```text
Architecture
Sequence
Data Flow
Workflow
Lifecycle
ADR
Plan
```

其中前五项来自 Archify。

## 第一版实现

优先使用：

```text
sandboxed iframe
```

嵌入 Archify self-contained HTML。

不要重新开发：

- pan/zoom
- node finder
- route probe
- semantic relationship inspection
- architecture export
- architecture presentation
- architecture layout

这些由 Archify Viewer 提供。

## 同时显示

- DSH Plan Mode
- 当前计划
- `docs/ARCHITECTURE.md`
- `docs/ADR/`
- 当前 blocker
- Architecture Evidence status

职责：

```text
ARCHITECTURE.md
= 为什么这样设计 / 设计原则

ADR
= 为什么做某项关键决策

Archify IR
= 系统实际上如何连接

DSH Plan
= 当前准备怎么实施
```

第一版不做 WYSIWYG 架构编辑器。

Archify 官方本身也不是 WYSIWYG 工具。

---

# 32A. DSH 右侧 Sidebar 设计

右侧详细工程面板建议采用：

```text
Trajectory
Architecture
Architecture Delta
Files
Agent
Task
Approval
```

## Trajectory

必须使用：

```text
DSH native trajectory
```

展示：

```text
Turn
Assistant
Tool
Subtool
Step
Token
Duration
Input/Output
```

## Architecture

展示当前：

```text
Archify artifact
```

## Architecture Delta

仅在存在可比较 baseline/head 时启用。

## 原则

```text
Trajectory = 执行事实
Architecture = 系统结构事实
Delta = 系统结构变化
```

禁止三个 Tab 共享一个自研“Trace/Architecture engine”。

---

# 33. Development Floor

工位数量动态。

不要固定 3 个 Developer。

原则：

```text
当前多少个正在执行代码类工作的 DSH Agent
→ 出现多少个活跃工位
```

例如：

```text
Agent A12 → Desk 1
Agent A13 → Desk 2
Agent A19 → Desk 3
Agent B02 → Desk 4
```

Agent 完成后工位进入 idle/available。

---

# 34. QA Lab

触发条件：

- test tool
- shell command 命中 test runner
- CI test projection
- test result event

显示：

- current suite
- pass/fail
- duration
- failing cases
- coverage（如果有事实数据）

禁止虚构 coverage。

---

# 35. Review Room

数据：

- git diff
- changed files
- review findings
- PR metadata（如果项目有 GitHub connector）
- review-related agent activity

V4 增加：

```text
Architecture Delta
```

当本次变更被 AI OS 判断为：

```text
architecture_evidence.required = true
```

Review Room 必须同时提供：

```text
Code Diff
+
Architecture Delta
+
相关 ADR
```

Archify Delta 用于回答：

> **系统结构发生了什么变化？**

Git Diff 用于回答：

> **代码发生了什么变化？**

二者不能互相替代。

Review 本身仍由 DSH Agent 完成。

Archify不判断：

- merge safety
- change risk
- 是否批准

它只提供结构事实。

Claw3D 只展示。

---

# 36. DevOps / Server Room

显示真实：

- build
- deploy
- service health
- process/log status
- Docker status（如果真实可取）
- deployment approvals

机柜灯颜色：

```text
green = healthy
yellow = warning / waiting
red = failed
blue = active build/deploy
gray = unknown/offline
```

不得用随机动画伪装成真实状态。

装饰性 LED 可以随机，但必须与“业务状态 LED”视觉区分。

---

# 37. Chat 设计

用户点击一个 Agent：

显示：

```text
Agent ID
Session ID
Current Task
Current Tool
Workspace
Worktree / Branch
Status
Recent Activity
```

输入消息后：

```text
Claw3D UI
↓
DSH agent.followup() / steer()
↓
对应真实 Agent/Session
```

Claw3D 不直接请求 LLM provider。

---

# 38. Approval UI

流程：

```text
AI OS
tools/pre-execute
→ ASK

DSH ctx.approval
→ pending

CQ Office
→ Approval card / room indicator

User Approve
→ DSH Approval outcome

DSH
→ continue
```

禁止：

```text
Claw3D → AIOS approval DB → 自己恢复 Agent
```

---

# 39. Project / Workspace 切换

使用 DSH：

```text
ctx.workspaceRegistry
```

Claw3D 显示 workspace。

AI OS 只标记：

```text
AIOS initialized
AIOS not initialized
Code Start ready
Frontend Gate pending
Finish status
```

---

# 40. Worktree 与 DSH 并行 Agent

这是 AI OS 最有价值的补缺之一。

DSH 负责：

```text
Agent A
Agent B
Agent C
并行执行
```

AI OS 负责：

```text
Agent A → .worktrees/backend
Agent B → .worktrees/frontend
Agent C → .worktrees/db
```

Worktree 创建：

```text
aios_worktree_prepare
```

返回：

```text
path
branch
targetBranch
```

DSH 启动子 Agent 时把 cwd 指到对应 Worktree。

完成：

```text
commit
aios_worktree_finish
review
merge
aios_worktree_cleanup
```

---

# 41. Worktree 使用策略

不是所有任务都自动 Worktree。

使用条件：

- 两个及以上 Agent 同时写代码；
- 长时间实验；
- 高风险重构；
- 用户明确需要隔离。

不使用：

- 只读 research
- 小型顺序修改
- 单 Agent 单文件修复
- 纯文档分析

---

# 42. AI OS Memory

继续采用：

```text
docs/memory/memory.jsonl
```

唯一事实源。

允许类型：

```text
decision
bug
lesson
pattern
project-summary
```

禁止：

- raw chat
- reasoning
- shell logs
- test full output
- DSH session mirror
- token log mirror

DSH 子 Agent：

```text
只提交 memory candidate
```

主/Lead session 在 Finish 阶段统一合并。

---

# 43. 3D UI Token 成本规范

必须增加测试证明：

## Idle 10 分钟

条件：

- 不主动发消息
- Agent 无模型工作

要求：

```text
LLM requests added by CQ Office = 0
LLM tokens added by CQ Office = 0
```

## Runtime Event Playback

回放：

- tool/call
- tool/result
- approval
- todo
- agent state

要求：

```text
全部只触发 UI projection
不触发 model invocation
```

---

# 44. 性能目标

桌面默认：

```text
目标 60 FPS
可接受 ≥45 FPS
```

提供：

```text
Quality: Auto / High / Medium / Low
```

Low：

- 关闭或降低 Bloom
- 减少阴影
- 降低 DPR
- 降低动态灯数量
- 减少透明材质开销
- 服务器 LED 降采样
- 简化 avatar animation

参考 cyberpunk-room 的自动 quality preset 思路。

---

# 45. UI 风格规范

默认色：

```text
background: charcoal / near-black
primary: cyan / teal
secondary: cool blue
warning: amber
error: red
success: green
accent: restrained purple
```

避免：

- 过度霓虹
- 满屏渐变
- 游戏厅式 RGB
- 花哨动画遮挡信息
- 巨量玻璃模糊导致性能问题

目标：

> 企业级 AI Command Center，而不是 Cyberpunk 游戏 Demo。

---

# 46. 推荐新仓库结构（V4：加入 Architecture Evidence）

以当前 AI OS 仓库作为治理内核，融合 Claw3D，并将 Archify 作为外部 pinned capability：

```text
AI-Engineering-OS/
│
├── apps/
│   └── cq-office/                    # Claw3D fork
│       ├── src/
│       ├── server/
│       └── package.json
│
├── packages/
│   ├── dsh-aios-governance/          # DSH governance plugin
│   └── dsh-office-adapter/           # DSH → Claw3D projection
│
├── src/
│   └── ai_engineering_os/            # Python deterministic core
│
├── skills/
│   ├── governance-entry/
│   ├── open-source-research/
│   ├── frontend-design-review/
│   ├── html-prototype/
│   ├── worktree-protocol/
│   ├── memory-protocol/
│   ├── document-impact/
│   └── finish-checklist/
│
├── docs/
│   ├── ADR/
│   ├── design/
│   ├── memory/
│   ├── architecture/
│   │   ├── manifest.yaml
│   │   ├── system.architecture.json
│   │   ├── auth.sequence.json
│   │   └── ...
│   └── upstream-reviews/
│
├── .aios/
│   └── artifacts/
│       └── archify/                   # generated, rebuildable
│           ├── index.json
│           ├── system.html
│           └── ...
│
├── compatibility/
│   ├── dsh-matrix.json
│   ├── claw3d-matrix.json
│   ├── archify-matrix.json
│   └── stack-matrix.json
│
├── upstream/
│   ├── DSH.md
│   ├── CLAW3D.md
│   └── ARCHIFY.md
│
├── governance/
│   └── policy.yaml
│
├── THIRD_PARTY_CODE.md
├── THIRD_PARTY_ASSETS.md
├── VERIFIED_STACK.md
├── AGENTS.md
├── pyproject.toml
└── package.json
```

注意：

```text
Archify 源码默认不 vendor 进本仓库
```

而是：

```text
pin package / release
```

生成 HTML 默认可重新生成，因此不应成为 Git 主事实源。

---

# 47. Governance Policy 单一事实源

为了避免 Python Core 与 TypeScript DSH Plugin 规则漂移：

新增：

```text
governance/policy.yaml
```

包含机器可读硬规则：

```yaml
protected_paths:
  - input/**
  - .git/**
  - .aios/state/**
  - "**/.env"
  - "**/credentials/**"

governance_paths:
  - AGENTS.md
  - governance/**
  - packages/dsh-aios-governance/**

git:
  deny_force_push: true
  deny_remote_ref_delete: true
  deny_update_ref_delete: true

main_workspace:
  deny_reset_hard: true
  deny_clean_force: true
  deny_branch_force_delete: true

worktree:
  allow_local_destructive_git: true
```

Python 和 TypeScript 均解析同一份。

禁止两边各写一套字符串规则。

---



# 47AA. Architecture Evidence Governance

V4 将 Architecture Evidence 纳入 AI OS，但不得演变为重型架构状态机。

## 47AA.1 何时 Required

以下变更默认进入 Architecture Impact Review：

- 新项目；
- 新服务；
- 服务拆分/合并；
- 新持久化存储；
- 数据库职责变化；
- 消息队列 / Event Bus；
- 网络边界变化；
- Trust Boundary 变化；
- 核心 API 调用链变化；
- 数据流 / PII 变化；
- 部署拓扑变化；
- 核心模块依赖方向变化；
- 大规模重构导致组件职责变化。

以下通常不 Required：

- 文案；
- 样式微调；
- 局部 Bug；
- 单元测试修复；
- 无边界变化的小型 refactor；
- 单文件内部实现替换。

## 47AA.2 状态

保持最小：

```text
NOT_APPLICABLE
REQUIRED_PENDING
VERIFIED
```

不要增加十几阶段 Architecture Workflow。

## 47AA.3 Required 后必须满足

至少：

```text
1. 对应 Archify IR 存在
2. Schema validation PASS
3. Repository evidence 合理
4. 生成 artifact PASS
5. Review 可以看到 Architecture Delta（若存在 base）
```

## 47AA.4 判断责任

第一阶段：

```text
DSH Lead Agent
+ AI OS Governance Skill
```

进行 Architecture Impact 判断。

Plugin 可以提供确定性“疑似触发器”：

- deployment/config 文件变化；
- DB schema/migration；
- package/service entrypoint；
- infra；
- API gateway；
- queue/topic；

但不得假装仅靠文件名就100%判断架构语义。

确定性触发器只允许：

```text
raise candidate
```

不能：

```text
自动编造 architecture facts
```

---

# 47AB. AI OS 现有 Skills 的 V4 修改清单

不要新建 9 套角色规范。

直接修改现有治理 Skill。

## governance-entry

新增：

```text
Architecture Impact Check
```

要求重大变更判断是否需要 Architecture Evidence。

## open-source-research

完成 OSS 选型后，如果方案进入架构设计阶段：

```text
Research
→ Architecture Decision
→ Archify Architecture Evidence
```

不是每次 Research 都必须画图。

## document-impact

新增检查：

```text
代码改动是否导致 architecture IR / ADR / ARCHITECTURE.md 过期
```

## finish-checklist

新增：

```text
Architecture Evidence required?
├ no  → continue
└ yes
   ├ IR updated?
   ├ validate pass?
   ├ artifact check pass?
   └ delta reviewed?
```

## frontend-design-review

不强绑定 Archify。

UI 结构不是系统架构时，不触发。

## memory-protocol

允许沉淀：

```text
architecture decision
architecture lesson
architecture bug
```

禁止把整份 Archify HTML 写入 Memory。

---

# 47AC. Archify Artifact Contract

Git 真源：

```text
docs/architecture/*.json
```

生成目录：

```text
.aios/artifacts/archify/
```

必须生成：

```text
index.json
```

建议结构：

```json
{
  "artifacts": [
    {
      "id": "system",
      "type": "architecture",
      "source": "docs/architecture/system.architecture.json",
      "artifact": ".aios/artifacts/archify/system.html",
      "sourceRevision": "<git-commit>",
      "validated": true
    }
  ]
}
```

CQ Office 只读这个 index 发现可展示 Artifact。

不要扫描整个 workspace 猜测 HTML。

---

# 47AD. Archify Architecture Delta Contract

Architecture Delta 不保存：

```text
before-v1.json
after-v2.json
```

流程：

```text
BASE Git revision
       ↓
临时导出 base IR
       ↓
HEAD IR
       ↓
Archify compare
       ↓
temporary/generated Delta HTML
       ↓
Review Room
```

完成后：

- baseline 由 Git 保留；
- Delta HTML 可重新生成；
- 不建立第二套版本历史。

---


# 47A. 上游更新、兼容性、去重与回滚——长期维护方案

本章为 V3 新增的长期维护核心方案，优先级仅次于“系统形态与职责边界”。

目标：

> **允许 DeepSeek Harness、Claw3D、AI Engineering OS 与 Archify 独立升级，同时避免任何官方更新破坏最终产品。**

最终维护原则：

```text
DSH
= 上游 Runtime

Claw3D
= 上游 UI 基础

AI OS
= 自有 Governance Layer

Archify
= pinned Architecture Evidence capability
```

四个组成部分必须通过明确版本、兼容矩阵和验证流程组合，而不是“永远追最新版”。

---

# 47B. DeepSeek Harness 的升级原则

## 47B.1 禁止 Fork DSH 作为长期主线

除非官方明确要求，不得：

- 修改 DSH 核心 Agent loop
- 修改 DSH Session 内核
- 修改 Tool Runtime 内核
- 修改 Approval 内核
- 修改 Workflow 内核
- 修改 Plugin Loader 内核
- 修改 Workspace Registry 内核
- 修改 Provider/Model Runtime 内核

AI OS 和 CQ Office 必须优先通过：

- Plugin
- Event seam
- Tool seam
- Approval seam
- Workspace seam
- UI projection seam
- officially supported extension point

接入。

目标：

```text
官方 DSH
+
@aios/dsh-governance
+
@cq-office/dsh-ui-adapter
```

而不是：

```text
自定义 DSH Fork
```

---

## 47B.2 DSH 不允许自动升级正式环境

发现新版本后只允许进入：

```text
UPDATE_AVAILABLE
```

禁止：

```text
latest → 自动替换 production DSH
```

原因：

- DSH 仍可能产生 breaking change；
- Plugin API / Event schema / Session semantics 可能变化；
- Agent Teams 等实验能力可能调整；
- UI projection 依赖 Runtime 行为一致性。

---

## 47B.3 DSH 升级标准流程

每次 DSH 更新必须执行：

```text
1. 获取最新 release/tag/commit
2. 阅读 changelog / release notes
3. 检查 extension API 变化
4. 检查 tool pipeline 变化
5. 检查 approval / user question 变化
6. 检查 workspace/session/event 变化
7. 检查 Agent Teams / Workflow 变化
8. 创建 disposable test environment
9. 安装候选 DSH
10. 安装当前 AI OS Plugin
11. 安装当前 CQ Office Adapter
12. 运行 Compatibility Suite
13. 运行上游能力去重审计
14. 更新 Compatibility Matrix
15. 人工批准
16. 才允许升级正式环境
```

任何一项未完成：

> 不得标记 VERIFIED。

---

# 47C. Claw3D 的升级原则

Claw3D 必须以标准 Git Fork 模式维护。

推荐 remote：

```text
origin
= 自己的 CQ Office 仓库

upstream
= https://github.com/iamlukethedev/Claw3D.git
```

禁止：

```text
复制一份 Claw3D 源码后与 upstream 断开
```

禁止：

```text
每次官方更新直接覆盖 CQ Office
```

正确方式：

```text
git fetch upstream
↓
分析 upstream diff
↓
选择 merge / rebase / cherry-pick
↓
解决冲突
↓
运行 UI + Adapter Compatibility Suite
↓
进入候选版本
```

---

# 47D. Claw3D 二开必须保持“可上游同步”

为降低未来升级成本，CQ Office 自定义代码必须尽量隔离。

推荐：

```text
apps/cq-office/
├── upstream/
│   └── claw3d-core-compatible-code
│
├── extensions/
│   ├── dsh/
│   ├── modern-office/
│   ├── qa-lab/
│   ├── review-room/
│   ├── server-room/
│   └── dashboard/
│
├── themes/
│   ├── claw3d-retro/
│   └── cq-modern-tech/
│
└── assets/
```

实际实现不强制照搬此目录，但必须满足：

> **DSH 逻辑、现代办公室视觉、QA/Review/Server 扩展不要大量散落修改 Claw3D 上游核心文件。**

特别避免：

```text
RetroOffice3D.tsx
```

或等价核心文件变成几千行 CQ 私有逻辑集合。

---

# 47E. 现代 UI 必须主题化 / 模块化

视觉自定义必须尽量做成：

```text
theme
room
furniture
dashboard component
lighting preset
asset pack
```

例如：

```text
themes/
├── retro-upstream
└── cq-modern-tech
```

房间：

```text
rooms/
├── research
├── architecture
├── development
├── qa
├── review
├── devops
└── server
```

目的：

> Claw3D 官方如果更新渲染引擎、导航、Builder、Avatar，不应该要求重做全部现代办公室资产。

---

# 47F. Verified Stack 机制

正式环境不得使用“最新版组合”概念。

必须维护：

```text
VERIFIED_STACK.md
```

或：

```text
compatibility/stack.json
```

示例：

```yaml
stack_version: 2026-09-12.1

dsh:
  version: x.y.z
  status: VERIFIED

aios:
  version: 1.0.0
  status: VERIFIED

cq_office:
  version: 1.0.0
  status: VERIFIED

dsh_governance_plugin:
  version: 1.0.0

dsh_ui_adapter:
  version: 1.0.0

verified_on: 2026-09-12
```

用户日常运行的是：

> **Verified Stack**

而不是：

> “各组件最新版本”。

---

# 47G. Compatibility Matrix

新增：

```text
compatibility/
├── dsh-matrix.json
├── claw3d-matrix.json
└── stack-matrix.json
```

DSH 示例：

```json
{
  "aiosVersion": "1.2.0",
  "cqOfficeVersion": "1.4.0",
  "dsh": {
    "0.x.1": "PASS",
    "0.x.2": "PASS",
    "0.x.3": "FAIL",
    "0.x.4": "PENDING"
  }
}
```

Claw3D 示例：

```json
{
  "cqOfficeVersion": "1.4.0",
  "upstream": {
    "commit-a": "BASE",
    "commit-b": "MERGED",
    "commit-c": "PENDING_REVIEW"
  }
}
```

---

# 47H. Compatibility Suite

必须创建自动化兼容测试。

## DSH Runtime

至少测试：

- Agent start/end
- Subagent
- Workflow
- Parallel
- Todo
- Goal
- Agent Teams（若启用）
- Session resume
- Workspace resolution
- Tool call/result
- Approval
- User Question
- Plan Mode
- Sandbox
- Plugin loading

## AI OS

至少测试：

- Code Start Gate
- Frontend Gate
- Finish Gate
- OSS-first
- protected path
- Git restrictions
- ASK
- Worktree
- Memory
- policy parsing

## CQ Office

至少测试：

- Agent appears
- Agent disappears
- status projection
- chat
- approval
- task/todo
- workspace switch
- multi-agent rendering
- event playback
- office builder
- modern theme
- dashboard
- QA/Review/Server Room

---

# 47I. 上游能力去重审计

每次 DSH 或 Claw3D 更新后都必须问：

> **官方是否已经实现了我们当前自研的某项能力？**

如果官方能力满足：

- 功能需求
- 稳定性
- 安全性
- 性能
- 可治理性

则默认策略：

> **删除自己的重复实现，迁移到官方能力。**

不是：

> “我们已经写了，所以继续维护。”

---

# 47J. DSH 官方能力替换 AI OS 自研能力的规则

例如当前 AI OS 提供：

```text
Worktree isolation
```

未来如果 DSH 正式提供：

```text
per-agent isolated worktree
per-agent cwd
automatic merge/cleanup
```

必须执行：

```text
1. 对比 DSH native vs AI OS
2. 运行 PoC
3. 确认治理能力可满足
4. AI OS 删除执行层
5. AI OS 只保留 Worktree Policy
```

最终关系始终保持：

```text
DSH = capability
AI OS = governance
```

---

# 47K. Claw3D 官方能力替换 CQ Office 自研能力的规则

如果 Claw3D 后续官方加入：

- modern office theme
- Server Room
- QA Lab
- whiteboard
- dashboard
- DSH-compatible adapter
- advanced room system
- better avatar
- better builder

则：

```text
官方实现
vs
CQ 自研实现
```

进行比较。

官方达到要求：

> 优先采用 upstream，删除对应自研轮子。

---

# 47L. Upstream Radar

推荐新增：

```text
upstream/
├── DSH.md
├── CLAW3D.md
├── AIOS.md
└── compatibility.json
```

自动化任务可定期检查：

```text
DeepSeek Harness release
Claw3D release / main
```

发现新版本只生成：

```text
UPSTREAM_UPDATE_AVAILABLE
```

并记录：

- version/tag
- commit
- release date
- changelog URL
- changed subsystem
- probable impact

不得自动升级。

---

# 47M. Upstream Impact Report

每次发现更新，由 DSH 执行一次影响分析：

```text
输入：
当前 Verified Stack
+
新 upstream version

输出：
1. Breaking Changes
2. AI OS Plugin 影响
3. CQ Office Adapter 影响
4. Claw3D fork 冲突
5. 已新增官方能力
6. 可删除的自研能力
7. 测试计划
8. 回滚风险
9. 推荐：
   - UPGRADE
   - WAIT
   - BLOCKED
```

保存到：

```text
docs/upstream-reviews/
YYYY-MM-DD-dsh-x.y.z.md
YYYY-MM-DD-claw3d-<commit>.md
```

---

# 47N. 升级必须 Human Gate

无论自动测试是否全绿：

```text
正式 Runtime 升级
Claw3D 大版本合并
AI OS Governance 核心变更
```

都必须 ASK。

只有用户批准：

```text
APPROVED_FOR_UPGRADE
```

才可进入正式环境。

---

# 47O. 回滚机制

任何升级必须在开始前记录：

```text
DSH exact version
AI OS exact tag
CQ Office exact tag
plugin versions
lockfile
config snapshot
migration version
```

升级前建立：

```text
PRE_UPGRADE_TAG
```

例如：

```text
verified/2026-09-12-01
```

失败时：

```text
1. 停止候选环境
2. 恢复 Verified Stack
3. 恢复 lockfile
4. 恢复 plugin versions
5. 重新运行 smoke
6. 标记新版本 FAIL
```

---

# 47P. 数据迁移回滚

如果 DSH/Claw3D/AI OS 更新包含数据 schema 变化：

必须：

1. 先备份；
2. migration 可重复；
3. migration 有版本；
4. 能 rollback 或 forward-fix；
5. 不直接在唯一生产数据上测试。

尤其保护：

- DSH session/persistence
- AIOS memory
- AIOS worktree registry
- Claw3D user layout/preferences

---

# 47Q. 版本策略

三个产品独立版本：

```text
DeepSeek Harness
= 官方版本

AI Engineering OS
= SemVer

CQ Office
= SemVer
```

Adapter 也独立版本：

```text
@aios/dsh-governance
@cq-office/dsh-ui-adapter
```

不要把所有组件绑成一个假版本。

---

# 47R. Upgrade Branch

所有 upstream 升级在专门分支完成：

```text
upgrade/dsh-x.y.z
upgrade/claw3d-<tag>
```

流程：

```text
upgrade branch
↓
compatibility tests
↓
impact report
↓
human approval
↓
merge main
↓
create verified tag
```

正式主分支禁止直接实验 upstream 更新。

---

# 47S. 上游冲突处理原则

优先级：

```text
1. 官方稳定实现
2. 官方 extension seam
3. Adapter
4. 自研补缺
5. Fork core patch（最后手段）
```

如果必须长期 patch upstream core：

必须新增 ADR：

```text
why official seam insufficient
which files patched
upstream issue link
exit strategy
```

没有退出策略的 core patch 不允许合并。

---

# 47T. Upstream Patch Budget

为避免 Fork 越来越无法更新：

建议设置：

```text
core upstream patch budget
```

例如原则：

> CQ Office 对 Claw3D 核心上游文件的直接永久修改数量必须保持最小。

每次 release 统计：

```text
upstream files modified
CQ extensions files
merge conflict count
```

如果长期上升：

> 必须安排重构，将私有逻辑移出 upstream core。

---

# 47U. 官方功能替代时的迁移标准

删除自研能力之前必须保证：

- 行为兼容；
- 数据迁移完成；
- UI 不退化；
- Governance 不退化；
- 回滚路径存在；
- 测试覆盖完整。

然后标记：

```text
REPLACED_BY_UPSTREAM
```

而不是直接删除历史。

---


# 47U-A. Archify 的上游升级策略

Archify 与 Claw3D 不同：

```text
Claw3D
= Fork + upstream merge

Archify
= package/release pin + compatibility verification
```

第一阶段不得无理由 Fork Archify。

每次 Archify 更新检查：

- JSON Schema 是否变化；
- IR schema_version 是否变化；
- Renderer contract 是否变化；
- CLI command 是否变化；
- compare/deliver/validate 是否变化；
- Viewer behavior 是否变化；
- DSH community integration compatibility；
- Node runtime requirement；
- generated artifact regression。

新增：

```text
compatibility/archify-matrix.json
```

Upstream Radar：

```text
upstream/ARCHIFY.md
```

Verified Stack 增加：

```yaml
archify:
  version: "<exact>"

archify_dsh:
  version: "<exact>"
```

如果未来 DSH 原生提供等价、成熟的 architecture evidence capability：

> 按 V3 去重原则重新评估，优先减少重复能力。

---


# 47V. 长期维护最终目标

维护系统应达到：

```text
DSH update
→ 主要影响 Adapter

Claw3D update
→ 主要影响 UI merge

AI OS update
→ 主要影响 Governance

三个组件相互独立
```

这就是当前三层架构的重要价值。


# 48. 开发阶段

---

## Phase 0 — 冻结与审计

必须先完成：

1. CQ OS Archive；
2. 建立新主分支；
3. 将 AI-OS(4) 作为治理基线；
4. Fork/pin Claw3D；
5. 检查并 pin Archify core 与 `@tt-a1i/archify-dsh` 精确版本；
6. 记录所有 upstream commit hash / package version；
7. License audit；
8. 建立 THIRD_PARTY 文件；
9. 建立 `docs/architecture/` 与 `.aios/artifacts/archify/` 目录约定。

验收：

```text
CQ OS 不再是 dependency
第三方来源可追溯
```

---

## Phase 1 — AI OS DSH-only 清理

完成：

- 删除 Codex plugin
- 删除 .codex
- package rename
- CLI rename
- `.codex-os` → `.aios`
- Codex 文案替换
- Skill DSH 化
- DB 删除 task/approval
- Governance policy.yaml
- DSH 插件骨架

验收：

```text
rg -i "codex" .
```

除历史 ADR/迁移说明外，不应存在运行时 Codex 耦合。

---

## Phase 2 — DSH Governance Integration

实现：

- `tools/pre-execute`
- ALLOW / DENY / ASK
- DSH approval
- workspace detection
- native AIOS tools
- Worktree
- Memory
- Gate
- prompt/skill integration

验收：

- force push 被阻止；
- input 写入被阻止；
- main reset --hard 被阻止；
- disposable worktree 正确允许；
- ASK 进入 DSH 原生 approval；
- 无第二 approval DB；
- DSH Agent 能调用 AIOS tools。

---


## Phase 2A — Archify + Architecture Evidence 基线

目标：

> 先验证 Archify 是 DSH 的可调用工程能力，再做 UI 集成。

完成：

1. 安装 pinned `@tt-a1i/archify-dsh`；
2. 确认 DSH 能发现 Archify Skill；
3. 用真实仓库生成一份 `architecture` IR；
4. validate；
5. deliver；
6. 生成 self-contained HTML；
7. 建立 `.aios/artifacts/archify/index.json`；
8. 用 Git base/head 生成一次 Architecture Delta；
9. 修改 AI OS：
   - governance-entry
   - document-impact
   - finish-checklist
   - open-source-research
10. 验证普通小修改不会强制 Archify。

验收：

```text
Archify 不创建 Agent
Archify 不创建 Runtime
Archify 不创建后台 Server
IR 在 Git
HTML 可重建
DSH 可按需调用
AI OS 可要求 Architecture Evidence
```

---


## Phase 3 — Claw3D → DSH

先不要改美术。

目标：

> 用原始 Claw3D 场景证明 DSH 状态通道正确。

完成：

- 删除 OpenClaw/Hermes 主路径
- DSH provider
- session projection
- Agent rendering
- chat
- approval
- todo/task
- real-time events

验收：

同时启动多个 DSH Agent：

```text
Office 出现多个不同真实 Agent
```

Agent 完成：

```text
UI 状态同步变化
```

不允许模拟数据假装成功。

---

## Phase 4 — Event → Spatial Mapping

实现确定性状态机。

覆盖：

- coding
- research
- plan
- test
- review
- deploy
- approval
- blocked
- done

验收：

同一 recorded DSH event stream 回放两次：

```text
产生相同 Office animation state
```

说明映射是确定性的。

---


## Phase 4A — Trajectory + Archify 工程侧栏 / Architecture Room

在美术重构之前，先完成工程信息架构。

实现：

### DSH Trajectory

复用 DSH 原生轨迹能力。

### Archify Architecture

嵌入：

```text
Architecture
Sequence
Data Flow
Workflow
Lifecycle
```

### Architecture Delta

Review Room 可直接打开。

### Architecture Room

第一版使用：

```text
sandboxed iframe
```

加载生成 HTML。

### Sidebar

至少：

```text
Trajectory
Architecture
Delta
Files
Agent
Task
Approval
```

验收：

- Trajectory 和 Archify 数据源严格分离；
- 3D UI 不解析 Archify IR 自己重画；
- Archify Viewer 功能可用；
- iframe 有 sandbox/CSP 安全边界；
- Artifact 不存在时 UI 正确显示 Empty State；
- 全过程不额外调用 LLM。

---


## Phase 5 — 现代办公室视觉重构

顺序：

### 5.1 ai-office

先迁移：

- glass meeting room
- workstation
- monitors
- day/night
- dark mode
- office props

### 5.2 VirtOffice

迁移：

- server room layout
- whiteboard
- typing/walking/idle animation
- click inspect

### 5.3 cyberpunk-room

迁移技术：

- PBR
- postprocessing
- quality presets
- emissive
- controlled Bloom

### 5.4 Tremor

迁移：

- Dashboard
- KPI
- progress
- charts

### 5.5 Server Room

参考 thingraph，自研 rack / LED / monitoring。

验收：

- 视觉统一；
- 没有多个项目拼贴感；
- 所有第三方代码记录 provenance；
- 性能达到目标。

---

## Phase 6 — Worktree + Memory 深度联动

实现：

- Agent → worktree visual badge
- branch view
- worktree cleanup status
- Memory candidate
- ADR display
- lessons display

注意：

Claw3D 可以展示 AIOS Memory，但不能修改 Memory Source of Truth，除非通过 AIOS tool。

---

## Phase 7 — Hardening

- E2E
- performance
- token-zero test
- permission tests
- path traversal
- XSS
- WebSocket limits
- CSP
- rate limit
- asset license check
- fresh install test
- Windows test
- Linux test

---


# 48A. Phase 8 — Upstream Maintenance Infrastructure

在首个稳定版本发布前，必须建立：

- `VERIFIED_STACK.md`
- compatibility matrix
- upstream radar
- DSH compatibility test suite
- Claw3D upstream merge workflow
- Archify compatibility matrix / artifact regression tests
- upgrade branch convention
- pre-upgrade tag
- rollback runbook
- upstream impact report template

第一版稳定交付不允许缺少这套长期维护基础。

---

# 49. 明确禁止开发的东西

任何 Agent 如果准备创建以下组件，必须停止并重新阅读本规格：

```text
ParallelScheduler
AgentManager
AgentRegistry
TeamManager
TaskRuntime
TaskDatabase
ApprovalDatabase
ApprovalEngine
SessionManager
WorkspaceRegistry
ModelRouterRuntime
LLMGateway
ToolRuntime
SandboxEngine
PluginManager
CQCoreAgent
DeveloperAgent
TesterAgent
ReviewAgent
ArchifyRuntime
ArchifyAgentManager
ArchitectureTaskDB
ArchitectureHistoryDB
CustomArchitectureRenderer（用于重复Archify已有能力）
```

除非能够证明：

> DSH 当前稳定版本确实没有对应能力，

并提交 OSS/DSH source research + ADR 后才允许新增。

---

# 50. Source of Truth 总表

| 数据 | 唯一真源 |
|---|---|
| Agent | DSH |
| Agent Team | DSH |
| Session | DSH |
| Todo | DSH |
| Goal | DSH |
| Team Task | DSH |
| Workflow | DSH |
| Tool call/result | DSH |
| Approval runtime | DSH |
| User Question | DSH |
| Workspace | DSH |
| Model | DSH |
| Runtime logs | DSH |
| 工程治理规则 | AI OS |
| OSS research decision | Git docs |
| UI approval fact | UI_SPEC.md |
| ADR | Git docs |
| Engineering Memory | docs/memory/memory.jsonl |
| Worktree registration | AIOS local DB + Git worktree |
| 3D layout | Claw3D local UI state |
| UI preference | Claw3D local UI state |
| 3D Agent status | DSH projection derived state |
| Architecture IR | `docs/architecture/*.json` |
| Architecture history | Git |
| Architecture HTML | Archify generated artifact，可重建 |
| Architecture Delta | Git base/head + Archify compare，可重建 |
| Architecture Evidence policy | AI OS |
| 实时执行轨迹 | DSH Trajectory |
| Archify artifact index | `.aios/artifacts/archify/index.json`，derived |

---

# 51. 最终用户工作流

用户打开 CQ Office。

选择 DSH Workspace。

输入：

```text
开发一个后台管理系统
```

DSH：

1. 读取 AI OS Governance；
2. 判断 Code Start；
3. 需要 OSS research 时执行；
4. AI OS 判断 Architecture Evidence 是否 Required；
5. 若 Required，DSH 按需调用 Archify 创建/更新 IR；
6. 使用自身 Agent/Subagent/Workflow；
7. 需要并行代码时调用 AI OS Worktree；
8. 多 Agent 同时执行；
9. Claw3D 实时显示；
10. 测试进入 QA Lab；
11. 架构变更时生成 Architecture Delta；
12. Review Room 同时显示 Git Diff + Architecture Delta；
13. deploy 请求触发 AI OS ASK；
14. DSH Approval；
15. 用户在 3D UI Approve；
16. DSH继续；
17. Finish Gate 检查 Architecture Evidence；
18. Memory 提炼；
19. 交付。

---

# 52. 最终画面预期

用户能看到：

```text
Research Area
  Agent A 正在读资料

Architecture Room
  Agent B 正在 Plan Mode
  Archify 显示当前 Architecture / Sequence / Data Flow

Development Floor
  Agent C 正在 backend worktree
  Agent D 正在 frontend worktree
  Agent E 正在 migration worktree

QA Lab
  Agent F 正在跑 tests

Review Room
  Agent G 正在看 diff

Server Room
  build/deploy health

Approval Room
  “Production deploy waiting approval”
```

这些全部来自真实 DSH 工作，不是演示动画。

---

# 53. 最终验收标准

## 架构

- [ ] CQ OS 完全退役
- [ ] DSH 是唯一 Runtime
- [ ] AI OS 不创建 Agent Runtime
- [ ] Claw3D 不创建 Runtime 真源
- [ ] 无第二 Task DB
- [ ] 无第二 Approval DB
- [ ] 无第二 Session Store
- [ ] 无 Parallel Scheduler

## AI OS

- [ ] Codex hooks 全部删除
- [ ] DSH plugin 生效
- [ ] Code Start Gate 有效
- [ ] Frontend Gate 有效
- [ ] Finish Gate 有效
- [ ] OSS-first 有效
- [ ] Worktree 有效
- [ ] Memory 有效
- [ ] protected path 有效
- [ ] ASK 使用 DSH native approval

## DSH

- [ ] 原生 Agent 可显示
- [ ] 多 Agent 并行可显示
- [ ] Workflow 状态可显示
- [ ] Todo/Goal/Task 可显示
- [ ] Session 正确映射
- [ ] Workspace 正确映射
- [ ] User Questions 可显示
- [ ] Approval 可在 UI 操作

## Claw3D

- [ ] 现代科技办公室
- [ ] 玻璃会议室
- [ ] 多显示器开发工位
- [ ] QA Lab
- [ ] Review Room
- [ ] Server Room
- [ ] Archify Architecture Room
- [ ] Core Dashboard
- [ ] 暗色科技风
- [ ] Office Builder 保留
- [ ] click-to-inspect Agent
- [ ] Chat
- [ ] Approval UI


## Archify / Architecture Evidence

- [ ] Archify 不成为第四 Runtime
- [ ] 使用官方 DSH Skill 集成优先
- [ ] Archify 精确版本写入 Verified Stack
- [ ] `docs/architecture/*.json` 是架构图 Source of Truth
- [ ] HTML 是 generated artifact
- [ ] Architecture history 只使用 Git
- [ ] 无 architecture-v1/v2/final 文件复制
- [ ] Architecture Evidence 可为 NOT_APPLICABLE / REQUIRED_PENDING / VERIFIED
- [ ] 重大架构变更 Finish 前必须 VERIFIED
- [ ] Architecture Delta 可由 Git base/head 重新生成
- [ ] Architecture Room 嵌入 Archify Viewer
- [ ] Review Room 可展示 Architecture Delta
- [ ] DSH Trajectory 与 Archify Architecture 明确分离
- [ ] 普通小型修改不会强制运行 Archify


## Token

- [ ] Idle UI 0 model calls
- [ ] Event playback 0 model calls
- [ ] 状态 polling 不调用 LLM
- [ ] 动画不调用 LLM

## 性能

- [ ] Desktop 平均 ≥45 FPS
- [ ] Auto quality
- [ ] Low quality 可用
- [ ] 多 Agent 时不明显卡顿

## License

- [ ] Claw3D MIT notice
- [ ] ai-office MIT notice
- [ ] VirtOffice MIT notice
- [ ] cyberpunk-room code MIT notice
- [ ] cyberpunk-room assets逐项审计
- [ ] Tremor Apache-2.0 notice
- [ ] thingraph 仅参考，不复制
- [ ] cyberpunk-dashboard 仅参考，不复制
- [ ] THIRD_PARTY_CODE.md 完整
- [ ] THIRD_PARTY_ASSETS.md 完整

---

# 54. DSH 执行本规格时的工作方式

不要直接大改。

执行顺序必须是：

```text
1. 阅读本规格
2. 阅读 AI OS 当前源码
3. 阅读 DSH 当前源码/官方文档
4. 阅读 Claw3D 当前源码
5. 阅读 Archify 当前 release / DSH integration / schemas / skill contract
6. 建立 Open Source Research
7. 建立 ADR
8. 先完成 Phase 0/1
9. 再做 DSH Governance
10. 完成 Archify Architecture Evidence 基线
11. 再接 Claw3D
12. 确认真实状态链路
13. 完成 Trajectory + Architecture Room
14. 最后升级美术
```

任何阶段发现 DSH 已有新能力：

> 优先删除计划中的自研实现，切换为 DSH 原生能力。

---

# 55. 开发中的 Human Gate

这次大型重构仍然要保留 AI OS Frontend Gate。

在进入 **Phase 5 视觉重构** 前：

必须先输出：

```text
docs/design/PROTOTYPE.html
docs/design/UI_SPEC.md
```

Prototype 至少体现：

- Office overall layout
- modern tech theme
- glass meeting room
- development floor
- QA lab
- review room
- server room
- core dashboard
- Archify Architecture Room
- right sidebar：Trajectory / Architecture / Delta
- dark mode
- Agent inspect panel

用户批准后才正式进行最终视觉实现。

---

# 56. 建议的 ADR

至少新增：

```text
ADR-0017-DSH-only-runtime-boundary.md
ADR-0018-CQ-OS-retirement.md
ADR-0019-claw3d-ui-layer.md
ADR-0020-dsh-native-state-source.md
ADR-0021-zero-token-office-state.md
ADR-0022-third-party-visual-composition.md
ADR-0023-aios-database-slimming.md
ADR-0024-archify-architecture-evidence.md
ADR-0025-archify-ir-source-of-truth.md
ADR-0026-trajectory-vs-architecture-boundary.md
ADR-0027-archify-no-fork-first-policy.md
```

---

# 57. 参考源码与官方资料

## DeepSeek Harness

```text
https://github.com/deepseek-ai/deepseek-harness
```

重点：

```text
docs/subsystems/workflow.md
docs/subsystems/agent-team.md
docs/subsystems/tools.md
docs/tool-execution-pipeline.md
docs/subsystems/workspace.md
docs/subsystems/user-questions.md
docs/subsystems/plan.md
docs/cookbook/extension-cookbook.md
docs/capability-seams.md
```

## Claw3D

```text
https://github.com/iamlukethedev/Claw3D
```

重点：

```text
README.md
ARCHITECTURE.md
CODE_DOCUMENTATION.md
src/app/office/
src/features/office/
src/features/retro-office/
src/lib/office/
```


## Archify

```text
https://github.com/tt-a1i/archify
```

重点：

```text
README_EN.md
archify/SKILL.md
archify/schemas/README.md
archify/references/authoring-contract.md
archify/references/delivery-contract.md
archify/references/viewer-runtime.md
docs/authoring-cookbook.md
ROADMAP.md
CHANGELOG.md
```

DSH 集成：

```text
@tt-a1i/archify-dsh
```

实现前必须重新核对当前版本与 DSH compatibility。


## AI Office

```text
https://github.com/Gaurav2693/ai-office
```

## VirtOffice

```text
https://github.com/OneByJorah/VirtOffice
```

## Cyberpunk Room

```text
https://github.com/klmtseng/cyberpunk-room
```

## Server Room reference

```text
https://github.com/thingraph/server-room
```

## Tremor

```text
https://github.com/tremorlabs/tremor
```

---




# 57C. V4 Archify 专项验收

## 定位

- [ ] Archify 只是 DSH 按需工程能力
- [ ] Archify 不成为 Runtime
- [ ] Archify 不进入 AI OS deterministic core
- [ ] Archify 第一阶段不 Fork

## 工程事实

- [ ] Typed JSON IR 进入 Git
- [ ] HTML 不作为架构真源
- [ ] Architecture history 由 Git 提供
- [ ] Architecture Delta 基于 Git baseline
- [ ] repository evidence 只记录实际验证事实

## UI

- [ ] Architecture Room 使用 Archify Viewer
- [ ] Review Room 显示 Architecture Delta
- [ ] Sidebar 分离 Trajectory / Architecture / Delta
- [ ] CQ Office 不重写 Archify renderer

## Governance

- [ ] governance-entry 有 Architecture Impact Check
- [ ] document-impact 检查 Architecture drift
- [ ] finish-checklist 支持 Architecture Evidence
- [ ] 小修改不会强制 Archify
- [ ] 重大结构变更不能在 Evidence pending 时 Finish

## Upstream

- [ ] Archify core exact version 已 pin
- [ ] Archify DSH bundle exact version 已 pin
- [ ] 有 archify compatibility matrix
- [ ] Upstream Radar 包含 ARCHIFY.md
- [ ] Archify 升级不自动进入正式 Verified Stack

---


# 57B. V3 上游升级专项验收

## DSH

- [ ] 正式环境不自动追 latest
- [ ] 有 DSH compatibility matrix
- [ ] 有 disposable upgrade environment
- [ ] AI OS Plugin compatibility 自动测试
- [ ] CQ Office Adapter compatibility 自动测试
- [ ] 升级必须 Human Gate
- [ ] 可以回滚到上一 Verified Stack

## Claw3D

- [ ] origin / upstream remote 分离
- [ ] 自定义代码尽量模块化
- [ ] theme 与 upstream core 解耦
- [ ] modern-office 扩展不散落侵入核心
- [ ] upstream merge 有专门 upgrade branch
- [ ] merge 后运行 UI/E2E/性能测试

## 去重

- [ ] 每次 upstream 更新执行能力去重审计
- [ ] 官方能力满足要求时优先替换自研
- [ ] 被替代功能标记 `REPLACED_BY_UPSTREAM`
- [ ] 不保留两套长期 Runtime 能力

## 版本

- [ ] AI OS 独立 SemVer
- [ ] CQ Office 独立 SemVer
- [ ] DSH 使用官方精确版本
- [ ] Adapter 独立版本
- [ ] `VERIFIED_STACK.md` 可明确还原完整运行组合

---

# 57A. V2 专项架构验收

除原有功能验收外，必须额外通过以下 V2 架构检查。

## AI OS 形态

- [ ] README 明确 AI OS 由四部分组成
- [ ] AI OS 不作为 DSH Preset
- [ ] AI OS 不作为 Agent Mode
- [ ] `@aios/dsh-governance` 仅是 AI OS 的强制执行入口
- [ ] Skills 按需加载
- [ ] Python Core 非常驻 Agent Backend
- [ ] Project Assets 存在于 Git 项目仓库

## 通信边界

- [ ] Claw3D 只与 DSH 交互
- [ ] Claw3D 不直接调用 AI OS
- [ ] AI OS 只通过 DSH Governance seam 影响执行
- [ ] Claw3D 不直接调用模型 Provider
- [ ] Approval 完整走 DSH native approval

## Runtime 唯一性

- [ ] Agent 真源只有 DSH
- [ ] Task 真源只有 DSH
- [ ] Session 真源只有 DSH
- [ ] Approval Runtime 真源只有 DSH
- [ ] Workspace 真源只有 DSH
- [ ] Model execution 只有 DSH
- [ ] Claw3D view state 可完全从 DSH 重建

## Token

- [ ] Skills 未全量注入 system prompt
- [ ] Idle Office 0 LLM call
- [ ] Runtime event projection 0 LLM call
- [ ] UI animation 0 LLM call

---

# 58. 最终产品定义

最终不要再宣传：

> “CQ OS 是 DSH 第五模式。”

CQ OS 已废弃。

最终产品由三部分构成：

## DeepSeek Harness

> AI 工作执行引擎。

## AI Engineering OS

> DeepSeek Harness 的软件工程治理体系，由 DSH Governance Plugin + Governance Skills + Deterministic Core + Project Governance Assets 四部分共同组成。

## CQ Office

> DeepSeek Harness 的实时 3D AI 工程工作空间。

## Archify（工程能力，不是第四产品层）

> DSH 按需调用的 Architecture Evidence / Engineering Visualization capability；由 AI OS 规定何时需要，由 CQ Office 展示结果。

最终描述：

> **A governed, observable AI software engineering workspace built on DeepSeek Harness.**
>
> DeepSeek Harness executes.
>
> AI Engineering OS governs.
>
> Archify makes architecture evidence visible and verifiable.
>
> CQ Office visualizes.

---

# 59. 最终不可回退原则

未来任何新功能都按这个判断：

```text
这个能力是“执行”吗？
→ 先检查 DSH
→ DSH 有：直接使用
→ DSH 没有：再判断是否真有必要

这个能力是“工程治理”吗？
→ AI OS

这个能力是“系统架构证据/工程结构可视化”吗？
→ 优先 Archify

这个能力是“用户看见/交互”吗？
→ Claw3D / CQ Office
```

禁止三层职责再次混合。

这是本次重构最重要的成功标准。



---

# V2 变更摘要（保留）

相较 V1，本版新增并冻结：

1. **AI OS 四部分正式形态**
   - DSH Governance Plugin
   - Governance Skills
   - Deterministic Core
   - Project Governance Assets

2. **明确 AI OS 不是 Preset / Agent / Runtime / 单一 Plugin / 单一 Skill。**

3. **明确 AI OS 对任意 DSH 运行模式生效，而不是第五模式。**

4. **明确 Plugin / Skill / Core / Asset 的职责分工。**

5. **明确 Python Deterministic Core 不是常驻 Backend。**

6. **明确 Governance Skills 必须按需加载，禁止全量塞入 system prompt。**

7. **明确 Claw3D 是独立 Web UI，而不是 DSH Plugin 本体。**

8. **明确 Claw3D 与 AI OS 不直接通信。**

9. **明确 Claw3D → DSH → AI OS Governance 的唯一交互边界。**

10. **强化 Source of Truth 约束，禁止复制 Agent / Task / Session / Approval Runtime 状态。**

11. **新增 V2 架构违规清单与专项验收。**

V2 之后，任何实现若重新引入 CQ OS 式的第二 Runtime、第二调度层或固定角色 Agent 体系，均视为架构回退。


---

# V3 变更摘要

V3 在 V2 三层架构合同基础上，新增完整长期维护策略。

新增内容：

1. **DSH 禁止长期 Fork 核心。**
2. **DSH 正式环境禁止自动追 latest。**
3. **Claw3D 必须通过标准 Git Fork + upstream remote 维护。**
4. **CQ Office 私有逻辑必须尽量与 Claw3D upstream core 解耦。**
5. **现代办公室视觉要求主题化、模块化。**
6. **新增 Verified Stack。**
7. **新增 DSH / Claw3D / Stack Compatibility Matrix。**
8. **新增自动 Compatibility Suite。**
9. **每次 upstream 更新必须执行“官方能力去重审计”。**
10. **官方能力成熟后优先替换 AI OS / CQ Office 自研重复功能。**
11. **新增 Upstream Radar。**
12. **新增 Upstream Impact Report。**
13. **正式升级必须 Human Gate。**
14. **新增 Pre-upgrade Tag 和 Rollback Runbook。**
15. **新增数据迁移回滚要求。**
16. **AI OS、CQ Office、DSH、Adapters 独立版本化。**
17. **新增 upgrade branch 规范。**
18. **新增 upstream patch budget，防止 Claw3D fork 越改越无法同步。**
19. **新增 Phase 8：Upstream Maintenance Infrastructure。**
20. **新增 V3 上游升级专项验收。**

V3 的长期目标：

> **DSH 更新主要只影响 Adapter；Claw3D 更新主要只影响 UI merge；AI OS 更新主要只影响 Governance。**

通过此机制，三个组成部分可以持续跟随官方更新，同时保持系统可验证、可回滚、可维护。


---

# V4 变更摘要

V4 在 V3 的“三层架构 + 上游升级机制”基础上，正式引入 Archify。

V4 不增加第四个 Runtime，而是增加一个**被 DSH 按需调用的工程能力**。

主要变化：

1. **正式定义 Archify = Architecture Evidence + Engineering Visualization capability。**
2. **明确 Archify 不是 Runtime、Agent Framework、Task Engine 或实时状态真源。**
3. **AI OS 新增 Architecture Evidence 治理概念。**
4. **Archify Typed JSON IR 成为架构可视化 Source of Truth。**
5. **Archify HTML 定义为 generated/rebuildable artifact。**
6. **架构历史继续只使用 Git，禁止 architecture-v1/v2/final 副本。**
7. **Architecture Delta 使用 Git base/head + Archify compare。**
8. **Architecture Room / Whiteboard 升级为 Archify Architecture Room。**
9. **Review Room 增加 Git Diff + Architecture Delta。**
10. **Core Dashboard 增加 Architecture Evidence 状态。**
11. **DSH Trajectory 与 Archify Architecture 被严格区分。**
12. **右侧栏建议固定 Trajectory / Architecture / Delta / Files / Agent / Task / Approval。**
13. **AI OS 现有 Skills 增加 Architecture Impact / Drift / Finish Evidence 规则，不创建新角色体系。**
14. **Archify 第一阶段不 Fork，优先使用官方 DSH community integration。**
15. **Archify 纳入 Verified Stack、Compatibility Matrix、Upstream Radar 和 Human Gate 升级机制。**
16. **新增 Phase 2A：Archify + Architecture Evidence 基线。**
17. **新增 Phase 4A：Trajectory + Archify 工程侧栏 / Architecture Room。**
18. **新增 V4 Archify 专项验收。**
19. **删除“自己开发复杂架构白板/图形引擎”的方向。**
20. **继续执行“不重复造轮子”原则：Archify 已有 Renderer/Viewer/Delta 的能力不自研。**

V4 最终责任关系：

```text
DSH
= 执行与调用

AI OS
= 工程治理与 Architecture Evidence Policy

Archify
= 架构证据、结构可视化、Architecture Delta

CQ Office / Claw3D
= 3D 与工程 UI 展示
```

最终仍只有一个 Runtime：

> **DeepSeek Harness。**
