import { describe, expect, it } from 'vitest'
import { formatProfileCount, profileInitials, profileToDraft } from '@/domain/profile/profile'
import { createFixtureProfileGateway } from '@/features/profile/api/fixture-profile-gateway'
import { fixtureAuthGateway } from '@/features/auth/api/fixture-auth-gateway'
import { parseChinaPhone } from '@/domain/auth/auth'

describe('profile domain', () => {
  it('creates deterministic initials and compact counts', () => {
    expect(profileInitials('杨老虎')).toBe('杨老')
    expect(profileInitials('')).toBe('ME')
    expect(formatProfileCount(1_735_334)).toMatch(/173\.5万|174万/)
  })

  it('creates an editable draft without stats/version', async () => {
    const phone = parseChinaPhone('13800138000')
    if (!phone) throw new Error('phone must be valid')
    const auth = await fixtureAuthGateway.signIn({ phone, password: 'douyin-demo' })
    if (!auth.ok) throw new Error(auth.error.message)
    const result = await createFixtureProfileGateway().getCurrent(auth.data)
    if (!result.ok) throw new Error(result.error.message)

    expect(profileToDraft(result.data)).not.toHaveProperty('stats')
    expect(profileToDraft(result.data)).not.toHaveProperty('version')
  })
})
