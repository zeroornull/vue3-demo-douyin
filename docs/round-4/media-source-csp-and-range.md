# Round 4E：媒体资源、CSP、Range 与测试

## 可重复生成的 MP4 fixture

Legacy 没有本地视频，因此 Round 4E 从已跟踪封面：

```text
public/feed/covers/field.jpg
```

生成：

```text
public/feed/media/field-demo.mp4
```

脚本：

```bash
bun run migration:round4:media
```

实现：

```text
scripts/round-4/generate-playback-fixture.ts
→ ffmpeg 6.1
→ H.264
→ yuv420p
→ 640x480
→ 24 fps
→ 4 seconds
→ no audio track
→ faststart
```

输出：

```text
bytes=31,973
sha256=d162a926f10ee573125b21dd52335d66e673fc1886bdc29062add83c7b2d98cd
```

同一环境连续生成前后 SHA-256 相同：

```text
deterministic=yes
```

文件不包含 Legacy 远程视频内容；它是由本地 field poster 生成的迁移验证 fixture。

## 为什么没有音轨

本轮关注媒体状态机和浏览器播放边界，fixture 没有音轨以避免：

- 自动化或本地验证意外发声。
- 新增音频素材许可问题。
- 不必要的体积。

Muted 控件仍直接读写 `HTMLMediaElement.muted`，因此未来替换为带音轨的安全 MediaSource 时不需要重写状态机。当前文档不会声称已经完成音频质量或音轨切换验证。

## Faststart

生成命令使用：

```text
-movflags +faststart
```

MP4 metadata 位于文件前部，浏览器不需要先下载完整文件才能得到 duration 和开始播放。

## Byte range

Playwright 直接请求：

```http
Range: bytes=0-99
```

Vite preview 返回：

```text
status=206
Accept-Ranges=bytes
Content-Range=bytes 0-99/31973
body bytes=100
```

这锁定了当前预览服务器对基础 MP4 seek/range 的支持。

生产部署时仍必须在真实 CDN/反向代理上重复相同检查；Vite preview 通过不能证明 Nginx、对象存储或 CDN 配置正确。

## Content Security Policy

`index.html` 新增 CSP meta：

```text
default-src 'self'
base-uri 'self'
object-src 'none'
form-action 'self'
img-src 'self' data:
media-src 'self'
script-src 'self'
style-src 'self' 'unsafe-inline'
connect-src 'self' ws: wss:
```

Round 4E E2E 明确读取 CSP，并验证：

```text
media-src 'self'
```

Parser 与 CSP 是两层边界：

- Parser 防止不受信任 MediaSource 进入 DOM。
- CSP 在浏览器层阻止遗漏或其他注入路径访问非 self 媒体。

生产环境更推荐 HTTP response header CSP，并按部署实际收紧 `style-src` 和
`connect-src`。Meta CSP 不支持全部 header directive，也不能替代服务端安全头。

## 浏览器验证

真实 Chrome 验证：

1. 初始 paused/currentTime=0。
2. 没有 autoplay attribute。
3. 点击播放进入 playing。
4. 播放时间前进。
5. 点击暂停进入 paused。
6. 键盘 M 修改 muted。
7. Space 重新播放。
8. 接近末尾后触发 ended。
9. ended 后重新播放。
10. 缺失本地 MP4 显示 media error。
11. 外部 MediaSource 被 parser 拒绝且外部请求数为 0。
12. Reduced Motion 下 transitionDuration=0s。
13. 206 byte range。

## 视觉证据

自动采集：

```text
media-paused
media-playing
media-unmuted
media-ended
media-error
```

所有状态：

- 0 page exception。
- 移动端控制条不横向溢出。
- 状态文本与主按钮一致。
- ended 显示重新播放。
- error 显示可见 alert。

视觉采集使用 Reduced Motion，并在截图前回到 `scrollY=0`，延续 Round 4C 的证据稳定策略。
