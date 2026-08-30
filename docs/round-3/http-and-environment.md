# 第 3 轮：HTTP、环境与 Adapter

## 1. Axios 依赖

新增唯一生产依赖：

```text
axios 1.20.0
```

查询日 npm registry `latest` 同为 1.20.0。没有引入 axios-mock-adapter；unit 使用 Axios adapter/fake HttpClient，浏览器使用 Playwright route。

依赖边界：

```text
View / Pinia / Domain
        ↓ ShopGateway
HTTP Shop Gateway
        ↓ HttpClient
Axios infrastructure
```

只有 `src/infrastructure/http/http-client.ts` import Axios。

## 2. HttpClient

```ts
interface HttpClient {
  get(path: string, options?): Promise<AppResult<unknown>>
}
```

HTTP data 明确返回 `unknown`；Shop HTTP Gateway 收到后继续调用 Round-2 `parseLegacyGoodsList`。替换网络 adapter 不会绕开 runtime validation。

请求选项：

- typed string/number/boolean query。
- AbortSignal。
- base URL。
- timeout。
- `Accept: application/json`。

## 3. Axios 错误映射

| Axios 情况 | AppError |
| --- | --- |
| `CanceledError` / `ERR_CANCELED` | `aborted` |
| `ETIMEDOUT` / `ECONNABORTED` | `timeout` |
| response 4xx/5xx | `http` + status |
| request 存在、response 缺失 | `network` |
| 非 Axios/未知 throw | `unexpected` + details |

HTTP response body 不写入 AppError，避免把服务端秘密或大对象泄漏到 UI/log。

503 示例：

```ts
{
  kind: 'http',
  message: 'HTTP 请求失败（503）。',
  status: 503
}
```

浏览器对真实 503 resource 会自然输出一条 “Failed to load resource” console error；E2E 明确断言它是唯一预期 console error，同时页面没有 page exception。

## 4. Runtime Config

配置：

```ts
interface RuntimeConfig {
  apiBaseUrl: string
  httpTimeoutMs: number
  shopDataSource: 'fixture' | 'http'
}
```

环境变量：

```text
VITE_API_BASE_URL
VITE_HTTP_TIMEOUT_MS
VITE_SHOP_DATA_SOURCE
```

验证：

- API base 必须是单斜杠根相对路径或 HTTP(S) URL。
- 拒绝 `//host`、`javascript:` 等危险/不支持形式。
- timeout 必须是 100–120000 的整数。
- data source 只允许 fixture/http。

默认：

```text
apiBaseUrl=/api
httpTimeoutMs=10000
shopDataSource=fixture
```

配置错误不会被 `as` 强转隐藏；`getRuntimeConfig` 抛出的内部 invariant 会被 Shop Store 捕获为 `unexpected` 并进入 error 状态。

## 5. 显式数据源切换

普通开发/production 未设置时：

```text
Shop Store → fixtureShopGateway
```

`.env.e2e`：

```dotenv
VITE_API_BASE_URL=/api
VITE_HTTP_TIMEOUT_MS=10000
VITE_SHOP_DATA_SOURCE=http
```

E2E：

```text
Shop Store
  → getDefaultShopGateway
  → HttpShopGateway
  → AxiosHttpClient
  → /api/shop/products
  → Playwright route
```

`/health` 在 E2E build 中显示：

```text
Mode=e2e
Shop data source=http
HTTP timeout=10000 ms
```

这证明 E2E 不是继续偷偷使用 fixture adapter。

## 6. HTTP 浏览器场景

| 场景 | HTTP/Payload | UI |
| --- | --- | --- |
| success | 200 + 6 DTO | 6 商品 |
| empty | 200 + `[]` | “目前没有商品” |
| HTTP failure | 503 | typed HTTP alert + retry |
| parse failure | 200 + object | “商品列表必须是数组” |

视觉/机器证据：

- `generated/browser-states.json`（本地生成：`generated/browser-states.json`）
- `screenshots/shop-http-success.png`（本地生成：`screenshots/shop-http-success.png`）
- `screenshots/shop-http-empty.png`（本地生成：`screenshots/shop-http-empty.png`）
- `screenshots/shop-http-503.png`（本地生成：`screenshots/shop-http-503.png`）
- `screenshots/shop-http-parse-error.png`（本地生成：`screenshots/shop-http-parse-error.png`）
- `screenshots/health-http.png`（本地生成：`screenshots/health-http.png`）
