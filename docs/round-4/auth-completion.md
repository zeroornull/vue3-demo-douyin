# Round 4I：验证码登录与密码重置

Legacy 的验证码页只展示固定手机号和本地 code 输入；找回密码入口也没有完整服务端回执。
这轮把流程拆成真正的 challenge：先请求 challengeId、expiresAt、retryAt，再用 challengeId
验证验证码。页面不能从手机号或路由自行推导 challenge。

验证码登录使用 `/auth/code/request` 和 `/auth/code/verify`；密码重置使用
`/auth/password/request-reset` 和 `/auth/password/reset`。Challenge、AuthSession 和 reset
receipt 都从 unknown parser 开始。429 映射 rate-limit；Fixture 验证码固定为 2468，便于
本地学习和测试，HTTP 模式不会把真实验证码写进页面。

验证码页在请求成功后启动 60 秒重发倒计时，组件卸载会清除 interval。请求失败不会启动
倒计时。登录成功由 Auth Store 的 `acceptSession()` 统一更新 session 并发出 typed event。

这轮没有决定长期 Session persistence。Token 仍只在 Pinia 内存中；refresh token、cookie
属性、跨标签同步和设备管理需要单独的安全设计，不能顺手塞进验证码页面。

实现中没有遇到新的产品缺陷。唯一需要同步修复的是 Auth view 的 memory router：登录入口
新增两个 RouterLink 后，测试路由表也必须声明 code/recover named route。我们保留真实路由
解析，没有 stub 掉链接。
