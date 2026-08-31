<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/store/auth'
import { resolveAuthRedirect } from '@/features/auth/validation'
import { ROUTE_NAMES } from '@/router'
import '@/features/auth/auth.css'

defineOptions({ name: 'PasswordLoginView' })

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { error, fieldErrors, status } = storeToRefs(auth)
const phone = ref('')
const password = ref('')
const agreed = ref(false)
const showPassword = ref(false)
let controller: AbortController | undefined

const submitting = computed(() => status.value === 'submitting')

async function submit() {
  controller?.abort()
  controller = new AbortController()
  const result = await auth.signIn(
    { phone: phone.value, password: password.value, agreed: agreed.value },
    { signal: controller.signal },
  )
  if (result.ok) {
    await router.replace(resolveAuthRedirect(route.query.redirect))
  }
}

onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <section class="auth-page" aria-labelledby="password-login-title">
    <div class="auth-intro">
      <p class="eyebrow">Typed credentials · No hanging promise</p>
      <h1 id="password-login-title">手机号密码登录</h1>
      <p>手机号、密码和协议分别校验；只有全部通过后才会调用 AuthGateway。</p>
      <RouterLink class="shop-back" :to="{ name: ROUTE_NAMES.authLogin }"
        >← 返回登录方式</RouterLink
      >
    </div>

    <form class="auth-card auth-form" novalidate @submit.prevent="submit">
      <div class="auth-field">
        <label for="auth-phone">手机号</label>
        <input
          id="auth-phone"
          v-model="phone"
          name="phone"
          type="tel"
          inputmode="tel"
          autocomplete="tel"
          placeholder="请输入手机号"
          :aria-invalid="Boolean(fieldErrors.phone)"
          :aria-describedby="fieldErrors.phone ? 'auth-phone-error' : undefined"
        />
        <p v-if="fieldErrors.phone" id="auth-phone-error" class="auth-field-error">
          {{ fieldErrors.phone }}
        </p>
      </div>

      <div class="auth-field">
        <label for="auth-password">密码</label>
        <div class="auth-password-input">
          <input
            id="auth-password"
            v-model="password"
            name="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            placeholder="请输入密码"
            :aria-invalid="Boolean(fieldErrors.password)"
            :aria-describedby="fieldErrors.password ? 'auth-password-error' : undefined"
          />
          <button
            type="button"
            class="auth-password-toggle"
            :aria-pressed="showPassword"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? '隐藏' : '显示' }}
          </button>
        </div>
        <p v-if="fieldErrors.password" id="auth-password-error" class="auth-field-error">
          {{ fieldErrors.password }}
        </p>
      </div>

      <label class="auth-agreement">
        <input v-model="agreed" type="checkbox" />
        <span>我已阅读并同意用户协议和隐私政策。</span>
      </label>
      <p v-if="fieldErrors.agreement" class="auth-field-error">
        {{ fieldErrors.agreement }}
      </p>

      <div v-if="status === 'error' && error" class="auth-service-error" role="alert">
        <strong>登录失败</strong>
        <span>{{ error.message }}</span>
      </div>

      <button class="auth-primary-action" type="submit" :disabled="submitting">
        {{ submitting ? '登录中…' : '登录' }}
      </button>
    </form>
  </section>
</template>
