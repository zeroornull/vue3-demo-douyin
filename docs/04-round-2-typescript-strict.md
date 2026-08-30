# 第 2 轮：TypeScript 严格化

> 执行状态：已完成。验收结果见 [`round-2/README.md`](round-2/README.md)。

## 1. 本轮目标

建立一套可持续的类型迁移规则。目标不是把 `.js` 批量改名成 `.ts`，而是让编译器能够在 API、Store、路由、事件、组件 props/emits 和环境变量边界发现真实错误。

## 2. 编译器基线

以官方 `@vue/tsconfig` 为基础，应用配置至少满足：

```jsonc
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "include": ["env.d.ts", "src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"],
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "allowJs": false,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

`noUncheckedIndexedAccess` 和 `exactOptionalPropertyTypes` 会暴露更多问题，可以分小提交开启，但最终目标必须明确。禁止为了让旧代码通过而长期保留一个宽松的全局配置；必要的临时兼容应限定到独立 migration tsconfig，并带删除日期。

## 3. 类型层次

建议按责任分层，而不是建立一个巨大 `types.ts`：

```text
src/
  domain/                 # 业务实体和不可变规则
    user.ts
    video.ts
    message.ts
  api/
    contracts/            # 请求/响应 DTO
    client.ts             # HTTP 边界
  stores/                 # Store 私有状态和动作输入
  router/
    meta.d.ts             # RouteMeta 扩展
  shared/
    events.ts             # 事件映射
    env.d.ts              # 环境变量/构建常量
```

原则：

- DTO 描述服务端或 fixture 实际形状。
- Domain model 描述应用内部可靠形状。
- 在边界做 DTO → Domain 映射，页面不应到处猜可选字段。
- 外部输入先是 `unknown`，验证后才收窄。
- 类型不应从一个巨型 Mock 对象自动推断并泄漏到全应用。

## 4. 迁移顺序

### 4.1 先迁移叶子工具

优先迁移无 UI、输入输出明确的工具：枚举、格式化、时间、DOM 计算、滑动距离。为每个工具补单测，然后替换 `any`。

### 4.2 再迁移请求和契约

旧 `request(config: AxiosRequestConfig)` 的返回类型会影响至少十多个 API 使用点。先统一：

```ts
export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiFailure {
  success: false
  code: string
  message: string
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure
```

实际旧数据若不满足此结构，应以基线为准调整；不要为了漂亮类型篡改 fixture。

### 4.3 再迁移 Pinia

先定义 `BaseState`、动作参数和 API 结果，再决定保持 Options Store 还是改为 Setup Store。**类型迁移不要求同时改变 Store 风格**。

旧字段如 `routeData: null`、`excludeNames: []`、`users: []` 在严格模式会推断过窄，必须显式声明。所有 DOM 尺寸初始化也应考虑 SSR/测试环境没有 `document` 的情况。

### 4.4 再迁移 Router

- 给路由补稳定 `name`。
- 扩展 `RouteMeta`，不要用任意键。
- 导航守卫中通过显式 Pinia 实例访问 Store，避免初始化时序隐式依赖。
- 对 `matched[0]`、组件 `name` 和找不到路由深度的情况做空值处理。
- Router 4 → 5 单独提交，先通过官方迁移说明和类型错误修复，再处理行为差异。

### 4.5 最后迁移组件

每个组件依次处理：

1. `props`。
2. `emits`。
3. template refs。
4. composable 返回值。
5. Store/API 使用。
6. DOM/浏览器 API。
7. 测试。

不要把所有 Options API 组件强制改为 Composition API。只有当转换能删除 mixin、改善复用或收紧类型时才做。

## 5. 移除 `$ref` 与 Vue Macros 锁定

旧项目有 5 个 `$ref` token，分布在 4 个文件中。它们应逐文件替换：

```ts
// 旧：编译期转换，赋值时不写 .value
let count = $ref(0)
count += 1

// 新：Vue 原生语义
const count = ref(0)
count.value += 1
```

迁移时特别检查：

- 解构是否丢失响应性。
- 函数参数传入的是值还是 ref。
- template 自动解包与脚本 `.value` 的差异。
- watch 源是否仍正确。
- 闭包和异步回调是否引用最新值。

`defineModel`、`defineOptions` 等已成为目标 Vue 版本的原生 SFC 宏时可以保留。先做“宏使用清单”，只移除非标准部分；最后没有插件专属语法后才删除 `unplugin-vue-macros`。

## 6. `any` 与错误抑制策略

允许：

- 在尚未验证的外部数据入口使用 `unknown`。
- 极窄的第三方类型缺口使用局部类型断言，并附上 issue/删除条件。
- 测试 fixture 使用明确的 builder 帮助构造最小对象。

禁止：

- `as any as T`。
- 在共享请求层返回 `any`。
- 给整个文件 `@ts-nocheck`。
- 用空接口或索引签名 `[key: string]: any` 逃避建模。
- 因一个旧页面而重新全局开启 `allowJs`。

建议在迁移看板统计：JS SFC 数、`.js` 源文件数、`$ref` 次数、显式 `any` 次数和 type-check 错误数。趋势必须单调下降。

## 7. 代表性首个纵切

选择一个同时包含 Router、Store、API、组件和资源但规模可控的页面作为样板。推荐 `/shop` → `/shop/detail`，而不是最复杂的首页。

样板完成后沉淀：

- 目录布局。
- DTO 和 Domain 的映射方式。
- Store 使用方式。
- 页面测试写法。
- 图片资源导入方式。
- 路由和返回行为。
- 错误/空/加载状态。

后续页面复用样板，而不是每个纵切重新发明规则。

## 8. 本轮验收门禁

- [ ] 新应用 `strict: true` 且 `allowJs: false`。
- [ ] API、Store、Router meta、事件和环境变量边界有显式类型。
- [ ] 首个代表性纵切通过 type-check、单测和 E2E。
- [ ] 新代码不新增 `$ref`、隐式 `any`、`@ts-ignore` 或全局类型逃生口。
- [ ] Vue Macros 的保留/删除清单明确。
- [ ] JS SFC、`.js`、`$ref` 和 `any` 数量可自动统计。
- [ ] 每个临时断言都有范围、原因和删除条件。
