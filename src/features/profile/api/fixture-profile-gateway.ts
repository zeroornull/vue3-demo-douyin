import type { UserProfile } from '@/domain/profile/profile'
import type { ProfileGateway } from './profile-gateway'
import { abortedFailure, failure, success } from '@/shared/result'

export function createFixtureProfileGateway(
  initial: UserProfile = {
    userId: 'demo-user',
    displayName: '杨老虎🐯',
    handle: '12345xiaolaohu',
    bio: '每晚 12:00 直播。韩舞业余，专业蹦迪！',
    age: 27,
    gender: 'female',
    province: '广东',
    city: '珠海',
    school: null,
    stats: {
      likes: 10_295_529,
      friends: 3_778,
      following: 3_778,
      followers: 1_735_334,
      posts: 124,
    },
    version: 1,
  },
): ProfileGateway {
  let profile = initial

  function authorized(userId: string) {
    return userId === profile.userId
  }

  return {
    async getCurrent(session, options) {
      await Promise.resolve()
      if (options?.signal?.aborted) return abortedFailure()
      return authorized(session.userId)
        ? success(profile)
        : failure({ kind: 'unauthorized', message: '登录已失效。', status: 401 })
    },

    async update(session, draft, expectedVersion, options) {
      await Promise.resolve()
      if (options?.signal?.aborted) return abortedFailure()
      if (!authorized(session.userId)) {
        return failure({ kind: 'unauthorized', message: '登录已失效。', status: 401 })
      }
      if (expectedVersion !== profile.version) {
        return failure({
          kind: 'conflict',
          message: '资料已被其他设备更新，请重新加载。',
          status: 409,
        })
      }
      profile = Object.freeze({
        ...profile,
        ...draft,
        version: profile.version + 1,
      })
      return success(profile)
    },
  }
}

export const fixtureProfileGateway = createFixtureProfileGateway()
