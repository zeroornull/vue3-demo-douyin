/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_BUILD_SHA?: string
  readonly VITE_HTTP_TIMEOUT_MS?: string
  readonly VITE_SHOP_DATA_SOURCE?: 'fixture' | 'http'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
