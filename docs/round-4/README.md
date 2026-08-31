# 第 4 轮进度：Round 4A Login 纵切

> 执行日期：2026-08-30（Asia/Shanghai）
> 状态：**Round 4A 完成；Round 4 整体仍在进行中**
> Git：本批次基线 HEAD 为 `f9704d5`；本批次没有创建或暂存新提交

## 本批次范围

已迁移：

- `/login` 登录入口。
- `/login/password` 手机号密码登录。
- `/login/other` 安全重定向到密码登录。
- 手机号/密码/协议同步校验。
- Fixture 与 HTTP AuthGateway。
- authenticated、validation、unauthorized、503、parse、aborted、unexpected 状态。
- 安全 redirect。
- 内存 session、sign out 和 `auth:signed-in` typed event。

尚未迁移：

- 短信验证码。
- 找回密码。
- Help/协议页面。
- 第三方社交登录。
- 真实 token refresh/persistence。
- Profile、Message、Home 等其他 Round-4 纵切。

因此本轮总路线不会被标记为全部完成；下一个建议批次是 Round 4B Profile。

## 结果摘要

| 项目 | 结果 |
| --- | --- |
| 旧缺陷 | 删除协议未同意时永不 resolve 的 Promise 模式 |
| Domain | branded PhoneNumber、AuthCredentials、AuthSession |
| Validation | 手机号、8–128 字符密码、协议分别返回字段错误 |
| Gateway | fixture/http 两个 adapter，共享 AuthGateway |
| HTTP | POST `/api/auth/login`，响应仍从 unknown parser 开始 |
| 安全 | 禁止 `//evil` 和递归 `/login` redirect |
| Session | 只保存在 Pinia 内存，不写 localStorage/cookie |
| Tests | 20 个 Vitest 文件、70 个测试；17 个 E2E |
| 依赖 | 没有新增 npm dependency，继续复用 Axios 1.20.0 |
| 类型债务 | 新 runtime/tests 继续保持 0 any、0 `$ref`、0 type suppression |

## 文档

- [登录纵切](login-slice.md)
- [校验和安全边界](validation-and-security.md)
- [迁移指标](metrics.md)
- [验证证据](verification.md)

自动日志、JSON 和截图保存在本地 `docs/round-4/evidence/`、`generated/`、`screenshots/`，按 Git 卫生策略忽略，不进入仓库。

## Git 边界

Round 3 已在批次开始前提交为：

```text
f9704d5 feat: implement round 3 of migration focusing on HTTP infrastructure and navigation
```

本批次没有创建 commit、没有暂存文件。

## 完成定义

- [x] 页面不 import Axios。
- [x] HTTP response data 从 `unknown` 进入 parser。
- [x] 表单校验失败时不调用 Gateway。
- [x] 协议未同意立即返回 validation error，不创建悬挂 Promise。
- [x] 401 与字段 validation 分开表示。
- [x] 503 与 invalid response 分开表示。
- [x] 登录成功只接受经过 parser 的 AuthSession。
- [x] 外部/递归 redirect 被阻止。
- [x] 请求在页面 unmount 时 Abort。
- [x] 登录成功 emit typed `auth:signed-in`。
- [x] 退出登录清空内存 session/error。
- [x] 默认开发使用 fixture，E2E 使用 HTTP。
- [x] 登录所有关键状态有 unit/component/E2E 和视觉证据。

## 下一批次

Round 4B Profile 应复用当前 AuthSession，迁移：

1. User DTO/parser。
2. Session/user Pinia 边界。
3. `/me` 和 `/me/edit-userinfo`。
4. 表单 dirty/validation/save/error。
5. 深链、刷新和未登录 redirect。
6. 只迁移该纵切真正使用的头像/资源。
