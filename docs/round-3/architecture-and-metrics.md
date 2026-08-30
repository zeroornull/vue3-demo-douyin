# 第 3 轮：架构和迁移指标

## 新增边界

```text
src/
├── config/
│   └── runtime.ts
├── infrastructure/
│   ├── events/
│   │   ├── app-event-bus.ts
│   │   └── event-bus.ts
│   └── http/
│       └── http-client.ts
├── features/shop/api/
│   ├── http-shop-gateway.ts
│   └── shop-gateway-provider.ts
├── router/meta.ts
└── stores/
    ├── index.ts
    └── navigation.ts
```

依赖方向：

```text
View
  ↓
Pinia Shop Store
  ↓
ShopGateway interface
  ├── Fixture adapter
  └── HTTP adapter
        ↓
      HttpClient
        ↓
      Axios
```

Domain、View 和 Store 不 import Axios。

## Round 2 → Round 3

| 指标 | Round 2 | Round 3 |
| --- | ---: | ---: |
| Production source files | 22 | 30 |
| Production TypeScript | 13 | 21 |
| Vue SFC | 6 | 6 |
| JavaScript runtime files | 0 | 0 |
| Vitest files | 7 | 13 |
| Vitest tests | 21 | 43 |
| E2E tests | 7 | 10 |
| Explicit `any` | 0 | 0 |
| `$ref` | 0 | 0 |
| Type suppression | 0 | 0 |

所有现代 `src/`：

```text
files=43
explicit any=0
$ref=0
@ts-ignore/@ts-nocheck=0
```

运行时 `unknown` 从 11 增加到 19，新增位置主要是：

- 环境变量 runtime parser。
- Axios response data。
- Axios/Store catch boundary。
- Router meta parser。

这些是边界验证所需，不是类型倒退。

## AppError 扩展

Round 2：

```text
aborted, not-found, parse, unexpected
```

Round 3：

```text
aborted, http, network, not-found, parse, timeout, unexpected
```

页面仍只消费同一个 discriminated AppResult，而不是识别 Axios class。

## 测试增长

新增测试组：

- Runtime config：5。
- HTTP client/error mapping：6。
- HTTP Shop Gateway：3。
- Typed event bus：2。
- Navigation Store：3。
- Route meta parser：3。

原 Round-2 测试继续通过，合计 43。

## 构建体积

Round 2：

```text
1,398,106 bytes
```

Round 3：

```text
1,463,076 bytes ≈ 1.40 MiB
product images=1,274,128 bytes
non-product output=188,948 bytes ≈ 184.52 KiB
increase=64,970 bytes
```

主要增长来自 Axios HTTP adapter、runtime config、Navigation Store 和 event infrastructure。商品图片不变。

## Lockfile

```text
Round-2 bun.lock bytes=80,089
Round-3 bun.lock bytes=85,235
delta=5,146 bytes
sha256=c33205a80989103b674624f70a41051462c635f05dd0b720518a67badb60a997
```

新增唯一直接依赖是 Axios 1.20.0。

## 机器证据

- `generated/summary.json`（本地生成：`generated/summary.json`）
- `generated/browser-states.json`（本地生成：`generated/browser-states.json`）
- [`scripts/round-3/collect-round.ts`](../../scripts/round-3/collect-round.ts)
