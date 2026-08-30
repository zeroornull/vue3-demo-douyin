# 第 3 轮：验证证据

## 最终命令

| 验证 | 结果 | 证据 |
| --- | --- | --- |
| `bun install` | Axios 1.20.0 安装成功 | `bun-install.log`（本地生成：`evidence/bun-install.log`） |
| `bun install --frozen-lockfile` | 323 installs / 364 packages，无变化 | `bun-install-frozen.log`（本地生成：`evidence/bun-install-frozen.log`） |
| 空目录冻结安装 | 322 packages，package/lock 哈希一致 | `bun-install-clean-frozen.log`（本地生成：`evidence/bun-install-clean-frozen.log`） |
| `bun run check` | 全部通过 | `check.log`（本地生成：`evidence/check.log`） |
| `bun run build` | typecheck + build 通过 | `build.log`（本地生成：`evidence/build.log`） |
| 本地 E2E | 10/10 | `e2e.log`（本地生成：`evidence/e2e.log`） |
| CI-mode E2E | 10/10 | `e2e-ci-mode.log`（本地生成：`evidence/e2e-ci-mode.log`） |
| HTTP 状态截图 | 5/5 | `capture-http-states.log`（本地生成：`evidence/capture-http-states.log`） |
| `bun audit --audit-level=high` | 349 packages，0 vulnerabilities | `bun-audit.log`（本地生成：`evidence/bun-audit.log`） |

## Check 结果

```text
Prettier                 passed
Oxlint                   passed
ESLint 10                passed
vue-tsc                  passed
Vitest files             13 passed
Vitest tests             43 passed
Vite modules             110 transformed
Vite production build    passed in 454ms
exit_code                0
```

Combined `bun run build`：

```text
vue-tsc --build          passed
vite build               passed in 531ms
exit_code                0
```

## E2E 结果

`.env.e2e` 强制：

```text
VITE_SHOP_DATA_SOURCE=http
```

10 个测试：

1. 根迁移页。
2. Health，断言 data source 为 http。
3. catch-all。
4. HTTP success list → stable detail。
5. detail direct/reload 和全部图片。
6. invalid ProductId。
7. legacy detail redirect。
8. HTTP 200 empty。
9. HTTP 503 typed error。
10. HTTP 200 invalid payload → parse error。

本地 Google Chrome 和 `CI=true` Chromium 各 10/10。

503 时浏览器按规范产生一条 resource console error；测试断言该 503 是唯一 console error，页面没有 page exception，UI 显示 typed HTTP error。

## 视觉状态

浏览器状态采集：

| 状态 | Page errors | Console errors |
| --- | ---: | ---: |
| health/http | 0 | 0 |
| success | 0 | 0 |
| empty | 0 | 0 |
| 503 | 0 | 1 个预期 503 resource error |
| parse error | 0 | 0 |

截图：

- `screenshots/health-http.png`（本地生成：`screenshots/health-http.png`）
- `screenshots/shop-http-success.png`（本地生成：`screenshots/shop-http-success.png`）
- `screenshots/shop-http-empty.png`（本地生成：`screenshots/shop-http-empty.png`）
- `screenshots/shop-http-503.png`（本地生成：`screenshots/shop-http-503.png`）
- `screenshots/shop-http-parse-error.png`（本地生成：`screenshots/shop-http-parse-error.png`）

机器数据：`generated/browser-states.json`（本地生成：`generated/browser-states.json`）。

## 门禁捕获的问题

### Route meta unknown

第一次 typecheck 发现 Vue Router 5 `to.meta.title` 仍是 unknown。只依赖 module augmentation 不足以证明运行时数据。

修复：增加 `AppRouteMeta`、`defineRouteMeta` 和 `parseRouteMeta`。

### 空 augmentation lint

将 RouteMeta 写成只 extends 项目接口的空 interface 后，ESLint 报 `no-empty-object-type`。

修复：删除 `meta.d.ts`，统一使用可运行/可测试的 `meta.ts` 边界。

### Migration round parser

新增 Round 3 测试后，parser 仍只接受 1/2，测试失败。

修复：显式扩展到 1/2/3，并保留 invalid transition 测试。

### Node JSON import attribute

Playwright 直接运行 ESM test 时要求 JSON import attribute。

修复：

```ts
import fixture from './goods.fixture.json' with { type: 'json' }
```

### 503 console 语义

真实浏览器对 503 resource 会输出 console error。这是网络事实，不应伪装为 0。最终测试接受且只接受一条包含 503 的 console error，并继续要求 0 page exception。

失败/迭代日志保存在 `evidence/check-attempt-*` 和 `evidence/e2e-attempt-*`。

## 安全和依赖

```text
axios latest query=1.20.0
bun audit=0 vulnerabilities
lock frozen=no changes
clean install=package/lock hash match
```

`bun outdated` 仍只报告既有 TypeScript 7、jsdom 30、Node types 26 等有意不升级的主版本候选。

## 限制

- Playwright route 是可控 HTTP 服务替身，不等于真实生产后端。
- 尚未验证 CORS、真实 TLS、代理和服务端 auth。
- timeout/cancel/network mapping 有 unit 证据；浏览器 E2E 当前覆盖 503、empty 和 parse failure。
- Round-3 尚未提交，因此远端 CI 没有运行本轮代码。
