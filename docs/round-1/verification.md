# 第 1 轮：验证证据

## 最终门禁

| 验证 | 命令 | 结果 | 日志 |
| --- | --- | --- | --- |
| Bun 安装 | `bun install` | 通过，无最终 peer warning | [`bun-install.log`](evidence/bun-install.log) |
| 冻结安装 | `bun install --frozen-lockfile` | 通过，无变化 | [`bun-install-frozen.log`](evidence/bun-install-frozen.log) |
| 空目录冻结安装 | 临时目录 `bun install --frozen-lockfile` | 297 packages，通过且输入哈希不变 | [`bun-install-clean-frozen.log`](evidence/bun-install-clean-frozen.log) |
| 格式 | `bun run format:check` | 通过 | [`check.log`](evidence/check.log) |
| Oxlint | `bun run lint:oxlint` | 通过 | [`check.log`](evidence/check.log) |
| ESLint | `bun run lint:eslint` | 通过 | [`check.log`](evidence/check.log) |
| TypeScript | `bun run type-check` | 通过 | [`check.log`](evidence/check.log) |
| Unit/component | `bun run test:unit:run` | 3 files / 4 tests 通过 | [`check.log`](evidence/check.log) |
| Build | `bun run build-only` | 33 modules / 7 files 通过 | [`check.log`](evidence/check.log) |
| Local E2E | `bun run test:e2e` | 3 tests 通过 | [`e2e.log`](evidence/e2e.log) |
| CI-mode E2E | `CI=true ... bun run test:e2e` | 3 tests 通过 | [`e2e-ci-mode.log`](evidence/e2e-ci-mode.log) |
| Audit | `bun audit --audit-level=high` | 0 vulnerabilities | [`bun-audit.log`](evidence/bun-audit.log) |

所有最终日志中的 `exit_code` 都是 0。

## `bun run check`

最终输出：

```text
Prettier: passed
Oxlint: passed
ESLint: passed
vue-tsc: passed
Vitest: 3 files passed, 4 tests passed
Vite 8.2.2: 33 modules transformed
Build: passed in 264ms
```

本轮还验证了门禁自身会失败：

1. 第一次检查捕获 Round-0 CommonJS 采集器的 3 个 `require()` lint 错误；采集器随后迁成 ESM `.mjs`。
2. 第二次检查发现 `lint:*` 会错误包含 fix scripts；已改为显式 `lint:oxlint lint:eslint`，保证验证不修改源码。
3. 第三次检查捕获旧 ECMAScript lib 下不可用的 `Array.prototype.at`；Store 改为受 `noUncheckedIndexedAccess` 保护的索引读取。
4. Vite native config warning 修复时，TypeScript 又捕获 `.ts` import extension 需要显式配置；最终只在工具 tsconfig 中开启 `allowImportingTsExtensions`。

这些失败证明门禁不是装饰性脚本，能够发现工具配置和源码问题。历史失败日志保存在 `evidence/`。

## 单元测试

### Health pure function

- 显式 build SHA 被保留。
- 缺少 build SHA 时使用 `local`。
- 返回判别值 `status: "ok"`。

### Pinia migration store

- 使用独立 Pinia 初始化。
- 完成轮次为 `[0, 1]`。
- 下一轮为 2。
- computed summary 与状态一致。

### Vue component

- `HealthView.vue` 通过 Vue Test Utils 挂载。
- 组件渲染 `status: ok`。
- 组件渲染 Bun package manager 基线。

## E2E

E2E 只针对 production preview，而不是 Vite dev server：

```text
bun run build-only
bun run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

测试：

1. `/` 显示迁移主标题和导航。
2. `/health` 显示运行状态 `ok` 和 Vue 3.5 版本。
3. 未匹配路径显示显式 404 页面和返回链接，不产生 Router no-match warning。

本地模式使用系统 Google Chrome；`CI=true` 使用 Playwright Chromium。两个分支的 3 个测试都通过。

另外，Vite dev server 对 `/`、`/health` 和 catch-all 样例 `/mine` 都返回 200，且 `/mine` 不再产生 Vue Router no-match warning。证据见 [`dev-server.log`](evidence/dev-server.log) 和 [`dev-http-smoke.log`](evidence/dev-http-smoke.log)。

## 构建结果

| 产物 | 原大小 | gzip |
| --- | ---: | ---: |
| 主 JS | 93,357 B | 36,589 B |
| CSS | 4,168 B | 1,565 B |
| Migration Home chunk | 2,218 B | 1,370 B |
| Health chunk | 1,131 B | 656 B |
| Not Found chunk | 624 B | 506 B |
| HTML | 648 B | 429 B |
| favicon | 4,286 B | — |

最终精确大小由 [`generated/summary.json`](generated/summary.json) 记录；新增显式 404 chunk 后为 106,432 B，约 103.94 KiB。

构建产物不包含：

- `legacy/` 路径。
- Baomitu CDN。
- `vue.runtime.global`。
- `vue-router.global`。
- 旧 Mock/资源 JSON。

## CI

`.github/workflows/ci.yml`：

1. `actions/checkout@v4`。
2. `oven-sh/setup-bun@v2`，Bun 1.4.0。
3. 冻结安装。
4. 只读 `bun run check`。
5. 安装 Playwright Chromium。
6. `CI=true` production-preview E2E。
7. 失败时上传 Playwright 报告。

真实 GitHub-hosted 执行仍需要未来添加 remote 并提交；本轮遵守“不提交”约束，只运行了本地等价路径。

## 索引与直接验证

Round-1 code graph 使用 fast index，主要运行时源文件无记录解析缺口。测试、E2E、assets 和脚本被索引策略排除，因此相关结论来自直接源码读取以及实际 Vitest/Playwright/Prettier/ESLint 执行，而不是从图谱作负面推断。
