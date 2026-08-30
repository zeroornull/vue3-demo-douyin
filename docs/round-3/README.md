# 第 3 轮验收报告：核心基础设施

> 执行日期：2026-08-30（Asia/Shanghai）
> 状态：**本轮完成**
> Git：本轮基线 HEAD 为 `b79b695`；本轮没有创建或暂存新提交

## 结果摘要

| 项目 | 结果 |
| --- | --- |
| HTTP client | Axios 1.20.0，返回 `AppResult<unknown>` |
| HTTP error | aborted/http/network/timeout/unexpected 全部映射 |
| Shop adapter | fixture 与 HTTP Gateway 可由环境切换，页面/Store 不变 |
| Environment | API base、timeout、Shop source 运行时解析 |
| E2E mode | `.env.e2e` 强制使用 HTTP adapter，Playwright mock API |
| Navigation | 基于 history position 推导 forward/back，不使用路由表索引 |
| KeepAlive | typed meta + component name 去重缓存列表页 |
| Event | typed dispatcher，订阅返回 unsubscribe，Store 实际 emit |
| Tests | 13 个 Vitest 文件、43 个测试；10 个 production-preview E2E |
| Build | 110 modules；40 个产物，约 1.40 MiB，其中商品图约 1.22 MiB |
| Security | 349 packages，0 vulnerabilities |

## 文档入口

- [HTTP、环境与 Adapter](http-and-environment.md)
- [导航、KeepAlive 与事件](navigation-and-events.md)
- [架构和迁移指标](architecture-and-metrics.md)
- [验证证据](verification.md)
- 机器摘要（本地生成：`generated/summary.json`）
- 浏览器状态证据（本地生成：`generated/browser-states.json`）
- 视觉截图（本地生成：`screenshots/`）
- 原始日志（本地生成：`evidence/`）

## Git 边界

Round 2 已由外部操作提交为：

```text
b79b695 feat: complete round 2 of TypeScript migration, including strict type enforcement and shop fixture import
```

本轮保留当前 `master`、`origin` 和该提交；没有创建 Round-3 commit，暂存区为空。

## 本轮完成定义

- [x] Axios 只存在于 infrastructure adapter，不泄漏到页面、Store 或 Domain。
- [x] HTTP response data 从 `unknown` 开始，仍经过 Round-2 parser。
- [x] canceled、timeout、HTTP status、network 和 unexpected 分支可区分。
- [x] HTTP status error 不暴露响应 body/秘密到 AppError。
- [x] 环境变量经过 runtime parser，不直接散落在业务组件。
- [x] 默认开发使用 fixture，E2E build 使用 HTTP。
- [x] Shop 页面/Store 在切换 adapter 后不改 API。
- [x] HTTP success、empty、503 和 invalid payload 都有浏览器级验证。
- [x] 导航方向基于 history position，而非旧 routes.findIndex。
- [x] KeepAlive component name 由 typed route meta 管理并去重。
- [x] typed event listener 可 unsubscribe/clear。
- [x] 新运行时代码仍保持 0 `any`、0 `$ref`、0 type suppression、0 JS。
- [x] 冻结安装、空目录安装、格式、lint、typecheck、unit、build、E2E、audit 全绿。

## 可重复执行

```bash
bun install --frozen-lockfile
bun run check
bun run build
bun run test:e2e
CI=true VITE_BUILD_SHA=round3test bun run test:e2e
bun audit --audit-level=high
bun run migration:round3:collect
```

HTTP 状态视觉采集：

```bash
bun run build:e2e
bun run preview -- --host 127.0.0.1 --port 4173 --strictPort
node scripts/round-3/capture-http-states.mjs
```

## 有意边界

- 真实后端仍未接入；Playwright route 模拟 `/api/shop/products`，但浏览器中运行的确实是 Axios HTTP adapter。
- 当前 Shop detail 仍通过 list endpoint 恢复商品；`getById` adapter 已有单测，真实后端可在下一纵切决定是否启用独立 endpoint。
- Navigation Store 建立方向和 KeepAlive 合同，没有迁入旧项目全部复杂转场和排除列表。
- Event bus 只承载 typed `shop:product-viewed`，没有把所有状态重新变成全局事件。
- 本轮不迁移用户/session/social Store；这些应在业务纵切需要时进入，而非提前复制大 Store。

## 下一轮

第 4 轮进入按业务纵切迁移页面与资源。建议顺序：

1. Login：表单、校验、错误结果和路由。
2. Profile：typed session/user DTO 与编辑流程。
3. Message：列表、会话 fixture 和事件订阅清理。
4. Home 搜索/音乐/直播。
5. 最后迁移最复杂的 Home 视频流。

每个纵切继续复用当前 HTTP、Result、Router、Pinia、event 和测试合同，不重新建立平行基础设施。
