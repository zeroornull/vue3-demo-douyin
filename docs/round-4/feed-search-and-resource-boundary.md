# Round 4D：Search、Cursor 与封面资源边界

## Search query 是路由状态

搜索使用：

```text
/home/search?q=Vue
```

而不是只保存在组件 `ref` 中。这样：

- 搜索结果可以刷新。
- URL 可以分享。
- 浏览器前进/后退能恢复关键词。
- E2E 可以从真实深链开始。

输入先进入：

```ts
validateFeedSearchQuery(value: unknown)
```

规则：

```text
trim 后 1–50 字符
```

非法 query：

- 增加 search request sequence，使旧响应失效。
- 清除旧 searchItems。
- 清除旧 cursor/query。
- 返回 validation error。
- HTTP request 数保持 0。

路由 query 变为空时，页面会 abort 当前搜索请求并清空 Search Store。

提交与当前 URL 相同的关键词时，不执行无效导航，而是重新运行搜索。

## Cursor 与 refresh 的区别

### Load more

```text
GET /feed?cursor=<nextCursor>
```

- 向尾部追加。
- 按 FeedId 去重。
- nextCursor=null 后停止。

### Refresh

```text
GET /feed
```

- 不携带 cursor。
- 请求期间旧内容仍然可见。
- 成功后整体替换。
- 失败后保留旧内容。

Refresh 不是“把第一页再追加一次”，也不是先清空页面再等待网络。

## Search cursor

```text
GET /feed/search?q=Vue&cursor=<nextCursor>
```

Store 只有在：

```text
incoming query === current validated query
```

时才允许 append。关键词变化会先清除旧结果，防止把不同搜索的页面混在一起。

## 封面 URL 白名单

Round 4D 的 parser 只接受：

```text
/feed/covers/<safe-name>.(avif|jpg|jpeg|png|webp)
```

文件名规则：

```text
[A-Za-z0-9][A-Za-z0-9_-]*
```

因此拒绝：

```text
https://example.test/cover.jpg
/feed/covers/..
//external.example/cover.jpg
```

这是本轮的离线可复现资源策略，不代表未来 CDN 永远不能使用。接入真实 CDN 时，应单独建立：

- 允许 origin 清单。
- HTTPS/CSP。
- 图片代理或签名策略。
- 尺寸和格式预算。
- 加载失败占位。
- 隐私和 referrer policy。

不能为了方便直接放开任意 HTTP URL。

## 本轮复制的资源

只复制两个实际用于 FeedCard/Detail 的本地稳定封面：

```text
public/feed/covers/alley.jpg
  bytes=37,437
  source=legacy/src/assets/img/poster/1.jpg
  sha256=4c7b0f6d3480294176098f629f6903b4bff724ed99b13bb7262d45777dbb1612

public/feed/covers/field.jpg
  bytes=39,629
  source=legacy/src/assets/img/poster/3.jpg
  sha256=6855d760b115526a4730b9787ea88d0a5337c7e050cc568a438ec090875ecb04
```

总计：

```text
files=2
bytes=77,066
```

没有复制：

- legacy 整个 poster 目录。
- 视频文件。
- 远程 Douyin 封面。
- 远程头像。
- 直播/音乐/分享/评论图标。

> 后续状态：Round 4E 没有从 Legacy 复制远程视频，而是从已跟踪 field poster
> 可重复生成一个本地 H.264 fixture。Round 4D 的“没有复制视频文件”仍准确描述该批次。

## 图片页面合同

FeedCard 图片：

- 明确 width/height，减少布局跳动。
- CSS 使用固定 aspect-ratio 和 object-fit。
- `loading=lazy`。
- alt 使用 caption。
- E2E 等待 `complete && naturalWidth > 0`。

详情页图片不 lazy，作为页面主要内容直接加载。

## Fixture 是协议实现

Fixture FeedGateway 包含六条只读内容，支持：

- Feed cursor。
- Search cursor。
- caption/author/handle/tag 搜索。
- Detail lookup。
- 404。
- invalid cursor。
- AbortSignal。

它不模拟播放器、延迟抖动或随机推荐。随机性会让截图、E2E 和学习指标不可复现。

## 视觉证据

自动采集：

```text
feed-list
feed-refreshed
feed-empty
feed-503
feed-parse-error
feed-search-landing
feed-search-results
feed-search-empty
feed-detail
feed-not-found
feed-invalid-id
```

所有状态要求：

- 0 page exception。
- 无外部图片请求。
- 移动端导航不溢出。
- 搜索标题不出现孤立单字行。
- 详情明确标记 playback boundary。
