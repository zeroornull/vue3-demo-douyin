# 依赖版本策略、兼容矩阵与来源

## 1. “使用最新依赖”的精确定义

本项目把“最新”定义为：

1. 实施日 registry 的稳定 `latest`，不自动采用 alpha/beta/RC。
2. 满足整组 peer dependency 和 engine 条件。
3. 通过 Bun 安装、Vue SFC 类型检查、lint、unit、E2E 和生产 build。
4. 在 `package.json` 和 `bun.lock` 中形成可复现结果。
5. 主版本升级有独立迁移记录和回滚点。

因此，`latest` 是**候选发现机制**，不是建议写入 `package.json` 的永久范围。

## 2. 2026-08-30 版本快照

查询自 npm registry `latest` 和 Bun 官方 release：

| 工具/包 | 稳定版本 | 关键兼容条件 |
| --- | ---: | --- |
| Bun | `1.4.0` | 固定开发/CI 版本；检查 Node API 兼容 |
| Vue | `3.5.42` | 不采用当日 Vue 3.6 RC |
| Vue Router | `5.3.0` | Vue `^3.5.34`、Vite 7/8、Pinia 3/4；主版本迁移 |
| Pinia | `4.0.3` | Vue `^3.5.11`、TS `>=5.6`、devtools API v8 peer |
| Vite | `8.2.2` | Node `^20.19` 或 `>=22.12`；Rolldown/Oxc 迁移 |
| TypeScript | `7.0.2` | registry latest，但当前 TS ESLint 生态不接受 |
| TypeScript | `6.0.3` | 本项目推荐首轮：当前 latest 兼容线 |
| TypeScript fallback | `5.9.3` | 若编辑器/插件对 TS 6 有证据充分的问题 |
| vue-tsc | `3.3.11` | peer TypeScript `>=5.0` |
| `@vitejs/plugin-vue` | `6.0.8` | 支持 Vite 5/6/7/8 |
| ESLint | `10.9.1` | Node `^20.19`、`^22.13` 或 `>=24`；flat config |
| `eslint-plugin-vue` | `10.10.0` | 支持 ESLint 8.57/9/10 |
| `vue-eslint-parser` | `10.4.1` | 与 Vue ESLint 配置一起验证 |
| `typescript-eslint` | `8.68.0` | TypeScript `>=4.8.4 <6.1.0` |
| `@vue/eslint-config-typescript` | `14.9.0` | ESLint 9.10/10，TS `>=4.8.4` |
| Prettier | `3.9.6` | 与 ESLint 分开运行 |
| Vitest | `4.1.11` | 与 Vite 8 同组验证 |
| Playwright | `1.62.1` | 浏览器二进制需在 CI 安装 |

## 3. 为什么推荐 TypeScript 6.0.3，而不是 7.0.2

当日事实：

- TypeScript registry `latest` 是 `7.0.2`。
- `typescript-eslint@8.68.0` peer 要求 TypeScript `<6.1.0`。
- `create-vue@3.23.0` 在本环境以 Bun 生成 Vue+TS+Router+Pinia+Vitest+Playwright+ESLint 项目时，写入 `typescript: ~6.0.0`。
- registry 的 TypeScript 6 最新 patch 是 `6.0.3`。

所以首轮采用 `~6.0.3`：它是官方模板所选主/次版本线上的最新 patch，并落在类型 lint 工具支持范围内。若某个编辑器或插件对 TS 6 有可复现问题，可退到 `5.9.3`，但必须记录证据；不能无说明地永久停留旧版。

升级 TypeScript 7 的触发条件：

- typescript-eslint 正式 peer range 包含 TS 7。
- vue-tsc、Vue language tools、Vite 和测试工具通过兼容验证。
- 单独升级 PR 跑完整检查，不与页面迁移混合。

## 4. 推荐安装策略

### 4.1 先以官方模板生成组合

```bash
bun create vue@latest migration-scaffold \
  --bare --ts --router --pinia --vitest --playwright --eslint --prettier
```

官方模板反映 Vue 团队当日验证组合，但仍要检查 registry 和实际项目插件。

### 4.2 固定首轮验证版本

迁移分支的第一次稳定基线建议固定确切版本或窄 patch 范围。示意：

```json
{
  "dependencies": {
    "vue": "3.5.42",
    "vue-router": "5.3.0",
    "pinia": "4.0.3"
  },
  "devDependencies": {
    "vite": "8.2.2",
    "@vitejs/plugin-vue": "6.0.8",
    "typescript": "~6.0.3",
    "vue-tsc": "3.3.11",
    "eslint": "10.9.1",
    "prettier": "3.9.6"
  }
}
```

最终清单应以实施日 `create-vue` 和 peer 解析结果为准。不要手抄上面的局部示意后遗漏 ESLint parser/config、测试和 Node 类型包。

### 4.3 提交锁文件并冻结 CI

```bash
bun install
bun install --frozen-lockfile
git add package.json bun.lock
```

后续升级通过显式 PR；不要在 CI 使用无锁、自动漂移安装。

## 5. Bun 安全和供应链策略

- 提交 `bun.lock`。
- CI 使用 `bun ci` 或 `bun install --frozen-lockfile`。
- 运行 `bun audit --audit-level=high`，根据产品风险定义阻断等级。
- Bun 默认不信任依赖 lifecycle scripts；只有审计后才将必需包加入 `trustedDependencies`。
- 可使用 Bun 的 `minimumReleaseAge` 降低刚发布版本的供应链风险。
- 记录 registry、Bun 版本和 lockfile 哈希。
- 对主版本升级查看 release/migration guide，不只看 semver 数字。

## 6. 旧依赖处置表

| 旧依赖/能力 | 建议 | 验证/删除条件 |
| --- | --- | --- |
| Vue `^3.5.13` | 升级到稳定 Vue 3.5 最新 patch | SFC、SSR/DOM、构建测试 |
| Router `4.3.0` | 单独迁到 5；必要时先到 4.6.4 过渡 | 路由 E2E、守卫、返回、scroll |
| Pinia `^2.1.7` | 单独迁到 4 | ESM、devtools peer、Store tests |
| Vite `^6.4.2` | 单独迁到 8 | Rolldown/Oxc、插件、build、assets |
| TypeScript `5.3.3` | 首轮升至 `~6.0.3` | vue-tsc、IDE、ESLint 全绿 |
| ESLint 8 / `.eslintrc` | 升到 ESLint 10 flat config | Vue/TS parser 兼容，CI 非修改模式 |
| `vite-plugin-cdn-import` | 删除 | 构建产物只含一份 Vue/Router |
| `git-last-commit` | 删除 | build SHA 由 CI 环境注入 |
| `unplugin-vue-macros` | 分阶段删除 | 无 `$ref`/插件专属宏 |
| `@jambonn/vue-lazyload` | 优先用原生/局部 composable 替代 | 占位、失败、懒加载行为测试 |
| `core-js` | 审计后可能删除 | 无直接 import，浏览器目标无需 polyfill |
| Axios | 可保留并升级 | typed client 和错误测试 |
| `axios-mock-adapter` | 可保留并升级 | 满足 client/fixture 测试需求 |
| Mock.js | 先隔离，再评估替换 | typed fixture；浏览器级 Mock 需求明确 |
| Less | 本次保留并升级兼容版 | 避免同时切换样式技术 |
| `libarchive-wasm` | 升级并单独冒烟 | WASM 路径、MIME、生产 base 验证 |

## 7. Vite 8 专项审计

Vite 8 使用 Rolldown/Oxc 后，检查旧配置或插件是否依赖：

- `optimizeDeps.esbuildOptions`
- `transformWithEsbuild`
- `build.minify = 'esbuild'`
- `esbuild.drop/banner/footer`
- Rollup 内部行为或旧插件钩子
- CSS/JS minification 结果
- 默认浏览器 target

旧配置中存在 `esbuild` 块和复杂 `manualChunks`，即使部分内容被注释，也不要直接复制。以最小 Vite 8 配置起步，用构建证据逐条恢复。

## 8. ESLint flat config 策略

优先使用官方 Vue TypeScript 配置组合，而不是手工拼 parser：

- ESLint 10 flat config。
- `eslint-plugin-vue` flat recommended/essential。
- `@vue/eslint-config-typescript`。
- `eslint-config-prettier/flat` 关闭格式冲突。
- Prettier 单独运行，不默认把它变成 ESLint rule。
- 若保留官方模板加入的 Oxlint，明确 Oxlint 做快速通用检查、ESLint 做 Vue/TS 语义规则，避免重复和冲突。

CI 中：

```bash
bun run lint:check
bun run format:check
git diff --exit-code
```

## 9. 来源

### Bun

- 最新 release：<https://github.com/oven-sh/bun/releases/latest>
- 安装与 package manager：<https://bun.sh/docs/pm/cli/install>
- 锁文件：<https://bun.sh/docs/install/lockfile>
- Node.js 兼容：<https://bun.sh/docs/runtime/nodejs-compat>
- 安全审计：<https://bun.sh/docs/pm/cli/audit>

### npm registry latest metadata

- Vue：<https://registry.npmjs.org/vue/latest>
- Vue Router：<https://registry.npmjs.org/vue-router/latest>
- Pinia：<https://registry.npmjs.org/pinia/latest>
- Vite：<https://registry.npmjs.org/vite/latest>
- TypeScript：<https://registry.npmjs.org/typescript/latest>
- vue-tsc：<https://registry.npmjs.org/vue-tsc/latest>
- `@vitejs/plugin-vue`：<https://registry.npmjs.org/@vitejs%2fplugin-vue/latest>
- ESLint：<https://registry.npmjs.org/eslint/latest>
- `typescript-eslint`：<https://registry.npmjs.org/typescript-eslint/latest>
- `eslint-plugin-vue`：<https://registry.npmjs.org/eslint-plugin-vue/latest>
- `@vue/eslint-config-typescript`：<https://registry.npmjs.org/@vue%2feslint-config-typescript/latest>
- Prettier：<https://registry.npmjs.org/prettier/latest>

### 迁移/配置指南

- Vue Router migration：<https://router.vuejs.org/guide/migration/>
- Pinia releases：<https://github.com/vuejs/pinia/releases>
- Vite migration：<https://vite.dev/guide/migration>
- ESLint configuration：<https://eslint.org/docs/latest/use/configure/configuration-files>
- ESLint migration：<https://eslint.org/docs/latest/use/configure/migration-guide>

版本号是 2026-08-30 的证据快照。真正实施或升级时，必须重新查询这些来源并保存新日期。
