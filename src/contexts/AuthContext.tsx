import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Perfil, Sorveteria, SorveteriaUnidade } from '../types/database'

interface AuthContextValue {
  session: Session | null
  user: User | null
  perfil: Perfil | null
  sorveteria: Sorveteria | null
  unidade: SorveteriaUnidade | null
  loading: boolean
  refreshPerfil: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [sorveteria, setSorveteria] = useState<Sorveteria | null>(null)
  const [unidade, setUnidade] = useState<SorveteriaUnidade | null>(null)
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
      setUnidade(null)
      return
    }

    const typedPerfil = (perfilData as Perfil | null) ?? null
    setPerfil(typedPerfil)

    const [sorvRes, unidRes] = await Promise.all([
      typedPerfil?.sorveteria_id
        ? supabase
            .from('sorveterias')
            .select('*')
            .eq('id', typedPerfil.sorveteria_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      typedPerfil?.unidade_id
        ? supabase
            .from('sorveteria_unidades')
            .select('*')
            .eq('id', typedPerfil.unidade_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    setSorveteria((sorvRes.data as Sorveteria | null) ?? null)
    setUnidade((unidRes.data as SorveteriaUnidade | null) ?? null)
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
        setUnidade(null)
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
    setUnidade(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        perfil,
        sorveteria,
        unidade,
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
