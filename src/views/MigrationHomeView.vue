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
        第 0 轮锁定旧行为，第 1 轮建立现代基座；第 2 轮用 Shop 样板证明 DTO、Domain、Router、Pinia
        和运行时解析可以形成严格边界。
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
      <p class="eyebrow">Round 2 contract</p>
      <h2 id="principles-title">这层基座只证明三件事</h2>
    </div>

    <ol class="principle-grid">
      <li>
        <span>01</span>
        <h3>外部输入先验证</h3>
        <p>Legacy fixture 以 unknown 进入 parser，通过后才成为 Domain model。</p>
      </li>
      <li>
        <span>02</span>
        <h3>URL 是详情真相</h3>
        <p>稳定 productId 进入 URL，刷新和深链不再依赖全局内存对象。</p>
      </li>
      <li>
        <span>03</span>
        <h3>失败状态可区分</h3>
        <p>加载、空、解析错误、取消和 not-found 由判别联合与测试覆盖。</p>
      </li>
    </ol>
  </section>
</template>
