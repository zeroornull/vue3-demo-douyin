<script setup lang="ts">
import { version as vueVersion } from 'vue'
import { getRuntimeConfig } from '@/config/runtime'
import { createHealthSnapshot } from '@/lib/health'

const buildSha = import.meta.env.VITE_BUILD_SHA
const runtime = getRuntimeConfig()
const health = createHealthSnapshot({
  ...(buildSha ? { buildSha } : {}),
  mode: import.meta.env.MODE,
  vueVersion,
})
</script>

<template>
  <section class="health" aria-labelledby="health-title">
    <div class="section-heading">
      <p class="eyebrow">Runtime contract</p>
      <h1 id="health-title">运行状态</h1>
      <p>这个页面是第 1 轮最小生产构建和 E2E 冒烟入口。</p>
    </div>

    <div class="health-status" aria-live="polite">
      <span class="status-dot" aria-hidden="true"></span>
      <strong data-testid="health-status">{{ health.status }}</strong>
    </div>

    <dl class="health-grid">
      <div>
        <dt>Vue</dt>
        <dd>{{ health.vueVersion }}</dd>
      </div>
      <div>
        <dt>Mode</dt>
        <dd>{{ health.mode }}</dd>
      </div>
      <div>
        <dt>Build SHA</dt>
        <dd>{{ health.buildSha }}</dd>
      </div>
      <div>
        <dt>Package manager</dt>
        <dd>Bun 1.4</dd>
      </div>
      <div>
        <dt>Shop data source</dt>
        <dd data-testid="shop-data-source">{{ runtime.shopDataSource }}</dd>
      </div>
      <div>
        <dt>Auth data source</dt>
        <dd data-testid="auth-data-source">{{ runtime.authDataSource }}</dd>
      </div>
      <div>
        <dt>HTTP timeout</dt>
        <dd>{{ runtime.httpTimeoutMs }} ms</dd>
      </div>
    </dl>
  </section>
</template>
