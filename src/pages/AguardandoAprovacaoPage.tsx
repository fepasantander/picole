import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, Clock, LogOut, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function AguardandoAprovacaoPage() {
  const { user, perfil, sorveteria, refreshPerfil, signOut } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    if (perfil?.role === 'sorveteria') {
      navigate('/sorveteria/jornadas', { replace: true })
      return
    }
    if (perfil?.status_aprovacao === 'aprovado') {
      navigate('/app', { replace: true })
    }
  }, [user, perfil, navigate])

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
            isBlocked ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {isBlocked ? <Ban className="h-9 w-9" /> : <Clock className="h-9 w-9" />}
        </div>

        <h1 className="text-2xl font-extrabold text-slate-950">
          {isBlocked ? 'Acesso bloqueado' : 'Aguardando aprovação'}
        </h1>

        <p className="mt-2 text-base text-slate-700">
          {isBlocked ? (
            <>
              Seu vínculo com a sorveteria{' '}
              <strong>{sorveteria?.nome || 'vinculada'}</strong> está bloqueado no momento. Entre em
              contato diretamente com o responsável pela sorveteria.
            </>
          ) : (
            <>
              Olá, <strong>{perfil?.nome || 'sorveteiro'}</strong>! Seu cadastro está aguardando
              aprovação da sorveteria{' '}
              <strong>{sorveteria?.nome || 'selecionada'}</strong>. Assim que for aprovado, você
              poderá iniciar suas jornadas.
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
            <span>{checking ? 'Verificando...' : 'Verificar aprovação novamente'}</span>
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
