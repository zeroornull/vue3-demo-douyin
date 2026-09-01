<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { FeedId } from '@/domain/feed/feed'
import { buildShareUrl, type ReportReason } from '@/domain/moderation/moderation'
import { useAuthStore } from '@/features/auth/store/auth'
import { fixtureReportGateway } from '@/features/moderation/api/fixture-report-gateway'
import { createHttpReportGateway } from '@/features/moderation/api/http-report-gateway'
import { validateReport } from '@/features/moderation/validation'
import { getRuntimeConfig } from '@/config/runtime'
import { createAxiosHttpClient } from '@/infrastructure/http/http-client'
import type { AppError } from '@/shared/result'
import '@/features/moderation/moderation.css'
const props = defineProps<{ feedId: FeedId }>()
const auth = useAuthStore()
const { session } = storeToRefs(auth)
const reason = ref<ReportReason | 'selected'>('selected')
const description = ref('')
const status = ref<'idle' | 'submitting' | 'success' | 'error'>('idle')
const error = ref<AppError | null>(null)
const copyStatus = ref('')
async function copy() {
  const url = buildShareUrl(window.location.origin, props.feedId)
  try {
    await navigator.clipboard.writeText(url)
  } catch {
    const area = document.createElement('textarea')
    area.value = url
    document.body.append(area)
    area.select()
    document.execCommand('copy')
    area.remove()
  }
  copyStatus.value = '链接已复制'
}
async function submit() {
  if (!session.value) {
    error.value = { kind: 'unauthorized', message: '请先登录再举报。' }
    status.value = 'error'
    return
  }
  const valid = validateReport({ reason: reason.value, description: description.value })
  if (!valid.ok) {
    error.value = valid.error
    status.value = 'error'
    return
  }
  status.value = 'submitting'
  error.value = null
  const config = getRuntimeConfig()
  const gateway =
    config.feedDataSource === 'fixture'
      ? fixtureReportGateway
      : createHttpReportGateway(
          createAxiosHttpClient({ baseUrl: config.apiBaseUrl, timeoutMs: config.httpTimeoutMs }),
        )
  const result = await gateway.submit(session.value, props.feedId, valid.data)
  if (result.ok) {
    status.value = 'success'
    description.value = ''
  } else {
    status.value = 'error'
    error.value = result.error
    if (result.error.kind === 'unauthorized') auth.signOut()
  }
}
</script>
<template>
  <section class="share-report">
    <h2>分享与举报</h2>
    <div class="share-row">
      <button type="button" @click="copy">复制内容链接</button
      ><span aria-live="polite">{{ copyStatus }}</span>
    </div>
    <form @submit.prevent="submit">
      <label
        >举报原因<select v-model="reason">
          <option value="selected" disabled>请选择</option>
          <option value="spam">垃圾广告</option>
          <option value="misinformation">不实信息</option>
          <option value="harassment">侮辱骚扰</option>
          <option value="fraud">涉嫌欺诈</option>
          <option value="illegal">违法内容</option>
          <option value="other">其他</option>
        </select></label
      ><label>补充说明<textarea v-model="description" maxlength="500" rows="3"></textarea></label
      ><button type="submit" :disabled="status === 'submitting'">
        {{ status === 'submitting' ? '提交中…' : '提交举报' }}
      </button>
    </form>
    <p v-if="status === 'success'" role="status">举报已受理。</p>
    <p v-if="error" role="alert">{{ error.message }}</p>
  </section>
</template>
