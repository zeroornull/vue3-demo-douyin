# Round 4F：Optimistic update、回滚与登录意图

## 点赞 snapshot

点赞前保存：`liked`、`likeCount`、`version`。UI 立即切换并发送目标值与
`expectedVersion`。成功接受服务端 count/version；失败恢复完整 snapshot。

因此 409、429、503、401、abort 和 unexpected 都不会留下错误计数。

## 评论 optimistic model

校验成功后插入带 `pending=true` 的临时 CommentViewModel。服务端成功后用 parser
确认对象替换；失败时删除临时项，但组件 draft 不清空。

只有成功才：

- 清空 textarea。
- emit typed event。
- 将焦点恢复到 textarea。

## 重复提交

Store 在 `submitting` 时直接返回 conflict。组件也必须在创建新 AbortController 前
检查 submitting；否则程序化双 submit 会 abort 首个请求。E2E 曾捕获该问题，修复后
双 `requestSubmit()` 只产生一个 POST。

## 登录意图

公开详情允许未登录浏览。未登录点赞写入跳到密码登录；评论跳转保留：

```text
/home/content/:feedId#comment-form
```

登录成功返回后 textarea 自动 focus。服务端 401 同样清 session 并保留 comment focus
intent。

## 429 与草稿

HTTP 429 映射 rate-limit。Optimistic comment 被移除，错误可见，textarea 原值保留，
用户稍后可以重试。

## 非目标

本轮不迁移评论回复、评论点赞、删除、举报、@ 联系人、表情、图片评论、分享和实时推送。
