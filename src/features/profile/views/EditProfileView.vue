<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { onBeforeRouteLeave, RouterLink, useRouter } from 'vue-router'
import type { ProfileGender } from '@/domain/profile/profile'
import { useAuthStore } from '@/features/auth/store/auth'
import { useProfileStore } from '@/features/profile/store/profile'
import { ROUTE_NAMES } from '@/router'
import '@/features/profile/profile.css'

defineOptions({ name: 'EditProfileView' })

const router = useRouter()
const auth = useAuthStore()
const profileStore = useProfileStore()
const { session } = storeToRefs(auth)
const { draft, error, fieldErrors, isDirty, status } = storeToRefs(profileStore)
let controller: AbortController | undefined
let allowLeave = false
let redirectingToLogin = false

const displayName = computed({
  get: () => draft.value?.displayName ?? '',
  set: (value: string) => profileStore.updateDraft({ displayName: value }),
})
const handle = computed({
  get: () => draft.value?.handle ?? '',
  set: (value: string) => profileStore.updateDraft({ handle: value }),
})
const bio = computed({
  get: () => draft.value?.bio ?? '',
  set: (value: string) => profileStore.updateDraft({ bio: value }),
})
const age = computed({
  get: () => draft.value?.age?.toString() ?? '',
  set: (value: string) =>
    profileStore.updateDraft({ age: value.trim() === '' ? null : Number(value) }),
})
const gender = computed({
  get: () => draft.value?.gender ?? 'unspecified',
  set: (value: ProfileGender) => profileStore.updateDraft({ gender: value }),
})
const province = computed({
  get: () => draft.value?.province ?? '',
  set: (value: string) => profileStore.updateDraft({ province: value }),
})
const city = computed({
  get: () => draft.value?.city ?? '',
  set: (value: string) => profileStore.updateDraft({ city: value }),
})
const school = computed({
  get: () => draft.value?.school ?? '',
  set: (value: string) => profileStore.updateDraft({ school: value || null }),
})
const saving = computed(() => status.value === 'saving')

async function redirectToLogin() {
  if (redirectingToLogin) return
  redirectingToLogin = true
  allowLeave = true
  if (auth.session) auth.signOut()
  await router.replace({
    name: ROUTE_NAMES.authPassword,
    query: { redirect: '/me/edit-userinfo' },
  })
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

async function save() {
  if (!session.value) return
  controller?.abort()
  controller = new AbortController()
  const result = await profileStore.save(session.value, { signal: controller.signal })
  if (result.ok) {
    allowLeave = true
    await router.replace({ name: ROUTE_NAMES.profile })
  } else if (result.error.kind === 'unauthorized') {
    await redirectToLogin()
  }
}

watch(session, (value) => {
  if (!value) void redirectToLogin()
})
onMounted(() => load())
onBeforeUnmount(() => controller?.abort())
onBeforeRouteLeave(() =>
  allowLeave || !isDirty.value ? true : window.confirm('资料尚未保存，确定离开吗？'),
)
</script>

<template>
  <section class="profile-edit-page" aria-labelledby="edit-profile-title">
    <header class="profile-edit-heading">
      <div>
        <p class="eyebrow">Optimistic versioned update</p>
        <h1 id="edit-profile-title">编辑资料</h1>
        <p>修改保持在 draft，保存时携带 expectedVersion；409 不会覆盖本地输入。</p>
      </div>
      <RouterLink class="shop-back" :to="{ name: ROUTE_NAMES.profile }">← 返回资料</RouterLink>
    </header>

    <div v-if="status === 'idle' || status === 'loading'" class="profile-state">
      <h2>正在加载资料…</h2>
    </div>

    <form v-else-if="draft" class="profile-form" novalidate @submit.prevent="save">
      <div class="profile-form-status">
        <span :class="{ dirty: isDirty }">{{ isDirty ? '有未保存修改' : '已与服务器同步' }}</span>
        <span v-if="status === 'saving'">保存中…</span>
      </div>

      <div class="profile-form-grid">
        <label>
          <span>名字</span>
          <input v-model="displayName" name="displayName" autocomplete="name" />
          <small v-if="fieldErrors.displayName">{{ fieldErrors.displayName }}</small>
        </label>
        <label>
          <span>抖音号</span>
          <input v-model="handle" name="handle" autocomplete="username" />
          <small v-if="fieldErrors.handle">{{ fieldErrors.handle }}</small>
        </label>
        <label class="profile-form-wide">
          <span>个人简介</span>
          <textarea v-model="bio" name="bio" rows="4"></textarea>
          <small v-if="fieldErrors.bio">{{ fieldErrors.bio }}</small>
        </label>
        <label>
          <span>性别</span>
          <select v-model="gender" name="gender">
            <option value="unspecified">未设置</option>
            <option value="female">女</option>
            <option value="male">男</option>
          </select>
        </label>
        <label>
          <span>年龄</span>
          <input v-model="age" name="age" type="number" min="0" max="120" />
          <small v-if="fieldErrors.age">{{ fieldErrors.age }}</small>
        </label>
        <label>
          <span>省份</span>
          <input v-model="province" name="province" />
          <small v-if="fieldErrors.province">{{ fieldErrors.province }}</small>
        </label>
        <label>
          <span>城市</span>
          <input v-model="city" name="city" />
          <small v-if="fieldErrors.city">{{ fieldErrors.city }}</small>
        </label>
        <label class="profile-form-wide">
          <span>学校</span>
          <input v-model="school" name="school" placeholder="可选" />
          <small v-if="fieldErrors.school">{{ fieldErrors.school }}</small>
        </label>
      </div>

      <div v-if="status === 'conflict'" class="profile-save-error" role="alert">
        <strong>保存冲突</strong>
        <span>{{ error?.message }}</span>
        <button type="button" @click="load(true)">重新加载服务器版本</button>
      </div>
      <div v-else-if="status === 'error' && error" class="profile-save-error" role="alert">
        <strong>保存失败</strong>
        <span>{{ error.message }}</span>
      </div>

      <div class="profile-form-actions">
        <button type="button" :disabled="!isDirty || saving" @click="profileStore.resetDraft">
          放弃修改
        </button>
        <button class="profile-save-button" type="submit" :disabled="!isDirty || saving">
          {{ saving ? '保存中…' : '保存资料' }}
        </button>
      </div>
    </form>
  </section>
</template>
