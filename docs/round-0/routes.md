# 第 0 轮：路由基线

## 摘要

- 路由总数：**65**。
- 有稳定 route name 的路由：**1**；只有 `/video-detail` 已命名。
- 重定向：**1**；根路径 `/` 重定向到 `/home`。
- 动态导入页面：**61**。
- 建议优先级：P0 10、P1 53、P2 2。

优先级是迁移规划建议，不是旧代码事实。路由来源事实保存在
[`generated/routes.json`](generated/routes.json)，由
[`scripts/round-0/collect-baseline.ts`](../../scripts/round-0/collect-baseline.ts) 从
`legacy/src/router/routes.ts` 的 TypeScript AST 生成。

## P0 冒烟范围

本轮自动验证了：`/home`、`/home/search`、`/shop`、`/shop/detail`、
`/message`、`/message/chat`、`/me`、`/me/edit-userinfo`、`/login` 和
`/video-detail`。另外验证了三条真实点击流程：

1. `/shop` 点击第一个 `.goods` → `/shop/detail`。
2. `/message` 点击第一个 `.friend` → `/message/chat`。
3. `/me` 点击“编辑资料” → `/me/edit-userinfo`。

15 个浏览器用例都取得 HTTP 200 且没有导航/点击超时。直接深链
`/shop/detail` 和 `/video-detail` 会因缺少内存态 route data 产生运行时错误；从
`/shop` 正常点击进入详情则没有错误。这是新 Router 必须明确修复或保持并记录的行为差异。

## 完整路由表

| 优先级 | Path | Name | Redirect | Component | 源码行 |
| --- | --- | --- | --- | --- | ---: |
| P1 | `/` | — | `/home` | `—` | 8 |
| P2 | `/test` | — | — | `../pages/test/Test.vue` | 9 |
| P2 | `/test4` | — | — | `../pages/test/Test4.vue` | 10 |
| P1 | `/publish` | — | — | `@/pages/home/Publish.vue` | 12 |
| P0 | `/home` | — | — | `../pages/home/index.vue` | 14 |
| P1 | `/home/music` | — | — | `@/pages/home/Music.vue` | 15 |
| P1 | `/home/music-rank-list` | — | — | `@/pages/home/MusicRankList.vue` | 16 |
| P1 | `/home/live` | — | — | `@/pages/home/LivePage.vue` | 20 |
| P0 | `/shop` | — | — | `@/pages/shop/Shop.vue` | 22 |
| P0 | `/shop/detail` | — | — | `@/pages/shop/GoodsDetail.vue` | 23 |
| P0 | `/me` | — | — | `@/pages/me/Me.vue` | 28 |
| P0 | `/me/edit-userinfo` | — | — | `@/pages/me/userinfo/EditUserInfo.vue` | 29 |
| P1 | `/me/edit-userinfo-item` | — | — | `@/pages/me/userinfo/EditUserInfoItem.vue` | 33 |
| P1 | `/me/country-choose` | — | — | `@/pages/login/countryChoose.vue` | 37 |
| P1 | `/me/my-card` | — | — | `@/pages/me/MyCard.vue` | 41 |
| P1 | `/me/add-school` | — | — | `@/pages/me/userinfo/AddSchool.vue` | 42 |
| P1 | `/me/choose-school` | — | — | `@/pages/me/userinfo/ChooseSchool.vue` | 46 |
| P1 | `/me/declare-school` | — | — | `@/pages/me/userinfo/DeclareSchool.vue` | 50 |
| P1 | `/me/choose-department` | — | — | `@/pages/me/userinfo/ChooseDepartment.vue` | 54 |
| P1 | `/me/display-type` | — | — | `@/pages/me/userinfo/DisplayType.vue` | 58 |
| P1 | `/me/choose-location` | — | — | `@/pages/me/userinfo/ChooseLocation.vue` | 62 |
| P1 | `/me/choose-province` | — | — | `@/pages/me/userinfo/ChooseProvince.vue` | 66 |
| P1 | `/me/choose-city` | — | — | `@/pages/me/userinfo/ChooseCity.vue` | 70 |
| P1 | `/me/right-menu/look-history` | — | — | `@/pages/me/rightMenu/LookHistory.vue` | 74 |
| P1 | `/me/right-menu/minor-protection/index` | — | — | `@/pages/me/rightMenu/MinorProtection/Index.vue` | 78 |
| P1 | `/me/right-menu/minor-protection/detail-setting` | — | — | `@/pages/me/rightMenu/MinorProtection/DetailSetting.vue` | 82 |
| P1 | `/me/right-menu/minor-protection/trigger-time` | — | — | `@/pages/me/rightMenu/MinorProtection/TriggerTime.vue` | 86 |
| P1 | `/me/right-menu/setting` | — | — | `@/pages/me/rightMenu/Setting.vue` | 90 |
| P1 | `/me/collect/music-collect` | — | — | `@/pages/me/collect/MusicCollect.vue` | 94 |
| P1 | `/me/collect/video-collect` | — | — | `@/pages/me/collect/VideoCollect.vue` | 98 |
| P1 | `/me/my-music` | — | — | `@/pages/me/MyMusic.vue` | 102 |
| P0 | `/message` | — | — | `@/pages/message/Message.vue` | 105 |
| P1 | `/message/all` | — | — | `@/pages/message/AllMessage.vue` | 106 |
| P1 | `/message/more-search` | — | — | `@/pages/message/MoreSearch.vue` | 110 |
| P1 | `/message/joined-group-chat` | — | — | `@/pages/message/JoinedGroupChat.vue` | 114 |
| P1 | `/message/fans` | — | — | `@/pages/message/Fans.vue` | 118 |
| P1 | `/message/visitors` | — | — | `@/pages/message/Visitors.vue` | 122 |
| P1 | `/message/douyin-helper` | — | — | `@/pages/message/notice/DouyinHelper.vue` | 126 |
| P1 | `/message/system-notice` | — | — | `@/pages/message/notice/SystemNotice.vue` | 130 |
| P1 | `/message/task-notice` | — | — | `@/pages/message/notice/TaskNotice.vue` | 134 |
| P1 | `/message/live-notice` | — | — | `@/pages/message/notice/LiveNotice.vue` | 138 |
| P1 | `/message/money-notice` | — | — | `@/pages/message/notice/MoneyNotice.vue` | 142 |
| P1 | `/message/notice-setting` | — | — | `@/pages/message/notice/NoticeSetting.vue` | 146 |
| P0 | `/message/chat` | — | — | `@/pages/message/chat/Chat.vue` | 151 |
| P1 | `/message/chat/detail` | — | — | `@/pages/message/chat/ChatDetail.vue` | 155 |
| P1 | `/message/chat/red-packet-detail` | — | — | `@/pages/message/RedPacketDetail.vue` | 159 |
| P1 | `/people/find-acquaintance` | — | — | `@/pages/people/FindAcquaintance.vue` | 164 |
| P1 | `/people/follow-and-fans` | — | — | `@/pages/people/FollowAndFans.vue` | 168 |
| P1 | `/address-list` | — | — | `@/pages/people/AddressList.vue` | 174 |
| P1 | `/scan` | — | — | `@/pages/people/Scan.vue` | 178 |
| P1 | `/face-to-face` | — | — | `@/pages/people/FaceToFace.vue` | 179 |
| P1 | `/set-remark` | — | — | `@/pages/message/SetRemark.vue` | 183 |
| P0 | `/login` | — | — | `@/pages/login/Login.vue` | 189 |
| P1 | `/login/other` | — | — | `@/pages/login/OtherLogin.vue` | 190 |
| P1 | `/login/password` | — | — | `@/pages/login/PasswordLogin.vue` | 194 |
| P1 | `/login/verification-code` | — | — | `@/pages/login/VerificationCode.vue` | 198 |
| P1 | `/login/retrieve-password` | — | — | `@/pages/login/RetrievePassword.vue` | 202 |
| P1 | `/login/help` | — | — | `@/pages/login/Help.vue` | 206 |
| P1 | `/me/request-update` | — | — | `@/pages/me/RequestUpdate.vue` | 209 |
| P1 | `/me/my-request-update` | — | — | `@/pages/me/MyRequestUpdate.vue` | 213 |
| P1 | `/home/report` | — | — | `@/pages/home/Report.vue` | 217 |
| P1 | `/home/submit-report` | — | — | `@/pages/home/SubmitReport.vue` | 218 |
| P1 | `/message/share-to-friend` | — | — | `@/pages/message/Share2Friend.vue` | 222 |
| P0 | `/video-detail` | `video-detail` | — | `@/pages/other/VideoDetail.vue` | 226 |
| P0 | `/home/search` | — | — | `@/pages/home/SearchPage.vue` | 233 |

## Router 迁移风险

- 除一个路由外都没有 name，新项目不能依赖稳定命名导航，必须补齐。
- 导航守卫用路由数组索引推断前进/后退；这不等价于浏览器 history。
- 守卫从 `matched[0].components.default.name` 推断 KeepAlive 排除项，组件名缺失时有空值风险。
- history/hash 模式取决于 `IS_SUB_DOMAIN`，部署目标应先收敛。
- 详情页通过内存态 `routeData` 传递对象，刷新/深链不具备同样数据。
