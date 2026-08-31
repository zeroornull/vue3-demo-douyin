# Round 4E：Media Playback 纵切

## Legacy 审计

旧播放器核心：

```text
legacy/src/components/slide/BaseVideo.vue=627 lines
legacy/src/pages/other/VideoDetail.vue=360 lines
```

BaseVideo 同时负责：

- 从远程 Douyin `play_addr.url_list` 选择媒体源。
- `autoplay` 和页面 active 状态。
- pause/play、静音和进度。
- 触摸 seek。
- 全局 event bus。
- visibility/fullscreen。
- 评论、分享和导航。
- DOM/路由副作用。

Legacy 仓库没有可以直接复用的本地 MP4/WebM 产品样例。继续使用旧远程 URL 会导致：

- URL 签名或资源失效。
- 无法离线 E2E。
- 截图和媒体测试不稳定。
- 浏览器向未知第三方发送请求。
- CSP 必须被迫放宽。

Round 4E 只迁移稳定内容详情中的基础播放纵切：

```text
/home/content/:feedId
```

## MediaSource Domain

```ts
interface MediaSource {
  src: string
  mimeType: 'video/mp4'
  posterUrl: string
  durationSeconds: number
}
```

Feed detail 现在从同一个 HTTP response 中解析：

```ts
interface FeedDetail {
  item: FeedItem
  media: MediaSource
}
```

只有 item 和 media 都通过 runtime parser，详情 Store 才接受响应并 emit
`feed:item-viewed`。媒体不能绕过 Feed detail parser 单独进入 DOM。

## Media source parser

本轮只接受：

```text
src=/feed/media/<safe-name>.mp4
mimeType=video/mp4
posterUrl=/feed/covers/<safe-name>.<image extension>
durationSeconds > 0 && <= 3600
```

拒绝：

```text
https://media.example.test/video.mp4
//external.example/video.mp4
/feed/media/..
application/x-mpegURL
unsafe external poster
zero/negative/non-finite duration
```

HLS 不是通过把 MIME 字符串加入 union 就算支持。未来接入 HLS 时需要独立处理：

- 原生 HLS 与 MSE 能力检测。
- manifest/segment CSP。
- 跨域和 CORS。
- 签名 URL 生命周期。
- 清晰度切换。
- segment retry 和超时。

## PlaybackState

状态：

```text
idle
loading
paused
playing
buffering
ended
error
```

纯 reducer 接收标准化 action：

```text
load-start
metadata
play-request
playing
waiting
pause
time-update
mute-change
ended
failure
reset
```

DOM media event 只负责转成 action；页面模板不散落相互覆盖的 boolean。

关键规则：

- metadata 后是 paused，不是 playing。
- play request 先进入 loading。
- waiting 明确进入 buffering。
- ended 后浏览器补发 pause 不覆盖 ended。
- error 后 pause 不覆盖 error。
- 新 source 通过 reset 清空旧时间和错误。
- 非 finite/负时间不会写入状态。

## 用户触发播放

播放器没有 `autoplay` 属性：

```text
initial paused=true
initial currentTime=0
```

播放只来自：

- “播放”按钮。
- 播放器容器聚焦后的 Space。
- 播放器容器聚焦后的 K。

页面加载、Router mounted、metadata ready 和 Feed detail 接受响应都不会调用
`video.play()`。

## 控制和可访问性

提供：

- 播放/暂停/重新播放。
- 默认 muted。
- 静音/取消静音。
- range 进度。
- 当前时间/总时长。
- aria-live playback status。
- 明确 media error alert。
- 可聚焦的“媒体播放器”区域。

键盘：

```text
Space/K       play/pause
M             muted toggle
ArrowLeft     -5 seconds
ArrowRight    +5 seconds
```

事件只在播放器容器自身获得焦点时处理，不截获 textarea/input/range 内的空格和方向键。

## Reduced Motion

`prefers-reduced-motion: reduce` 下，播放器和控制元素的 CSS transition 为 none。

Reduced Motion 不等于禁止用户主动播放视频；本轮的约束是：

- 不自动播放。
- 不添加装饰性自动动画。
- 用户主动播放仍可用。
- 控件状态切换不依赖动画表达。

## 卸载边界

MediaPlayer unmount 时调用 `pause()`。离开详情页后不会继续播放本轮播放器实例。

本批次不实现跨路由小窗、后台音频或 Media Session；因此不存在“离开页面继续播放”的产品合同。

## 错误状态

真实浏览器错误通过 `HTMLMediaElement.error.code` 进入：

```text
媒体加载失败（code 4）。
```

错误后：

- playback status=error。
- alert 可见。
- 播放按钮 disabled。
- poster、元数据和返回链接仍保留。

HTTP detail 的非法 MediaSource 则更早返回 Feed detail parse error，根本不会创建外部 video request。

## 本批次仍不迁移

- 自动播放。
- 上下滑 Feed。
- 手势 seek。
- 全屏和画中画。
- Media Session。
- HLS/DASH。
- 清晰度切换。
- 字幕。
- 评论、点赞和分享写操作。
- 直播。
- 跨路由持续播放。
