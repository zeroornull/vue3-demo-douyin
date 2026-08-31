# Bun + TypeScript + Vue 迁移与学习文档

> 版本核对日期：2026-08-30（Asia/Shanghai）
> 文档状态：第 0、1、2、3 轮已完成；第 4 轮进行中（4A Login、4B Profile、4C Message 完成）
> 目标：用 Bun 管理依赖和运行脚本，以 TypeScript 严格模式重建应用，并迁移到当前稳定 Vue 生态。

## 1. 文档地图

| 顺序 | 文档 | 用途 | 结束条件 |
| --- | --- | --- | --- |
| 0 | [现状与目标](00-baseline-and-target.md) | 认识旧项目、目标技术栈和主要风险 | 团队接受基线、范围与版本策略 |
| 1 | [总路线图](01-migration-roadmap.md) | 理解各轮次、依赖关系和全局门禁 | 确认严格按轮次推进 |
| 2 | [第 0 轮：行为基线](02-round-0-behavior-baseline.md) | 在改代码前锁定页面、路由、数据和视觉行为 | 基线证据可重复生成 |
| 3 | [第 1 轮：Bun 与新骨架](03-round-1-bun-vue-scaffold.md) | 建立官方 Vue TS 骨架和 Bun 工作流 | 空骨架的安装、检查、测试、构建全绿 |
| 4 | [第 2 轮：TypeScript 严格化](04-round-2-typescript-strict.md) | 分层消除 JS、`any` 与非标准宏 | 新代码严格、迁移清单可量化 |
| 5 | [第 3 轮：核心基础设施](05-round-3-core-infrastructure.md) | 迁移 Vite、Router、Pinia、请求、Mock、全局能力 | 应用壳与关键基础设施稳定 |
| 6 | [第 4 轮：页面与资源](06-round-4-features-and-assets.md) | 按业务纵切逐页迁移 | 所有用户路径与资源完成迁移 |
| 7 | [第 5 轮：质量与切换](07-round-5-quality-and-cutover.md) | 完成测试、性能、部署和删除旧依赖 | 可发布、可回滚、可审计 |
| 8 | [学习路线](08-learning-path.md) | 按迁移任务学习 Bun、TS、Vue 与测试 | 能解释设计，不只是复制命令 |
| 9 | [命令、清单与排错](09-command-reference.md) | 提供日常命令、验收模板和常见故障处理 | 每轮均可复用同一套证据格式 |
| 10 | [依赖策略与来源](10-dependency-policy.md) | 解释“最新”含义、兼容矩阵、升级规则与来源 | 依赖升级可复现且不盲追版本 |
| 11 | [Git 文件卫生](git-hygiene.md) | 说明哪些文件应跟踪、忽略或取消跟踪 | 仓库不再积累可重建证据产物 |

## 当前执行产物

> 各轮的 `evidence/`、`generated/` 和 `screenshots/` 都由仓库脚本或测试重新生成，
> 仅保留在本地并由 Git 忽略；仓库只跟踪手写 Markdown、生成脚本和产品运行所需资源。

- [第 0 轮验收报告](round-0/README.md)
- [旧项目运行、类型、构建和浏览器证据](round-0/runtime.md)
- [65 条旧路由清单](round-0/routes.md)
- [API、Mock 与 fixture 契约](round-0/contracts.md)
- [全局副作用清单](round-0/global-side-effects.md)
- [2,081 个静态资源的可提交摘要](round-0/resources.md)
- [第 1 轮 Bun + Vue TypeScript 基座验收报告](round-1/README.md)
- [第 1 轮依赖解析与锁文件](round-1/dependency-resolution.md)
- [第 1 轮应用壳与架构](round-1/architecture.md)
- [第 1 轮完整验证证据](round-1/verification.md)
- [第 2 轮严格 TypeScript 验收报告](round-2/README.md)
- [第 2 轮类型和架构边界](round-2/architecture.md)
- [第 2 轮 Shop 纵切](round-2/shop-slice.md)
- [第 2 轮迁移指标](round-2/metrics.md)
- [第 2 轮验证证据](round-2/verification.md)
- [第 3 轮核心基础设施验收报告](round-3/README.md)
- [第 3 轮 HTTP、环境与 Adapter](round-3/http-and-environment.md)
- [第 3 轮导航、KeepAlive 与事件](round-3/navigation-and-events.md)
- [第 3 轮架构和迁移指标](round-3/architecture-and-metrics.md)
- [第 3 轮验证证据](round-3/verification.md)
- [第 4 轮进度与 4A Login 报告](round-4/README.md)
- [Round 4A 登录纵切](round-4/login-slice.md)
- [Round 4A 校验和安全](round-4/validation-and-security.md)
- [Round 4A 指标](round-4/metrics.md)
- [Round 4A 验证](round-4/verification.md)
- [Round 4B Profile 纵切](round-4/profile-slice.md)
- [Round 4B 冲突和授权边界](round-4/profile-conflict-and-auth.md)
- [Round 4C Message / Conversation 纵切](round-4/message-slice.md)
- [Round 4C 分页、未读与事件生命周期](round-4/message-pagination-and-events.md)

## 2. 必须遵守的迁移原则

1. **行为优先于重写。** 先锁定旧行为，再替换实现；不能用“新架构更优”解释功能回退。
2. **一次只改变一个主要变量。** Bun、Vue Router 5、Pinia 4、TypeScript 严格模式和页面重写不能在同一个不可观察的大提交里完成。
3. **新旧代码不混装。** `legacy/` 只读参考；新应用不能通过相对路径导入 `legacy/`。
4. **类型错误不能靠全局降级掩盖。** 禁止重新打开 `strict: false`、扩大 `allowJs`、批量加入 `any` 或 `@ts-ignore`。
5. **锁文件是构建输入。** 新仓库只提交 Bun 的文本锁文件 `bun.lock`；CI 使用冻结锁文件安装。
6. **“latest”是一次查询结果，不是版本规范。** 实施当日重新查询；选用经官方模板和 peer dependency 验证的兼容组合。
7. **每轮必须可回滚。** 一轮只在验收门禁全绿后完成；失败时回退该轮，不把不稳定状态带入下一轮。

## 3. 推荐的提交粒度

文档阶段只有一个全新初始提交。进入实现后，建议按以下粒度提交：

```text
chore(scaffold): add Bun and Vue TypeScript baseline
test(baseline): capture legacy route smoke cases
refactor(core): migrate router and navigation guards
refactor(store): type base store state and actions
feat(home): migrate home feed vertical slice
test(e2e): cover login and video navigation
chore(release): enable production deployment gate
```

不要把一整轮压缩为一个无法审查的巨型提交；“一轮”是验收单位，不是强制的单提交单位。

## 4. 如何使用 `legacy/`

- 可以运行、截图、搜索和读取旧文件。
- 不要修改旧文件来伪造迁移完成度。
- 不要把 `legacy/` 强制加入 Git；它可能包含大体积资源和旧仓库内容。
- 每迁移一个纵切，记录来源文件、目标文件、行为证据和遗留差异。
- 完成最终切换并经过约定观察期后，再单独决定是否删除本地 `legacy/`；删除不是本轮文档任务的一部分。
