# Upstream: DeepSeek Harness (DSH)

> 本文件是 DSH 上游的 pin 记录与升级入口。升级一律走 Human Gate（规格 §47N），禁止 fork DSH 作为长期主线（§47B.1），禁止自动升级正式环境（§47B.2）。

## Pinned baseline

| 项 | 值 |
|---|---|
| Repository | git@github.com:deepseek-ai/deepseek-harness.git |
| Pinned HEAD | c291e7961a515f6d7af9304e7fd1d257929aef26 |
| 本机安装版本 | @deepseek-ai/dsh 0.1.1-rc.2（npm 全局） |
| License | MIT |
| 验证日期 | 2026-09-13 |
| 验证方式 | git ls-remote（SSH） |

## 环境事实

- 本机 github.com HTTPS 443 不通，所有 clone/ls-remote/subtree 操作必须使用 SSH URL。
- DSH 为 Cordis 插件体系：profile bundles（dsh.profile）+ out-of-tree plugin（`dsh plugin --profile <name> <pnpm args>`）+ 动态插件（cordis_define 等）。
- 相关本机路径：C:\Users\84700\AppData\Roaming\npm\node_modules\@deepseek-ai\dsh

## 升级流程（摘要）

1. 在 upgrade branch 上核对 release notes 与兼容性；
2. 打 pre-upgrade tag；
3. 跑 DSH compatibility suite（Phase 8 建立）；
4. Human Gate 批准后合并；
5. 回滚按 rollback runbook（Phase 8 建立）。
