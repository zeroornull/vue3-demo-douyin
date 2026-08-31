export type ProfileGender = 'female' | 'male' | 'unspecified'

export interface ProfileStats {
  readonly followers: number
  readonly following: number
  readonly friends: number
  readonly likes: number
  readonly posts: number
}

export interface UserProfile {
  readonly age: number | null
  readonly bio: string
  readonly city: string
  readonly displayName: string
  readonly gender: ProfileGender
  readonly handle: string
  readonly province: string
  readonly school: string | null
  readonly stats: ProfileStats
  readonly userId: string
  readonly version: number
}

export interface ProfileDraft {
  readonly age: number | null
  readonly bio: string
  readonly city: string
  readonly displayName: string
  readonly gender: ProfileGender
  readonly handle: string
  readonly province: string
  readonly school: string | null
}

export function profileToDraft(profile: UserProfile): ProfileDraft {
  return {
    age: profile.age,
    bio: profile.bio,
    city: profile.city,
    displayName: profile.displayName,
    gender: profile.gender,
    handle: profile.handle,
    province: profile.province,
    school: profile.school,
  }
}

export function profileInitials(displayName: string): string {
  return [...displayName.trim()].slice(0, 2).join('').toUpperCase() || 'ME'
}

export function formatProfileCount(value: number): string {
  return new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  )
}
