# 第 2 轮：类型债务和迁移指标

## Legacy 输入与现代运行时

| 指标 | Legacy 基线 | 现代运行时 | 解释 |
| --- | ---: | ---: | --- |
| vue-tsc errors | 59 | 0 | Legacy 不修改；新代码门禁为 0 |
| 有类型错误文件 | 20 | 0 | Legacy 基线来自 Round 0 |
| 显式 `any` token | 54 | 0 | 新 runtime 和 tests 都为 0 |
| `$ref` token | 5 | 0 | 4 个旧文件尚未迁移 |
| `@ts-ignore/@ts-nocheck` | 0 | 0 | 不允许作为迁移逃生口 |
| JavaScript SFC | 57 | 0 | 旧组件尚未批量复制 |
| JavaScript runtime files | — | 0 | 新 `src/` 默认 TypeScript |
| `routeData` token | 旧 Store/Nav 使用 | 0 | Shop 深链已移除该依赖 |
| `legacy/` runtime path | n/a | 0 | 仅迁移脚本读取 legacy |
| `unknown` token | 未作为边界纪律 | 11 | 新 parser/error 边界的正向使用 |

## 现代源码规模

```text
production files=22
production TypeScript=13
production Vue SFC=6
all src files including tests=29
explicit any across all src=0
$ref across all src=0
type suppression across all src=0
```

这些数字由 [`scripts/round-2/collect-round.ts`](../../scripts/round-2/collect-round.ts) 直接扫描生成；机器结果位于 `generated/summary.json`（本地生成：`generated/summary.json`）。

## Shop 数据收敛

```text
legacy goods records=42
unique products=6
stable IDs=g1..g6
imported images=27
image bytes=1,274,128
```

旧 42 条记录是 6 个商品重复 7 次。新样板保留第一次出现顺序，但不把重复数据继续当作分页实现。

## 测试增长

Round 1：

```text
Vitest files=3
Vitest tests=4
E2E tests=3
```

Round 2：

```text
Vitest files=7
Vitest tests=21
E2E tests=7
```

增加的测试集中在 parser、gateway、Store 状态机、组件直接深链和图片加载，不以无业务价值的覆盖率数字替代风险验证。

## 构建体积

最终 production-preview 构建：

```text
files=39
total=1,398,106 bytes ≈ 1.33 MiB
product images=1,274,128 bytes ≈ 1.22 MiB
other build output=123,978 bytes ≈ 121.07 KiB
```

体积增长几乎完全来自显式迁移的 27 张本地商品图片。最大单文件为 `g1-3.jpg`，236,394 B。代码、CSS 和 HTML 仍约 121 KiB 未压缩。

## 指标解释边界

- Legacy 的 59 errors 没有下降，因为本轮不修改被忽略的旧代码；完成的是可持续迁移通道。
- 新代码 0 `any` 不代表业务类型建模已经全部完成，只证明当前样板没有用逃生口。
- `unknown` 数量不是越少越好；外部输入和 catch boundary 应保留 `unknown`。
- 扫描是静态 token 证据，正确性仍由 vue-tsc、Vitest、Playwright 和 runtime parser 共同证明。
