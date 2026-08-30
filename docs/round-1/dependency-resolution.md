# 第 1 轮：依赖解析与锁文件

## 官方模板来源

实际执行：

```bash
bun create vue@latest app \
  --bare \
  --ts \
  --router \
  --pinia \
  --vitest \
  --playwright \
  --eslint \
  --prettier
```

生成器版本：`create-vue 3.23.0`。

原始生成日志和 package：

- `evidence/create-vue.log`（本地生成：`evidence/create-vue.log`）
- `evidence/create-vue-package.json`（本地生成：`evidence/create-vue-package.json`）
- `evidence/create-vue-files.txt`（本地生成：`evidence/create-vue-files.txt`）

骨架在 `/tmp` 生成，再选择性复制；没有使用 `--force` 覆盖根目录，也没有复制脚手架 README、Git 或 `.gitignore`。

## 最终核心版本

| 依赖 | 解析版本 | 策略 |
| --- | ---: | --- |
| Bun | 1.4.0 | `packageManager` 和 CI 固定 |
| Vue | 3.5.42 | 当日稳定 Vue 3 latest |
| Vue Router | 5.3.0 | 当日稳定 major；仅建立两条新路由 |
| Pinia | 4.0.3 | 当日稳定 major；仅建立迁移状态 Store |
| Vite | 8.2.2 | 当日稳定版本 |
| `@vitejs/plugin-vue` | 6.0.8 | 与 Vite 8 兼容 |
| TypeScript | 6.0.3 | 当前 TS ESLint 支持范围内的最新稳定线 |
| vue-tsc | 3.3.11 | Vue SFC 类型检查 |
| ESLint | 10.9.1 | flat config |
| Oxlint / ESLint plugin | 1.80.0 / 1.80.0 | 同版本，消除 peer 警告 |
| Prettier | 3.9.6 | 独立格式检查 |
| Vitest | 4.1.11 | 官方模板测试栈 |
| Playwright | 1.62.1 | production-preview E2E |

完整直接依赖解析保存在 `generated/summary.json`（本地生成：`generated/summary.json`）。

## Oxlint peer 修复

官方模板最初生成：

```text
eslint-plugin-oxlint ~1.73.0
oxlint ~1.74.0
```

Bun 首次安装报告：

```text
warn: incorrect peer dependency "oxlint@1.74.0"
```

registry 显示当日 `eslint-plugin-oxlint@1.80.0` peer 要求 `oxlint ~1.80.0`。因此二者同步到 `1.80.0`；重新安装后无 peer warning。

证据：

- `evidence/bun-install-initial.log`（本地生成：`evidence/bun-install-initial.log`）
- `evidence/bun-install.log`（本地生成：`evidence/bun-install.log`）

## 文本锁文件

`bun.lock`：

- 约 80,089 bytes。
- 约 720 行。
- SHA-256 记录在 `generated/summary.json`。
- 由 Bun 1.4.0 生成。
- `bun install --frozen-lockfile` 检查 298 installs / 339 packages，11ms，无变化。

此外，只把 `package.json` 和 `bun.lock` 复制到空临时目录后重新执行冻结安装：

- 安装 297 packages，约 0.84 秒（缓存已存在）。
- 生成 `node_modules`。
- 临时副本的 `package.json` 和 `bun.lock` 哈希均与仓库输入一致。

证据：`evidence/bun-install-clean-frozen.log`（本地生成：`evidence/bun-install-clean-frozen.log`）。

冻结安装证据：`evidence/bun-install-frozen.log`（本地生成：`evidence/bun-install-frozen.log`）。

## 有意不升级的候选

`bun outdated` 只报告四类更高主版本：

| 包 | 当前 | Registry latest | 保持原因 |
| --- | ---: | ---: | --- |
| TypeScript | 6.0.3 | 7.0.2 | `typescript-eslint 8.68.0` peer 上限 `<6.1.0` |
| jsdom | 29.1.1 | 30.0.1 | 官方 Vue 模板兼容线；jsdom 30 提高 Node engine |
| `@types/jsdom` | 28.0.3 | 30.0.0 | 与官方模板/当前 jsdom 组合一起验证 |
| `@types/node` | 24.13.3 | 26.4.0 | 项目使用 Node 24 tsconfig，不用未来 Node 26 类型污染边界 |

日志：`evidence/bun-outdated.log`（本地生成：`evidence/bun-outdated.log`）。

这四项不是遗漏更新，而是经过 peer/engine 判断后的兼容性固定。后续主版本升级必须单独执行。

## 安全审计

```text
bun audit --audit-level=high
No vulnerabilities found
checked 324 packages
exit_code=0
```

日志：`evidence/bun-audit.log`（本地生成：`evidence/bun-audit.log`）。
