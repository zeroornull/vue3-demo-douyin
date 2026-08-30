# 现状与目标

## 1. 旧项目基线

旧项目快照位于 `legacy/`。本次盘点来自重置前的工作树和代码知识图谱，统计只用于规划；实施时应通过脚本重新生成。

### 1.1 规模和结构

| 项目 | 基线值 |
| --- | ---: |
| Git 跟踪文件 | 2,316 |
| Vue SFC | 128 |
| `script setup lang="ts"` SFC | 69 |
| `script setup` JavaScript SFC | 19 |
| 传统 JavaScript `<script>` SFC | 38 |
| 传统 TypeScript `<script lang="ts">` SFC | 2 |
| `src/` TypeScript/TSX 文件 | 19 |
| `src/` JavaScript 文件 | 3 |
| `node/` JavaScript 数据处理脚本 | 10 |
| `$ref` 非标准宏 token | 5（4 个文件） |
| 显式 `any`（`: any` + `as any`） | 54 |

由此可见，项目并不是“从 JavaScript 迁到 TypeScript”的零起点：它已经混合使用 Vue 3、TS、JS 和 Vue Macros。真正的任务是**收紧类型边界、移除非标准运行假设并建立可持续工具链**。

### 1.2 当前依赖基线

旧根 `package.json` 的关键版本：

| 能力 | 旧版本 |
| --- | --- |
| Vue | `^3.5.13` |
| Vue Router | `4.3.0` |
| Pinia | `^2.1.7` |
| Vite | `^6.4.2` |
| TypeScript | `5.3.3` |
| vue-tsc | `^2.0.6` |
| ESLint | `^8.57.0`，传统 `.eslintrc` |
| 包管理器/锁文件 | pnpm / `pnpm-lock.yaml` |

当前 `tsconfig.app.json` 设置 `allowJs: true`、`strict: false`。这意味着文件扩展名虽然已有不少 `.ts`，但编译器并没有提供严格迁移应有的保护。

### 1.3 架构边界

- `src/main.ts`：安装全局 mixin、Pinia、Router、懒加载插件，并代理 `HTMLElement.prototype.addEventListener`。
- `src/router/`：集中式路由表，包含大量动态页面导入；导航守卫直接读写 Pinia。
- `src/store/pinia.ts`：单个大型 Options Store，状态、动作和 API 响应缺少显式类型。
- `src/api/` 与 `src/utils/request.ts`：Axios 请求边界，是类型化 API 的最佳切入点。
- `src/mock/index.ts`：大型 Mock 入口，和 Pinia 启动顺序耦合。
- `vite.config.ts`：异步读取 Git 提交、按生命周期切换插件、手工分包，并通过 CDN 插件固定 Vue `3.4.21` 与 Router `4.3.0`。
- `node/`：资源抓取和 JSON 处理脚本，可迁移为 Bun 执行的 `scripts/*.ts`。
- `public/` 与 `src/assets/`：大体积图片、WebP、JSON、WASM 等静态资源，不能在没有清单的情况下整体复制。

### 1.4 已知高风险点

1. **双版本风险**：本地 npm 依赖与 Vite CDN 中的 Vue/Router 版本不同，升级后可能在开发和生产呈现不同运行时。
2. **全局副作用**：修改 `HTMLElement.prototype` 会影响第三方组件和所有点击处理器。
3. **宏锁定**：`$ref` 属于非标准宏，直接移除 `unplugin-vue-macros` 会造成编译失败或响应性错误。
4. **类型债务集中**：Pinia、Mock、API 响应和路由 meta 的类型会向所有页面传播。
5. **历史依赖**：构建中读取最后一次 Git 提交；仓库重置后必须重新定义构建版本来源。
6. **资源规模**：一次性复制旧图片和 JSON 会让审查、性能比较和死资源判断失真。
7. **部署分支**：旧配置包含 Gitee/GitHub Pages、Netlify、Vercel 和 Uni 模式；必须先决定仍需支持哪些目标。

## 2. 目标状态

迁移完成后应满足：

- Bun 是唯一的依赖安装器、锁文件生成器和默认脚本入口。
- 应用源码以 TypeScript 为默认语言，`strict: true`，`allowJs: false`。
- 使用稳定 Vue 3、Vue Router 5、Pinia 4、Vite 8 的兼容组合。
- 不依赖 CDN 注入 Vue 核心运行时，开发和生产解析同一份锁定依赖。
- 不使用 `$ref` 等非标准响应性语法；优先使用 Vue 原生 `ref`、`reactive`、`computed`、`defineModel`。
- API、路由、Store、事件和环境变量都有明确类型边界。
- 关键业务路径有 Vitest 单元/组件测试和 Playwright E2E 覆盖。
- `bun install --frozen-lockfile`、类型检查、lint、测试和生产构建在 CI 中全部通过。
- 构建产物不读取旧 Git 历史，也不引用 `legacy/`。

## 3. 目标版本快照

以下是 2026-08-30 从 npm `latest`、Bun 官方 GitHub Release 和 `create-vue@3.23.0` 生成结果核对的快照：

| 包/工具 | 当日稳定版 | 本项目首轮建议 |
| --- | ---: | ---: |
| Bun | `1.4.0` | `1.4.0` |
| Vue | `3.5.42` | `3.5.42` |
| Vue Router | `5.3.0` | `5.3.0` |
| Pinia | `4.0.3` | `4.0.3` |
| Vite | `8.2.2` | `8.2.2` |
| TypeScript | `7.0.2` | `~6.0.3`，暂不采用 7 |
| vue-tsc | `3.3.11` | `3.3.11` |
| `@vitejs/plugin-vue` | `6.0.8` | `6.0.8` |
| ESLint | `10.9.1` | 由当日 `create-vue` 兼容模板确定 |
| Prettier | `3.9.6` | `3.9.6` |
| Vitest | `4.1.11` | `4.1.11` |
| Playwright | `1.62.1` | `1.62.1` |

TypeScript 是有意的例外：`typescript-eslint@8.68.0` 当日 peer dependency 要求 TypeScript `<6.1.0`，而官方 `create-vue@3.23.0` 也生成 `typescript: ~6.0.0`。因此“所有包一律 `@latest`”会制造一个已知不兼容组合。详见[依赖策略](10-dependency-policy.md)。

## 4. 非目标

以下内容不应顺便塞进本次迁移：

- 重做全部视觉设计或产品交互。
- 在没有 ADR 和收益证据时替换 Axios、Pinia 或 Router。
- 把所有页面一次性改成同一种 Vue 编码风格。
- 同时更换 CSS 方案、组件库、测试框架和部署平台。
- 为追求“零依赖”自行实现已有且稳定的标准能力。
- 在新应用中直接导入 `legacy/`，把旧目录变成永久兼容层。
