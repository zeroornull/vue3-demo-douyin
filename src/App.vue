<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">跳到主要内容</a>

    <header class="app-header">
      <div>
        <p class="eyebrow">Douyin Web Migration</p>
        <p class="brand">现代化迁移工作区</p>
      </div>

      <nav aria-label="主要导航">
        <RouterLink to="/">迁移概览</RouterLink>
        <RouterLink to="/health">运行状态</RouterLink>
      </nav>
    </header>

    <main id="main-content">
      <RouterView />
    </main>

    <footer class="app-footer">
      <span>当前只包含现代 Vue 基座，不导入 legacy 业务代码。</span>
      <span>迁移文档位于仓库 <code>docs/</code>。</span>
    </footer>
  </div>
</template>
