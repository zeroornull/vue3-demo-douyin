import { describe, expect, it } from 'vitest'
import { createHealthSnapshot } from '@/lib/health'

describe('createHealthSnapshot', () => {
  it('uses an explicit build SHA', () => {
    expect(
      createHealthSnapshot({ buildSha: 'abc123', mode: 'test', vueVersion: '3.5.42' }),
    ).toEqual({
      buildSha: 'abc123',
      mode: 'test',
      status: 'ok',
      vueVersion: '3.5.42',
    })
  })

  it('uses local when no build SHA is available', () => {
    expect(createHealthSnapshot({ mode: 'test', vueVersion: '3.5.42' }).buildSha).toBe('local')
  })
})
