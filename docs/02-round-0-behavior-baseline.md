# 第 0 轮：建立行为基线

## 1. 本轮目标

在新代码出现之前，捕获旧项目的可重复行为证据。完成本轮后，迁移讨论应能回答：“新实现与哪一份旧行为比较？”

旧项目位于 `legacy/`，它被新仓库忽略。所有基线产物中只有**说明、测试设计和经筛选的小型证据**进入新仓库；不要把整个旧资源目录重新加入 Git。

## 2. 运行旧项目

旧项目仍使用 pnpm 锁文件。为了忠实复现，不要先升级它：

```bash
cd legacy
corepack enable
pnpm install --frozen-lockfile
pnpm run type-check
pnpm run build
pnpm run dev
```

若旧依赖在当前 Node 下无法安装，应记录 Node 版本、错误和临时复现环境，而不是修改旧 `package.json`。可以使用容器或版本管理器锁定旧运行环境。

### 必须记录的环境

```bash
node --version
pnpm --version
git --version
uname -a
```

## 3. 路由基线

旧 `src/router/routes.ts` 有大量页面路由。先生成机器可读清单，再人工标注优先级：

| 字段 | 含义 |
| --- | --- |
| path | URL 路径 |
| name | 稳定路由名；缺少时记录待补 |
| component | 旧组件路径 |
| data source | Mock、静态 JSON 或真实 API |
| auth/state | 所需 Store 状态 |
| smoke | 最小可验证操作 |
| priority | P0/P1/P2 |
| migrated | 未开始/进行中/完成 |

优先覆盖以下纵切：

1. `/home`：首屏、视频/长视频内容、滑动/点击、静音提示。
2. `/home/search`：搜索入口和结果。
3. `/shop` → `/shop/detail`：列表到详情导航。
4. `/message` → `/message/chat`：消息列表和会话。
5. `/me` → 编辑资料相关页面：Store 初始化和表单。
6. `/login` 及密码/验证码路径：输入、校验、跳转。
7. `/video-detail`：动态导入、参数和返回行为。

## 4. 视觉与交互基线

每个 P0 路由至少捕获：

- 视口：移动端主尺寸、窄屏和桌面预览各一份。
- 页面加载后稳定截图。
- 关键交互前后截图或短录屏。
- 控制台错误和未处理 Promise。
- 网络请求/Mock 响应摘要。
- 首屏加载、路由切换和主要资源体积。

建议使用 Playwright 生成证据，而不是手工截图：

```ts
import { expect, test } from '@playwright/test'

test('legacy home baseline', async ({ page }) => {
  await page.goto('/home')
  await expect(page).toHaveScreenshot('legacy-home.png', {
    animations: 'disabled',
  })
})
```

旧页面若包含随机数据、时间或异步图片，应先通过固定 fixture、冻结时间或等待明确的就绪标记消除波动；不要用无限增大的截图容差掩盖不稳定。

## 5. 数据契约基线

重点查看：

- `legacy/src/api/user.ts`
- `legacy/src/api/videos.ts`
- `legacy/src/utils/request.ts`
- `legacy/src/mock/index.ts`
- `legacy/src/store/pinia.ts`
- `legacy/src/assets/data/resource.js`

为每个 API/fixture 记录：

```ts
interface BaselineContract<T> {
  request: {
    method: 'GET' | 'POST'
    path: string
    params?: unknown
    body?: unknown
  }
  response: {
    successShape: T
    emptyShape?: unknown
    errorShape?: unknown
  }
  consumers: string[]
}
```

不要从一份成功示例过度推断字段必填性。应同时记录缺省、空列表、错误和延迟场景。

## 6. 全局副作用基线

必须单独验证旧 `src/main.ts` 的行为：

- `window.isMoved` 如何阻止 click。
- `window.isMuted` 与静音提示事件。
- 全局 `HTMLElement.prototype.addEventListener` Proxy 是否吞掉异常。
- `app.mixin(mixin)` 向页面暴露了哪些属性/方法。
- `@jambonn/vue-lazyload` 的占位图、失败和重试行为。
- `startMock()` 为什么必须在 Pinia 安装后调用。

这些能力在新项目中需要显式替代，但本轮只记录，不重构。

## 7. 资源基线

旧仓库包含大量 PNG、WebP、JPG、JSON 和 WASM。生成资源清单：

```bash
cd legacy
find public src/assets -type f -print0 \
  | xargs -0 sha256sum \
  | sort > ../resource-manifest.local.txt
```

`resource-manifest.local.txt` 可能很大，默认保留本地。受 Git 管理的摘要只需包含：总数、总大小、按类型大小、P0 页面实际引用资源和潜在重复项。

## 8. 本轮验收门禁

- [ ] 旧依赖和运行环境版本有记录。
- [ ] 旧应用能启动；若不能，失败原因和可复现环境有记录。
- [ ] 所有路由有清单，P0/P1/P2 已标注。
- [ ] P0 用户路径有可重复截图/交互证据。
- [ ] API、Mock、Store 初始化和错误形状有样例。
- [ ] 全局 mixin、DOM Proxy、事件和懒加载行为已说明。
- [ ] 资源清单可生成，且没有把全部旧资源重新提交。
- [ ] 旧生产构建结果、控制台错误和已知缺陷已归档。

完成后才进入第 1 轮。否则新项目即使“看起来能跑”，也没有可验证的等价标准。
