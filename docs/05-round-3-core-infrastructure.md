# 第 3 轮：迁移核心基础设施

> 执行状态：已完成。验收结果见 [`round-3/README.md`](round-3/README.md)。

## 1. 本轮目标

先迁移所有页面共同依赖的平台能力，形成稳定的“应用壳”。核心能力没有稳定之前，不应批量搬页面。

推荐顺序：环境与构建 → Router → Pinia → 请求/API → Mock/fixture → 事件与交互 → 资源能力。

## 2. 环境变量和构建版本

旧项目通过 `env/` 存放多个模式，并在 Vite 配置中使用 `process.env` 与 `git-last-commit`。新项目应：

1. 使用 Vite 标准 `import.meta.env` 和 `VITE_` 前缀。
2. 只提交 `.env.example`，不提交秘密。
3. 用显式环境变量注入构建版本，例如 `VITE_BUILD_SHA`。
4. CI 通过当前新仓库的 `git rev-parse --short HEAD` 生成该值，而不是安装 `git-last-commit`。
5. 在 `ImportMetaEnv` 中声明允许的变量。

```ts
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_BUILD_SHA: string
  readonly VITE_MOCK_ENABLED: 'true' | 'false'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

新仓库历史只有新的初始提交，旧提交哈希不应继续作为产品版本来源。

## 3. 删除核心运行时 CDN 注入

旧 Vite 配置通过 CDN 固定：

- Vue `3.4.21`
- Vue Router `4.3.0`
- Vue Demi `0.14.7`
- Mock.js 的旧构建

这与本地依赖不一致。新应用先让 Vite 打包锁文件中的 Vue/Router；只有在有明确性能数据、SRI、回退和版本同步机制后，才可重新评估 external/CDN。

验收时检查 HTML 和构建产物：

```bash
bun run build
grep -R "baomitu\|vue.runtime.global\|vue-router.global" dist || true
```

期望无匹配。

## 4. Router 迁移

### 4.1 先迁移路由数据，不复制旧守卫

建立 typed route records，并补全稳定路由名。推荐把业务路由按领域拆分，再在入口合并：

```text
src/router/
  index.ts
  routes/
    home.ts
    shop.ts
    message.ts
    profile.ts
    auth.ts
```

### 4.2 导航动画显式化

旧守卫用路由在数组中的索引比较前进/后退，并维护 `excludeNames`。这依赖路由表顺序和组件名。新实现应把导航层级或转场策略放入 `RouteMeta`：

```ts
declare module 'vue-router' {
  interface RouteMeta {
    depth: number
    transition: 'none' | 'forward' | 'back' | 'fade'
    keepAlive?: boolean
  }
}
```

实际前进/后退还要结合浏览器 history state；不要继续把“路由定义顺序”当历史栈。

### 4.3 Router 5 升级门禁

- 阅读对应版本的官方迁移/变更说明。
- 先让类型检查暴露 route location 和组件类型变化。
- 对 redirect、动态 import、scroll behavior、导航守卫返回值和 history 模式逐项测试。
- 保留 hash/history 两种模式只有在部署目标确实需要时；否则选择一个并记录原因。

## 5. Pinia 迁移

旧 Store 同时承担视口、遮罩、用户、好友、路由缓存和加载状态。先按责任切分，而不是把大 Store 原样复制：

```text
stores/
  app-ui.ts        # viewport、mask、loading
  session.ts       # 当前用户
  social.ts        # friends/users
  navigation.ts    # keep-alive/transition state
```

切分步骤：

1. 为旧 Store 写 characterization tests。
2. 定义状态接口和动作输入。
3. 迁移一个消费者。
4. 双写只允许存在于短期适配层，并有删除测试。
5. 所有消费者完成后删除旧 Store 适配。

Store 不直接决定 HTTP 细节；通过 typed service 调用 API。DOM 尺寸也不要在 state 初始化时无条件读取 `document`，应由浏览器侧 composable 注入。

## 6. 请求层与错误模型

保留 Axios 是低风险选择，但先升级到兼容稳定版并建立单一 client：

```text
src/api/client.ts
src/api/errors.ts
src/api/contracts/
src/api/services/
```

要求：

- base URL、timeout、headers 在 client 配置。
- interceptor 只做横切能力，不包含页面跳转业务。
- `unknown` 错误转为判别联合。
- 支持 AbortSignal，页面卸载可取消请求。
- service 返回 Domain 或明确 DTO，不返回裸 AxiosResponse。
- 空数据、业务失败、HTTP 失败、解析失败可区分。

## 7. Mock 与 fixture

旧 `startMock()` 依赖安装顺序。新项目应让 Mock 是否启用成为显式环境配置：

```ts
if (import.meta.env.DEV && import.meta.env.VITE_MOCK_ENABLED === 'true') {
  await startMocking()
}

createApp(App).use(pinia).use(router).mount('#app')
```

不要默认引入新 Mock 库。先评估现有 Axios mock adapter 是否足够：

- 若只需 client 级测试，`axios-mock-adapter` 可以保留并升级。
- 若需要浏览器/E2E 级网络拦截，再写 ADR 比较 MSW 或 Playwright route mocking。
- 大型 fixture 放在按领域分割的 JSON/TS builder 中，不要继续一个超大 `startMock()`。

## 8. 事件、点击和滑动

### 8.1 事件总线类型化

把事件映射建模：

```ts
interface AppEvents {
  'audio:unmute': undefined
  'audio:notice-hide': undefined
  'video:active-change': { videoId: string }
}
```

事件名、payload 和取消订阅都有类型。组件卸载时必须清理监听。

### 8.2 替代全局 DOM Proxy

旧代码代理 `HTMLElement.prototype.addEventListener` 来阻止滑动后的 click，并捕获处理器异常。替代方案按局部优先：

1. `v-safe-click` 指令：只用于需要滑动抑制的元素。
2. `usePointerGesture` composable：统一 pointerdown/move/up 阈值。
3. 错误通过 Vue `app.config.errorHandler` 和监控边界处理。

必须测试 tap、drag、长按、多指、触控取消和键盘可访问性。不能以“移动端”为由破坏键盘 click。

## 9. 图片懒加载与 WASM

优先使用：

- 原生 `<img loading="lazy" decoding="async">`。
- 需要占位/进入视口时使用局部 IntersectionObserver composable。
- 明确 width/height 或 aspect-ratio，减少布局偏移。

只有基线证明原生能力不足时才保留/替换 `@jambonn/vue-lazyload`。

`libarchive-wasm` 和 `public/libarchive.wasm` 需要单独冒烟：正确 MIME、路径、跨域隔离要求、生产 base path 和 worker/线程能力都要验证。

## 10. 手工分包

旧 `manualChunks` 把大量页面硬编码为 `other`。Vite/Rollup 主版本升级后，先观察默认分包结果，再基于数据优化：

1. 记录首屏 JS、最大 chunk、重复模块。
2. 只为稳定的共享边界写 `manualChunks`。
3. 不用一个 `vendor` 包收纳所有依赖；这可能破坏缓存和首屏。
4. 每条分包规则都有 bundle visualization 证据和测试。

## 11. 本轮验收门禁

- [ ] 环境变量、构建版本和秘密边界明确。
- [ ] 生产产物不从 CDN 加载另一份 Vue/Router。
- [ ] Router 5 的跳转、返回、scroll、动态 import 和守卫有测试。
- [ ] Pinia 按责任切分并有严格类型。
- [ ] API 成功、空、业务失败、HTTP 失败和取消均有测试。
- [ ] Mock 启用条件显式，启动顺序无隐式依赖。
- [ ] 没有全局 DOM 原型修改。
- [ ] 事件监听可清理且 payload 类型化。
- [ ] 懒加载、WASM 和构建 base path 有生产预览证据。
- [ ] 手工分包只保留有测量依据的规则。
