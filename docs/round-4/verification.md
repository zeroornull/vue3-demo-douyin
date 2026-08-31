# Round 4A + 4B + 4C + 4D：验证证据

## Unit / Component

最终结果：

```text
Vitest files=41
Vitest tests=155
```

关键断言：

- 协议未同意时 Gateway 调用数为 0。
- 校验同步返回，不存在 pending Promise。
- fixture 正确账号成功、错误密码 unauthorized。
- HTTP 401 映射 unauthorized。
- HTTP 503 保留 http/status。
- 无效 session payload 返回 parse。
- Store 成功 emit userId，不 emit token。
- Abort 回到 idle。
- Sign out 清空 session/error。
- 组件成功登录并跟随 redirect。
- Profile parser/fixture/http gateway。
- Bearer Authorization。
- Dirty/validation/save/version increment。
- 409 保留本地 draft。
- 401 清 session。
- Profile typed event。
- ConversationId/时间/首字母 Domain。
- Message draft 同步 validation。
- Conversation/Message/ReadReceipt parser。
- Fixture/HTTP MessageGateway 和 Bearer/cursor/path。
- Conversation/thread cursor 合并和去重。
- 自动 read receipt 与未读总数。
- validation 不调用 send Gateway。
- typed incoming/read/sent/unread events。
- Message Shell listener mount=1、unmount=0。
- Message list/chat/invalid ID 组件状态。
- FeedId/SearchQuery/formatter Domain。
- Feed query validation。
- Feed item/page/detail parser 和 cover 白名单。
- Fixture/HTTP FeedGateway 和 cursor/query/path。
- Feed/Search cursor 合并和 refresh 替换。
- Invalid query 清除旧结果且不调用 Gateway。
- Detail typed viewed event。
- Home/Search/Detail/invalid ID 组件状态。
- Runtime Feed data source parser/Health。

## E2E

Round 4A 最终结果为本地和 CI 17/17；Round 4B 为 24/24；Round 4C 为 34/34；Round 4D 为 45/45。
下面列出 Round 4 功能纵切的核心浏览器覆盖；此前 10 项 Scaffold/Shop 场景仍在同一个 E2E 文件中持续执行：

1. 登录入口 → 密码表单。
2. 空表单三类字段错误，HTTP request 数为 0。
3. HTTP 登录成功并 redirect `/shop`。
4. HTTP 401 unauthorized。
5. HTTP 503 service error。
6. HTTP 200 invalid session → parse error。
7. 外部 redirect 被阻止。
8. 未登录 `/me` → 登录。
9. Bearer GET Profile。
10. Edit validation 不 PATCH。
11. PATCH 保存和 version 2。
12. 409 conflict 保留 draft。
13. Profile 401 清 session。
14. Profile 503。
15. Profile invalid payload。
16. 未登录 Message 深链 → 登录。
17. Bearer conversation list 和 cursor 加载更多。
18. 显式 empty conversation list。
19. 稳定 conversation deep link。
20. GET thread 后 POST read receipt。
21. 空消息 validation 不 POST send。
22. POST send 并渲染服务端确认消息。
23. 无 ID 旧 chat URL → Message list。
24. 非法 ConversationId 零 HTTP 请求。
25. Message 401 清 session 并显示完整登录表单。
26. Message 503。
27. Invalid conversation payload。
28. Missing conversation 404。
29. Feed cursor 加载更多和 refresh 替换。
30. 显式 empty Feed。
31. Feed 503。
32. 外部 cover URL parser 拒绝。
33. Search query/cursor 分页。
34. 超长 query 零 HTTP 请求。
35. 显式 no-results。
36. Stable Feed detail 直接访问和刷新。
37. Missing Feed 404。
38. Invalid FeedId 零 HTTP 请求。
39. 无 ID 旧 VideoDetail → Home。

## 视觉状态

本地自动生成但不跟踪：

```text
docs/round-4/screenshots/login-entry.png
docs/round-4/screenshots/password-validation.png
docs/round-4/screenshots/password-unauthorized.png
docs/round-4/screenshots/password-503.png
docs/round-4/screenshots/password-success.png
docs/round-4/screenshots/profile-success.png
docs/round-4/screenshots/profile-edit.png
docs/round-4/screenshots/profile-conflict.png
docs/round-4/screenshots/profile-unauthorized.png
docs/round-4/screenshots/profile-503.png
docs/round-4/screenshots/profile-parse-error.png
docs/round-4/screenshots/message-list.png
docs/round-4/screenshots/message-empty.png
docs/round-4/screenshots/message-chat.png
docs/round-4/screenshots/message-validation.png
docs/round-4/screenshots/message-sent.png
docs/round-4/screenshots/message-503.png
docs/round-4/screenshots/message-unauthorized.png
docs/round-4/screenshots/message-parse-error.png
docs/round-4/screenshots/message-not-found.png
docs/round-4/screenshots/feed-list.png
docs/round-4/screenshots/feed-refreshed.png
docs/round-4/screenshots/feed-empty.png
docs/round-4/screenshots/feed-503.png
docs/round-4/screenshots/feed-parse-error.png
docs/round-4/screenshots/feed-search-landing.png
docs/round-4/screenshots/feed-search-results.png
docs/round-4/screenshots/feed-search-empty.png
docs/round-4/screenshots/feed-detail.png
docs/round-4/screenshots/feed-not-found.png
docs/round-4/screenshots/feed-invalid-id.png
```

所有状态要求 0 page exception。

最终自动采集 Login 5 张、Profile 6 张、Message 9 张和 Feed 11 张有效 PNG，
总大小 3,043,473 B。所有 Feed 状态为 0 page exception，本地封面成功解码，搜索标题在移动端没有孤立单字行。

Message 表单交互后浏览器位于页面下方；`fullPage` 对 fixed skip-link 的拼接曾产生黄色条伪影。采集器现在在截图前显式回到 `scrollY=0`，重新生成并人工检查，运行时 skip-link 保持未聚焦和隐藏。

## 完整门禁

```text
bun install --frozen-lockfile    323 installs / 364 packages, no changes
Prettier                          passed
Oxlint                            passed
ESLint 10                         passed
vue-tsc                           passed
Vitest                            41 files / 155 tests passed
Vite                              164 modules transformed
Production build                 60 files / 1,636,026 bytes
Local Chrome E2E                  45/45 passed
CI Chromium E2E                  45/45 passed
bun audit                         349 packages / 0 vulnerabilities
```

## 门禁捕获的问题

### ES target 与 `replaceAll`

vue-tsc 捕获当前目标 lib 没有 `String.replaceAll`。手机号规范化改用已有目标支持的 global regex `replace`，不为一个 API 无依据提高浏览器 target。

### exact optional property

Axios test 捕获 `{ method?: string }` 不能显式赋 `undefined`。测试记录类型改为 `method: string | undefined`，保持 exactOptionalPropertyTypes 语义。

### Playwright label strictness

`getByLabel('手机号')` 同时匹配以标题作为 accessible name 的 section 和 input。测试改用：

```text
getByRole('textbox', { name: '手机号', exact: true })
```

防止模糊 selector 掩盖可访问性结构。

### 未读摘要的 DOM 边界

视觉上连续的 `2 条未读` 分别位于 `<strong>` 和 `<span>`。首轮 E2E 用单一文本节点定位，结果为 33/34。断言改为检查未读摘要容器的完整可访问文本后，定向场景和完整 34 项都通过；没有为了测试方便破坏语义结构。

### Full-page fixed 元素拼接

发送按钮会让浏览器滚到 composer。Playwright 在非零 scrollY 做 full-page screenshot 时，会把固定定位的隐藏 skip-link 拼接到页面中间。采集器在验证完成后先 `window.scrollTo({ top: 0 })` 再截图，消除证据生成伪影，而不是修改产品可访问性样式。

### Feed 标题 selector strictness

首轮 45 项 E2E 中 43 项通过；两项失败都因为非 exact 的“推荐内容”标题同时匹配页面 H1 和卡片 H2。断言改为页面 H1 的 exact accessible name 后，两个定向场景和完整套件通过。没有为了测试重命名产品标题或使用 CSS selector 绕过语义。

### Search 移动端孤立单字

首轮视觉截图中“从一个明确关键词开始”最后一个字单独换行。移动端 suggestion heading 使用 1.7rem 字号后，完整短语在同一行显示；重新采集 11 张 Feed 截图确认没有布局回归。

### 封面来源和解码

两个本地 JPEG 保留原哈希和字节；E2E 等待每个 FeedCard 图片满足 `complete && naturalWidth > 0`。外部 HTTPS cover 即使结构其他字段合法，也会在 parser 层被拒绝。

## Git 卫生

本批次日志、generated JSON 和截图全部位于已忽略的 Round artifact 目录；Git 只应看到手写 Markdown、源码和生成脚本。
