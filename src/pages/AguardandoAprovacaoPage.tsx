import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, Clock, LogOut, PowerOff, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getHomePathForRole } from '../components/ProtectedRoute'

export function AguardandoAprovacaoPage() {
  const { user, perfil, sorveteria, refreshPerfil, signOut } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)

  const isUnitDisabled = Boolean(
    perfil && perfil.role !== 'superadmin' && sorveteria && sorveteria.ativo === false
  )

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    if (perfil?.role === 'superadmin') {
      navigate(getHomePathForRole('superadmin'), { replace: true })
      return
    }
    if (perfil && !isUnitDisabled && perfil.status_aprovacao === 'aprovado') {
      navigate(getHomePathForRole(perfil.role), { replace: true })
    }
  }, [user, perfil, isUnitDisabled, navigate])

  const handleCheck = async () => {
    setChecking(true)
    await refreshPerfil()
    setChecking(false)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const isBlocked = perfil?.status_aprovacao === 'bloqueado'

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="card w-full max-w-md p-6 text-center shadow-lg">
        <div
          className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
            isUnitDisabled || isBlocked
              ? 'bg-red-100 text-red-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {isUnitDisabled ? (
            <PowerOff className="h-9 w-9" />
          ) : isBlocked ? (
            <Ban className="h-9 w-9" />
          ) : (
            <Clock className="h-9 w-9" />
          )}
        </div>

        <h1 className="text-2xl font-extrabold text-slate-950">
          {isUnitDisabled
            ? 'Unidade temporariamente desativada'
            : isBlocked
              ? 'Acesso bloqueado'
              : 'Aguardando aprovação'}
        </h1>

        <p className="mt-2 text-base text-slate-700">
          {isUnitDisabled ? (
            <>
              O acesso operacional da sorveteria{' '}
              <strong>{sorveteria?.nome || 'vinculada'}</strong> está desativado no momento. Entre
              em contato com a administração da plataforma para regularizar e reativar a unidade.
            </>
          ) : isBlocked ? (
            <>
              Seu vínculo com a sorveteria{' '}
              <strong>{sorveteria?.nome || 'vinculada'}</strong> está bloqueado no momento. Entre em
              contato diretamente com o responsável pela sorveteria.
            </>
          ) : (
            <>
              Olá, <strong>{perfil?.nome || 'usuário'}</strong>! Seu cadastro está aguardando
              aprovação da sorveteria{' '}
              <strong>{sorveteria?.nome || 'selecionada'}</strong>. Assim que for aprovado, você
              poderá utilizar o sistema normalmente.
            </>
          )}
        </p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleCheck}
            disabled={checking}
            className="btn-primary w-full"
          >
            <RefreshCw className={`h-5 w-5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Verificando...' : 'Verificar status novamente'}</span>
          </button>

          <button type="button" onClick={handleSignOut} className="btn-secondary w-full">
            <LogOut className="h-5 w-5" />
            <span>Sair da conta</span>
          </button>
        </div>
      </div>
    </div>
  )
}
