<script setup lang="ts">
import { ref } from 'vue'
import { parseChinaPhone } from '@/domain/auth/auth'
import { getAuthChallengeGateway } from '@/features/auth/api/auth-challenge-provider'
import type { AppError } from '@/shared/result'
import '@/features/auth/auth.css'
const phone = ref('13800138000'),
  code = ref(''),
  password = ref(''),
  challengeId = ref(''),
  done = ref(false),
  error = ref<AppError | null>(null),
  busy = ref(false)
async function request() {
  const parsed = parseChinaPhone(phone.value)
  if (!parsed) {
    error.value = { kind: 'validation', message: '请输入有效手机号。' }
    return
  }
  busy.value = true
  const r = await getAuthChallengeGateway().requestReset(parsed)
  busy.value = false
  if (r.ok) {
    challengeId.value = r.data.id
    error.value = null
  } else error.value = r.error
}
async function reset() {
  if (!challengeId.value) {
    error.value = { kind: 'validation', message: '请先发送验证码。' }
    return
  }
  if (password.value.length < 8) {
    error.value = { kind: 'validation', message: '新密码至少 8 个字符。' }
    return
  }
  busy.value = true
  const r = await getAuthChallengeGateway().resetPassword(
    challengeId.value,
    code.value,
    password.value,
  )
  busy.value = false
  if (r.ok) {
    done.value = true
    password.value = ''
    error.value = null
  } else error.value = r.error
}
</script>
<template>
  <section class="auth-page">
    <div class="auth-intro">
      <p class="eyebrow">Password reset</p>
      <h1>重置密码</h1>
      <p>验证码挑战和重置回执都从 unknown parser 开始。</p>
    </div>
    <div class="auth-card">
      <form class="auth-form" @submit.prevent="reset">
        <label class="auth-field">手机号<input v-model="phone" /></label
        ><button type="button" class="auth-primary-action" @click="request">发送重置验证码</button
        ><label class="auth-field">验证码<input v-model="code" /></label
        ><label class="auth-field">新密码<input v-model="password" type="password" /></label
        ><button class="auth-primary-action" type="submit" :disabled="busy">确认重置</button>
        <p v-if="done" role="status">密码已重置，请使用新密码登录。</p>
        <div v-if="error" class="auth-service-error" role="alert">{{ error.message }}</div>
      </form>
    </div>
  </section>
</template>
