import type { ProfileGender, UserProfile } from '@/domain/profile/profile'
import { failure, success, type AppResult } from '@/shared/result'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function string(value: unknown): value is string {
  return typeof value === 'string'
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === 'number' && value >= 0
}

function gender(value: unknown): value is ProfileGender {
  return value === 'female' || value === 'male' || value === 'unspecified'
}

export function parseUserProfile(input: unknown): AppResult<UserProfile> {
  if (!isRecord(input) || !isRecord(input.profile) || !isRecord(input.stats)) {
    return failure({ kind: 'parse', message: '资料响应缺少 profile 或 stats。' })
  }
  const profile = input.profile
  const stats = input.stats
  const errors: string[] = []
  if (!string(profile.userId) || !profile.userId) errors.push('profile.userId')
  if (!string(profile.displayName) || !profile.displayName) errors.push('profile.displayName')
  if (!string(profile.handle)) errors.push('profile.handle')
  if (!string(profile.bio)) errors.push('profile.bio')
  if (!gender(profile.gender)) errors.push('profile.gender')
  if (!string(profile.province)) errors.push('profile.province')
  if (!string(profile.city)) errors.push('profile.city')
  if (profile.school !== null && !string(profile.school)) errors.push('profile.school')
  if (profile.age !== null && !nonNegativeInteger(profile.age)) errors.push('profile.age')
  for (const key of ['likes', 'friends', 'following', 'followers', 'posts'] as const) {
    if (!nonNegativeInteger(stats[key])) errors.push(`stats.${key}`)
  }
  if (!nonNegativeInteger(input.version) || input.version < 1) errors.push('version')
  if (errors.length) {
    return failure({
      kind: 'parse',
      message: '资料响应字段无效。',
      details: errors,
    })
  }

  return success(
    Object.freeze({
      userId: profile.userId as string,
      displayName: profile.displayName as string,
      handle: profile.handle as string,
      bio: profile.bio as string,
      age: profile.age as number | null,
      gender: profile.gender as ProfileGender,
      province: profile.province as string,
      city: profile.city as string,
      school: profile.school as string | null,
      stats: Object.freeze({
        likes: stats.likes as number,
        friends: stats.friends as number,
        following: stats.following as number,
        followers: stats.followers as number,
        posts: stats.posts as number,
      }),
      version: input.version as number,
    }),
  )
}
