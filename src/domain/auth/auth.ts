declare const phoneNumberBrand: unique symbol

export type PhoneNumber = string & { readonly [phoneNumberBrand]: 'PhoneNumber' }

export interface AuthCredentials {
  readonly password: string
  readonly phone: PhoneNumber
}

export interface AuthSession {
  readonly accessToken: string
  readonly displayName: string
  readonly userId: string
}

export function parseChinaPhone(value: unknown): PhoneNumber | null {
  if (typeof value !== 'string') return null
  const normalized = value
    .trim()
    .replace(/[\s-]/g, '')
    .replace(/^\+?86/, '')
  return /^1[3-9]\d{9}$/.test(normalized) ? (normalized as PhoneNumber) : null
}

export function maskPhone(phone: PhoneNumber): string {
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}
