# Round 4G：通知与消息附件

本批次建立 `/message/notifications` typed UI，以及聊天 JPEG/PNG/MP4 附件基础边界。
4G-B 已把通知页接到 Fixture/HTTP Gateway，并补上 cursor、单条/批量已读、401、503
和 parser。上传仍不提供百分比进度；产品只展示 uploading/ready/error，因为当前 HttpClient
没有稳定的上传进度接口，文档不伪造一个假百分比。

这一轮最先碰到的不是网络，而是测试路由。MessageList 新增通知入口后，memory router
没有 `notifications` route，完整 Unit 直接失败。补齐测试路由比 stub 掉 RouterLink 更合理，
因为它继续验证真实 named route。

附件上传保持两段式：先上传并解析本地附件 URL，再把 attachmentId 放进消息发送请求。
JPEG/PNG 上限 5 MB，MP4 上限 25 MB；401、413、429、503 和 AbortSignal 分开处理。

## Legacy 差异

旧通知只在页面内执行 `item.read=true`；新页面统一展示 system/task/wallet 通知并支持单条和全部已读。旧聊天媒体使用硬编码远程 URL；现代 parser 只接受
`/message/attachments/<safe-name>.(jpg|jpeg|png|mp4)`。

## 上传规则

```text
JPEG/PNG <= 5 MB
MP4 <= 25 MB
```

HTTP 上传使用 multipart FormData、Bearer token 和 AbortSignal。错误映射：401 unauthorized、
413 validation、429 rate-limit、503 http。上传成功后附件进入待发送 MessageDraft；消息 parser
允许“文本”或“附件”至少一项存在。

## 路由与 UI

- `/message/notifications` 需要登录。
- Message list 提供通知中心入口。
- Chat 支持选择附件、上传状态、错误和 ready 提示。
- 收到的 image/video attachment 分别使用 img/video 渲染。

本批次不实现对象存储签名、转码、缩略图、上传进度、批量选择和通用媒体库。
