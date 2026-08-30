export interface HealthSnapshotInput {
  buildSha?: string
  mode: string
  vueVersion: string
}

export interface HealthSnapshot {
  buildSha: string
  mode: string
  status: 'ok'
  vueVersion: string
}

export function createHealthSnapshot(input: HealthSnapshotInput): HealthSnapshot {
  return {
    buildSha: input.buildSha || 'local',
    mode: input.mode,
    status: 'ok',
    vueVersion: input.vueVersion,
  }
}
