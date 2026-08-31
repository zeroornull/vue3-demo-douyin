# 第 4 轮进度：Round 4A Login + 4B Profile + 4C Message

> 更新日期：2026-08-31（Asia/Shanghai）
> 状态：**Round 4A、4B、4C 完成；Round 4 整体仍在进行中**
> Git：4C 基线 HEAD 为 `a6ca4bc`；4C 没有创建或暂存新提交

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
- `/me` 个人资料与 `/me/edit-userinfo` 编辑资料。
- UserProfile DTO/parser、fixture/http ProfileGateway。
- Bearer GET/PATCH、dirty draft、expectedVersion 和 409 conflict。
- 未登录 Profile 深链 redirect、401 清 session、503 和非法 payload。
- `/message` 会话列表与 `/message/chat/:conversationId` 文本聊天。
- branded ConversationId、Conversation/Message parser 和 fixture/http MessageGateway。
- Bearer conversation/thread/read/send、cursor 分页、已读/未读和同步发送校验。
- typed incoming/read/sent/unread events 与页面卸载订阅清理。
- 401 清 session 和消息私有状态、404、503、非法 payload 和无 ID 旧路由回退。

尚未迁移：

- 短信验证码。
- 找回密码。
- Help/协议页面。
- 第三方社交登录。
- 真实 token refresh/persistence。
- Message 通知、群聊、媒体消息和 Home 等其他 Round-4 纵切。

因此本轮总路线不会被标记为全部完成；下一个建议批次是 Round 4D Home/Search。

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
| Profile | typed draft、dirty、validation、save、409 conflict、version increment |
| Message | stable conversation ID、cursor、read/unread、send、typed lifecycle events |
| Tests | 34 个 Vitest 文件、125 个测试；34 个 E2E |
| 依赖 | 没有新增 npm dependency，继续复用 Axios 1.20.0 |
| 类型债务 | 新 runtime/tests 继续保持 0 any、0 `$ref`、0 type suppression |

## 文档

- [登录纵切](login-slice.md)
- [校验和安全边界](validation-and-security.md)
- [Profile 纵切](profile-slice.md)
- [Profile 冲突和授权边界](profile-conflict-and-auth.md)
- [Message / Conversation 纵切](message-slice.md)
- [Message 分页、未读与事件生命周期](message-pagination-and-events.md)
- [迁移指标](metrics.md)
- [验证证据](verification.md)

自动日志、JSON 和截图保存在本地 `docs/round-4/evidence/`、`generated/`、`screenshots/`，按 Git 卫生策略忽略，不进入仓库。

## Git 边界

Round 4B 已在本批次开始前提交为：

```text
a6ca4bc feat: implement round 4B of migration focusing on profile features
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
- [x] Profile 未登录深链安全 redirect 登录。
- [x] Profile GET/PATCH 都携带 Bearer token，但 token 不进入 DOM/log/event。
- [x] UserProfile response 从 unknown parser 开始。
- [x] 编辑只修改 draft，dirty/reset/save 可观察。
- [x] 保存携带 expectedVersion，409 保留本地 draft。
- [x] 401 清 AuthSession 并回到登录。
- [x] 401 与 session watcher 共享 single-flight redirect，登录 RouterView 不会因重复 replace 变空。
- [x] Profile 503/parse/validation/success 有 unit/component/E2E/视觉证据。
- [x] Profile 不复制旧视频列表、侧栏、二维码或外部头像。
- [x] Message 深链包含 URL-safe ConversationId，无 ID 旧路径安全回到列表。
- [x] Conversation/Message/ReadReceipt 都从 unknown parser 开始。
- [x] 会话和更早消息使用 cursor，并按 ID 去重合并。
- [x] 打开 unread conversation 后发送 read receipt，成功后再清未读数。
- [x] 空消息同步 validation，Gateway 调用数为 0。
- [x] Message HTTP 401/404/503/parse 与空列表分开表示。
- [x] `message:received` listener 在 Message Shell unmount 时删除。
- [x] Sign out 清除 Message Store 私有数据与导航未读徽标。
- [x] Message 不复制旧通知、媒体、红包或外部头像资源。

## 下一批次

Round 4D Home/Search 建议迁移：

1. 最小只读 Home feed DTO 和 parser。
2. `/home`、`/home/search` 与稳定内容深链。
3. cursor feed、空状态、下拉刷新和请求竞态。
4. 只迁移首屏实际消费的封面资源。
5. 不在同一批次引入视频播放、直播、音乐和复杂手势。
