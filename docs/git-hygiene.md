# Git 文件卫生策略

## 应当跟踪

- `src/`、`e2e/`、`scripts/` 中的源码和可重复生成脚本。
- `package.json`、`bun.lock`、TypeScript/Vite/ESLint/Playwright 配置。
- `.env.example` 和不含秘密的 `.env.e2e`。
- `.github/workflows/`、`.editorconfig`、`.gitattributes` 和共享 `.vscode` 配置。
- `docs/**/*.md` 手写迁移/学习文档。
- `public/shop/products/` 等应用运行时实际需要的产品资源。

## 不应跟踪

- `node_modules/`、`dist/`、coverage、Playwright report/test-results。
- `.omx/`、`.omc/`、IDE/OS 本地状态。
- 本地旧项目快照 `legacy/`。
- `docs/round-*/evidence/`：命令日志。
- `docs/round-*/generated/`：机器生成 JSON/manifest/report。
- `docs/round-*/screenshots/`：浏览器验证截图。

后三类 Round artifact 由 `scripts/round-*`、Vitest、Playwright 和文档中的命令重新生成；
Git 只保存最终结论和生成方式，不保存每次执行的临时证据。

## 已经跟踪的生成物

新增 `.gitignore` 不会自动停止跟踪已有文件。清理时使用：

```bash
git rm -r --cached -- \
  docs/round-*/evidence \
  docs/round-*/generated \
  docs/round-*/screenshots
```

`--cached` 只从 Git 索引移除，磁盘上的本地证据仍保留。删除会进入暂存区，等待使用者审查并在后续提交。

## 历史中的大文件

常规删除提交只会从新版本移除文件，旧 commit 仍包含历史 blob。彻底缩小整个 Git 历史需要
`git filter-repo` 和强制推送，会改写已发布 commit；这属于单独的破坏性维护操作，不在普通 ignore 清理中自动执行。
