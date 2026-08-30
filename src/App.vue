<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { RouterLink, RouterView } from 'vue-router'
import { useNavigationStore } from '@/stores/navigation'

const navigation = useNavigationStore()
const { keepAliveNames, transitionName } = storeToRefs(navigation)
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
        <RouterLink to="/shop">商品样板</RouterLink>
        <RouterLink to="/health">运行状态</RouterLink>
      </nav>
    </header>

    <main id="main-content">
      <RouterView v-slot="{ Component, route }">
        <Transition :name="transitionName" mode="out-in">
          <KeepAlive :include="[...keepAliveNames]">
            <component :is="Component" :key="route.fullPath" />
          </KeepAlive>
        </Transition>
      </RouterView>
    </main>

    <footer class="app-footer">
      <span>当前包含现代基座和严格类型的 Shop 样板，不导入 legacy 运行时代码。</span>
      <span>迁移文档位于仓库 <code>docs/</code>。</span>
    </footer>
  </div>
</template>
