# 第 0 轮：API、Mock 与数据契约基线

## 摘要

- API 包装函数：**15**，全部声明为 GET。
- Axios Mock handler：**14**。
- `/user/userinfo` 有 API 函数但没有对应 Mock handler，是当前清单中的缺口。
- 所有 API 函数的 `params` 和 `data` 都是可选 `any`，没有请求/响应 DTO。

原始机器证据：

- `generated/api-and-mocks.json`（本地生成：`generated/api-and-mocks.json`）
- `generated/fixture-summary.json`（本地生成：`generated/fixture-summary.json`）

## API 包装函数

| 函数 | Method | URL | 来源 |
| --- | --- | --- | --- |
| `userinfo` | GET | `/user/userinfo` | `legacy/src/api/user.ts:3` |
| `userVideoList` | GET | `/user/video_list` | `legacy/src/api/user.ts:7` |
| `panel` | GET | `/user/panel` | `legacy/src/api/user.ts:11` |
| `friends` | GET | `/user/friends` | `legacy/src/api/user.ts:15` |
| `userCollect` | GET | `/user/collect` | `legacy/src/api/user.ts:19` |
| `recommendedPost` | GET | `/post/recommended` | `legacy/src/api/user.ts:23` |
| `recommendedShop` | GET | `/shop/recommended` | `legacy/src/api/user.ts:27` |
| `historyOther` | GET | `/video/historyOther` | `legacy/src/api/videos.ts:3` |
| `historyVideo` | GET | `/video/history` | `legacy/src/api/videos.ts:7` |
| `recommendedVideo` | GET | `/video/recommended` | `legacy/src/api/videos.ts:11` |
| `recommendedLongVideo` | GET | `/video/long/recommended/` | `legacy/src/api/videos.ts:15` |
| `myVideo` | GET | `/video/my` | `legacy/src/api/videos.ts:19` |
| `privateVideo` | GET | `/video/private` | `legacy/src/api/videos.ts:23` |
| `likeVideo` | GET | `/video/like` | `legacy/src/api/videos.ts:27` |
| `videoComments` | GET | `/video/comments` | `legacy/src/api/videos.ts:31` |

## Mock handlers

| Method | Matcher | 来源 |
| --- | --- | --- |
| GET | `/video\/recommended/` | `legacy/src/mock/index.ts:136` |
| GET | `/video\/long\/recommended/` | `legacy/src/mock/index.ts:151` |
| GET | `/video\/comments/` | `legacy/src/mock/index.ts:166` |
| GET | `/video\/private/` | `legacy/src/mock/index.ts:197` |
| GET | `/video\/like/` | `legacy/src/mock/index.ts:212` |
| GET | `/video\/my/` | `legacy/src/mock/index.ts:227` |
| GET | `/video\/history/` | `legacy/src/mock/index.ts:260` |
| GET | `/user\/collect/` | `legacy/src/mock/index.ts:275` |
| GET | `/user\/video_list/` | `legacy/src/mock/index.ts:295` |
| GET | `/user\/panel/` | `legacy/src/mock/index.ts:305` |
| GET | `/user\/friends/` | `legacy/src/mock/index.ts:317` |
| GET | `/historyOther/` | `legacy/src/mock/index.ts:323` |
| GET | `/post\/recommended/` | `legacy/src/mock/index.ts:339` |
| GET | `/shop\/recommended/` | `legacy/src/mock/index.ts:360` |

## 代表性 fixture

| JSON fixture | 大小 | 顶层类型 | 项目数 |
| --- | ---: | --- | ---: |
| `public/data/users.json` | 74.09 KiB | array | 13 |
| `public/data/goods.json` | 11.91 KiB | array | 42 |
| `public/data/posts.json` | 51.41 KiB | array | 62 |
| `public/data/videos.json` | 4.63 MiB | array | 832 |
| `public/data/comments/video_id_6686589698707590411.json` | 33.50 KiB | array | 40 |
| `public/data/user_video_list/user-04074747.json` | 282.40 KiB | array | 56 |

字段 key 和嵌套类型位于 `fixture-summary.json`；报告不复制真实内容值。

## 请求语义

旧 `legacy/src/utils/request.ts` 的重要事实：

1. Axios timeout 为 60 秒，默认补 `Content-Type: application/json`。
2. 响应拦截器把空响应、字符串、业务 code、HTTP 4xx/5xx 和无响应转换成多个不同对象形状。
3. 错误通常被转成 resolved value，而不是继续 reject；调用方不能依靠 `catch` 判断失败。
4. `request<T = any>` 默认泛型为 `any`，再次包装成 `{ success, data }`。
5. 多数 Mock 即使业务失败也返回 HTTP 200，并在 body 中使用 `code: 500`。
6. `/video/long/recommended/` 带尾斜杠，其他路径通常不带；新契约应统一并测试兼容。

## JSON 与 archived `.md` 双轨

开发环境和非 Gitee 模式中，`_fetch` 会把请求 URL 的 `.md` 替换为 `.json`。
Gitee 模式读取 archived `.md`，通过 `libarchive-wasm` 解包其中的 JSON。因此：

- `.md` 不是 UTF-8 Markdown，不能当文本解析。
- 新迁移必须决定是否继续双轨；若删除，需先确认不再支持 Gitee 压缩资源模式。
- production build 已出现 `fs`、`path`、`crypto` 被浏览器 externalize 的三条 libarchive 警告。

## 建模优先级

1. `ApiResult<T>` 和错误判别联合。
2. User、Video、Goods、Post、Comment DTO。
3. 分页参数及 `start/pageSize` 与 `pageNo/pageSize` 的统一。
4. Fixture 运行时验证和 DTO → Domain 映射。
5. 取消请求、超时、HTTP 失败和业务 code 失败的独立测试。
