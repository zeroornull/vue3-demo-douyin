# 第 1 轮验收报告：Bun + Vue TypeScript 现代基座

> 执行日期：2026-08-30（Asia/Shanghai）
> 状态：**本轮完成**
> Git：按要求保持未提交、未暂存；HEAD 仍是 `445c21a`

## 结果摘要

| 项目 | 结果 |
| --- | --- |
| 官方骨架 | `create-vue 3.23.0`，`--bare --ts --router --pinia --vitest --playwright --eslint --prettier` |
| 包管理器 | Bun `1.4.0`，文本 `bun.lock` |
| 冻结安装 | 现有树检查 298 installs / 339 packages；空临时目录安装 297 packages，均无 lock 漂移 |
| 运行依赖 | Vue 3.5.42、Router 5.3.0、Pinia 4.0.3 |
| 构建工具 | Vite 8.2.2、`@vitejs/plugin-vue` 6.0.8、TypeScript 6.0.3、vue-tsc 3.3.11 |
| 质量工具 | ESLint 10.9.1 flat config、Oxlint 1.80.0、Prettier 3.9.6 |
| 单元/组件测试 | 3 个文件、4 个测试，全部通过 |
| E2E | 1 个文件、3 个测试，本地 Chrome 和 CI Chromium 模式均通过 |
| 生产构建 | 33 modules，7 个文件，约 103.94 KiB，最终只读门禁约 0.26s |
| 安全审计 | 324 packages，0 vulnerabilities |
| Legacy 边界 | 新运行时代码中 `legacy/` 引用为 0 |

## 本轮产物

- [技术栈与依赖解析](dependency-resolution.md)
- [应用壳与架构](architecture.md)
- [验证证据](verification.md)
- [机器摘要](generated/summary.json)
- [桌面/移动视觉证据](screenshots/)
- [原始命令日志](evidence/)

## 新根目录能力

本轮在仓库根建立：

- `package.json` 与 Bun 文本锁文件 `bun.lock`。
- Vue 3 + TypeScript 严格模式应用。
- `/` 迁移概览页。
- `/health` 运行状态页。
- 具名 Vue Router 5 路由。
- 类型化 Pinia migration store。
- Vitest 纯函数和 Store 测试。
- Playwright production-preview E2E。
- ESLint flat config、Oxlint、Prettier 只读门禁和显式 fix 命令。
- GitHub Actions CI 配置。
- `.env.example` 和 typed `ImportMetaEnv`。

本轮没有复制任何旧页面、资源、Store、Mock、全局 mixin、DOM Proxy、Vue Macros 或 CDN 配置。

## 可重复执行

```bash
bun install --frozen-lockfile
bun run check
bunx playwright install chromium
bun run test:e2e
CI=true VITE_BUILD_SHA=round1test bun run test:e2e
bun audit --audit-level=high
```

`bun run check` 是只读组合门禁：

```text
format:check → oxlint → eslint → vue-tsc → vitest → vite build
```

修复命令与验证命令分离：

```bash
bun run format
bun run lint:fix
```

## 本轮验收清单

- [x] 使用当日官方 `create-vue` 兼容模板，而非手写猜测整套配置。
- [x] `packageManager` 固定 `bun@1.4.0`。
- [x] 新根目录只有 `bun.lock` 作为应用锁文件。
- [x] `bun install --frozen-lockfile` 成功且没有改变锁文件。
- [x] 仅复制 `package.json`/`bun.lock` 到空临时目录后，冻结安装也成功。
- [x] Vue、Router、Pinia 的最小应用壳可启动。
- [x] TypeScript `strict: true`、`allowJs: false`。
- [x] `noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` 和 `useUnknownInCatchVariables` 已开启。
- [x] ESLint 使用 flat config；Oxlint/ESLint 的验证命令不带 `--fix`。
- [x] Vitest 3 个文件、4 个纯函数/Store/组件测试通过。
- [x] Playwright 3 个 production-preview E2E 在本地 Chrome 和 CI Chromium 模式通过。
- [x] Vite 8 production build 成功且无旧 CDN。
- [x] `bun audit --audit-level=high` 无漏洞。
- [x] 新运行时代码没有 `legacy/` import、`$ref`、JavaScript 源文件或旧 CDN 地址。
- [x] CI 文件已创建；其等价命令和 `CI=true` Playwright 分支已在本地验证。

## 已知边界

1. GitHub Actions 尚未在远端真实运行，因为仓库按要求没有 remote 且本轮不提交；本地已验证所有 job 命令和 CI Playwright 分支。
2. `bun outdated` 显示 TypeScript 7、jsdom 30、Node types 26 等更高主版本，但它们被有意保持在当前兼容线，原因见[依赖解析](dependency-resolution.md)。
3. Playwright 日志中的 `NO_COLOR`/`FORCE_COLOR` 提示来自当前执行环境的颜色变量冲突，不影响测试和产物。
4. 官方模板附带的 `vite-plugin-vue-devtools` 没有被保留，因为第 1 轮没有必须由它解决的需求；需要时应在独立变更中重新评估。
5. 当前 UI 是迁移状态壳，不是旧抖音业务页面，也不代表最终产品视觉。

## 下一轮输入

第 2 轮应使用这套已验证基座建立严格 TypeScript 迁移通道，优先处理：

1. Domain/DTO/API error 类型目录。
2. Router meta 和 route data 的深链模型。
3. Pinia Store 边界样板。
4. `$ref` 的 5 个旧 token 迁移策略。
5. 旧项目 59 个 type errors 的分类和单调下降指标。
6. 选择 `/shop` → `/shop/detail` 作为首个代表性纵切，但不在第 2 轮一次性迁完所有页面。
