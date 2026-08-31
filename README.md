# Douyin Web：Bun + TypeScript + Vue 迁移工作区

本仓库已经重置为一个**文档优先的迁移工作区**。旧项目仍保存在本地
`legacy/` 中，供逐页比对和迁移使用，但该目录被 Git 忽略，不属于新仓库历史。

当前已经包含现代 Vue 应用壳、严格类型的 Shop 样板和可切换的 fixture/HTTP 基础设施。
迁移继续按文档中的轮次推进，每一轮都必须通过自己的验收门禁后才能进入下一轮，
避免一次性升级运行时、框架、类型系统和业务代码。

## 当前进度

- 第 0 轮“旧项目行为基线”已执行完成。
- 第 1 轮“Bun + Vue TypeScript 官方骨架”已执行完成。
- 第 2 轮“严格 TypeScript 迁移通道与 Shop 样板”已执行并提交为 `b79b695`。
- 第 3 轮“HTTP、环境、导航与事件核心基础设施”已执行并提交为 `f9704d5`。
- 第 4 轮正在进行：Round 4A Login 已完成，Profile/Message/Home 等纵切尚未开始。
- 报告：[`docs/round-0/README.md`](docs/round-0/README.md)、[`docs/round-1/README.md`](docs/round-1/README.md)、[`docs/round-2/README.md`](docs/round-2/README.md)、[`docs/round-3/README.md`](docs/round-3/README.md)、[`docs/round-4/README.md`](docs/round-4/README.md)。
- 下一实施批次：Round 4B Profile。

## 从这里开始

1. 阅读 [`docs/README.md`](docs/README.md) 了解文档地图与基本原则。
2. 阅读 [`docs/00-baseline-and-target.md`](docs/00-baseline-and-target.md) 了解旧项目基线和目标版本矩阵。
3. 按 [`docs/01-migration-roadmap.md`](docs/01-migration-roadmap.md) 从第 0 轮开始执行。
4. 每次开始新一轮前，重新运行版本核对命令，不要把文档中的版本快照永久视为 `latest`。

## 仓库边界

- `docs/`：受 Git 管理的迁移与学习文档。
- `legacy/`：旧项目本地快照；被忽略，不提交。
- `.omx/`：本地自动化运行状态；被忽略，不提交。
- 新应用文件：从第 1 轮开始逐步加入仓库根目录。
