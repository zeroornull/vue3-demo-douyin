# Round 4A + 4B + 4C + 4D：迁移指标

## 测试增长

| 指标 | Round 3 | Round 4A | Round 4B | Round 4C | Round 4D |
| --- | ---: | ---: | ---: | ---: | ---: |
| Vitest files | 13 | 20 | 27 | 34 | 41 |
| Vitest tests | 43 | 70 | 96 | 125 | 155 |
| E2E tests | 10 | 17 | 24 | 34 | 45 |

新增测试覆盖：

- Phone domain：3。
- Form validation/redirect：4。
- Session parser：4。
- Fixture AuthGateway：3。
- HTTP AuthGateway：3。
- Auth Store：5。
- Auth components：4。
- HttpClient POST 扩展。
- Runtime auth data source。

Round 4B 新增：

- Profile Domain/draft/format。
- Profile validation。
- UserProfile parser。
- Fixture/HTTP ProfileGateway。
- Profile Store dirty/save/conflict/event。
- Profile/EditProfile components。
- Bearer GET/PATCH 和 HttpClient patch。

Round 4C 新增：

- ConversationId/Conversation/ChatMessage Domain。
- Message draft validation 和四类 response parser。
- Fixture/HTTP MessageGateway。
- Conversation/thread cursor 分页。
- 自动已读、未读汇总和发送状态。
- Incoming/read/sent/unread typed events。
- Message Shell listener cleanup。
- Message list/chat 组件和授权深链。

Round 4D 新增：

- FeedId/FeedSearchQuery/FeedItem Domain。
- Feed page/detail parser 和本地 cover 白名单。
- Fixture/HTTP FeedGateway。
- 独立 Feed runtime data source。
- Home/Search/Detail Store 状态和竞态保护。
- Feed/Search cursor 与 refresh 替换。
- FeedCard/Home/Search/Detail 组件。
- stable content deep link 和旧 VideoDetail 回退。

## 迁移范围

```text
legacy login routes audited=6
routes migrated/redirected=3
login entry migrated=yes
password login migrated=yes
verification code=no
password recovery=no
social login=no
help/protocol=no
```

Round 4B 新增：

```text
legacy profile routes audited=2 core routes + many adjacent subroutes
routes migrated=2
profile view=yes
profile edit=yes
video/sidebar/QR code=no
```

Round 4C 新增：

```text
legacy message routes audited=16
legacy message files audited=21
routes migrated=2
legacy no-ID chat redirect=1
conversation list=yes
text chat=yes
cursor/read/unread/send=yes
notice/group/media/call/red-packet=no
```

Round 4D 新增：

```text
legacy Home directory files audited=22
legacy Home index lines=513
legacy SearchPage lines=1,315
legacy VideoDetail lines=360
routes migrated=3
legacy no-ID VideoDetail redirect=1
feed/search/detail=yes
cursor/refresh/runtime parser=yes
video playback/live/music/gesture=no
```

这是 Round 4A+4B+4C+4D，不是 Round 4 全部完成。

## 现代源码规模

```text
production files=77
production TypeScript=53
production Vue SFC=17
production JavaScript=0
all src files including tests=118
Auth production files=10
Auth test files=7
Profile production files=10
Profile test files=7
Message production files=11
Message test files=7
Feed production files=12
Feed test files=7
```

## 类型纪律

Round 4D 最终继续满足：

```text
production JavaScript=0
explicit any=0
$ref=0
@ts-ignore/@ts-nocheck=0
legacy runtime import=0
```

新增 unknown 主要位于：

- Phone parser input。
- Auth session response。
- Store catch boundary。
- HTTP response。
- Profile parser/session user consistency。
- Profile Store catch 和 HTTP response。
- Conversation/Message/ReadReceipt parser input。
- Message Store catch boundary 和 HTTP response。
- Feed/Search/Detail parser input。
- Feed Store catch boundary 和 runtime query。

## 资源

迁移登录入口和密码登录无需旧图像资源，因此：

```text
login image imports=0
third-party login icons=0
new public assets=0
```

Round 4D 只复制两个 Feed 消费者实际使用的本地封面：

```text
feed cover files=2
feed cover bytes=77,066
external cover URLs accepted=0
video files copied=0
```

旧 social icons 留在被忽略的 legacy 中，等对应纵切迁移时再按消费者复制。

Message 使用姓名首字母头像，没有复制旧页面引用的头像、通知、通话、红包和媒体资源：

```text
message image imports=0
external avatar requests=0
new public assets=0
```

## 构建

Round 4A 新增：

- Auth Domain/parser/validation。
- Auth fixture/http gateway。
- Auth Pinia Store。
- LoginEntry/PasswordLogin 两个动态 chunk。
- Auth CSS chunk。

Round 4B production build：

```text
files=45
total=1,498,873 bytes ≈1.43 MiB
product images=1,274,128 bytes
non-product output=224,745 bytes ≈219.48 KiB
Round-4A total=1,479,707 bytes
Round-4B increase=19,166 bytes
```

Round 4C production build：

```text
files=52
total=1,530,035 bytes ≈1.46 MiB
product images=1,274,128 bytes
non-product output=255,907 bytes ≈249.91 KiB
Round-4C increase=31,162 bytes
modules transformed=148
```

Message 新增独立 CSS、Shell/List/Chat 动态 chunk。共享 Vue runtime、Router 和 Pinia 被 Vite 拆成稳定共享 chunk，因此构建文件数由 45 增至 52；总字节增量仍以实际输出总和为准，不能只比较某一个入口 chunk。

Round 4D production build：

```text
files=60
total=1,636,026 bytes ≈1.56 MiB
product images=1,351,194 bytes
non-product output=284,832 bytes ≈278.16 KiB
Round-4D increase=105,991 bytes
feed cover contribution=77,066 bytes
code/config/chunk increase excluding covers=28,925 bytes
modules transformed=164
```

Feed 新增 Card/Home/Search/Detail 动态 chunk和 Feed CSS；两个封面按原字节复制进入 dist，不使用无法复现的远程 Douyin 资源。

Lockfile 没有新增依赖，仍为：

```text
bytes=85,235
sha256=c33205a80989103b674624f70a41051462c635f05dd0b720518a67badb60a997
```

机器指标由本地 `docs/round-4/generated/summary.json` 生成；该目录按 Git 卫生策略忽略。
