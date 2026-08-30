# 第 2 轮：Shop 严格类型纵切

## 旧实现问题

旧 `/shop`：

```vue
<div class="goods" @click="nav('/shop/detail', {}, item)">
```

旧 `useNav`：

```ts
if (data) store.routeData = cloneDeep(data)
router.push({ path, query })
```

旧详情 mount：

```ts
console.log('r', store.routeData.imgs)
state.detail = store.routeData
```

后果：

- URL 不包含商品身份。
- 刷新、复制链接和新标签页没有 routeData。
- 直接 `/shop/detail` 抛出读取 null `imgs` 错误。
- Store 成为无类型的跨页面对象搬运通道。

Round-0 浏览器基线已经证明：直接详情 3 个 page errors，而列表点击进入没有错误。

## 新 URL 合同

| URL | 行为 |
| --- | --- |
| `/shop` | 加载 6 个经过 parser 的唯一商品 |
| `/shop/detail` | 重定向 `/shop`，不再抛错 |
| `/shop/detail/g1` | 可深链商品详情 |
| `/shop/detail/g6` | 可深链小米电视，刷新后仍恢复 |
| `/shop/detail/g99` | 合法 ID、记录不存在 → not-found |
| `/shop/detail/not-valid` | ID 格式非法 → not-found |

详情状态只由 URL productId 和 Gateway/Store 数据决定，不读取历史导航内存。

## Fixture 导入

可重复脚本：

```bash
bun run migration:shop:import
```

来源：

```text
legacy/public/data/goods.json
legacy/public/images/goods/
```

处理：

1. 对 42 条记录做结构预检。
2. 以 cover 去重，保留第一次出现顺序。
3. 得到 6 个唯一商品：`g6, g1, g2, g3, g4, g5`。
4. 格式化写入 `src/features/shop/data/goods.fixture.json`。
5. 复制 27 张真正被引用的图片到 `public/shop/products/`。
6. 对每张目标图片计算 SHA-256。

结果：

```text
records: 42 → 6
images: 27
image bytes: 1,274,128
fixture bytes: 1,745
```

完整来源清单：`generated/shop-import.json`（本地生成：`generated/shop-import.json`）。

生成器连续执行两次并比较 fixture、27 张图片和 manifest 共 29 个文件的 SHA-256，结果完全一致；见 `evidence/import-shop-idempotence.log`（本地生成：`evidence/import-shop-idempotence.log`）。

新运行时只导入新 fixture，不从 `legacy/` import。迁移脚本允许读取本地 legacy，因为它是显式、可重放的开发工具边界。

## UI 状态

列表：

- `idle/loading`：正在验证契约。
- `error`：显示 parser/API 错误并可 force retry。
- `empty`：明确无商品。
- `ready`：6 张商品卡片。

详情：

- loading。
- error + retry。
- not-found。
- ready + 本地 gallery。

图片使用明确 width/height、alt 和 async decoding；6 个列表封面与详情 gallery 都由 E2E 检查实际加载，不依赖旧外部 CDN。

## 测试矩阵

| 层级 | 覆盖 |
| --- | --- |
| Parser | valid、unsafe path、duplicate ID、empty |
| Gateway | list、get、not-found、aborted |
| Store | ready、empty、parse error、aborted、unexpected throw、domain event |
| Component | 6 cards、稳定 href、直接详情、invalid ID、viewed event |
| E2E | list→detail、直接深链、reload、全部 gallery 图片加载、invalid ID、旧 path redirect |

## 视觉证据

- `screenshots/shop-desktop.png`（本地生成：`screenshots/shop-desktop.png`）
- `screenshots/shop-mobile.png`（本地生成：`screenshots/shop-mobile.png`）
- `screenshots/shop-detail-desktop.png`（本地生成：`screenshots/shop-detail-desktop.png`）
- `screenshots/shop-detail-mobile.png`（本地生成：`screenshots/shop-detail-mobile.png`）
- `screenshots/shop-not-found-mobile.png`（本地生成：`screenshots/shop-not-found-mobile.png`）

视觉目标是验证类型纵切和响应式布局，不是完整复刻旧 1,150 行商品详情。
