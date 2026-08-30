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
        第 0 轮锁定了旧项目的行为、缺陷和资源；第 1
        轮只建立现代工具链和最小应用壳，不复制旧业务代码。
      </p>

      <div class="actions">
        <RouterLink class="primary-action" to="/health">查看运行状态</RouterLink>
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
      <p class="eyebrow">Round 1 contract</p>
      <h2 id="principles-title">这层基座只证明三件事</h2>
    </div>

    <ol class="principle-grid">
      <li>
        <span>01</span>
        <h3>依赖可复现</h3>
        <p>Bun 文本锁文件进入版本控制，CI 使用冻结安装。</p>
      </li>
      <li>
        <span>02</span>
        <h3>严格类型可持续</h3>
        <p>Vue SFC、Router、Pinia 和测试共用严格 TypeScript 边界。</p>
      </li>
      <li>
        <span>03</span>
        <h3>验证不修改源码</h3>
        <p>格式、lint、类型、测试和构建都提供只读检查命令。</p>
      </li>
    </ol>
  </section>
</template>
