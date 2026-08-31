# Round 4F：点赞与评论纵切

## Legacy 审计

旧评论核心为 `legacy/src/components/Comment.vue`，约 17 KB；点赞位于
`ItemToolbar.vue`。主要问题：

- 评论发送只 `unshift` 本地对象，没有服务端确认或失败回滚。
- 点赞直接修改 props 中的 `digg_count`。
- 100ms 后再通过全局 bus 广播，没有请求状态。
- 没有 401/409/429/503 区分。
- 没有重复提交保护、版本或 cursor 契约。
- Comment response 使用 `any`。

Round 4F 在稳定 `/home/content/:feedId` 上迁移公开评论读取与登录写操作。

## Domain

新增：`CommentId`、`CommentAuthor`、`FeedComment`、`CommentPage`、
`CommentDraft` 和 `FeedLikeState`。

Comment 与 Like 都携带 FeedId；跨 Feed response 会被 parser 拒绝。Like state
包含 `version`，写请求携带 `expectedVersion`。

## Gateway

```text
GET  /api/feed/:feedId/comments?cursor=...
POST /api/feed/:feedId/comments
POST /api/feed/:feedId/like
```

评论读取公开；评论/点赞写入携带 Bearer token。写错误映射：

```text
401 → unauthorized
409 → conflict
429 → rate-limit
503 → http
invalid 200 → parse
```

## 评论分页

CommentPage 使用 opaque cursor。Store 首次替换、加载更多按 CommentId 去重追加，
`nextCursor=null` 后停止请求。空评论与加载错误分开表示。

## 评论校验

正文 trim 后必须为 1–300 字符。失败同步返回 validation，Gateway 调用数为 0。

## UI

Feed Detail 新增 `FeedInteractions`：

- 当前点赞数和 aria-pressed。
- 登录后写提示。
- 评论输入、字数、字段错误。
- pending 评论。
- public cursor comment list。
- like/comment error alert。
- 空评论和加载更多。

头像继续使用姓名首字母，不复制旧评论头像资源。

## Typed events

成功写入 emit：

```text
feed:liked { feedId, liked }
feed:comment-created { feedId, commentId }
```

事件不包含 token、完整评论正文或未经 parser 的 response。
