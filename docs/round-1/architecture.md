# 第 1 轮：应用壳与架构

## 文件结构

```text
src/
├── App.vue
├── assets/
│   └── main.css
├── lib/
│   └── health.ts
├── main.ts
├── router/
│   └── index.ts
├── stores/
│   └── migration.ts
├── views/
│   ├── HealthView.vue
│   ├── MigrationHomeView.vue
│   └── NotFoundView.vue
└── __tests__/
    ├── health.spec.ts
    ├── health-view.spec.ts
    └── migration-store.spec.ts
```

新 `src/` 共 12 个文件：

- 7 个 TypeScript 文件。
- 4 个 Vue SFC，全部为 `script setup lang="ts"`。
- 1 个 CSS 文件。
- JavaScript/JSX/CJS/MJS 生产源文件：0。

## 启动入口

`src/main.ts` 只做四件事：

1. 创建 Vue app。
2. 导入全局基础 CSS。
3. 安装 Pinia。
4. 安装 Router 并 mount。

没有：

- 全局 mixin。
- DOM prototype 修改。
- 全局 window mutable state。
- Vue Macros plugin。
- Axios Mock 启动副作用。
- CDN runtime 注入。
- Legacy import。

## Router

当前有三条具名路由：

| Name | Path | Component |
| --- | --- | --- |
| `migration-home` | `/` | `MigrationHomeView.vue` |
| `health` | `/health` | `HealthView.vue` |
| `not-found` | `/:pathMatch(.*)*` | `NotFoundView.vue` |

三个页面都使用动态 import。Router 使用 `createWebHistory(import.meta.env.BASE_URL)`，scroll behavior 只负责返回顶部；catch-all 路由会明确告知页面尚未迁移，不产生 Vue Router 的 no-match 警告。没有迁入旧路由索引/KeepAlive 推断逻辑。

## Pinia

`useMigrationStore` 只保存迁移状态：

- `completed: readonly number[]`
- `nextRound: number`
- `summary: computed string`

它没有 DOM、API、Router 或 legacy fixture 依赖。Store 单测通过独立 `createPinia()` 初始化，证明测试之间不共享状态。

## Health contract

`createHealthSnapshot` 是纯函数，输入：

- 可选 build SHA。
- Vite mode。
- Vue runtime version。

输出固定判别值：

```text
status: "ok"
```

`/health` 在 production preview 显示：

- Vue 3.5.42。
- production mode。
- build SHA 或 local fallback。
- Bun 1.4 package manager 基线。

`VITE_BUILD_SHA` 已通过 `env.d.ts` 类型化，CI 使用 `${{ github.sha }}` 注入。

## TypeScript 严格设置

`tsconfig.app.json` 明确设置：

```json
{
  "strict": true,
  "allowJs": false,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "useUnknownInCatchVariables": true
}
```

`tsconfig.node.json` 使用 module bundler resolution，并只在 `noEmit` 工具配置中开启 `allowImportingTsExtensions`，以消除 Vite native config loader 的无扩展 import 警告。

## UI 边界

当前页面只表达迁移状态，不尝试模拟旧抖音业务：

- 语义 header/nav/main/footer。
- Skip link 和可见 focus outline。
- 深色、高对比度、非渐变视觉。
- 桌面与 390px 移动布局。
- `prefers-reduced-motion` 处理。
- 没有图片、第三方字体或外部媒体请求。

视觉证据：

- [`screenshots/home-desktop.png`](screenshots/home-desktop.png)
- [`screenshots/home-mobile.png`](screenshots/home-mobile.png)
- [`screenshots/health-desktop.png`](screenshots/health-desktop.png)
- [`screenshots/health-mobile.png`](screenshots/health-mobile.png)

## 构建边界

机器扫描确认新运行时代码：

```text
legacy references=0
old CDN references=0
$ref tokens=0
JavaScript source files=0
```

旧项目仍只存在于被忽略的 `legacy/`，新应用没有通过相对路径或 alias 引入它。
