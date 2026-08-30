# 第 2 轮验收报告：严格 TypeScript 迁移通道

> 执行日期：2026-08-30（Asia/Shanghai）
> 状态：**本轮完成**
> Git：本轮基线 HEAD 为 `8ce3b46`；本轮没有创建或暂存新提交

## 结果摘要

| 项目 | 结果 |
| --- | --- |
| 类型边界 | `unknown → runtime parser → Legacy DTO → Product domain` |
| Result | `aborted / not-found / parse / unexpected` 判别分支 |
| Shop fixture | 从旧 42 条重复数据提取 6 个唯一商品，保留首次出现顺序 |
| 本地资源 | 27 张商品图，1,274,128 B，有 SHA-256 来源清单 |
| 路由 | `/shop`、安全重定向 `/shop/detail`、可深链 `/shop/detail/:productId` |
| Pinia | `idle/loading/ready/empty/error` 状态机和 typed domain event |
| TypeScript 债务 | 新运行时代码显式 `any`、`$ref`、`@ts-ignore`、JS、`routeData` 均为 0 |
| Unit/component | 7 个 Vitest 文件、21 个测试全部通过 |
| E2E | 本地 Chrome 和 CI Chromium 各 7 个 production-preview 测试通过 |
| Build | Vite 8，46 modules；39 个产物，共约 1.33 MiB，其中商品图约 1.22 MiB |
| Audit | 324 packages，0 vulnerabilities |

## 本轮入口

- [类型和架构边界](architecture.md)
- [Shop 纵切及行为差异](shop-slice.md)
- [类型债务与迁移指标](metrics.md)
- [验证证据](verification.md)
- 机器摘要（本地生成：`generated/summary.json`）
- 资源导入清单（本地生成：`generated/shop-import.json`）
- 视觉证据（本地生成：`screenshots/`）
- 原始命令日志（本地生成：`evidence/`）

## Git 边界

本轮实际工作开始后发现仓库已由外部操作更新为：

```text
branch=master
HEAD=8ce3b46
remote=origin
commit_count=2
```

`8ce3b46` 是 Round 0/1 产物的已有提交。本轮没有撤销该状态，也没有创建 Round-2 commit；当前 Round-2 文件保持工作树修改/未跟踪状态，暂存区为空。

## 本轮完成定义

- [x] 新外部数据从 `unknown` 开始，不从 JSON 推断全应用真相。
- [x] 旧 DTO 与内部 Product domain 分离。
- [x] Product 使用 branded `ProductId`，只接受 `g1…gN`。
- [x] 金额在 Domain 中转换为整数 cents。
- [x] 图片文件名通过 allow-list 正则，拒绝路径穿越。
- [x] Fixture/27 张图片/manifest 连续导入两次后 29 个输出文件哈希完全一致。
- [x] API/服务结果使用判别联合，不返回 `any`。
- [x] Pinia 区分 loading、ready、empty、error、aborted。
- [x] 未预期 throw 转换为 `unexpected`，不会永久停在 loading。
- [x] Router meta 的 `title`、`migrationRound`、`transition` 为必填类型。
- [x] 商品详情可以直接访问和刷新，不依赖内存 `routeData`。
- [x] 无效 ID 显示 not-found；旧无 ID 路径安全返回列表。
- [x] 组件覆盖 loading/empty/error/not-found/ready 分支。
- [x] 运行时代码没有显式 `any`、`$ref`、`@ts-ignore`、JS 或 legacy path import。
- [x] 冻结安装、格式、Oxlint、ESLint、vue-tsc、Vitest、build、E2E、audit 全部通过。

## 可重复执行

```bash
bun run migration:shop:import
bun install --frozen-lockfile
bun run check
bun run build
bun run test:e2e
CI=true VITE_BUILD_SHA=round2test bun run test:e2e
bun audit --audit-level=high
bun run migration:round2:collect
```

## 有意行为差异

旧页面把整个商品对象写入全局 `routeData`，所以 `/shop/detail` 刷新时读取空值并报错。新样板的有意差异：

```text
/shop/detail              → 重定向 /shop
/shop/detail/g6           → 可直接访问、刷新并恢复商品
/shop/detail/not-valid    → 显式“商品不存在”
```

这不是视觉/产品重做；它只修复深链数据所有权，并为后续 Router/API 迁移提供样板。

## 尚未包含

- 没有迁移真实 Axios 请求；当前 `ShopGateway` 使用经过 parser 的本地 fixture。
- 没有复制旧 1,150 行详情页的评论、店铺、购物车和复杂滑动交互。
- 没有全量迁移 65 条旧路由或 57 个 JavaScript SFC。
- 没有修改 `legacy/` 中的 59 个 TypeScript 错误。
- CI 配置存在于已有提交，但 Round-2 未提交，所以本轮代码尚未由远端 runner 执行。

这些内容属于第 3 轮核心基础设施和后续业务纵切，不应塞进严格类型样板。

## 下一轮

第 3 轮应在当前边界上实现真实核心基础设施：

1. typed HTTP client 与 Axios error → `AppResult` 映射。
2. 环境配置和 Mock/fixture 显式切换。
3. Router 导航/transition/keep-alive 状态。
4. Pinia 按 UI/session/social/navigation 拆分的生产模式。
5. typed event dispatcher 与监听清理。
6. 继续用 Shop gateway 替换为 HTTP/mock 两种 adapter，保持页面与 Store 不变。
