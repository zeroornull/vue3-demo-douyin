# 第 0 轮：全局副作用基线

## 启动顺序

旧 `legacy/src/main.ts` 的顺序：

1. 写入 `window.isMoved`、`window.isMuted`、`window.showMutedNotice`。
2. 全局代理 `HTMLElement.prototype.addEventListener`。
3. 创建 Vue app，安装全局 mixin。
4. 安装 `@jambonn/vue-lazyload`。
5. 安装 Pinia、Router，mount。
6. 注册全局 `v-click`。
7. mount 后调用 `startMock()`；源码注释明确要求放在 Pinia 后。
8. 2 秒后通过事件总线隐藏静音提示。

## 全局 DOM Proxy

所有元素新增 click listener 都会被另一层 Proxy 包裹：

- `window.isMoved` 为 true 时静默丢弃 click。
- listener 抛出的错误被 catch，只输出 console error，不继续抛出。
- 第三方组件和浏览器内所有 click 都受影响。
- 行为依赖全局 mutable window 标记，测试间容易泄漏。

新项目必须先锁定 tap/drag/keyboard 行为，再用局部 directive/composable 替代；不能原样复制原型修改。

## 全局 mixin

`legacy/src/utils/mixin.ts` 全局注册：

- 11 个左右的组件/别名，包括 Header、Footer、Mask、Loading、Icon、Slide。
- `SUCCESS` 和 `RELATE_ENUM` data。
- `longpress`、`hide`、`love` 三个 directive。

`longpress` 添加 touch/click listener，但没有对应 unmounted 清理逻辑。`love` 添加 pointer listener、计时器并通过事件总线触发单击，也没有显式清理。新迁移应将每项消费者显式列出，再逐项替换。

## Pinia 和 DOM

`useBaseStore` 在 state 初始化时直接读取：

- `document.body.clientHeight`
- `document.body.clientWidth`

这让 Store 依赖浏览器 DOM，影响 Vitest、SSR 或 Node 环境。Store 同时承载 UI mask、路由缓存、用户、朋友、加载和消息状态，属于核心迁移边界。

## Mock 和异步初始化

- `startMock()` 注册 14 个 Axios Mock handler。
- 函数末尾延迟 1 秒调用 `fetchData`。
- `fetchData` 在用户列表为空时调用 `baseStore.init()`，再把 author 数据合并到视频列表。
- 页面首屏因此受 Pinia、Mock 注册、静态 JSON fetch、1 秒计时器和外部媒体共同影响。

## 请求错误语义

响应 interceptor 会通知用户并把绝大多数错误转换成普通返回值；之后 `request` 又包装
`{ success, data }`。新请求层在改变该语义前必须有 characterization tests，否则页面可能从
“检查 success”变成未处理 reject。

## 构建副作用

- Vite 配置调用 `git-last-commit` 获取父仓库最近提交；旧项目已不再拥有自己的 Git 历史。
- 构建根据 `npm_lifecycle_event` 开启报告插件。
- CDN 插件固定另一组 Vue/Router/Mock 版本，开发与生产可能不一致。
- `manualChunks` 按具体页面路径和统一 `vendor`/`other` 名称硬编码。

## 迁移时必须保留的验证

- tap 与 drag 后 click 是否触发。
- 键盘 click 是否仍可访问。
- listener/directive 卸载是否清理。
- 静音提示 2 秒定时和 REMOVE_MUTED 事件。
- Store 初始化前后 Mock 请求结果。
- 请求失败是否 reject、resolve，以及页面提示次数。
- build SHA 是否来自新仓库的显式 CI 环境变量。
