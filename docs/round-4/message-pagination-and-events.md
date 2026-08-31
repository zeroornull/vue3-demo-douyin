# Round 4C：分页、未读与事件生命周期

## 为什么选择 cursor

消息列表和聊天记录都使用 cursor，而不是页面自己计算 `page=2`：

```text
ConversationPage:
  conversations[]
  nextCursor: string | null

MessagePage:
  conversation
  messages[]
  nextCursor: string | null
```

cursor 的含义由 Gateway/服务端拥有。Store 只负责：

1. 首次加载时替换当前集合。
2. 加载更多会话时向尾部追加并按 ID 去重。
3. 加载更早消息时向头部追加并按消息 ID 去重。
4. `nextCursor=null` 时停止请求。

这样后端以后改为时间游标、复合游标或 opaque token 时，页面不需要重新设计。

## Fixture 分页是协议实现，不是假数组

Fixture Gateway 也实现同一个 cursor 协议：

- 会话从头向后分页。
- 聊天首次返回最近一页。
- “加载更早消息”向时间线头部翻页。
- 非法 cursor 返回 parse error。

因此 fixture 模式可以验证 Store 的真实分页合并逻辑，而不是用一次性完整数组绕开边界。

## 已读状态

打开 unread conversation 后：

```text
GET thread
→ parser success
→ render messages
→ POST read receipt
→ verify receipt conversationId
→ local unreadCount=0
→ emit message:read
→ publish new unread total
```

只有服务端已读回执成功后才清除本地未读数。401、404、503 或非法回执不会伪装成成功。

## 发送状态

发送前先同步运行：

```ts
validateMessageDraft({ body })
```

空文本或超过 500 字符时：

- 立即返回 validation error。
- Gateway 调用次数保持 0。
- 页面显示字段错误。
- 现有消息不会被清空。

发送成功后：

- 消息追加到 thread。
- conversation.lastMessage 更新。
- conversation.updatedAt 更新。
- 会话移动到列表顶部。
- composer 清空。
- emit `message:sent`。

## Typed events

Round 4C 新增：

```ts
'message:received': { message: ChatMessage }
'message:read': { conversationId: ConversationId }
'message:sent': { conversationId: ConversationId; messageId: string }
'message:unread-changed': { total: number }
'auth:signed-out': { userId: string | null }
```

事件不包含 accessToken。

`MessageShellView` 在 mounted 时订阅 `message:received`，在 unmount 时调用返回的 unsubscribe：

```text
mount listener count=1
unmount listener count=0
```

这提供了未来 WebSocket/SSE adapter 的接入点，同时锁定当前最重要的生命周期合同：路由离开后不能继续保留页面 listener。

当前没有伪装成已经实现实时网络；组件测试只验证 typed incoming event 如何进入 Store。真正的长连接、重连、顺序号、去重和离线恢复应作为后续独立基础设施批次。

## Incoming message 合并

收到 typed incoming message 时：

- 当前打开的会话：追加消息，未读保持 0。
- 其他已知会话：未读数 +1。
- lastMessage/updatedAt 更新。
- 会话移动到列表顶部。
- 未知 conversationId 暂时忽略，等待未来补充 fetch-by-id 策略。

## Sign out 清理

Auth Store 在清 session 前 emit `auth:signed-out`。应用壳收到后：

- 清零导航未读徽标。
- reset Message Store。
- 删除会话和聊天记录等私有内存状态。

Message 路由自身也观察 session。401 或手工退出后只有壳层负责一次登录跳转：

```text
/message/chat/conv-id
→ /login/password?redirect=/message/chat/conv-id
```

子页面只调用 `auth.signOut()`，不再和 session watcher 同时执行第二次 `router.replace()`，因此不会重现 Profile 4B 曾捕获的重复导航竞态。

## 竞态保护

Store 分别维护：

- list request sequence。
- thread request sequence。

后发请求会使旧请求结果失效；切换用户、切换会话和 reset 也会增加序号。旧响应可以安全返回给调用者，但不会覆盖当前 Pinia 状态。

所有页面请求在 unmount 或下一次同类操作前 abort。
