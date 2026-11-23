import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Perfil, Sorveteria } from '../types/database'

interface AuthContextValue {
  session: Session | null
  user: User | null
  perfil: Perfil | null
  sorveteria: Sorveteria | null
  loading: boolean
  refreshPerfil: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [sorveteria, setSorveteria] = useState<Sorveteria | null>(null)
  const [loading, setLoading] = useState(true)

  const loadPerfil = useCallback(async (userId: string) => {
    const { data: perfilData, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Erro ao carregar perfil:', error)
      setPerfil(null)
      setSorveteria(null)
      return
    }

    const typedPerfil = (perfilData as Perfil | null) ?? null
    setPerfil(typedPerfil)

    if (typedPerfil?.sorveteria_id) {
      const { data: sorvData } = await supabase
        .from('sorveterias')
        .select('*')
        .eq('id', typedPerfil.sorveteria_id)
        .maybeSingle()
      setSorveteria((sorvData as Sorveteria | null) ?? null)
    } else {
      setSorveteria(null)
    }
  }, [])

  const refreshPerfil = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session?.user) {
      await loadPerfil(data.session.user.id)
    }
  }, [loadPerfil])

  useEffect(() => {
    let active = true

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return
        setSession(data.session)
        if (data.session?.user) {
          await loadPerfil(data.session.user.id)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession?.user) {
        setLoading(true)
        loadPerfil(nextSession.user.id).finally(() => {
          if (active) setLoading(false)
        })
      } else {
        setPerfil(null)
        setSorveteria(null)
        setLoading(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [loadPerfil])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setPerfil(null)
    setSorveteria(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        perfil,
        sorveteria,
        loading,
        refreshPerfil,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return ctx
}
