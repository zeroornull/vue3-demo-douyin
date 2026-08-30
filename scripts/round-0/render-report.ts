import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = resolve(scriptDirectory, '../..')
const roundRoot = resolve(projectRoot, 'docs/round-0')
const generatedRoot = resolve(roundRoot, 'generated')

async function readJson(name: string) {
  return Bun.file(resolve(generatedRoot, name)).json()
}

async function writeMarkdown(name: string, content: string) {
  await Bun.write(resolve(roundRoot, name), `${content.trim()}\n`)
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GiB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MiB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KiB`
  return `${bytes} B`
}

function cell(value: unknown) {
  return String(value ?? '—')
    .replaceAll('|', '\\|')
    .replaceAll('\n', ' ')
}

async function renderRoutes() {
  const data = await readJson('routes.json')
  const rows = data.routes
    .map(
      (route: Record<string, unknown>) =>
        `| ${cell(route.suggestedPriority)} | \`${cell(route.path)}\` | ${route.name ? `\`${cell(route.name)}\`` : '—'} | ${route.redirect ? `\`${cell(route.redirect)}\`` : '—'} | \`${cell(route.component)}\` | ${cell(route.sourceLine)} |`,
    )
    .join('\n')

  await writeMarkdown(
    'routes.md',
    `# 第 0 轮：路由基线

## 摘要

- 路由总数：**${data.total}**。
- 有稳定 route name 的路由：**${data.named}**；只有 \`/video-detail\` 已命名。
- 重定向：**${data.redirects}**；根路径 \`/\` 重定向到 \`/home\`。
- 动态导入页面：**${data.dynamicImports}**。
- 建议优先级：P0 ${data.priorityCounts.P0 ?? 0}、P1 ${data.priorityCounts.P1 ?? 0}、P2 ${data.priorityCounts.P2 ?? 0}。

优先级是迁移规划建议，不是旧代码事实。路由来源事实保存在
[\`generated/routes.json\`](generated/routes.json)，由
[\`scripts/round-0/collect-baseline.ts\`](../../scripts/round-0/collect-baseline.ts) 从
\`legacy/src/router/routes.ts\` 的 TypeScript AST 生成。

## P0 冒烟范围

本轮自动验证了：\`/home\`、\`/home/search\`、\`/shop\`、\`/shop/detail\`、
\`/message\`、\`/message/chat\`、\`/me\`、\`/me/edit-userinfo\`、\`/login\` 和
\`/video-detail\`。另外验证了三条真实点击流程：

1. \`/shop\` 点击第一个 \`.goods\` → \`/shop/detail\`。
2. \`/message\` 点击第一个 \`.friend\` → \`/message/chat\`。
3. \`/me\` 点击“编辑资料” → \`/me/edit-userinfo\`。

15 个浏览器用例都取得 HTTP 200 且没有导航/点击超时。直接深链
\`/shop/detail\` 和 \`/video-detail\` 会因缺少内存态 route data 产生运行时错误；从
\`/shop\` 正常点击进入详情则没有错误。这是新 Router 必须明确修复或保持并记录的行为差异。

## 完整路由表

| 优先级 | Path | Name | Redirect | Component | 源码行 |
| --- | --- | --- | --- | --- | ---: |
${rows}

## Router 迁移风险

- 除一个路由外都没有 name，新项目不能依赖稳定命名导航，必须补齐。
- 导航守卫用路由数组索引推断前进/后退；这不等价于浏览器 history。
- 守卫从 \`matched[0].components.default.name\` 推断 KeepAlive 排除项，组件名缺失时有空值风险。
- history/hash 模式取决于 \`IS_SUB_DOMAIN\`，部署目标应先收敛。
- 详情页通过内存态 \`routeData\` 传递对象，刷新/深链不具备同样数据。
`,
  )
}

async function renderContracts() {
  const api = await readJson('api-and-mocks.json')
  const fixture = await readJson('fixture-summary.json')
  const endpointRows = api.apiEndpoints
    .map(
      (endpoint: Record<string, unknown>) =>
        `| \`${cell(endpoint.functionName)}\` | ${cell(endpoint.method)} | \`${cell(endpoint.url)}\` | \`${cell(endpoint.source)}:${cell(endpoint.sourceLine)}\` |`,
    )
    .join('\n')
  const mockRows = api.mockEndpoints
    .map(
      (endpoint: Record<string, unknown>) =>
        `| ${cell(endpoint.method)} | \`${cell(endpoint.matcher)}\` | \`legacy/src/mock/index.ts:${cell(endpoint.sourceLine)}\` |`,
    )
    .join('\n')
  const fixtureRows = fixture.fixtures
    .map((item: Record<string, unknown>) => {
      const shape = item.shape as Record<string, unknown>
      return `| \`${cell(item.path)}\` | ${formatBytes(Number(item.bytes))} | ${cell(shape.type)} | ${cell(shape.length ?? '—')} |`
    })
    .join('\n')

  await writeMarkdown(
    'contracts.md',
    `# 第 0 轮：API、Mock 与数据契约基线

## 摘要

- API 包装函数：**${api.apiEndpointCount}**，全部声明为 GET。
- Axios Mock handler：**${api.mockEndpointCount}**。
- \`/user/userinfo\` 有 API 函数但没有对应 Mock handler，是当前清单中的缺口。
- 所有 API 函数的 \`params\` 和 \`data\` 都是可选 \`any\`，没有请求/响应 DTO。

原始机器证据：

- [\`generated/api-and-mocks.json\`](generated/api-and-mocks.json)
- [\`generated/fixture-summary.json\`](generated/fixture-summary.json)

## API 包装函数

| 函数 | Method | URL | 来源 |
| --- | --- | --- | --- |
${endpointRows}

## Mock handlers

| Method | Matcher | 来源 |
| --- | --- | --- |
${mockRows}

## 代表性 fixture

| JSON fixture | 大小 | 顶层类型 | 项目数 |
| --- | ---: | --- | ---: |
${fixtureRows}

字段 key 和嵌套类型位于 \`fixture-summary.json\`；报告不复制真实内容值。

## 请求语义

旧 \`legacy/src/utils/request.ts\` 的重要事实：

1. Axios timeout 为 60 秒，默认补 \`Content-Type: application/json\`。
2. 响应拦截器把空响应、字符串、业务 code、HTTP 4xx/5xx 和无响应转换成多个不同对象形状。
3. 错误通常被转成 resolved value，而不是继续 reject；调用方不能依靠 \`catch\` 判断失败。
4. \`request<T = any>\` 默认泛型为 \`any\`，再次包装成 \`{ success, data }\`。
5. 多数 Mock 即使业务失败也返回 HTTP 200，并在 body 中使用 \`code: 500\`。
6. \`/video/long/recommended/\` 带尾斜杠，其他路径通常不带；新契约应统一并测试兼容。

## JSON 与 archived \`.md\` 双轨

开发环境和非 Gitee 模式中，\`_fetch\` 会把请求 URL 的 \`.md\` 替换为 \`.json\`。
Gitee 模式读取 archived \`.md\`，通过 \`libarchive-wasm\` 解包其中的 JSON。因此：

- \`.md\` 不是 UTF-8 Markdown，不能当文本解析。
- 新迁移必须决定是否继续双轨；若删除，需先确认不再支持 Gitee 压缩资源模式。
- production build 已出现 \`fs\`、\`path\`、\`crypto\` 被浏览器 externalize 的三条 libarchive 警告。

## 建模优先级

1. \`ApiResult<T>\` 和错误判别联合。
2. User、Video、Goods、Post、Comment DTO。
3. 分页参数及 \`start/pageSize\` 与 \`pageNo/pageSize\` 的统一。
4. Fixture 运行时验证和 DTO → Domain 映射。
5. 取消请求、超时、HTTP 失败和业务 code 失败的独立测试。
`,
  )
}

async function renderResources() {
  const data = await readJson('resource-summary.json')
  const extensionRows = Object.entries(data.byExtension)
    .map(([extension, summary]) => {
      const value = summary as Record<string, number>
      return `| \`${cell(extension)}\` | ${value.files} | ${formatBytes(value.bytes)} |`
    })
    .join('\n')
  const largestRows = data.largestFiles
    .slice(0, 20)
    .map(
      (item: Record<string, unknown>) =>
        `| \`${cell(item.path)}\` | ${cell(item.extension)} | ${formatBytes(Number(item.bytes))} | \`${String(item.sha256).slice(0, 12)}…\` |`,
    )
    .join('\n')
  const duplicateRows = data.largestDuplicates
    .slice(0, 15)
    .map(
      (item: Record<string, unknown>) =>
        `| ${formatBytes(Number(item.reclaimableBytes))} | ${(item.paths as string[]).map((path) => `\`${cell(path)}\``).join('；')} |`,
    )
    .join('\n')

  await writeMarkdown(
    'resources.md',
    `# 第 0 轮：资源基线

## 摘要

- 扫描范围：\`legacy/public\` 与 \`legacy/src/assets\`。
- 文件总数：**${data.totalFiles}**。
- 总大小：**${formatBytes(data.totalBytes)}**。
- \`public\`：${data.byRoot.public.files} 个文件，${formatBytes(data.byRoot.public.bytes)}。
- \`src/assets\`：${data.byRoot['src/assets'].files} 个文件，${formatBytes(data.byRoot['src/assets'].bytes)}。
- 相同 SHA-256 的重复组：**${data.duplicateGroups}**。
- 理论可回收重复大小：**${formatBytes(data.reclaimableDuplicateBytes)}**。

完整逐文件 SHA-256 清单位于本地
\`generated/resource-manifest.local.json\`，该文件可重建且已被 Git 忽略。可提交摘要位于
[\`generated/resource-summary.json\`](generated/resource-summary.json)。

## 按扩展名

| 扩展名 | 文件数 | 总大小 |
| --- | ---: | ---: |
${extensionRows}

## 最大文件

| 路径 | 类型 | 大小 | SHA-256 前缀 |
| --- | --- | ---: | --- |
${largestRows}

## 最大重复组

| 可回收大小 | 路径 |
| ---: | --- |
${duplicateRows || '| — | 未发现 |'}

## 迁移结论

- PNG 占绝大多数空间，不能整目录无差别复制到新项目。
- \`videos.json\` 和 \`videos-old.json\` 各约 4.6 MiB；它们并非同哈希重复，需由业务确认旧文件是否仍需要。
- JSON 与 archived \`.md\` 双份数据显著放大 public 体积。
- 新页面应按纵切迁移资源，并记录来源、哈希、尺寸、许可、页面消费者和删除条件。
- \`public/libarchive.wasm\` 必须经过 MIME、base path 和生产加载测试后才能决定保留。
`,
  )
}

async function renderRuntime() {
  const environment = await readJson('environment.json')
  const typeErrors = await readJson('type-errors.json')
  const build = await readJson('build-summary.json')
  const browser = await readJson('browser-smoke.json')

  const errorFiles = Object.entries(
    Object.groupBy(typeErrors.errors, (error: Record<string, unknown>) => String(error.path)),
  )
    .map(([path, errors]) => ({ path, count: errors?.length ?? 0 }))
    .sort((left, right) => right.count - left.count)
  const errorFileRows = errorFiles
    .map((item) => `| \`${cell(item.path)}\` | ${item.count} |`)
    .join('\n')
  const codeRows = Object.entries(typeErrors.countsByCode)
    .map(([code, count]) => `| \`${cell(code)}\` | ${cell(count)} |`)
    .join('\n')
  const browserRows = browser.results
    .map(
      (item: Record<string, unknown>) =>
        `| \`${cell(item.id)}\` | ${cell(item.responseStatus)} | ${cell(item.consoleErrorCount)} | ${(item.pageErrors as unknown[]).length} | ${(item.requestFailures as unknown[]).length} | [截图](${cell(item.screenshot)}) |`,
    )
    .join('\n')
  const buildLargest = build.largestFiles
    .slice(0, 15)
    .map(
      (item: Record<string, unknown>) =>
        `| \`${cell(item.path)}\` | ${formatBytes(Number(item.bytes))} | ${item.gzipBytes ? formatBytes(Number(item.gzipBytes)) : '—'} |`,
    )
    .join('\n')

  await writeMarkdown(
    'runtime.md',
    `# 第 0 轮：运行、类型、构建与浏览器基线

## 运行环境

| 工具 | 版本 |
| --- | --- |
| Bun | \`${cell(environment.tools.bun)}\`（\`${cell(environment.tools.bunRevision)}\`） |
| Node | \`${cell(environment.tools.node)}\` |
| pnpm | \`${cell(environment.tools.pnpm)}\` |
| Git | \`${cell(environment.tools.git)}\` |
| Platform | \`${cell(environment.platform)}\` |

新仓库采集时为 \`${cell(environment.newRepository.branch)}\`，1 个提交，0 个 remote。

## 依赖安装

\`pnpm install --frozen-lockfile\` 在 pnpm 11 首次执行时因供应链默认策略阻止
\`core-js\`、两个 \`esbuild\` 和 \`vue-demi\` 的 lifecycle build，以
\`ERR_PNPM_IGNORED_BUILDS\` 退出。

为忠实复现且不修改旧 manifest/锁文件，本轮临时创建未保留的
\`pnpm-workspace.yaml\`：

\`\`\`yaml
allowBuilds:
  esbuild: true
  vue-demi: true
  core-js: false
\`\`\`

并使用 \`HUSKY=0\` 防止旧 Husky 修改新仓库 hooks。随后冻结安装成功，且
\`package.json\` 与 \`pnpm-lock.yaml\` 的 SHA-256 前后不变。

证据：[\`evidence/pnpm-install.log\`](evidence/pnpm-install.log)。pnpm 自动预检导致的首次脚本阻断也保存在
\`type-check-pnpm-preflight-failure.log\` 和 \`build-pnpm-preflight-failure.log\`。

## 类型检查

\`pnpm run type-check\` 真正运行 \`vue-tsc --build --force\` 后以 **${typeErrors.exitCode}** 退出：

- TypeScript 错误：**${typeErrors.errorCount}**。
- 涉及文件：**${typeErrors.filesWithErrors}**。
- 这是旧项目基线缺陷，本轮没有修改 legacy 源码。

### 按错误码

| 错误码 | 数量 |
| --- | ---: |
${codeRows}

### 按文件

| 文件 | 数量 |
| --- | ---: |
${errorFileRows}

完整错误：[\`generated/type-errors.json\`](generated/type-errors.json) 和
[\`evidence/type-check.log\`](evidence/type-check.log)。

## 生产构建

\`pnpm run build\` 成功：

- Vite：6.4.2。
- 转换模块：715（来自构建日志）。
- 构建文件：**${build.outputFiles}**。
- 产物总大小：**${formatBytes(build.totalBytes)}**。
- 构建用时：13.87 秒（当前机器）。
- 警告：3 条，均为 \`libarchive-wasm\` 引入的 \`fs\`、\`path\`、\`crypto\` 被浏览器 externalize。

### 最大产物

| 文件 | 原大小 | gzip |
| --- | ---: | ---: |
${buildLargest}

证据：[\`generated/build-summary.json\`](generated/build-summary.json) 和
[\`evidence/build.log\`](evidence/build.log)。

## 浏览器冒烟

通过 Google Chrome + Playwright 1.62.1，在移动 UA/touch、窄屏和桌面视口执行：

- 用例：**${browser.total}**。
- 文档 HTTP 200：**${browser.successfulDocuments}/${browser.total}**。
- 导航失败：**${browser.navigationFailures}**。
- 点击流程失败：**${browser.actionFailures}**。
- 有 console error 的用例：**${browser.casesWithConsoleErrors}**。
- 有 page error 的用例：**${browser.casesWithPageErrors}**。
- 有资源请求失败的用例：**${browser.casesWithRequestFailures}**。

| 用例 | HTTP | Console errors | Page errors | Request failures | 视觉证据 |
| --- | ---: | ---: | ---: | ---: | --- |
${browserRows}

### 已确认缺陷

1. 直接打开 \`/shop/detail\`：3 个 page errors，读取空 route data 的 \`imgs\` 失败。
2. 从 \`/shop\` 点击商品进入同一路由：0 console/page errors；证明详情依赖内存导航状态。
3. 直接打开 \`/video-detail\`：2 个 page errors，读取空 route data 的 \`index\` 失败。
4. 首页在三种视口都有 5–6 个外部图片/视频请求失败，常见错误为
   \`ERR_BLOCKED_BY_ORB\` 或 \`ERR_ABORTED\`；页面本身仍可渲染。
5. Message→Chat、Profile→Edit 三条点击流程没有错误。

机器证据：[\`generated/browser-smoke.json\`](generated/browser-smoke.json)。截图位于
[\`screenshots/\`](screenshots/)。
`,
  )
}

async function renderGlobalSideEffects() {
  await writeMarkdown(
    'global-side-effects.md',
    `# 第 0 轮：全局副作用基线

## 启动顺序

旧 \`legacy/src/main.ts\` 的顺序：

1. 写入 \`window.isMoved\`、\`window.isMuted\`、\`window.showMutedNotice\`。
2. 全局代理 \`HTMLElement.prototype.addEventListener\`。
3. 创建 Vue app，安装全局 mixin。
4. 安装 \`@jambonn/vue-lazyload\`。
5. 安装 Pinia、Router，mount。
6. 注册全局 \`v-click\`。
7. mount 后调用 \`startMock()\`；源码注释明确要求放在 Pinia 后。
8. 2 秒后通过事件总线隐藏静音提示。

## 全局 DOM Proxy

所有元素新增 click listener 都会被另一层 Proxy 包裹：

- \`window.isMoved\` 为 true 时静默丢弃 click。
- listener 抛出的错误被 catch，只输出 console error，不继续抛出。
- 第三方组件和浏览器内所有 click 都受影响。
- 行为依赖全局 mutable window 标记，测试间容易泄漏。

新项目必须先锁定 tap/drag/keyboard 行为，再用局部 directive/composable 替代；不能原样复制原型修改。

## 全局 mixin

\`legacy/src/utils/mixin.ts\` 全局注册：

- 11 个左右的组件/别名，包括 Header、Footer、Mask、Loading、Icon、Slide。
- \`SUCCESS\` 和 \`RELATE_ENUM\` data。
- \`longpress\`、\`hide\`、\`love\` 三个 directive。

\`longpress\` 添加 touch/click listener，但没有对应 unmounted 清理逻辑。\`love\` 添加 pointer listener、计时器并通过事件总线触发单击，也没有显式清理。新迁移应将每项消费者显式列出，再逐项替换。

## Pinia 和 DOM

\`useBaseStore\` 在 state 初始化时直接读取：

- \`document.body.clientHeight\`
- \`document.body.clientWidth\`

这让 Store 依赖浏览器 DOM，影响 Vitest、SSR 或 Node 环境。Store 同时承载 UI mask、路由缓存、用户、朋友、加载和消息状态，属于核心迁移边界。

## Mock 和异步初始化

- \`startMock()\` 注册 14 个 Axios Mock handler。
- 函数末尾延迟 1 秒调用 \`fetchData\`。
- \`fetchData\` 在用户列表为空时调用 \`baseStore.init()\`，再把 author 数据合并到视频列表。
- 页面首屏因此受 Pinia、Mock 注册、静态 JSON fetch、1 秒计时器和外部媒体共同影响。

## 请求错误语义

响应 interceptor 会通知用户并把绝大多数错误转换成普通返回值；之后 \`request\` 又包装
\`{ success, data }\`。新请求层在改变该语义前必须有 characterization tests，否则页面可能从
“检查 success”变成未处理 reject。

## 构建副作用

- Vite 配置调用 \`git-last-commit\` 获取父仓库最近提交；旧项目已不再拥有自己的 Git 历史。
- 构建根据 \`npm_lifecycle_event\` 开启报告插件。
- CDN 插件固定另一组 Vue/Router/Mock 版本，开发与生产可能不一致。
- \`manualChunks\` 按具体页面路径和统一 \`vendor\`/\`other\` 名称硬编码。

## 迁移时必须保留的验证

- tap 与 drag 后 click 是否触发。
- 键盘 click 是否仍可访问。
- listener/directive 卸载是否清理。
- 静音提示 2 秒定时和 REMOVE_MUTED 事件。
- Store 初始化前后 Mock 请求结果。
- 请求失败是否 reject、resolve，以及页面提示次数。
- build SHA 是否来自新仓库的显式 CI 环境变量。
`,
  )
}

async function renderReadme() {
  const source = await readJson('source-summary.json')
  const resources = await readJson('resource-summary.json')
  const typeErrors = await readJson('type-errors.json')
  const build = await readJson('build-summary.json')
  const browser = await readJson('browser-smoke.json')
  const routes = await readJson('routes.json')

  await writeMarkdown(
    'README.md',
    `# 第 0 轮验收报告：旧项目行为基线

> 执行日期：2026-08-30（Asia/Shanghai）
> 状态：**本轮完成，存在已归档的旧项目缺陷**
> Git：按要求保持未提交；本轮没有修改 \`legacy/\` 的 package manifest、锁文件或源码。

## 结果摘要

| 项目 | 结果 |
| --- | --- |
| 冻结安装 | 通过；pnpm 11 需临时显式允许 esbuild/vue-demi build，Husky 禁用 |
| TypeScript | 失败基线：${typeErrors.errorCount} 个错误、${typeErrors.filesWithErrors} 个文件 |
| 生产构建 | 通过：${build.outputFiles} 个文件，${formatBytes(build.totalBytes)}，3 条 libarchive 警告 |
| 路由 | ${routes.total} 条；只有 ${routes.named} 条具名 |
| 浏览器 | ${browser.total}/${browser.total} 文档 HTTP 200；0 导航失败；0 点击流程失败 |
| 已确认运行时缺陷 | 详情深链 2 类；首页外部媒体/图片 ORB/abort |
| Vue SFC | ${source.vue.total}：setup TS 69、setup JS 19、classic JS 38、classic TS 2 |
| 类型债务 token | 显式 any ${source.occurrences.any.count}、\`$ref\` ${source.occurrences.dollarRef.count}、\`@ts-ignore\` ${source.occurrences.tsIgnore.count} |
| 静态资源 | ${resources.totalFiles} 个，${formatBytes(resources.totalBytes)}，${resources.duplicateGroups} 个重复哈希组 |

## 文档和证据

- [运行、类型、构建和浏览器基线](runtime.md)
- [完整路由基线](routes.md)
- [API、Mock 和数据契约](contracts.md)
- [全局副作用](global-side-effects.md)
- [资源基线](resources.md)
- [机器生成 JSON](generated/)
- [P0 截图](screenshots/)
- [原始命令日志](evidence/)

## 可重复执行

先准备旧依赖；pnpm 11 需要按 [runtime.md](runtime.md) 中的临时 allowBuilds 配置运行：

\`\`\`bash
cd legacy
HUSKY=0 pnpm install --frozen-lockfile
cd ..

bun run scripts/round-0/collect-baseline.ts
bun run scripts/round-0/render-report.ts
\`\`\`

浏览器采集需要运行旧 Vite dev server和 Playwright 1.62.1；完整命令记录在
[\`evidence/browser-capture.log\`](evidence/browser-capture.log)。脚本默认使用系统 Google Chrome：

\`\`\`bash
cd legacy
./node_modules/.bin/vite --host 127.0.0.1 --port 4173 --strictPort

# 另一个终端；PLAYWRIGHT_NODE_PATH 指向本地/临时 Playwright 安装
NODE_PATH="$PLAYWRIGHT_NODE_PATH" \\
  node scripts/round-0/capture-browser-baseline.mjs
\`\`\`

## 本轮验收清单

- [x] 旧运行环境和工具版本已记录。
- [x] 旧锁文件可冻结安装，pnpm 11 lifecycle policy 差异已记录。
- [x] 旧应用可以启动。
- [x] 65 条路由已生成完整机器/Markdown 清单。
- [x] P0 直接访问和三条真实点击流程有 15 张截图。
- [x] Console、page error、失败资源和 HTTP 状态已采集。
- [x] 15 个 API 包装函数、14 个 Mock handler 和代表性 fixture 已盘点。
- [x] 全局 mixin、DOM Proxy、事件、懒加载、Pinia/Mock 启动顺序已说明。
- [x] 2,081 个静态资源已生成 SHA-256 本地清单和可提交摘要。
- [x] 旧 type-check 失败已完整归档，未修改旧源码伪造通过。
- [x] 旧 production build 成功，产物和警告已归档。

## 进入第 1 轮前必须保留的回归点

1. Shop 列表点击进入详情成功，但详情深链失败。
2. Video detail 深链依赖 route data，会报 \`index\` 空值错误。
3. 首页移动视图、底部导航、外部视频/图片失败表现。
4. Message→Chat、Profile→Edit 的跳转和截图。
5. Axios 错误被转为 resolved result 的旧语义。
6. JSON/archived \`.md\` 双轨和 \`libarchive-wasm\` 构建警告。
7. 59 个类型错误是第 2 轮的明确输入，不应在第 1 轮用宽松配置隐藏。
`,
  )
}

await Promise.all([
  renderRoutes(),
  renderContracts(),
  renderResources(),
  renderRuntime(),
  renderGlobalSideEffects(),
])
await renderReadme()
console.log('Round-0 Markdown reports rendered')
