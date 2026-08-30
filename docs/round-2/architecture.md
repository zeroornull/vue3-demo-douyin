# 第 2 轮：类型和架构边界

## 目录

```text
src/
├── domain/shop/product.ts
├── features/shop/
│   ├── api/
│   │   ├── fixture-shop-gateway.ts
│   │   ├── legacy-goods-parser.ts
│   │   └── shop-gateway.ts
│   ├── data/goods.fixture.json
│   ├── product-image.ts
│   ├── shop.css
│   ├── store/shop.ts
│   ├── views/
│   │   ├── ShopDetailView.vue
│   │   └── ShopListView.vue
│   └── __tests__/
├── router/
│   ├── index.ts
│   └── meta.d.ts
└── shared/
    ├── events.ts
    └── result.ts
```

## 1. Result 边界

`AppResult<T>`：

```ts
type AppResult<T, E extends AppError = AppError> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: E }
```

错误类别：

| Kind | 含义 | Store 行为 |
| --- | --- | --- |
| `aborted` | AbortSignal 已取消 | 返回 `idle`，可重新加载 |
| `not-found` | 稳定 ID 合法，但记录不存在 | 详情显示 not-found |
| `parse` | 外部数据不符合契约 | `error`，保留 details |
| `unexpected` | Gateway 抛出未预期异常 | 转成 error，不泄漏 throw 到组件 |

页面不再依赖 AxiosResponse、裸 throw 或 `{ success, data: any }`。

## 2. DTO → Domain

旧 fixture 字段：

```text
name, cover, imgs, price, real_price, isLowPrice, discount, sold
```

Parser 规则：

- 输入必须是数组；每项必须是 object。
- name 非空。
- cover/imgs 只能是安全的 JPG/PNG/WebP 文件名，不能包含 `/` 或路径穿越。
- cover 必须存在于 imgs。
- price/real_price 为非负有限数字。
- sold 为非负整数。
- isLowPrice 为 boolean。
- discount 为 string。
- cover 前缀必须能派生 `gN` ID。
- ID 不能重复。

内部 `Product`：

```ts
interface Product {
  id: ProductId
  name: string
  coverFile: string
  imageFiles: readonly string[]
  listPriceCents: number
  salePriceCents: number
  soldCount: number
  discountLabel: string | null
  isRecentLowPrice: boolean
}
```

金额转成整数 cents，避免 UI/业务层长期携带不明确的浮点价格语义。

## 3. Branded ID

```ts
type ProductId = string & { readonly [productIdBrand]: 'ProductId' }
```

`parseProductId` 接受类似 `g1`、`g2`、`g6`、`g99` 的标识，拒绝空值、数组、普通单词、路径或 `not-valid`。这样 Store/Gateway 接收到 `ProductId` 时，不需要再次猜测字符串是否已经验证。

## 4. Gateway

页面/Store 依赖接口，而不是 fixture：

```ts
interface ShopGateway {
  list(options?): Promise<AppResult<readonly Product[]>>
  getById(id, options?): Promise<AppResult<Product>>
}
```

当前 adapter 为 `fixtureShopGateway`；第 3 轮可以添加 HTTP adapter，而无需改变页面和 Store 的返回语义。

## 5. Pinia 状态机

状态：

```text
idle → loading → ready
               → empty
               → error
               → idle (aborted)
```

额外约束：

- request sequence 防止旧异步结果覆盖新请求。
- ready/empty 默认复用缓存，`force` 才重新加载。
- throw 被捕获为 `unexpected`。
- `findById` 通过 computed Map 查询 branded ID。
- `reset` 同时使正在执行的旧 request sequence 失效。

## 6. Typed domain event

当前事件映射：

```ts
interface AppEventMap {
  'shop:product-viewed': { productId: ProductId }
}
```

详情成功解析后 Store 记录 `ProductViewedEvent`，包含 type、严格 payload 和 ISO occurredAt。当前没有引入全局 bus；第 3 轮若需要 dispatcher，可复用该映射，避免无类型字符串/payload。

## 7. Router Meta

所有路由必须声明：

```ts
interface RouteMeta {
  migrationRound: 1 | 2
  title: string
  transition: 'back' | 'fade' | 'forward' | 'none'
  keepAlive?: boolean
}
```

Router `afterEach` 使用 typed title 更新文档标题。Shop 列表标记 `keepAlive: true`，但本轮不实现复杂旧缓存策略；类型先确定合同。

## 8. 类型纪律

新运行时代码扫描：

```text
explicit any=0
$ref=0
@ts-ignore/@ts-nocheck=0
JavaScript files=0
legacy path references=0
routeData=0
unknown tokens=11
```

`unknown` 是外部边界的正向设计，不是类型债务；必须经过 parser 才能进入 Domain。
