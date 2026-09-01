<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { parseChinaPhone } from '@/domain/auth/auth'
import { getAuthChallengeGateway } from '@/features/auth/api/auth-challenge-provider'
import { useAuthStore } from '@/features/auth/store/auth'
import { ROUTE_NAMES } from '@/router'
import type { AppError } from '@/shared/result'
import '@/features/auth/auth.css'
const router = useRouter()
const auth = useAuthStore()
const phone = ref('13800138000')
const code = ref('')
const challengeId = ref('')
const retry = ref(0)
const error = ref<AppError | null>(null)
const busy = ref(false)
let timer: number | undefined
function start() {
  retry.value = 60
  timer = window.setInterval(() => {
    retry.value -= 1
    if (retry.value <= 0 && timer) window.clearInterval(timer)
  }, 1000)
}
async function request() {
  const parsed = parseChinaPhone(phone.value)
  if (!parsed) {
    error.value = { kind: 'validation', message: '请输入有效手机号。' }
    return
  }
  busy.value = true
  const r = await getAuthChallengeGateway().requestCode(parsed)
  busy.value = false
  if (r.ok) {
    challengeId.value = r.data.id
    error.value = null
    start()
  } else error.value = r.error
}
async function verify() {
  if (!challengeId.value || !/^[0-9]{4,6}$/.test(code.value)) {
    error.value = { kind: 'validation', message: '请输入 4–6 位验证码。' }
    return
  }
  busy.value = true
  const r = await getAuthChallengeGateway().signIn(challengeId.value, code.value)
  busy.value = false
  if (r.ok) {
    auth.acceptSession(r.data)
    await router.push({ name: ROUTE_NAMES.homeFeed })
  } else error.value = r.error
}
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>
<template>
  <section class="auth-page">
    <div class="auth-intro">
      <p class="eyebrow">SMS challenge</p>
      <h1>验证码登录</h1>
      <p>Fixture 验证码为 2468；真实 HTTP 模式不会把验证码写入页面。</p>
    </div>
    <div class="auth-card">
      <form class="auth-form" @submit.prevent="verify">
        <label class="auth-field">手机号<input v-model="phone" name="phone" /></label
        ><button
          type="button"
          class="auth-primary-action"
          :disabled="busy || retry > 0"
          @click="request"
        >
          {{ retry > 0 ? `${retry}s 后重发` : '发送验证码' }}</button
        ><label class="auth-field"
          >验证码<input v-model="code" name="code" inputmode="numeric" /></label
        ><button class="auth-primary-action" :disabled="busy" type="submit">登录</button>
        <div v-if="error" class="auth-service-error" role="alert">{{ error.message }}</div>
      </form>
    </div>
  </section>
</template>
