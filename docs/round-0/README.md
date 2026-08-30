# 第 0 轮验收报告：旧项目行为基线

> 执行日期：2026-08-30（Asia/Shanghai）
> 状态：**本轮完成，存在已归档的旧项目缺陷**
> Git：按要求保持未提交；本轮没有修改 `legacy/` 的 package manifest、锁文件或源码。

## 结果摘要

| 项目 | 结果 |
| --- | --- |
| 冻结安装 | 通过；pnpm 11 需临时显式允许 esbuild/vue-demi build，Husky 禁用 |
| TypeScript | 失败基线：59 个错误、20 个文件 |
| 生产构建 | 通过：1557 个文件，127.26 MiB，3 条 libarchive 警告 |
| 路由 | 65 条；只有 1 条具名 |
| 浏览器 | 15/15 文档 HTTP 200；0 导航失败；0 点击流程失败 |
| 已确认运行时缺陷 | 详情深链 2 类；首页外部媒体/图片 ORB/abort |
| Vue SFC | 128：setup TS 69、setup JS 19、classic JS 38、classic TS 2 |
| 类型债务 token | 显式 any 54、`$ref` 5、`@ts-ignore` 0 |
| 静态资源 | 2081 个，128.88 MiB，25 个重复哈希组 |

## 文档和证据

- [运行、类型、构建和浏览器基线](runtime.md)
- [完整路由基线](routes.md)
- [API、Mock 和数据契约](contracts.md)
- [全局副作用](global-side-effects.md)
- [资源基线](resources.md)
- 机器生成 JSON（本地生成：`generated/`）
- P0 截图（本地生成：`screenshots/`）
- 原始命令日志（本地生成：`evidence/`）

## 可重复执行

先准备旧依赖；pnpm 11 需要按 [runtime.md](runtime.md) 中的临时 allowBuilds 配置运行：

```bash
cd legacy
HUSKY=0 pnpm install --frozen-lockfile
cd ..

bun run scripts/round-0/collect-baseline.ts
bun run scripts/round-0/render-report.ts
```

浏览器采集需要运行旧 Vite dev server和 Playwright 1.62.1；完整命令记录在
`evidence/browser-capture.log`（本地生成：`evidence/browser-capture.log`）。脚本默认使用系统 Google Chrome：

```bash
cd legacy
./node_modules/.bin/vite --host 127.0.0.1 --port 4173 --strictPort

# 另一个终端；PLAYWRIGHT_NODE_PATH 指向本地/临时 Playwright 安装
NODE_PATH="$PLAYWRIGHT_NODE_PATH" \
  node scripts/round-0/capture-browser-baseline.mjs
```

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
2. Video detail 深链依赖 route data，会报 `index` 空值错误。
3. 首页移动视图、底部导航、外部视频/图片失败表现。
4. Message→Chat、Profile→Edit 的跳转和截图。
5. Axios 错误被转为 resolved result 的旧语义。
6. JSON/archived `.md` 双轨和 `libarchive-wasm` 构建警告。
7. 59 个类型错误是第 2 轮的明确输入，不应在第 1 轮用宽松配置隐藏。
