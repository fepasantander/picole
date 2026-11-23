import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseAnonKey.includes('COLE_AQUI')
)

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'picole-romaneio-auth',
    },
  }
)

const memoryStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

let ephemeralClientInstance: ReturnType<typeof createClient> | null = null

/**
 * Cliente secundário sem persistência de sessão e com storageKey exclusivo
 * para permitir que o superadmin cadastre novos usuários (signUp) sem derrubar
 * sua própria sessão ativa e sem emitir aviso de múltiplos GoTrueClient.
 */
export function createEphemeralAuthClient() {
  if (!ephemeralClientInstance) {
    ephemeralClientInstance = createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-anon-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: 'picole-ephemeral-signup',
          storage: memoryStorage,
        },
      }
    )
  }
  return ephemeralClientInstance
}
