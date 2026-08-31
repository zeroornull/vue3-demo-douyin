export interface AppRouteMeta extends Record<PropertyKey, unknown> {
  readonly migrationRound: 1 | 2 | 3 | 4
  readonly title: string
  readonly transition: 'back' | 'fade' | 'forward' | 'none'
  readonly keepAlive?: boolean
  readonly keepAliveName?: string
  readonly requiresAuth?: boolean
}

function isTransition(value: unknown): value is AppRouteMeta['transition'] {
  return value === 'back' || value === 'fade' || value === 'forward' || value === 'none'
}

export function defineRouteMeta(meta: AppRouteMeta): AppRouteMeta {
  return meta
}

export function parseRouteMeta(value: unknown): AppRouteMeta {
  if (typeof value !== 'object' || value === null) throw new Error('Route meta must be an object')
  if (!('title' in value) || typeof value.title !== 'string') {
    throw new Error('Route meta.title must be a string')
  }
  if (
    !('migrationRound' in value) ||
    (value.migrationRound !== 1 &&
      value.migrationRound !== 2 &&
      value.migrationRound !== 3 &&
      value.migrationRound !== 4)
  ) {
    throw new Error('Route meta.migrationRound must be 1, 2, 3, or 4')
  }
  if (!('transition' in value) || !isTransition(value.transition)) {
    throw new Error('Route meta.transition is invalid')
  }
  if ('keepAlive' in value && typeof value.keepAlive !== 'boolean') {
    throw new Error('Route meta.keepAlive must be a boolean')
  }
  if ('keepAliveName' in value && typeof value.keepAliveName !== 'string') {
    throw new Error('Route meta.keepAliveName must be a string')
  }
  if ('requiresAuth' in value && typeof value.requiresAuth !== 'boolean') {
    throw new Error('Route meta.requiresAuth must be a boolean')
  }

  return {
    title: value.title,
    migrationRound: value.migrationRound,
    transition: value.transition,
    ...('keepAlive' in value ? { keepAlive: value.keepAlive as boolean } : {}),
    ...('keepAliveName' in value ? { keepAliveName: value.keepAliveName as string } : {}),
    ...('requiresAuth' in value ? { requiresAuth: value.requiresAuth as boolean } : {}),
  }
}
