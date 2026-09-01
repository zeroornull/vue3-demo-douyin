# Round 4H：分享与举报

旧分享面板列了很多平台，但大多数只弹“未实现”；旧举报页有原因列表，提交页却没有 Gateway。
这轮没有接社交 SDK。分享只复制当前 origin 下的稳定 Feed 深链，举报只在服务端回执通过
parser 后显示成功。

`buildShareUrl()` 固定生成 `/home/content/:feedId`，不会接受服务端外链。Clipboard 优先使用
`navigator.clipboard.writeText`，旧浏览器回退到临时 textarea 和 `execCommand('copy')`。

举报原因收敛为 fraud、harassment、illegal、misinformation、spam、other；说明最多 500 字。
HTTP `POST /feed/:feedId/reports` 携带 Bearer，401、409、429、503 和 invalid receipt 分开处理。
409 保留表单，避免用户误以为重复举报成功。

定向 E2E 首次 3/4：举报成功断言用了宽泛 status role，同时匹配播放器状态 output 和举报状态。
修复测试为精确文本定位，没有改产品的 aria-live 结构。

不在本轮接第三方分享、二维码、下载、举报材料上传或审核进度查询。
