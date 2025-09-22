/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_AUTH_TIMEOUT: string
  readonly VITE_LOADING_TIMEOUT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
