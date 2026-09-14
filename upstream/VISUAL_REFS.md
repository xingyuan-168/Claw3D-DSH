# 上游视觉参考 pin（Phase 5 前置）

状态：Phase 5 未启动。本文件先固定参考源与许可边界；实际 clone 延迟到 Phase 5 启动，
clone 到仓库外参考目录 `D:\dsh-projects\refs\`（不进 Git），提取片段逐项记录 provenance。
可达性验证：2026-09-14，全部 SSH `git ls-remote` 通过。

| 参考源 | 上游 | 许可 | HEAD（2026-09-14） | V4 用途 | 提取策略 |
|---|---|---|---|---|---|
| ai-office | github.com/Gaurav2693/ai-office | MIT | 028295a272d208f60c4452fcdd843a20729a9228 | glass meeting room / workstation / monitors / day-night / dark mode / props（§5.1） | 文件级提取 + MIT notice 进 THIRD_PARTY_CODE.md |
| VirtOffice | github.com/OneByJorah/VirtOffice | MIT | 8ef3f896f45b5ea4c73c5ea81e49c701c264b5de | server room layout / whiteboard / typing-walking-idle 动画 / click inspect（§5.2） | 文件级提取 + MIT notice；动画技术学习 |
| cyberpunk-room | github.com/klmtseng/cyberpunk-room | 代码 MIT；资产逐项审计 | 93592b2aab7b374fb37b19f5d8369bd0cbbcd80e | PBR / postprocessing / quality presets / emissive / controlled Bloom（§5.3） | 只迁移技术实现思路；**任何资产入库前逐项审计许可** |
| thingraph/server-room | github.com/thingraph/server-room | 待确认（V4：仅参考，不复制） | 57966a9cac9e15d0d557a35707c9234fc062dbc7 | rack / LED / monitoring 自研参考（§5.5） | **仅参考设计，不复制代码**；启动前先确认其实际许可 |
| Tremor | npm @tremor/react | Apache-2.0 | 3.18.7（registry latest） | Dashboard / KPI / progress / charts（§5.4） | 作 npm 依赖直接使用，不拉树；notice 进 THIRD_PARTY_CODE.md |

## 纪律

- 提取的任何代码/资产在进入 `apps/cq-office` 前必须：记录来源 URL + commit + license 到 THIRD_PARTY_CODE.md / THIRD_PARTY_ASSETS.md；复制式整树 vendor 禁止（thingraph 绝对禁止复制）。
- Phase 5 启动铁律不变：Frontend Gate（PROTOTYPE.html + UI_SPEC.md + 用户明确批准）先于任何视觉迁移。
- 上游更新检查（V4 §47U）：每次 Phase 5 复工前 `git ls-remote` 比对 HEAD，变化则评估是否重 pin。
