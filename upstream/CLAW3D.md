# Upstream: Claw3D

> Claw3D 是最终 3D Office UI 的主体骨架（规格 §15/§23.1），Phase 3 以 git subtree 方式并入 apps/cq-office，保持可上游同步（§47C/§47D）。

## Pinned baseline

| 项 | 值 |
|---|---|
| Repository | git@github.com:iamlukethedev/Claw3D.git |
| Pinned HEAD | 0565b7892909eca7bbc8f2d9b0fad171dd75ad7c |
| License | MIT |
| 验证日期 | 2026-09-13 |
| 验证方式 | git ls-remote（SSH） |

## 引入方式（Phase 3 执行）

```sh
git subtree add --prefix apps/cq-office git@github.com:iamlukethedev/Claw3D.git 0565b7892909eca7bbc8f2d9b0fad171dd75ad7c
```

上游更新：subtree pull 到 upgrade branch，冲突处理按规格 §47S，patch 预算受 §47T 约束。

## 二开红线

- 保留 UI 架构思想：Runtime 是 Source of Truth；UI 只存偏好与 derived state。
- 删除/禁用 OpenClaw/Hermes 主路径与重复 registry（规格 §16）。
- 本仓库对 Claw3D 的改动记录 provenance 于 THIRD_PARTY_CODE.md。
