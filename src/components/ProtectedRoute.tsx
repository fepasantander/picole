import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../types/database'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export function getHomePathForRole(role: UserRole): string {
  if (role === 'superadmin') return '/superadmin/sorveterias'
  if (role === 'sorveteria') return '/sorveteria/jornadas'
  return '/app'
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, perfil, sorveteria, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-6">
        <Loader2 className="h-10 w-10 animate-spin text-ocean-700" />
        <p className="text-base font-bold text-slate-700">Carregando sessão...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (!perfil) {
    return <Navigate to="/aguardando-aprovacao" replace />
  }

  // Bloqueio operacional se a sorveteria estiver desligada (ativo = false)
  if (perfil.role !== 'superadmin' && sorveteria && sorveteria.ativo === false) {
    return <Navigate to="/aguardando-aprovacao" replace />
  }

  if (perfil.role !== 'superadmin' && perfil.status_aprovacao !== 'aprovado') {
    return <Navigate to="/aguardando-aprovacao" replace />
  }

  if (allowedRoles && !allowedRoles.includes(perfil.role)) {
    return <Navigate to={getHomePathForRole(perfil.role)} replace />
  }

  return <>{children}</>
}
