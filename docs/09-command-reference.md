# 命令、验收清单与排错手册

## 1. 版本核对

迁移开始和每次依赖升级前运行：

```bash
date -Iseconds
bun --version
bun --revision
node --version

npm view vue version engines peerDependencies
npm view vue-router version engines peerDependencies
npm view pinia version engines peerDependencies
npm view vite version engines peerDependencies
npm view typescript version engines peerDependencies
npm view vue-tsc version engines peerDependencies
npm view @vitejs/plugin-vue version engines peerDependencies
npm view eslint version engines peerDependencies
npm view typescript-eslint version engines peerDependencies
```

保存查询日期和结果。不要只抄版本号，不保存 peer/engine 条件。

## 2. Bun 日常命令

```bash
# 安装并生成/更新 bun.lock
bun install

# CI/可重复安装
bun install --frozen-lockfile
# Bun 也提供面向 CI 的等价入口
bun ci

# 添加运行依赖/开发依赖
bun add <package>@<version>
bun add -d <package>@<version>

# 查看依赖树、过期包和安全公告
bun pm ls
bun outdated
bun audit
bun audit --audit-level=high

# 执行 package.json 脚本或 TS 文件
bun run dev
bun run type-check
bun run scripts/data/process-posts.ts --dry-run
```

## 3. 每次提交前的最小验证

文档-only 变更：

```bash
git diff --check
find docs -type f -name '*.md' -print | sort
```

代码变更：

```bash
bun install --frozen-lockfile
bun run format:check
bun run lint
bun run type-check
bun run test:unit --run
bun run build
git diff --exit-code
```

路由、交互、资源或部署变更再加：

```bash
bun run test:e2e
bun run preview
```

## 4. 迁移进度统计

以下脚本是方向示例，实施时可写成 `scripts/migration-report.ts`：

```bash
find src -name '*.vue' | wc -l
grep -RIl '<script setup[^>]*lang="ts"' src --include='*.vue' | wc -l
find src -type f -name '*.js' | wc -l
grep -R '\$ref' src --include='*.vue' --include='*.ts' | wc -l
grep -R -E '(: any| as any)' src --include='*.vue' --include='*.ts' | wc -l
grep -R 'legacy/' src package.json vite.config.ts || true
```

不要把 grep 数量当正确性的全部证明；它只是防止债务数量悄悄回升。

## 5. Git 仓库验收

本仓库重置后应满足：

```bash
# 只有一条初始提交（实现开始前）
git rev-list --count HEAD

# 没有任何远端
git remote -v

# legacy 被忽略
git check-ignore -v legacy legacy/package.json legacy/src/main.ts

# legacy 不在索引
git ls-files legacy

# 工作树干净
git status --short --branch
```

预期：提交数为 `1`；远端和 `git ls-files legacy` 无输出；`git check-ignore` 显示根 `.gitignore` 的 `/legacy/` 规则；工作树干净。

## 6. 常见故障

### 6.1 `bun install --frozen-lockfile` 失败

检查顺序：

1. `package.json` 是否与 `bun.lock` 同一提交。
2. 本地和 CI Bun 版本是否一致。
3. registry/代理是否改变解析。
4. peer dependency 是否出现新的不兼容主版本。
5. 平台 optional dependency 是否被错误固定。
6. 安装脚本是否被 Bun 的默认信任策略阻止。

不要通过删除锁文件并提交一个未审查的新锁文件“修好”CI。

### 6.2 Vite dev 能跑但 build 失败

优先检查：

- 仅开发环境存在的全局变量。
- 大小写路径差异。
- 动态 import 不是静态可分析字符串。
- Vite 8 Rolldown/Oxc 与旧插件/配置不兼容。
- `process.env` 未迁移到 `import.meta.env`。
- WASM/worker/public URL 和 base path。
- 旧 `manualChunks` 使用 Rollup 内部假设。

### 6.3 Type-check 与编辑器结果不同

检查：

- 编辑器是否使用工作区 TypeScript。
- Vue language tools/Volar 是否匹配。
- `vue-tsc` 与 TypeScript 版本是否属于验证矩阵。
- 编辑器使用的 tsconfig 是否和 CLI 一致。
- 是否残留旧的 Vue 类型 shim 或宏全局类型。

### 6.4 ESLint 无法解析 Vue/TS

检查：

- 是否仍混用 `.eslintrc` 和 flat config。
- `eslint-plugin-vue`、`vue-eslint-parser`、`typescript-eslint`、`@vue/eslint-config-typescript` 的 peer 范围。
- flat config 的 `files` 是否包含 `.vue`/`.ts`。
- ignore 是否无意排除了整个 `src/`。
- TypeScript 7 是否超出当前 typescript-eslint 支持范围。

### 6.5 Bun 下插件异常、Node 下正常

检查插件是否依赖：

- `node:module` loader。
- `child_process`、worker 或 async hooks 的边界行为。
- CJS/ESM 缓存和 `require.cache`。
- 原生二进制或安装 lifecycle script。
- Node engine 检测。

先建立最小复现；短期可以让该工具显式由兼容 Node 执行，但要记录 owner 和删除条件，不能静默形成第二套包管理器。

### 6.6 升级后开发正常、生产从旧 Vue 运行

搜索：

```bash
grep -R "baomitu\|vue.runtime.global\|vue-router.global" . \
  --exclude-dir=legacy --exclude-dir=node_modules --exclude-dir=.git
```

若有结果，删除旧 CDN 注入并重新构建；同时检查 HTML、部署缓存和 Service Worker。

## 7. 变更证据表

```markdown
| Claim | Command/Test | Result | Artifact |
| --- | --- | --- | --- |
| 冻结安装可复现 | bun install --frozen-lockfile | pass | CI URL |
| 类型严格通过 | bun run type-check | pass | log |
| P0 路由等价 | Playwright suite | pass | report |
| 无旧 CDN | dist grep | no match | build log |
| legacy 未跟踪 | git ls-files legacy | empty | command log |
```

最终报告只声称这张表能够证明的内容；无法运行的验证必须明确写为缺口。
