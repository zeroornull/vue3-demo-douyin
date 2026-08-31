<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRouter } from 'vue-router'
import { formatProfileCount, profileInitials } from '@/domain/profile/profile'
import { useAuthStore } from '@/features/auth/store/auth'
import { useProfileStore } from '@/features/profile/store/profile'
import { ROUTE_NAMES } from '@/router'
import '@/features/profile/profile.css'

defineOptions({ name: 'ProfileView' })

const router = useRouter()
const auth = useAuthStore()
const profileStore = useProfileStore()
const { session } = storeToRefs(auth)
const { error, profile, status } = storeToRefs(profileStore)
let controller: AbortController | undefined
let redirectingToLogin = false

const location = computed(() =>
  profile.value ? [profile.value.province, profile.value.city].filter(Boolean).join(' · ') : '',
)

async function redirectToLogin() {
  if (redirectingToLogin) return
  redirectingToLogin = true
  if (auth.session) auth.signOut()
  await router.replace({ name: ROUTE_NAMES.authPassword, query: { redirect: '/me' } })
}

async function load(force = false) {
  if (!session.value) return
  controller?.abort()
  controller = new AbortController()
  const result = await profileStore.load(session.value, { force, signal: controller.signal })
  if (!result.ok && result.error.kind === 'unauthorized') {
    await redirectToLogin()
  }
}

watch(session, (value) => {
  if (!value) void redirectToLogin()
})
onMounted(() => load())
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <section class="profile-page" aria-labelledby="profile-title">
    <div v-if="status === 'idle' || status === 'loading'" class="profile-state" aria-live="polite">
      <p class="eyebrow">Profile gateway</p>
      <h1 id="profile-title">正在加载个人资料…</h1>
    </div>

    <div v-else-if="status === 'error'" class="profile-state profile-state-error" role="alert">
      <p class="eyebrow">Profile error</p>
      <h1 id="profile-title">个人资料无法加载</h1>
      <p>{{ error?.message }}</p>
      <button type="button" @click="load(true)">重新加载</button>
    </div>

    <template v-else-if="profile">
      <header class="profile-hero">
        <div class="profile-avatar" aria-hidden="true">
          {{ profileInitials(profile.displayName) }}
        </div>
        <div class="profile-heading">
          <p class="eyebrow">Round 4B · Typed profile</p>
          <h1 id="profile-title">{{ profile.displayName }}</h1>
          <p class="profile-handle">@{{ profile.handle }}</p>
          <p class="profile-bio">{{ profile.bio || '还没有填写个人简介。' }}</p>
          <div class="profile-tags">
            <span v-if="profile.age !== null">{{ profile.age }} 岁</span>
            <span v-if="location">{{ location }}</span>
            <span v-if="profile.school">{{ profile.school }}</span>
          </div>
        </div>
        <RouterLink class="profile-edit-link" :to="{ name: ROUTE_NAMES.profileEdit }">
          编辑资料
        </RouterLink>
      </header>

      <dl class="profile-stats">
        <div>
          <dt>获赞</dt>
          <dd>{{ formatProfileCount(profile.stats.likes) }}</dd>
        </div>
        <div>
          <dt>朋友</dt>
          <dd>{{ formatProfileCount(profile.stats.friends) }}</dd>
        </div>
        <div>
          <dt>关注</dt>
          <dd>{{ formatProfileCount(profile.stats.following) }}</dd>
        </div>
        <div>
          <dt>粉丝</dt>
          <dd>{{ formatProfileCount(profile.stats.followers) }}</dd>
        </div>
        <div>
          <dt>作品</dt>
          <dd>{{ formatProfileCount(profile.stats.posts) }}</dd>
        </div>
      </dl>

      <section class="profile-boundary" aria-labelledby="profile-boundary-title">
        <p class="eyebrow">Migration boundary</p>
        <h2 id="profile-boundary-title">本批次只迁移资料核心</h2>
        <p>
          视频列表、侧栏、二维码、收藏和复杂滑动仍留在 legacy，等待各自纵切，而不是复制进 Profile。
        </p>
        <code>version={{ profile.version }}</code>
      </section>
    </template>
  </section>
</template>
