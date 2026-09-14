# Third-Party Code Notices

> 规则：任何第三方代码进入本仓库前必须在此登记来源、版本/commit、License 与使用方式（规格 §29）。Phase 5 视觉迁移时逐项补充。

## CQ-OS governance（MIT，思想性改编）

Source: <https://github.com/xingyuan-168/CQ-OS/tree/400a93088e34f3221d7b95eba7edd7685df8e7cf/preset/plugins/cq-governance>

The package manifest declares the package under the MIT License. AI Engineering OS
contains an independent Python adaptation of its pure Baseline + Project policy
composition, protected-path matching, and related test ideas. It does not include the
CQ-OS DSH/Cordis runtime integration.

Copyright (c) CQ-OS contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this
software and associated documentation files (the "Software"), to deal in the Software
without restriction, including without limitation the rights to use, copy, modify,
merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be included in all copies
or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## 计划引入（尚未进入本仓库，进入时逐项登记完整 License 文本）

| 来源 | License | 计划阶段 | 方式 |
|---|---|---|---|
| iamlukethedev/Claw3D | MIT | Phase 3 | git subtree → apps/cq-office |
| Gaurav2693/ai-office | MIT | Phase 5 | 提取/复刻部件，记录 provenance |
| VirtOffice | MIT | Phase 5 | 提取/复刻部件 |
| cyberpunk-room | MIT（代码） | Phase 5 | 仅技法；资产不入库 |
| Tremor | Apache-2.0 | Phase 5 | Dashboard 组件模式 |
| thingraph/server-room | 仅参考 | Phase 5 | 不复制代码/资产 |
| cyberpunk-dashboard | 仅参考 | Phase 5 | 不复制代码/资产 |
