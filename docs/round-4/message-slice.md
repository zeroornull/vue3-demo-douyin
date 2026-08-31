# Round 4C：Message / Conversation 纵切

## Legacy 审计

旧消息领域共有：

```text
message routes=16
message source files=21
Message.vue=1092 lines
Chat.vue=915 lines
```

旧 `/message` 同时负责：

- 好友在线横栏。
- 新朋友、互动消息和通知入口。
- 私聊会话。
- 搜索好友。
- 创建群聊。
- 已加入群聊。
- 推荐联系人无限追加。

旧 `/message/chat` 又把文本、时间、图片、视频、音频、通话、表情、红包和长按菜单全部硬编码在一个页面中。聊天 URL 没有任何会话标识，因此刷新、分享或多会话并行时，路由本身无法说明正在查看哪一条会话。

Round 4C 只迁移可独立闭环的消息核心：

```text
/message
/message/chat/:conversationId
```

以下能力暂不复制：

- 建群、联系人搜索和推荐。
- 粉丝、访客和互动消息。
- 系统、任务、直播和钱包通知。
- 图片、视频、语音、通话、红包和长按菜单。
- WebSocket/SSE 真实传输。

这些能力分别拥有独立的数据模型、安全边界和测试矩阵，不能再次塞进一个超大 Chat 组件。

## 稳定会话路由

Conversation ID 是带 brand 的 URL-safe 字符串：

```ts
type ConversationId = string & {
  readonly [conversationIdBrand]: 'ConversationId'
}
```

只接受：

```text
[A-Za-z0-9_-]{1,64}
```

因此：

- `/message/chat/conv-123` 可以直接访问、刷新和分享。
- `bad.id` 在页面边界立即拒绝，不发送 HTTP 请求。
- 带 `/` 的值不能逃出单个路由参数。
- 旧 `/message/chat` 因缺少 ID，不猜测默认联系人，只重定向到 `/message`。

## Message Domain

核心类型：

```ts
interface ConversationSummary {
  id: ConversationId
  participant: ConversationParticipant
  lastMessage: ChatMessage | null
  unreadCount: number
  updatedAt: string
}

interface ChatMessage {
  id: string
  conversationId: ConversationId
  senderId: string
  body: string
  sentAt: string
  delivery: 'sent' | 'delivered' | 'read'
}
```

列表页不需要完整聊天记录，只消费 `ConversationSummary`。聊天页通过 `MessagePage` 获取当前摘要、当前一页消息和下一条历史 cursor。

这避免了旧实现中“进入消息首页就把所有聊天类型和记录一起装入组件”的边界混乱。

## MessageGateway

Gateway 契约：

```ts
interface MessageGateway {
  listConversations(session, options?): Promise<AppResult<ConversationPage>>
  getConversation(session, conversationId, options?): Promise<AppResult<MessagePage>>
  markRead(session, conversationId, options?): Promise<AppResult<ReadReceipt>>
  sendMessage(session, conversationId, draft, options?): Promise<AppResult<ChatMessage>>
}
```

HTTP 路径：

```text
GET  /api/messages/conversations?cursor=...
GET  /api/messages/conversations/:conversationId/messages?cursor=...
POST /api/messages/conversations/:conversationId/read
POST /api/messages/conversations/:conversationId/messages
```

四类请求都携带：

```text
Authorization: Bearer <accessToken>
```

页面和 Store 不 import Axios。HTTP response 仍从 `unknown` 进入：

- `parseConversationPage`
- `parseMessagePage`
- `parseChatMessage`
- `parseReadReceipt`

HTTP 映射：

```text
401 → unauthorized
404 → not-found
503 → http/status
invalid 200 → parse
AbortSignal → aborted
```

Parser 还检查：

- cursor 必须是非空字符串或 `null`。
- 消息的 conversationId 必须与所属会话一致。
- HTTP 返回的会话 ID 必须与请求路径一致。
- 已读回执必须属于请求中的会话。
- 时间必须可被解析。
- unreadCount 必须是非负整数。
- 文本消息必须为 1–500 个字符。

## Message UI

`/message` 提供：

- 会话参与者姓名和 handle。
- 姓名首字母头像。
- 在线状态。
- 最后一条消息。
- 更新时间。
- 单会话未读数。
- 全局未读总数。
- cursor 加载更多。
- loading/success/empty/error 状态。

`/message/chat/:conversationId` 提供：

- 稳定会话 ID。
- 聊天参与者信息。
- 更早消息 cursor。
- 自己/对方消息方向。
- sent/delivered/read 状态。
- 1–500 字符同步校验。
- 发送成功后追加消息。
- 404、503、parse 和 unauthorized 状态。

## 资源策略

旧消息页引用了大量本地头像、通知图标、红包、通话、视频和工具栏图片。Round 4C 的文本会话核心并不需要这些资源，因此：

```text
new message image assets=0
legacy message asset imports=0
external avatar requests=0
```

参与者头像由 displayName 首字母生成。后续迁移图片消息或头像上传时，应单独建立媒体/CDN 安全边界，而不是把旧 `message/` 资源目录整体复制过来。
