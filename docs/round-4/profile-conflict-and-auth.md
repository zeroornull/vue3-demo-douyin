# Round 4B：Profile 冲突和授权边界

## 未登录访问

Route meta：

```ts
requiresAuth: true
```

应用路由守卫：

```text
/me
→ /login/password?redirect=/me
```

编辑页同理保留内部 redirect。

## 401

Profile HTTP GET/PATCH 返回 401：

1. HttpClient 映射 `http status=401`。
2. ProfileGateway 映射 `unauthorized`。
3. Profile View/Edit View 进入同一个幂等 `redirectToLogin()`。
4. 内存 AuthSession 清除。
5. replace 到密码登录。

`redirectToLogin()` 在清 session 之前先设置 single-flight 标记。这样，401 分支与
`watch(session)` 即使在同一个更新周期内触发，也只有一次 `router.replace()`，不会与
`<Transition mode="out-in">` 组合成空白 RouterView。

E2E 不只断言 URL 和登录链接，还断言“手机号密码登录”表单标题可见；视觉证据中的
`profile-unauthorized.png` 也必须显示完整密码表单，而不是只有 Header/Footer。

## 409 Optimistic Conflict

保存请求：

```json
{
  "profile": {
    "displayName": "本地修改",
    "handle": "..."
  },
  "expectedVersion": 1
}
```

服务器如果已更新为其他版本：

```text
HTTP 409
→ AppError kind=conflict
→ Store status=conflict
```

关键行为：

- 本地 draft 保留。
- 服务器 profile 基线不被本地值覆盖。
- 用户可选择重新加载服务器版本。
- 不自动静默覆盖他人修改。

## 响应用户一致性

即使 Profile response 结构合法，Store 仍检查：

```text
response.userId === AuthSession.userId
```

不一致返回 parse error，防止错误缓存/服务端 bug 把其他用户资料写入当前 session。

## Dirty 离开

编辑页有未保存修改时，路由离开调用：

```text
window.confirm('资料尚未保存，确定离开吗？')
```

保存成功/401 redirect 会显式设置 allowLeave，避免不必要提示。

## Validation

| 字段 | 规则 |
| --- | --- |
| displayName | 1–20 字符 |
| handle | 2–16 位字母/数字/下划线/点 |
| bio | 最多 160 字符 |
| age | null 或 0–120 整数 |
| province/city | 最多 20 字符 |
| school | null 或最多 60 字符 |

Validation failure 不调用 PATCH，draft 保留。

## Typed Event

保存成功 emit：

```ts
'profile:updated': {
  userId: string
  version: number
}
```

不包含 token 或完整个人资料。
