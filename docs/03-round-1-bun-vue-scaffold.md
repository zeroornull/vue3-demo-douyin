# 第 1 轮：Bun 与官方 Vue TypeScript 骨架

## 1. 本轮目标

建立一个**没有旧业务代码**的现代基座，证明 Bun、Vue、Vite、TypeScript、lint 和测试工具能够作为一个兼容整体工作。只有这个基座全绿后，才允许迁移公共能力和页面。

## 2. 运行时前置条件

截至版本核对日：

```bash
bun --version   # 目标：1.4.0
node --version  # 保留兼容基线：>= 22.18.0；当前环境 22.23.2 满足
```

为什么仍记录 Node：`create-vue@3.23.0` 声明 Node `^22.18.0 || >=24.12.0`，Vite/ESLint 也声明 Node engines。Bun 是默认安装器和脚本运行器，但生态插件、编辑器或 CI 工具仍可能在某一步调用 Node。只有所有链路都有证据后，才能讨论移除 Node fallback。

## 3. 从官方生成器建立临时骨架

不要在仓库根直接使用 `--force`，因为根目录已经有 `docs/`、`.gitignore` 和 `legacy/`。在临时目录生成，再有选择地合入：

```bash
bun create vue@latest migration-scaffold \
  --bare \
  --ts \
  --router \
  --pinia \
  --vitest \
  --playwright \
  --eslint \
  --prettier
```

当日 `create-vue@3.23.0` 还会在选择 ESLint 时加入 Oxlint。保留生成结果，先不要手工“精简”配置；官方模板是兼容矩阵的起点。

### 建议合入内容

逐项审查并复制：

- `package.json`
- `src/`、`public/` 的空骨架
- `index.html`
- `vite.config.ts`、`vitest.config.ts`、`playwright.config.ts`
- `tsconfig*.json`、`env.d.ts`
- `eslint.config.ts`、`.oxlintrc.json`、`.prettierrc.json`
- `.editorconfig`、`.gitattributes`
- `e2e/`
- `.vscode/extensions.json` 和 `.vscode/settings.json`（可选但推荐）

不要覆盖：

- `.git/`
- `docs/`
- `legacy/`
- 根 `.gitignore` 中的 `/legacy/` 与 `/.omx/` 规则

合入后删除临时 `migration-scaffold/`，确保它没有进入 Git。

## 4. 调整 `package.json`

建议以生成结果为主，并加入运行时声明：

```json
{
  "private": true,
  "type": "module",
  "packageManager": "bun@1.4.0",
  "engines": {
    "bun": ">=1.4.0",
    "node": "^22.18.0 || >=24.12.0"
  }
}
```

脚本建议保持小而明确：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "run-p type-check \"build-only {@}\" --",
    "build-only": "vite build",
    "preview": "vite preview",
    "type-check": "vue-tsc --build",
    "lint": "run-s \"lint:*\"",
    "lint:oxlint": "oxlint .",
    "lint:eslint": "eslint . --cache",
    "format": "prettier --write src/ tests/ e2e/",
    "format:check": "prettier --check src/ tests/ e2e/",
    "test:unit": "vitest",
    "test:e2e": "playwright test",
    "check": "run-s type-check lint format:check test:unit:run build-only"
  }
}
```

注意：官方生成模板的 lint/format 命令默认带 `--fix` 或 `--write`。CI 的验证命令必须是非修改模式；可以保留本地修复脚本，同时增加 `lint:check` 和 `format:check`。

## 5. 安装与锁文件

```bash
bun install
git status --short
```

Bun 1.4 生成文本锁文件 `bun.lock`。新根目录中只保留并提交这一份锁文件；旧 `pnpm-lock.yaml` 留在被忽略的 `legacy/` 中作复现用途。

验证可重复安装：

```bash
bun install --frozen-lockfile
```

若冻结安装会修改锁文件或失败，不得进入下一步。先查清平台可选依赖、registry、peer dependency 或 Bun 版本差异。

## 6. 最小应用壳

本轮只保留：

- `App.vue`：一个可访问的标题和 `<RouterView />`。
- `/`：迁移状态首页。
- `/health`：显示构建版本、运行环境和静态健康状态。
- 一个 Pinia 示例 Store，仅用于证明安装顺序和类型推断。
- 一个纯函数单测。
- 一个访问 `/health` 的 Playwright 冒烟测试。

不要在本轮引入旧的：

- 全局 mixin。
- `HTMLElement.prototype` Proxy。
- `$ref` 宏。
- CDN Vue/Router。
- 手工 `manualChunks` 大表。
- 全部 Mock 数据和资源。

## 7. Vite 最小配置

先从简单配置开始：

```ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
```

每一个后来加入的插件都必须回答：解决什么已验证问题、是否支持当前 Vite/Vue/Bun、怎样测试、何时删除。不要先复制旧 `vite.config.ts` 再逐行猜测。

## 8. CI 基线

CI 至少执行：

```bash
bun install --frozen-lockfile
bun run type-check
bun run lint
bun run format:check
bun run test:unit --run
bun run build
bun run test:e2e
```

缓存键应包含操作系统、Bun 版本和 `bun.lock` 哈希。不要缓存工作树 `node_modules` 作为唯一正确性来源；必须证明无缓存也能冻结安装。

## 9. 本轮验收门禁

- [ ] `packageManager` 和 engines 明确。
- [ ] 根目录只有 `bun.lock` 作为新应用锁文件。
- [ ] `bun install --frozen-lockfile` 在干净环境成功。
- [ ] Vue、Router、Pinia 能启动并有最小类型证明。
- [ ] TypeScript 默认严格，不含 `allowJs: true`。
- [ ] ESLint 使用 flat config；CI 命令不会自动修改文件。
- [ ] Vitest 与 Playwright 各有一个稳定测试。
- [ ] `bun run build` 与 `bun run preview` 成功。
- [ ] 构建产物不含第二份 CDN Vue/Router。
- [ ] 新应用没有任何 `legacy/` import。
