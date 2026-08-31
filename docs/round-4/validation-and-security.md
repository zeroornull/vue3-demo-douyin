# Round 4A：校验和安全边界

## 表单校验

输入：

```ts
interface AuthFormInput {
  phone: string
  password: string
  agreed: boolean
}
```

输出：

```ts
AppResult<AuthCredentials, AuthValidationError>
```

字段错误：

- `phone`
- `password`
- `agreement`

校验是同步纯函数；没有 timer、DOM、Promise 或 Router 副作用。

## Result 分支

本批次扩展 AppError：

```text
validation
unauthorized
```

区分：

| 情况 | Kind |
| --- | --- |
| 手机号/密码/协议不合法 | `validation` |
| HTTP 401 | `unauthorized` |
| HTTP 503 | `http` |
| HTTP 200 但 session 结构错误 | `parse` |
| AbortSignal | `aborted` |
| Gateway throw | `unexpected` |

UI 不需要识别 AxiosError。

## Redirect 安全

`resolveAuthRedirect`：

- 允许 `/shop` 等内部绝对路径。
- 拒绝 `//evil.example`。
- 拒绝非 `/` 开头字符串。
- 拒绝 `/login...` 递归 redirect。
- 无效值回到 `/`。

E2E 实际登录：

```text
/login/password?redirect=//evil.example
```

最终仍停留当前 origin 的 `/`。

## Token 边界

当前 access token：

- 只保存在 Pinia 内存。
- 不写 localStorage/sessionStorage。
- 不写 URL。
- 不输出到 DOM。
- 不在 HTTP error 中回显 response body。

真实 cookie/token refresh 属于后续安全设计；本批次不建立不安全的“临时永久存储”。

## 请求取消

Password View 每次 submit：

1. Abort 上一个 controller。
2. 创建新 controller。
3. 传给 Auth Store/Gateway/HttpClient。
4. 页面 unmount 时 Abort。

Store 把 aborted 返回 idle，而不是显示为密码错误。

## Typed Event

新增：

```ts
'auth:signed-in': {
  userId: string
}
```

Store 登录成功后 emit。测试保存 unsubscribe 并验证 listener cleanup；event 不包含 token。
