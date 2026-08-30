# 第 3 轮：导航、KeepAlive 与事件

## 1. 为什么不复制旧导航算法

旧守卫通过：

```ts
routes.findIndex(route.path)
```

比较 to/from 路由在定义数组中的位置，以此判断前进/后退。路由定义顺序不等于浏览器 history，重排路由会改变动画。

新实现读取：

```text
window.history.state.position
```

规则：

- position 变大 → forward。
- position 变小 → back。
- 首次/未知 position → none。
- position 相同可使用 meta preferred transition。

## 2. Navigation Store

新增：

- `src/stores/navigation.ts`
- `src/stores/index.ts`

状态：

```text
currentTitle
direction: back | forward | none
transitionName
previousPosition
keepAliveNames
```

Pinia 实例由 `src/stores/index.ts` 显式创建并同时提供给 Vue app 和 Router afterEach，避免“Router 是否在 Pinia 安装后执行”的隐式假设。

## 3. Route Meta Runtime Boundary

Vue Router 5 的 `RouteMeta` 本身继承 `Record<PropertyKey, unknown>`。本轮最初尝试仅依赖 module augmentation，但在实际 `vue-tsc` 中读取到的 meta property 仍可能为 unknown，而且空 interface augmentation 会触发 ESLint。

最终使用：

- `AppRouteMeta`：项目内部明确类型。
- `defineRouteMeta`：路由定义编译期合同。
- `parseRouteMeta`：afterEach 的运行时合同。

字段：

```ts
interface AppRouteMeta {
  migrationRound: 1 | 2 | 3
  title: string
  transition: 'back' | 'fade' | 'forward' | 'none'
  keepAlive?: boolean
  keepAliveName?: string
}
```

因此删除了只做 module augmentation 的 `src/router/meta.d.ts`，用可运行、可测试的 `meta.ts` 取代。

## 4. RouterView Transition 和 KeepAlive

App：

```text
RouterView slot
  → Transition(name from Navigation Store)
  → KeepAlive(include typed component names)
  → routed component
```

Shop 列表 route meta：

```text
keepAlive=true
keepAliveName=ShopListView
```

Store 会去重 keepAlive names。页面 component 通过 `defineOptions({ name: 'ShopListView' })` 与 meta 明确对应，不再从异步 component 内部结构猜 name。

转场：

- `route-forward`
- `route-back`
- `route-fade`
- 空字符串表示无动画

并继续受全局 `prefers-reduced-motion` 约束。

## 5. Typed Event Bus

新增：

- `src/infrastructure/events/event-bus.ts`
- `src/infrastructure/events/app-event-bus.ts`

API：

```ts
on(type, handler): unsubscribe
emit(type, payload): void
listenerCount(type): number
clear(): void
```

类型来自既有：

```ts
interface AppEventMap {
  'shop:product-viewed': {
    productId: ProductId
  }
}
```

Shop Store `recordViewed`：

1. 保存 typed domain event snapshot。
2. 通过 `appEventBus.emit` 发布 payload。

测试证明：

- payload 类型和值正确。
- unsubscribe 后不再接收。
- listener count 回到 0。
- `clear` 删除所有事件订阅。

## 6. 边界原则

- Event bus 不承载 Store state；它只发布瞬时事件。
- 组件仍优先使用 props/emits 和 Pinia，不把所有通信改成全局事件。
- 订阅必须保存并调用 unsubscribe，或在后续 composable 中绑定 scope disposal。
- Router/Navigation Store 负责导航方向，不允许业务页面自己比较 routes 数组。
- KeepAlive 名称是显式 meta 合同，不从 `matched[0].components.default.name` 读取。
