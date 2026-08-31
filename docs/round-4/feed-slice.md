# Round 4D：Home / Search / Feed 纵切

## Legacy 边界

旧内容发现路径包括：

```text
/home
/home/search
/video-detail
/home/live
/home/music
/home/music-rank-list
```

核心文件规模：

```text
legacy Home index=513 lines
legacy SearchPage=1315 lines
legacy VideoDetail=360 lines
legacy Home directory=22 files
```

旧 Home 是多层横向/纵向 Slide 容器，继续依赖：

- 全局 event bus。
- `routeData` 隐式页面数据。
- `$ref`/宏和 JSX/TSX 混用。
- 自动播放视频。
- 虚拟滑动 DOM 移动。
- 评论、分享、二维码、用户面板和举报弹层。
- 远程 Douyin 视频、封面和头像 URL。
- 触摸方向和全屏状态机。

旧 SearchPage 同时包含：

- 搜索历史。
- 猜你想搜。
- 抖音热榜。
- 直播榜。
- 音乐榜。
- 品牌榜。
- 自动轮播和多个 interval。

旧 `/video-detail` 没有内容 ID，而是从：

```ts
baseStore.routeData.list
baseStore.routeData.index
```

恢复当前视频，因此刷新或直接访问无法工作。

Round 4D 只迁移可验证的只读内容发现核心：

```text
/home
/home/search?q=<query>
/home/content/:feedId
```

旧 `/video-detail` 因没有内容身份，不猜测默认视频，只重定向到 `/home`。

## Stable FeedId

FeedId 使用 brand 和 URL-safe 规则：

```ts
type FeedId = string & {
  readonly [feedIdBrand]: 'FeedId'
}
```

允许：

```text
[A-Za-z0-9_-]{1,64}
```

因此：

- `/home/content/feed-e2e` 可直接打开和刷新。
- `/home/content/bad.id` 在页面边界立即拒绝。
- 非法 ID 不调用 Gateway。
- 不再依赖 routeData、点击来源或前一页内存。

## Feed Domain

核心类型：

```ts
interface FeedItem {
  id: FeedId
  author: FeedAuthor
  caption: string
  coverUrl: string
  durationSeconds: number
  likeCount: number
  commentCount: number
  shareCount: number
  publishedAt: string
  tags: readonly string[]
}

interface FeedPage {
  items: readonly FeedItem[]
  nextCursor: string | null
}
```

Domain 还提供：

- FeedId parser。
- compact count formatter。
- duration formatter。
- 固定 Asia/Shanghai 的发布日期 formatter。
- branded FeedSearchQuery。

本批次只表达页面真正消费的字段，不复制完整 Aweme DTO。

## Runtime parser

所有 HTTP response 从 `unknown` 进入：

```ts
parseFeedItem
parseFeedPage
parseFeedDetail
```

Parser 检查：

- FeedId。
- author userId/displayName/handle。
- caption 1–500 字符。
- duration 1–86400 秒。
- like/comment/share 为非负整数。
- publishedAt 可解析。
- tags 最多 5 个，每个 1–30 字符。
- page 内 FeedId 不重复。
- cursor 为非空字符串或 null。
- coverUrl 符合本轮本地资源白名单。

Parser 返回的 item、author、tags 和 page 都冻结，避免页面意外修改服务端 DTO。

## FeedGateway

```ts
interface FeedGateway {
  listFeed(options?): Promise<AppResult<FeedPage>>
  searchFeed(query, options?): Promise<AppResult<FeedPage>>
  getItem(feedId, options?): Promise<AppResult<FeedItem>>
}
```

HTTP 路径：

```text
GET /api/feed?cursor=...
GET /api/feed/search?q=...&cursor=...
GET /api/feed/:feedId
```

状态：

```text
404 → not-found
503 → http/status
invalid 200 → parse
AbortSignal → aborted
unexpected throw → unexpected
```

Feed 当前是公开只读内容，因此没有把 AuthSession 或 Bearer token 强行加入契约。

## 独立运行时数据源

新增：

```text
VITE_FEED_DATA_SOURCE=fixture|http
```

默认开发：

```text
fixture
```

E2E build：

```text
http
```

Health 页面新增 `feed-data-source`，避免 Feed 错误复用 Shop/Auth 开关后难以定位。

## Feed Store

列表状态：

```text
idle
loading
refreshing
loading-more
ready
error
```

详情状态：

```text
idle
loading
ready
error
```

Store 分别维护：

- Home items/cursor/status/error。
- Search query/items/cursor/status/error/fieldErrors。
- Active detail/status/error。
- Feed/Search/Detail 三组 request sequence。

行为：

- 首次 Feed 加载替换列表。
- cursor 加载更多按 FeedId 去重追加。
- refresh 不带 cursor，并只在成功后替换当前内容。
- refresh 失败时保留旧内容并显示 inline error。
- 新搜索词清除旧结果。
- 非法搜索词清除旧结果并且零 HTTP 请求。
- 搜索 cursor 按 ID 去重追加。
- stable detail 每次可独立请求。
- detail 成功 emit `feed:item-viewed { feedId }`。
- route/change/unmount 请求可 Abort。

## UI

`/home`：

- 响应式 FeedCard 网格。
- 本地稳定封面。
- 作者、caption、tags。
- duration。
- like/comment/share。
- cursor 加载更多。
- refresh。
- loading/success/empty/error。

`/home/search`：

- 可分享的 `q` query。
- 初始搜索建议。
- 1–50 字符 validation。
- 搜索结果 cursor。
- 显式 no-results。
- error 与 no-results 分离。

`/home/content/:feedId`：

- 稳定深链和刷新。
- 封面、作者、caption、tags、metrics、发布日期。
- 404、503、parse 和 invalid route。
- 明确展示“本批次不挂载视频播放器”的迁移边界。

## 本批次明确不迁移

- `<video>` 和自动播放。
- 上下滑切换内容。
- 手势方向判断。
- 音量、静音和媒体恢复。
- 全屏。
- 评论、点赞写操作和分享。
- 直播和音乐。
- 用户侧栏。
- 举报、二维码和下载。
- 远程头像/封面/video URL。

这些能力不会被伪装成已经完成；下一批次应为媒体播放建立单独的浏览器、可访问性、性能和网络测试矩阵。
