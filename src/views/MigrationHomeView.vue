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
        typed event dispatcher，并保持页面不依赖基础设施细节。
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
      <p class="eyebrow">Round 3 contract</p>
      <h2 id="principles-title">这层基座只证明三件事</h2>
    </div>

    <ol class="principle-grid">
      <li>
        <span>01</span>
        <h3>Adapter 可替换</h3>
        <p>Fixture 与 Axios HTTP Gateway 共享同一 ShopGateway 和 AppResult 合同。</p>
      </li>
      <li>
        <span>02</span>
        <h3>环境配置先解析</h3>
        <p>数据源、API base URL 和 timeout 都从 unknown 字符串收窄后使用。</p>
      </li>
      <li>
        <span>03</span>
        <h3>副作用可清理</h3>
        <p>导航方向由 history position 推导，typed event listener 返回 unsubscribe。</p>
      </li>
    </ol>
  </section>
</template>
