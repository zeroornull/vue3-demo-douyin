# Round 4A + 4B：迁移指标

## 测试增长

| 指标 | Round 3 | Round 4A | Round 4B |
| --- | ---: | ---: | ---: |
| Vitest files | 13 | 20 | 27 |
| Vitest tests | 43 | 70 | 96 |
| E2E tests | 10 | 17 | 24 |

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

Round 4B 新增：

- Profile Domain/draft/format。
- Profile validation。
- UserProfile parser。
- Fixture/HTTP ProfileGateway。
- Profile Store dirty/save/conflict/event。
- Profile/EditProfile components。
- Bearer GET/PATCH 和 HttpClient patch。

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

Round 4B 新增：

```text
legacy profile routes audited=2 core routes + many adjacent subroutes
routes migrated=2
profile view=yes
profile edit=yes
video/sidebar/QR code=no
```

这是 Round 4A+4B，不是 Round 4 全部完成。

## 现代源码规模

```text
production files=52
production TypeScript=37
production Vue SFC=10
production JavaScript=0
all src files including tests=79
Auth production files=10
Auth test files=7
Profile production files=10
Profile test files=7
```

## 类型纪律

Round 4B 最终继续满足：

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
- Profile parser/session user consistency。
- Profile Store catch 和 HTTP response。

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
files=45
total=1,498,873 bytes ≈1.43 MiB
product images=1,274,128 bytes
non-product output=224,745 bytes ≈219.48 KiB
Round-4A total=1,479,707 bytes
Round-4B increase=19,166 bytes
```

Lockfile 没有新增依赖，仍为：

```text
bytes=85,235
sha256=c33205a80989103b674624f70a41051462c635f05dd0b720518a67badb60a997
```

机器指标由本地 `docs/round-4/generated/summary.json` 生成；该目录按 Git 卫生策略忽略。
