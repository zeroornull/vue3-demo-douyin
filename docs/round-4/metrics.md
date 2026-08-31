# Round 4A：迁移指标

## 测试增长

| 指标 | Round 3 | Round 4A |
| --- | ---: | ---: |
| Vitest files | 13 | 20 |
| Vitest tests | 43 | 70 |
| E2E tests | 10 | 17 |

新增测试覆盖：

- Phone domain：3。
- Form validation/redirect：4。
- Session parser：4。
- Fixture AuthGateway：3。
- HTTP AuthGateway：3。
- Auth Store：5。
- Auth components：4。
- HttpClient POST 扩展。
- Runtime auth data source。

## 迁移范围

```text
legacy login routes audited=6
routes migrated/redirected=3
login entry migrated=yes
password login migrated=yes
verification code=no
password recovery=no
social login=no
help/protocol=no
```

这是 Round 4A，不是 Round 4 全部完成。

## 现代源码规模

```text
production files=41
production TypeScript=29
production Vue SFC=8
production JavaScript=0
all src files including tests=61
Auth production files=10
Auth test files=7
```

## 类型纪律

本批次最终继续要求：

```text
production JavaScript=0
explicit any=0
$ref=0
@ts-ignore/@ts-nocheck=0
legacy runtime import=0
```

新增 unknown 主要位于：

- Phone parser input。
- Auth session response。
- Store catch boundary。
- HTTP response。

## 资源

迁移登录入口和密码登录无需旧图像资源，因此：

```text
login image imports=0
third-party login icons=0
new public assets=0
```

旧 social icons 留在被忽略的 legacy 中，等对应纵切迁移时再按消费者复制。

## 构建

Round 4A 新增：

- Auth Domain/parser/validation。
- Auth fixture/http gateway。
- Auth Pinia Store。
- LoginEntry/PasswordLogin 两个动态 chunk。
- Auth CSS chunk。

最终 production build：

```text
files=43
total=1,479,707 bytes ≈1.41 MiB
product images=1,274,128 bytes
non-product output=205,579 bytes ≈200.76 KiB
Round-3 total=1,463,076 bytes
increase=16,631 bytes
```

Lockfile 没有新增依赖，仍为：

```text
bytes=85,235
sha256=c33205a80989103b674624f70a41051462c635f05dd0b720518a67badb60a997
```

机器指标由本地 `docs/round-4/generated/summary.json` 生成；该目录按 Git 卫生策略忽略。
