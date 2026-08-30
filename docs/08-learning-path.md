# 学习路线：在迁移中掌握 Bun、TypeScript 和 Vue

这不是独立于迁移的“先学完再做”课程。每个主题都绑定一个真实产物和验证问题，避免只会复制脚手架。

## 1. 学习顺序

### 模块 A：Bun 的角色与边界

#### 学习目标

- 区分 Bun 作为 package manager、script runner、JavaScript/TypeScript runtime 和 test runner 的不同角色。
- 理解 `bun.lock`、冻结安装、peer/optional dependency、lifecycle script 信任模型。
- 知道 Bun 的 Node 兼容不是“所有包无需验证”。

#### 练习

```bash
bun --version
bun --revision
bun install
bun install --frozen-lockfile
bun pm ls
bun outdated
bun audit --audit-level=high
```

#### 完成证明

- 能解释为什么提交 `bun.lock`。
- 能解释为什么新根没有 `pnpm-lock.yaml`，但 `legacy/` 中仍保留它。
- 能诊断一个 lifecycle script 未执行、peer 冲突或原生 optional dependency 问题。

### 模块 B：现代 TypeScript 的边界思维

#### 学习目标

- `unknown`、联合类型、类型守卫、泛型和 `satisfies`。
- `exactOptionalPropertyTypes` 与“字段缺失”和 `undefined` 的差异。
- `noUncheckedIndexedAccess` 对数组/字典的影响。
- DTO 与 Domain model 的职责。
- 类型断言为什么不是验证。

#### 练习

1. 为一个旧 Mock 响应定义 DTO。
2. 写解析/验证函数，输入为 `unknown`。
3. 映射为页面使用的 Domain model。
4. 写成功、缺字段、错误类型和空数据测试。

#### 完成证明

- 共享请求层不返回 `any`。
- 页面无需反复判断同一组服务端可选字段。
- 能解释一次 `as` 是否安全、由什么运行时证据保证。

### 模块 C：Vue 3 响应性与 SFC 类型

#### 学习目标

- `ref`、`reactive`、`computed`、`watch`、`watchEffect` 的选择。
- template 自动解包与脚本 `.value`。
- `defineProps`、`defineEmits`、`defineModel`、template refs。
- composable 的生命周期和清理。
- 为什么 `$ref` 转换可能改变语义。

#### 练习

- 从一个只含 `$ref` 的旧组件开始，改为 Vue 原生 `ref`。
- 为 watch、异步回调、解构和 template 交互补测试。
- 对比转换前后响应性，不只看 type-check。

#### 完成证明

- 能指出旧项目 Vue Macros 中哪些已经是 Vue 原生能力，哪些仍是插件语法。
- 新组件不依赖隐式全局 mixin。

### 模块 D：Vue Router 5

#### 学习目标

- history 模式、route location、动态 import、navigation guard。
- route name、params/query 与 RouteMeta 类型。
- RouterView、KeepAlive 和 transition 的协作。
- 浏览器历史与“路由表顺序”不是一回事。

#### 练习

- 迁移 `/shop` 和详情页。
- 测试直接深链、程序跳转、浏览器返回、滚动恢复和错误参数。
- 用 meta 表达导航/缓存策略。

#### 完成证明

- 不再通过 `routes.findIndex()` 推断前进/后退。
- 守卫没有未处理的空组件名或 Store 初始化时序。

### 模块 E：Pinia 4 与状态边界

#### 学习目标

- State、getter、action 的类型推断。
- Options Store 和 Setup Store 的真实取舍。
- Store 与 API service、组件、Router 的依赖方向。
- 测试中创建独立 Pinia，避免共享状态污染。

#### 练习

- 将旧 `useBaseStore` 拆成两个最明显的责任域。
- 写动作成功、失败、并发和 reset 测试。
- 把 DOM 尺寸从 Store 初始化中移到 composable。

#### 完成证明

- Store 不直接依赖页面组件。
- API 失败不会留下半更新状态。

### 模块 F：Vite 8、构建和性能

#### 学习目标

- dev server、dependency optimization、production build、preview 的区别。
- Vite 8 的 Rolldown/Oxc 迁移影响。
- 静态资源 URL、base path、动态 import 和 chunk。
- 为什么手工 `vendor`/`other` 分包不一定更快。

#### 练习

- 先测默认构建，再逐条恢复有必要的配置。
- 验证非根 base path、WASM、图片和动态页面。
- 生成 bundle report，解释最大三个 chunk。

#### 完成证明

- 生产产物没有旧 CDN Vue/Router。
- 每一条非默认分包规则都有测量证据。

### 模块 G：现代质量工具链

#### 学习目标

- ESLint flat config 与 Prettier 职责分离。
- Oxlint 快速检查与 ESLint 类型/框架规则的分工。
- Vitest 单元/组件测试和 Playwright E2E 的边界。
- 测试确定性：时间、随机、网络、动画和截图。

#### 练习

- 建一个 CI 只读 `check` 命令，运行后 `git diff --exit-code`。
- 为一个纵切同时写 service、component、E2E 测试。
- 故意制造类型、lint、视觉和网络错误，确认门禁能捕获。

## 2. 每周学习复盘模板

```markdown
## 本周迁移产物
- ...

## 我能解释的概念
- ...

## 我只是照抄但还不能解释的内容
- ...

## 一个被测试捕获的真实错误
- ...

## 一个删除的旧假设/依赖
- ...

## 下周最小学习目标
- ...
```

## 3. 推荐官方资料

- Bun 文档：<https://bun.sh/docs>
- Bun 安装/锁文件：<https://bun.sh/docs/pm/cli/install>、<https://bun.sh/docs/install/lockfile>
- Bun Node.js 兼容：<https://bun.sh/docs/runtime/nodejs-compat>
- Vue 指南：<https://vuejs.org/guide/introduction.html>
- Vue TypeScript：<https://vuejs.org/guide/typescript/overview.html>
- Vue Router：<https://router.vuejs.org/>
- Vue Router 迁移：<https://router.vuejs.org/guide/migration/>
- Pinia：<https://pinia.vuejs.org/>
- Vite：<https://vite.dev/guide/>
- Vite 迁移：<https://vite.dev/guide/migration>
- TypeScript Handbook：<https://www.typescriptlang.org/docs/handbook/intro.html>
- ESLint flat config：<https://eslint.org/docs/latest/use/configure/configuration-files>
- ESLint 迁移指南：<https://eslint.org/docs/latest/use/configure/migration-guide>
- Vitest：<https://vitest.dev/guide/>
- Playwright：<https://playwright.dev/docs/intro>

学习资料应优先选择和当前版本匹配的官方文档。博客可用于理解，但版本行为和配置以官方 release/migration guide、package metadata 和实际测试为准。
