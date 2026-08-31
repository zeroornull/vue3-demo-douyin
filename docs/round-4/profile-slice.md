# Round 4B：Profile 纵切

## Legacy 边界

旧 `/me` 页面同时包含：

- 用户资料和统计。
- 视频/私密/喜欢/收藏四个列表。
- 右侧抽屉、设置、二维码、商城、音乐。
- 大量滑动、预览和全局 mixin。

Round 4B 只迁移资料核心：

```text
/me
/me/edit-userinfo
```

不复制视频列表、侧栏、二维码和收藏逻辑，避免把多个业务纵切重新耦合。

## UserProfile Domain

```ts
interface UserProfile {
  userId: string
  displayName: string
  handle: string
  bio: string
  age: number | null
  gender: 'female' | 'male' | 'unspecified'
  province: string
  city: string
  school: string | null
  stats: ProfileStats
  version: number
}
```

编辑使用独立 `ProfileDraft`，不包含 stats、version 或 userId。

## Legacy 字段映射

| Legacy | Domain |
| --- | --- |
| `uid` | `userId` |
| `nickname` | `displayName` |
| `unique_id` | `handle` |
| `signature` | `bio` |
| `user_age` | `age` |
| gender 1/2 | male/female |
| province/city | province/city |
| school.name | school |
| total_favorited | stats.likes |
| following_count | friends/following baseline |
| follower_count | stats.followers |
| aweme_count | stats.posts |

现代 HTTP fixture 使用更明确的字段名，不继续向页面传播 legacy key。

## ProfileGateway

```ts
interface ProfileGateway {
  getCurrent(session, options?): Promise<AppResult<UserProfile>>
  update(
    session,
    draft,
    expectedVersion,
    options?
  ): Promise<AppResult<UserProfile>>
}
```

实现：

- Fixture ProfileGateway：本地内存和版本递增。
- HTTP ProfileGateway：GET/PATCH `/profile/me`。

页面/Store 不 import Axios。

## AuthSession 边界

ProfileGateway 接收完整 AuthSession：

- userId 用于响应用户一致性检查。
- accessToken 只用于 Authorization header。
- displayName 不作为 Profile 真相。

HTTP header：

```text
Authorization: Bearer <accessToken>
```

Token 不进入 Profile Domain、DOM、event 或 error body。

## Profile Pinia

状态：

```text
idle
  → loading → ready
              → saving → ready
                       → conflict
                       → error
              → idle/ready (aborted)
```

数据：

- `profile`：最后一次服务器确认版本。
- `draft`：本地编辑副本。
- `isDirty`：profile draft 与服务器版本比较。
- `fieldErrors`。
- `error`。

保存成功：

- version + 1。
- profile/draft 同步。
- dirty=false。
- emit `profile:updated { userId, version }`。

## Profile UI

`/me`：

- 姓名首字母头像，不新增外部图片。
- displayName/handle/bio/location/school。
- 获赞/朋友/关注/粉丝/作品统计。
- 当前 version。
- 编辑资料入口。

`/me/edit-userinfo`：

- 名字。
- 抖音号。
- 简介。
- 性别。
- 年龄。
- 省份/城市。
- 学校。
- Dirty 提示。
- 放弃修改。
- 保存和 conflict/error 状态。

## 资源策略

Legacy 当前用户头像来自外部 Douyin URL，无法作为稳定离线测试输入。本批次使用 displayName 首字母生成头像，因此：

```text
new profile image assets=0
external avatar requests=0
```

后续若产品要求真实头像，应作为独立上传/CDN 安全纵切，不直接复制外部 URL。
