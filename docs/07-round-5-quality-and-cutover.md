# 第 5 轮：质量收口、部署与最终切换

## 1. 本轮目标

证明新应用不仅在开发机“能打开”，而且能在干净环境冻结安装、通过所有检查、生成正确生产产物、部署到目标环境并在失败时回滚。

## 2. CI 最终门禁

建议按失败速度从快到慢执行：

```bash
bun install --frozen-lockfile
bun run format:check
bun run lint
bun run type-check
bun run test:unit --run --coverage
bun run build
bun run test:e2e
```

额外检查：

- `git diff --exit-code`：检查命令不能修改工作树。
- 锁文件变更检查。
- 依赖许可/漏洞审计（根据组织工具选择）。
- 构建产物中无 `legacy/`、旧 CDN 地址、秘密和 source-map 泄漏。
- CI 使用与 `packageManager` 一致的 Bun 版本。

## 3. 测试完成度

### 3.1 单元和组件测试

覆盖重点不是追求单一百分比，而是风险：

- API/DTO → Domain 映射。
- Store 初始化和动作。
- Router meta 与导航策略。
- gesture/click 抑制。
- 事件订阅清理。
- 时间、格式化和资源转换。
- loading/empty/error 状态。

覆盖率阈值应先记录基线，再逐步提高；不要通过排除核心目录制造虚高数字。

### 3.2 E2E

至少覆盖第 0 轮确定的所有 P0 路径，并包含：

- 直接打开深链。
- 页面间跳转和浏览器返回。
- 刷新后状态。
- 网络慢、失败、空数据。
- 手机视口和至少一个桌面视口。
- 控制台 `error`/未处理异常断言。
- 生产 preview，而不只是 Vite dev server。

## 4. 性能预算

以旧基线和产品目标共同确定预算。建议至少记录：

| 指标 | 门禁示例 |
| --- | --- |
| 首屏 JS（gzip/brotli） | 不高于批准预算；变化需解释 |
| 最大异步 chunk | 避免单个“other”巨包 |
| 首屏图片 | 有尺寸、格式和懒加载策略 |
| LCP/INP/CLS | 在固定设备/网络条件比较 |
| route transition | 无明显主线程长任务 |
| 重复依赖 | 不包含两份 Vue/Router |

对 bundle 做可视化时，把报告作为 CI artifact，不要默认提交巨大 HTML。

## 5. 部署目标收敛

旧项目同时包含 GitHub/Gitee Pages、Netlify、Vercel、Docker 和 Uni 模式线索。迁移前必须明确仍受支持的目标：

```markdown
| Target | Supported | Base path | History mode | Environment | Owner |
| --- | --- | --- | --- | --- | --- |
| GitHub Pages | yes/no | /.../ | hash/history | production | ... |
| Netlify | yes/no | / | history | preview | ... |
| Vercel | yes/no | / | history | production | ... |
| Docker | yes/no | / | history | production | ... |
| Gitee Pages | yes/no | /.../ | hash/history | production | ... |
| Uni mode | yes/no | n/a | n/a | special | ... |
```

不要无条件复制所有旧配置。对每个保留目标建立一个部署冒烟；不保留的目标在迁移记录中明确删除原因。

## 6. 发布版本与可观测性

生产应用至少暴露：

- 新仓库 commit SHA。
- 构建时间或发布 ID。
- 应用版本。
- 环境名（不能含秘密）。

错误监控应捕获：Vue error handler、未处理 Promise、资源加载失败和 API 错误分类。是否引入第三方监控产品需要单独决策；本迁移只要求有明确挂载点和日志策略。

## 7. 回滚方案

切换前必须完成一次演练：

1. 部署新版本到预览环境。
2. 运行生产 E2E。
3. 切换一小部分流量或发布目标。
4. 触发预定义失败条件。
5. 回滚到上一可用制品，而不是现场重新构建。
6. 验证旧制品恢复。
7. 记录耗时和缺口。

回滚点是构建制品/部署版本，不是被 Git 忽略的 `legacy/` 目录。`legacy/` 是开发参考，不能充当生产发布机制。

## 8. 删除和收口

完成所有纵切后搜索并删除：

- `unplugin-vue-macros`（确认无插件专属宏后）。
- `vite-plugin-cdn-import` 和旧 CDN 配置。
- `git-last-commit`。
- `@jambonn/vue-lazyload`（若已用原生/局部能力替代）。
- 无直接 import 且目标浏览器不需要的 `core-js`。
- 旧 Store/Router/Mock 适配层。
- 未使用资源和临时 migration flags。
- pnpm/npm/yarn 的新根锁文件或脚本残留。

每个删除都应由 import 搜索、构建和测试证明；不能仅凭包名看起来“老”。

## 9. 最终验收清单

- [ ] Bun 是唯一的新应用安装器，`bun.lock` 已提交。
- [ ] 冻结安装在干净 CI 成功。
- [ ] Vue/Router/Pinia/Vite 使用已验证兼容矩阵。
- [ ] TypeScript 严格模式全绿，无 JS 生产源码（明确豁免除外）。
- [ ] 所有 P0/P1 路由状态已关闭或明确删除。
- [ ] unit/component/E2E/视觉测试通过。
- [ ] 生产 preview 和所有保留部署目标通过冒烟。
- [ ] 性能预算通过，没有第二份 Vue/Router。
- [ ] 不存在 `legacy/` import、旧 CDN、临时适配和无主依赖。
- [ ] 构建版本来自新仓库。
- [ ] 回滚演练成功并有记录。
- [ ] 已知差异和剩余风险已由负责人接受。

满足以上条件后，新应用迁移才完成。`legacy/` 的本地删除应作为另一个明确、可审计的清理动作，不与上线同一时刻进行。
