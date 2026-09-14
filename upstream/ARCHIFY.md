# Upstream: Archify

> Archify 是"架构证据与工程可视化能力"：架构 IR、五类图渲染、Architecture Delta。它不是第四 Runtime（规格 §0P–§0W）。

## Pinned baseline

| 项 | 值 |
|---|---|
| Repository | git@github.com:tt-a1i/archify.git |
| Pinned HEAD | a07fa1d5b2a10cbea110c5a2be2817397a301cdc |
| DSH integration (npm) | @tt-a1i/archify-dsh@0.1.0（npm registry 已确认存在） |
| 验证日期 | 2026-09-13 |
| 验证方式 | git ls-remote（SSH）+ npm registry 查询 |

## 上游策略

- 第一阶段不 fork（规格 §0V/§47U-A）：优先官方 DSH community integration，精确版本 pin 于 VERIFIED_STACK.md。
- 源码不 vendor 进本仓库；生成 HTML 是可重建 artifact（.aios/artifacts/archify/，gitignore *.html）。
- 架构图 Source of Truth = docs/architecture/*.json；Architecture 历史 = Git；Delta = Git base/head + Archify compare。
