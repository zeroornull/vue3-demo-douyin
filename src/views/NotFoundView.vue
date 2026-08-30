<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="health" aria-labelledby="not-found-title">
    <div class="section-heading">
      <p class="eyebrow">404 · Not found</p>
      <h1 id="not-found-title">这个页面还没有迁移。</h1>
      <p>当前现代基座只开放迁移概览和运行状态；旧业务仍保存在本地 legacy 快照。</p>
    </div>

    <RouterLink class="primary-action" to="/">返回迁移概览</RouterLink>
  </section>
</template>
