# 第 4 轮进度：Round 4A Login + 4B Profile + 4C Message + 4D Feed + 4E Media

> 更新日期：2026-08-31（Asia/Shanghai）
> 状态：**Round 4A、4B、4C、4D、4E 完成；Round 4 整体仍在进行中**
> Git：4E 基线 HEAD 为 `4146ffd`；4E 没有创建或暂存新提交

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
- `/home`、`/home/search?q=` 和 `/home/content/:feedId` 只读内容发现纵切。
- branded FeedId/FeedSearchQuery、Feed parser 和 fixture/http FeedGateway。
- Feed/Search cursor、refresh 替换、搜索 validation 和 stable detail。
- 独立 `VITE_FEED_DATA_SOURCE` 与 Health 可观察项。
- 只复制两个本地封面，并拒绝任意外部 cover URL。
- 旧 `/video-detail` 因没有内容身份安全回到 `/home`。
- Feed Detail 的本地 H.264 MP4 播放器。
- MediaSource runtime parser 和 idle/loading/paused/playing/buffering/ended/error 状态机。
- 用户触发播放、暂停/重播、静音、range 进度和键盘控制。
- Reduced Motion、CSP `media-src 'self'` 和 206 byte-range 验证。
- 可重复 FFmpeg fixture 生成脚本和 0 page exception 媒体视觉证据。

尚未迁移：

- 短信验证码。
- 找回密码。
- Help/协议页面。
- 第三方社交登录。
- 真实 token refresh/persistence。
- 评论/分享交互、Message 通知/媒体、直播、音乐等其他 Round-4 纵切。

因此本轮总路线不会被标记为全部完成；下一个建议批次是 Round 4F Content Interactions。

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
| Feed | stable FeedId、search query、cursor、refresh、local cover boundary |
| Media | user-triggered MP4、playback state、keyboard、CSP、206 range |
| Tests | 44 个 Vitest 文件、168 个测试；51 个 E2E |
| 依赖 | 没有新增 npm dependency，继续复用 Axios 1.20.0 |
| 类型债务 | 新 runtime/tests 继续保持 0 any、0 `$ref`、0 type suppression |

## 文档

- [登录纵切](login-slice.md)
- [校验和安全边界](validation-and-security.md)
- [Profile 纵切](profile-slice.md)
- [Profile 冲突和授权边界](profile-conflict-and-auth.md)
- [Message / Conversation 纵切](message-slice.md)
- [Message 分页、未读与事件生命周期](message-pagination-and-events.md)
- [Home / Search / Feed 纵切](feed-slice.md)
- [Search、Cursor 与封面资源边界](feed-search-and-resource-boundary.md)
- [Media Playback 纵切](media-playback-slice.md)
- [媒体资源、CSP、Range 与测试](media-source-csp-and-range.md)
- [迁移指标](metrics.md)
- [验证证据](verification.md)

自动日志、JSON 和截图保存在本地 `docs/round-4/evidence/`、`generated/`、`screenshots/`，按 Git 卫生策略忽略，不进入仓库。

## Git 边界

Round 4D 已在本批次开始前提交为：

```text
4146ffd feat: implement round 4D of migration focusing on feed features
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
- [x] Home/Search/Detail 路由可以刷新和分享，不依赖 routeData。
- [x] Feed/Search/Detail response 全部从 unknown parser 开始。
- [x] Feed 和 Search cursor 按 FeedId 去重合并。
- [x] Refresh 不携带 cursor，成功替换、失败保留旧内容。
- [x] 非法 search query/FeedId 在 Gateway 前拒绝。
- [x] Search no-results 与 HTTP error 分开表示。
- [x] Cover parser 拒绝外部 URL 和 dot segment。
- [x] Feed 独立 fixture/http 数据源可从 Health 观察。
- [x] 两个封面按消费者复制，哈希/大小/来源已记录。
- [x] Round 4D 详情曾明确不挂载播放器，Round 4E 再独立引入媒体状态机。
- [x] MediaSource 和 FeedDetail 同时从 unknown parser 开始。
- [x] Media parser 拒绝外部 URL、dot segment、非 MP4 和不安全 poster。
- [x] 初始 paused/currentTime=0，页面不含 autoplay。
- [x] 只有按钮或聚焦播放器后的 Space/K 触发播放。
- [x] paused/playing/buffering/ended/error 状态可观察。
- [x] mute、range、时间、aria-live 和键盘帮助可访问。
- [x] error/ended 不被浏览器后续 pause 事件覆盖。
- [x] Reduced Motion 下控制 transition 为 0s。
- [x] CSP 限制 `media-src 'self'`，外部媒体请求数为 0。
- [x] 本地 MP4 支持 206 byte range。
- [x] FFmpeg fixture 重复生成 SHA-256 不变。

## 下一批次

Round 4F Content Interactions 建议迁移：

1. Comment DTO/parser、cursor 和 stable content association。
2. Like/comment optimistic update 与 rollback。
3. 未登录写操作的登录 redirect。
4. 重复提交、冲突、401/409/429/503。
5. 评论输入、字符限制和键盘/焦点恢复。
6. 不同时迁移直播、音乐或复杂 Feed 滑动。
