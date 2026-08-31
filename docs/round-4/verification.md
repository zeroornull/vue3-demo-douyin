# Round 4A + 4B：验证证据

## Unit / Component

最终结果：

```text
Vitest files=27
Vitest tests=96
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

## E2E

Round 4A 最终结果为本地和 CI 17/17；Round 4B 最终结果为本地和 CI 24/24。新增 Profile 场景：

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
```

所有状态要求 0 page exception。

最终自动采集 Login 5 张和 Profile 6 张有效 PNG，总大小 804,566 B。Profile 401
截图已人工检查，最终页面包含完整“手机号密码登录”表单，不存在空白 RouterView。

## 完整门禁

```text
bun install --frozen-lockfile    323 installs / 364 packages, no changes
Prettier                          passed
Oxlint                            passed
ESLint 10                         passed
vue-tsc                           passed
Vitest                            27 files / 96 tests passed
Vite                              134 modules transformed
Production build                 45 files / 1,498,873 bytes
Local Chrome E2E                  24/24 passed
CI Chromium E2E                  24/24 passed
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

## Git 卫生

本批次日志、generated JSON 和截图全部位于已忽略的 Round artifact 目录；Git 只应看到手写 Markdown、源码和生成脚本。
