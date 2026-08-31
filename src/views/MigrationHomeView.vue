<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { useMigrationStore } from '@/stores/migration'

const migrationStore = useMigrationStore()
const { completed, nextRound, summary } = storeToRefs(migrationStore)
</script>

<template>
  <section class="hero" aria-labelledby="migration-title">
    <div class="hero-copy">
      <p class="eyebrow">Bun · TypeScript · Vue</p>
      <h1 id="migration-title">用可验证的小步迁移，替代一次性重写。</h1>
      <p class="lede">
        第 0–2 轮建立基线、现代基座和严格 Shop 边界；第 3 轮加入 HTTP adapter、环境解析、导航状态和
        typed event dispatcher；第 4A 批次已迁移登录入口和密码登录，Round 4 其他纵切仍在进行中。
      </p>

      <div class="actions">
        <RouterLink class="primary-action" to="/health">查看运行状态</RouterLink>
        <RouterLink class="secondary-action" to="/shop">打开 Shop 样板</RouterLink>
        <a class="secondary-action" href="#principles-title">查看本轮契约</a>
      </div>
    </div>

    <aside class="status-panel" aria-label="迁移进度">
      <p class="status-label">当前状态</p>
      <p class="status-summary">{{ summary }}</p>
      <dl>
        <div>
          <dt>已完成轮次</dt>
          <dd>{{ completed.join('、') }}</dd>
        </div>
        <div>
          <dt>下一轮</dt>
          <dd>{{ nextRound }}</dd>
        </div>
        <div>
          <dt>Legacy import</dt>
          <dd>0</dd>
        </div>
      </dl>
    </aside>
  </section>

  <section class="principles" aria-labelledby="principles-title">
    <div class="section-heading">
      <p class="eyebrow">Round 4A · Login slice</p>
      <h2 id="principles-title">这层基座只证明三件事</h2>
    </div>

    <ol class="principle-grid">
      <li>
        <span>01</span>
        <h3>校验不会悬挂</h3>
        <p>协议、手机号和密码返回同步 typed validation，不创建永不完成的 Promise。</p>
      </li>
      <li>
        <span>02</span>
        <h3>Auth Adapter 可替换</h3>
        <p>Fixture 与 HTTP Gateway 共享 AuthGateway，页面和 Pinia 不 import Axios。</p>
      </li>
      <li>
        <span>03</span>
        <h3>跳转和错误可验证</h3>
        <p>成功、401、503、非法响应和外部 redirect 都有 production-preview E2E。</p>
      </li>
    </ol>
  </section>
</template>
