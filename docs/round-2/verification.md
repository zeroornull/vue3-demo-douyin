# 第 2 轮：验证证据

## 最终门禁

| 验证 | 命令 | 结果 | 证据 |
| --- | --- | --- | --- |
| Fixture import | `bun run migration:shop:import` | 6 products / 27 images | `import-shop-fixture.log`（本地生成：`evidence/import-shop-fixture.log`） |
| Fixture idempotence | 连续导入两次并比较 29 个 SHA-256 | 完全一致 | `import-shop-idempotence.log`（本地生成：`evidence/import-shop-idempotence.log`） |
| Frozen install | `bun install --frozen-lockfile` | 298 installs / 339 packages，无变化 | `bun-install-frozen.log`（本地生成：`evidence/bun-install-frozen.log`） |
| Read-only check | `bun run check` | 全部通过 | `check.log`（本地生成：`evidence/check.log`） |
| Combined build | `bun run build` | type-check + Vite build 通过 | `build.log`（本地生成：`evidence/build.log`） |
| Local E2E | `bun run test:e2e` | 7/7 | `e2e.log`（本地生成：`evidence/e2e.log`） |
| CI-mode E2E | `CI=true ... bun run test:e2e` | 7/7 | `e2e-ci-mode.log`（本地生成：`evidence/e2e-ci-mode.log`） |
| Audit | `bun audit --audit-level=high` | 0 vulnerabilities | `bun-audit.log`（本地生成：`evidence/bun-audit.log`） |

## `bun run check`

最终结果：

```text
Prettier                 passed
Oxlint                   passed
ESLint 10 flat config    passed
vue-tsc                  passed
Vitest files             7 passed
Vitest tests             21 passed
Vite modules             46 transformed
Vite build               passed in 278ms
exit_code                0
```

## E2E

7 个 production-preview 测试：

1. 根迁移页。
2. `/health`。
3. catch-all 页面。
4. Shop 列表 6 张卡片，点击第一项进入 `/shop/detail/g6`。
5. 直接访问 `/shop/detail/g6`，5 张 gallery 图片全部 complete/naturalWidth > 0，reload 后仍恢复。
6. `/shop/detail/not-valid` 显示 not-found，无 console/page error。
7. 旧 `/shop/detail` 重定向 `/shop`。

本地 Google Chrome 和 `CI=true` Playwright Chromium 各执行一次，均为 7/7。

## 失败门禁证据

本轮门禁捕获并修复：

1. Oxlint `vitest(no-conditional-expect)`：测试中的条件 expect 改为失败即 throw，后续断言保持无条件。
2. Fixture generator 初次写出的 JSON 未满足 Prettier：生成器改为调用项目已安装的 Prettier，重复执行后输出稳定且 `format:check` 通过。

历史日志：

- `check-attempt-1.log`（本地生成：`evidence/check-attempt-1.log`）
- `check-generated-format-failure.log`（本地生成：`evidence/check-generated-format-failure.log`）

## Runtime 和视觉

HTTP smoke 覆盖：

```text
/shop
/shop/detail
/shop/detail/g6
/shop/detail/not-valid
```

五张截图全部验证为有效 PNG：

- Desktop list/detail。
- 390px mobile list/detail。
- Mobile not-found。

机器证据见 `generated/summary.json`（本地生成：`generated/summary.json`）。

## 供应链

本轮未新增 npm dependency，`bun.lock` 哈希仍为：

```text
283a100a8d12a351035e66145c9b49b9c740a50c680db71f28ad2288e3e5c897
```

`bun audit`：324 packages，0 vulnerabilities。

## 验证限制

- Gateway 仍是本地 fixture adapter，尚未证明真实 HTTP、CORS 和 timeout 行为。
- Empty/error UI 分支通过 Store、unit 和组件结构证明；E2E 使用成功 fixture 和 not-found。第 3 轮 HTTP/mock adapter 应增加网络失败 E2E。
- Code graph fast index 会排除 tests、assets 和 scripts；这些路径使用直接源码、文件哈希和实际运行命令验证。
- Round-2 未提交，因此远端 CI runner 没有执行本轮代码；只验证了本地与 `CI=true` 分支。
