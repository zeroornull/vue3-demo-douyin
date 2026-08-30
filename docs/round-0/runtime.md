# 第 0 轮：运行、类型、构建与浏览器基线

## 运行环境

| 工具 | 版本 |
| --- | --- |
| Bun | `1.4.0`（`1.4.0+34cbb9a40`） |
| Node | `v22.23.2` |
| pnpm | `11.21.0` |
| Git | `git version 2.43.0` |
| Platform | `Linux R7000P 6.6.114.1-microsoft-standard-WSL2 #1 SMP PREEMPT_DYNAMIC Mon Dec  1 20:46:23 UTC 2025 x86_64 x86_64 x86_64 GNU/Linux` |

新仓库采集时为 `main`，1 个提交，0 个 remote。

## 依赖安装

`pnpm install --frozen-lockfile` 在 pnpm 11 首次执行时因供应链默认策略阻止
`core-js`、两个 `esbuild` 和 `vue-demi` 的 lifecycle build，以
`ERR_PNPM_IGNORED_BUILDS` 退出。

为忠实复现且不修改旧 manifest/锁文件，本轮临时创建未保留的
`pnpm-workspace.yaml`：

```yaml
allowBuilds:
  esbuild: true
  vue-demi: true
  core-js: false
```

并使用 `HUSKY=0` 防止旧 Husky 修改新仓库 hooks。随后冻结安装成功，且
`package.json` 与 `pnpm-lock.yaml` 的 SHA-256 前后不变。

证据：`evidence/pnpm-install.log`（本地生成：`evidence/pnpm-install.log`）。pnpm 自动预检导致的首次脚本阻断也保存在
`type-check-pnpm-preflight-failure.log` 和 `build-pnpm-preflight-failure.log`。

## 类型检查

`pnpm run type-check` 真正运行 `vue-tsc --build --force` 后以 **2** 退出：

- TypeScript 错误：**59**。
- 涉及文件：**20**。
- 这是旧项目基线缺陷，本轮没有修改 legacy 源码。

### 按错误码

| 错误码 | 数量 |
| --- | ---: |
| `TS2339` | 43 |
| `TS2322` | 8 |
| `TS2554` | 5 |
| `TS2591` | 1 |
| `TS2551` | 1 |
| `TS2304` | 1 |

### 按文件

| 文件 | 数量 |
| --- | ---: |
| `src/pages/message/Share2Friend.vue` | 16 |
| `src/pages/shop/Shop.vue` | 7 |
| `src/pages/shop/GoodsDetail.vue` | 7 |
| `src/pages/message/JoinedGroupChat.vue` | 6 |
| `src/utils/index.tsx` | 5 |
| `src/components/Comment.vue` | 3 |
| `src/pages/home/SubmitReport.vue` | 2 |
| `src/config/index.ts` | 1 |
| `src/components/BaseMusic.vue` | 1 |
| `src/store/pinia.ts` | 1 |
| `src/pages/me/userinfo/EditUserInfoItem.vue` | 1 |
| `src/pages/me/userinfo/AddSchool.vue` | 1 |
| `src/pages/me/rightMenu/LookHistory.vue` | 1 |
| `src/pages/me/rightMenu/Setting.vue` | 1 |
| `src/pages/message/notice/TaskNotice.vue` | 1 |
| `src/pages/message/notice/MoneyNotice.vue` | 1 |
| `src/pages/message/notice/NoticeSetting.vue` | 1 |
| `src/pages/message/chat/ChatDetail.vue` | 1 |
| `src/pages/message/SetRemark.vue` | 1 |
| `src/pages/me/RequestUpdate.vue` | 1 |

完整错误：`generated/type-errors.json`（本地生成：`generated/type-errors.json`） 和
`evidence/type-check.log`（本地生成：`evidence/type-check.log`）。

## 生产构建

`pnpm run build` 成功：

- Vite：6.4.2。
- 转换模块：715（来自构建日志）。
- 构建文件：**1557**。
- 产物总大小：**127.26 MiB**。
- 构建用时：13.87 秒（当前机器）。
- 警告：3 条，均为 `libarchive-wasm` 引入的 `fs`、`path`、`crypto` 被浏览器 externalize。

### 最大产物

| 文件 | 原大小 | gzip |
| --- | ---: | ---: |
| `data/videos.json` | 4.63 MiB | 569.13 KiB |
| `data/videos-old.json` | 4.60 MiB | 564.21 KiB |
| `libarchive.wasm` | 587.84 KiB | — |
| `data/user_video_list/user-12345xiaolaohu.json` | 455.89 KiB | 51.80 KiB |
| `data/user_video_list/user-jingyiziran.json` | 437.66 KiB | 51.05 KiB |
| `data/user_video_list/user-71158770.json` | 415.63 KiB | 36.86 KiB |
| `data/user_video_list/user-elfin16.json` | 411.65 KiB | 48.88 KiB |
| `data/user_video_list/user-Lsy0508.json` | 407.93 KiB | 47.13 KiB |
| `data/videos.md` | 406.42 KiB | — |
| `data/user_video_list/user-Dashalove.json` | 383.56 KiB | 40.71 KiB |
| `data/user_video_list/user-13632088.json` | 369.08 KiB | 45.17 KiB |
| `assets/other-CJsH0pfG.css` | 368.55 KiB | 36.20 KiB |
| `data/user_video_list/user-shmumu.json` | 353.54 KiB | 36.87 KiB |
| `data/user_video_list/user-SUNMENG333.json` | 352.52 KiB | 39.12 KiB |
| `data/user_video_list/user-81069823274.json` | 319.15 KiB | 36.54 KiB |

证据：`generated/build-summary.json`（本地生成：`generated/build-summary.json`） 和
`evidence/build.log`（本地生成：`evidence/build.log`）。

## 浏览器冒烟

通过 Google Chrome + Playwright 1.62.1，在移动 UA/touch、窄屏和桌面视口执行：

- 用例：**15**。
- 文档 HTTP 200：**15/15**。
- 导航失败：**0**。
- 点击流程失败：**0**。
- 有 console error 的用例：**2**。
- 有 page error 的用例：**2**。
- 有资源请求失败的用例：**3**。

| 用例 | HTTP | Console errors | Page errors | Request failures | 视觉证据 |
| --- | ---: | ---: | ---: | ---: | --- |
| `home-mobile` | 200 | 0 | 0 | 5 | 截图（本地生成：`screenshots/home-mobile.png`） |
| `search-mobile` | 200 | 0 | 0 | 0 | 截图（本地生成：`screenshots/search-mobile.png`） |
| `shop-mobile` | 200 | 0 | 0 | 0 | 截图（本地生成：`screenshots/shop-mobile.png`） |
| `shop-detail-mobile` | 200 | 1 | 3 | 0 | 截图（本地生成：`screenshots/shop-detail-mobile.png`） |
| `shop-to-detail-mobile` | 200 | 0 | 0 | 0 | 截图（本地生成：`screenshots/shop-to-detail-mobile.png`） |
| `message-mobile` | 200 | 0 | 0 | 0 | 截图（本地生成：`screenshots/message-mobile.png`） |
| `chat-mobile` | 200 | 0 | 0 | 0 | 截图（本地生成：`screenshots/chat-mobile.png`） |
| `message-to-chat-mobile` | 200 | 0 | 0 | 0 | 截图（本地生成：`screenshots/message-to-chat-mobile.png`） |
| `profile-mobile` | 200 | 0 | 0 | 0 | 截图（本地生成：`screenshots/profile-mobile.png`） |
| `edit-profile-mobile` | 200 | 0 | 0 | 0 | 截图（本地生成：`screenshots/edit-profile-mobile.png`） |
| `profile-to-edit-mobile` | 200 | 0 | 0 | 0 | 截图（本地生成：`screenshots/profile-to-edit-mobile.png`） |
| `login-mobile` | 200 | 0 | 0 | 0 | 截图（本地生成：`screenshots/login-mobile.png`） |
| `video-detail-mobile` | 200 | 1 | 2 | 0 | 截图（本地生成：`screenshots/video-detail-mobile.png`） |
| `home-narrow` | 200 | 0 | 0 | 5 | 截图（本地生成：`screenshots/home-narrow.png`） |
| `home-desktop` | 200 | 0 | 0 | 6 | 截图（本地生成：`screenshots/home-desktop.png`） |

### 已确认缺陷

1. 直接打开 `/shop/detail`：3 个 page errors，读取空 route data 的 `imgs` 失败。
2. 从 `/shop` 点击商品进入同一路由：0 console/page errors；证明详情依赖内存导航状态。
3. 直接打开 `/video-detail`：2 个 page errors，读取空 route data 的 `index` 失败。
4. 首页在三种视口都有 5–6 个外部图片/视频请求失败，常见错误为
   `ERR_BLOCKED_BY_ORB` 或 `ERR_ABORTED`；页面本身仍可渲染。
5. Message→Chat、Profile→Edit 三条点击流程没有错误。

机器证据：`generated/browser-smoke.json`（本地生成：`generated/browser-smoke.json`）。截图位于
`screenshots/`（本地生成：`screenshots/`）。
