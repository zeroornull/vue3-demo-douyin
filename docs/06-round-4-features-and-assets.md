# 第 4 轮：页面、组件与资源迁移

> 执行状态：进行中。Round 4A–4F 已完成，见 [`round-4/README.md`](round-4/README.md)；
> 分享、媒体消息、通知等纵切尚未完成，因此本轮不能标记为全部完成。

## 1. 本轮目标

按“用户可以完成的一条路径”迁移页面，而不是按文件类型批量复制。一个纵切必须同时包含它所需的路由、页面、组件、Store/API、fixture、资源和测试。

## 2. 推荐纵切顺序

| 批次 | 纵切 | 为什么这样排 |
| --- | --- | --- |
| A | `/shop` → `/shop/detail` | 范围适中，适合验证迁移样板 |
| B | `/login` 各分支 | 表单、校验、路由和错误状态清晰 |
| C | `/me` → 资料编辑 | 深度使用用户 Store 和多级路由 |
| D | `/message` → chat/notice | 列表、会话和多种 fixture |
| E | `/home/search`、音乐、直播 | 动态页面和资源加载 |
| F | `/home` 主信息流与 `/video-detail` | 交互最复杂，最后迁移可利用成熟基础设施 |
| G | test/低优先页面 | 最终决定迁移、重写或删除 |

实际顺序以第 0 轮的 P0/P1/P2 清单为准。若首页是发布的唯一核心路径，可提前做最小只读首页，但复杂交互仍应在平台能力稳定后完成。

## 3. 单个纵切的工作包

每个纵切创建一条迁移记录：

```markdown
# Vertical slice: shop

## Legacy sources
- legacy/src/pages/shop/Shop.vue
- legacy/src/pages/shop/GoodsDetail.vue
- legacy/src/assets/...

## Target files
- src/features/shop/...

## Contracts
- route names/params/query:
- API/fixture:
- Store dependencies:
- events:

## States
- loading:
- success:
- empty:
- error:
- offline/timeout:

## Evidence
- component tests:
- E2E:
- screenshots:
- bundle/resource delta:

## Intentional differences
- ...
```

## 4. 组件迁移规则

### 4.1 保持行为，删除偶然复杂度

迁移时可以：

- 把全局 mixin 使用替换为显式 composable/import。
- 把 `$ref` 换为 Vue 原生 `ref`。
- 为 props/emits/template refs 加类型。
- 抽出有两个以上真实消费者的共享逻辑。
- 删除确有基线证据证明不可达的旧分支。

迁移时不要顺便：

- 改设计语言和所有 CSS 类名。
- 把每个小表达式封装为 composable。
- 为只有一个消费者的页面建立多层 service/repository/facade。
- 批量重写 Options API 只为风格一致。

### 4.2 Props 和 emits

使用类型声明并给可选值合理默认：

```ts
interface Props {
  videoId: string
  autoplay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoplay: false,
})

const emit = defineEmits<{
  play: [videoId: string]
  error: [error: Error]
}>()
```

事件名和 payload 必须与父组件测试一起迁移，避免仅通过类型检查却破坏运行行为。

### 4.3 样式

旧项目使用 Less。第 1 轮可继续使用最新版兼容 Less，避免在框架迁移时更换样式方案。每个纵切检查：

- scoped/global 边界。
- CSS 变量和主题值。
- 安全区域 `env(safe-area-inset-*)`。
- 移动端 viewport 与动态高度。
- 字体、z-index、transition。
- `prefers-reduced-motion` 和键盘焦点。

## 5. 资源迁移规则

不要复制整个 `legacy/public` 或 `legacy/src/assets`。按纵切执行：

1. 从基线资源清单找出页面实际引用。
2. 计算哈希，避免重复复制同一资源。
3. 确认许可和来源。
4. 选择 `src/assets` import 或 `public/` 固定路径。
5. 补 width/height、alt、懒加载和错误占位。
6. 记录原大小与新大小。
7. 构建后确认资源能从非根 base path 加载。

建议目录：

```text
src/features/<feature>/assets/   # 只被一个纵切使用
src/assets/shared/               # 多个纵切使用且稳定
public/                          # 必须保留原文件名/公开路径的资源
```

## 6. 数据脚本迁移到 Bun + TypeScript

旧 `node/` 有 10 个 JavaScript 数据/图片处理脚本。不要把目录整体复制为新的 `node/`：

```text
scripts/
  data/
    process-posts.ts
    process-users.ts
  assets/
    download-images.ts
  lib/
    fs.ts
    concurrency.ts
```

规则：

- 用显式输入/输出路径，不依赖当前工作目录。
- `--dry-run` 是默认安全模式，写入需显式参数。
- 使用 schema/类型验证外部 JSON。
- 限制下载并发、超时和重试。
- 幂等：相同输入重复执行得到相同输出。
- 临时文件原子替换，失败不破坏已有资源。
- 记录来源 URL、响应状态、哈希和生成版本。
- 对纯转换逻辑写 Vitest；网络部分用 fixture。

Bun 可执行 TypeScript：

```bash
bun run scripts/data/process-posts.ts --input data/raw.json --dry-run
```

但 `Bun.file`/`Bun.write` 与 Node `fs` 的选型应以可测试性和跨工具兼容为准，不必为“纯 Bun”重写所有标准 API。

## 7. 每个纵切的测试矩阵

| 层级 | 必测内容 |
| --- | --- |
| 纯函数 | 格式化、映射、过滤、边界值 |
| Store/service | 成功、空、失败、取消、并发 |
| 组件 | props、emits、加载/空/错状态、交互 |
| Router | 进入、参数、跳转、返回、深链 |
| E2E | 用户主路径和关键失败路径 |
| 视觉 | 稳定视口截图、有意差异审查 |
| 可访问性 | 键盘、可见焦点、label/alt、Reduced Motion |
| 性能 | 首屏资源、最大 chunk、图片体积、交互阻塞 |

## 8. 完成定义

一个纵切只有同时满足以下条件才算完成：

- [ ] 不从 `legacy/` 导入代码或资源。
- [ ] 不依赖非标准 `$ref` 宏。
- [ ] 类型检查无错误且没有新逃生口。
- [ ] loading/success/empty/error 都有定义。
- [ ] 路由进入、跳转和返回通过测试。
- [ ] Store/API/事件依赖有明确边界。
- [ ] 组件和 E2E 测试覆盖核心行为。
- [ ] 截图差异已经审查。
- [ ] 资源许可、大小、路径和 base path 已验证。
- [ ] bundle 变化在预算内。
- [ ] 迁移矩阵标为完成，旧来源仅留在 `legacy/`。
