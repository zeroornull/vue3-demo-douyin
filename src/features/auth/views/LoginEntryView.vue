<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { DEMO_PASSWORD, DEMO_PHONE } from '@/features/auth/api/fixture-auth-gateway'
import { ROUTE_NAMES } from '@/router'
import '@/features/auth/auth.css'

defineOptions({ name: 'LoginEntryView' })
</script>

<template>
  <section class="auth-page" aria-labelledby="login-title">
    <div class="auth-intro">
      <p class="eyebrow">Round 4A · Authentication slice</p>
      <h1 id="login-title">登录看朋友内容</h1>
      <p>
        本纵切迁移旧登录入口和密码登录，同时移除未勾选协议时永不完成的
        Promise。验证码、找回密码和社交登录将在后续批次迁移。
      </p>
    </div>

    <div class="auth-card">
      <p class="auth-card-label">演示账号</p>
      <dl class="auth-demo-credentials">
        <div>
          <dt>手机号</dt>
          <dd>
            <code>{{ DEMO_PHONE }}</code>
          </dd>
        </div>
        <div>
          <dt>密码</dt>
          <dd>
            <code>{{ DEMO_PASSWORD }}</code>
          </dd>
        </div>
      </dl>

      <RouterLink
        class="auth-primary-action"
        :to="{ name: ROUTE_NAMES.authPassword, query: { redirect: '/shop' } }"
      >
        使用手机号和密码登录
      </RouterLink>

      <p class="auth-footnote">
        默认开发使用内存 fixture；E2E 构建使用 Axios HTTP Gateway。两种 adapter 共享同一
        AuthGateway。
      </p>
    </div>
  </section>
</template>
