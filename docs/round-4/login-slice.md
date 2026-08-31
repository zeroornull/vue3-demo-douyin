# Round 4A：登录纵切

## 旧行为

旧登录入口：

- 获取掩码手机号时固定等待 1 秒。
- 一键登录只把 `loading=true`，没有实际成功/失败结果。
- 密码页面是 JavaScript Options API，`extends: Base`。
- 表单状态依赖继承和全局组件/mixin。

最重要的缺陷在 `Base.check()`：

```js
return new Promise((resolve) => {
  if (this.isAgree) {
    resolve(true)
  } else {
    // 只做动画，不 resolve(false)
  }
})
```

未同意协议时，调用方：

```js
await this.check()
```

会永久等待。

## 新路由

| URL | 行为 |
| --- | --- |
| `/login` | 登录入口、演示账号、迁移边界说明 |
| `/login/password` | 严格类型密码表单 |
| `/login/other` | 重定向密码登录，避免旧路径 404 |

登录入口默认携带：

```text
redirect=/shop
```

## Domain

```ts
type PhoneNumber = string & PhoneNumberBrand

interface AuthCredentials {
  phone: PhoneNumber
  password: string
}

interface AuthSession {
  userId: string
  displayName: string
  accessToken: string
}
```

手机号 parser：

- 去除空格和连字符。
- 去除 +86/86 前缀。
- 只接受 `1[3-9]` 开头的 11 位大陆手机号。
- UI 可以通过 `maskPhone` 得到 `138****8000`。

## AuthGateway

```ts
interface AuthGateway {
  signIn(credentials, options?): Promise<AppResult<AuthSession>>
}
```

实现：

- `fixtureAuthGateway`：本地演示。
- `HttpAuthGateway`：POST `/auth/login`。

演示账号：

```text
phone=13800138000
password=douyin-demo
```

E2E build 通过 `.env.e2e` 使用 HTTP adapter；普通开发默认 fixture。

## HTTP 请求

请求体：

```json
{
  "phone": "13800138000",
  "password": "douyin-demo"
}
```

成功响应：

```json
{
  "user": {
    "id": "user-id",
    "displayName": "显示名"
  },
  "accessToken": "token"
}
```

HTTP data 仍为 unknown；`parseAuthSession` 逐项验证 user、id、displayName 和 accessToken。

## Pinia 状态机

```text
idle
  → submitting
    → authenticated
    → error (401/503/parse/unexpected)
    → idle (aborted)
```

validation 不进入 submitting，也不调用 Gateway。

成功时：

- 保存内存 session。
- `isAuthenticated=true`。
- emit `auth:signed-in`。
- router.replace 安全 redirect。

退出：

- request sequence 失效。
- session/error/field errors 清空。
- 不残留 localStorage token。

## UI

表单包括：

- `type=tel` 手机号。
- `autocomplete=tel`。
- `autocomplete=current-password`。
- 密码显示/隐藏按钮。
- 协议 checkbox。
- 每字段 aria-invalid/aria-describedby。
- service error `role=alert`。
- submitting 禁用按钮。

本批次没有复制旧登录图片或第三方登录 icon，因为密码纵切不需要它们。
