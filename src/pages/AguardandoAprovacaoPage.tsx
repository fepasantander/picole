import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Ban,
  Building2,
  Clock,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  PowerOff,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getHomePathForRole } from '../components/ProtectedRoute'
import { buildWhatsAppUrl } from '../lib/format'

export function AguardandoAprovacaoPage() {
  const { user, perfil, sorveteria, unidade, refreshPerfil, signOut } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)
  const [checkNotice, setCheckNotice] = useState<string | null>(null)

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
    setCheckNotice(null)
    await refreshPerfil()
    setChecking(false)
    setCheckNotice('Status verificado agora. Caso ainda esteja pendente, aguarde a liberação da sorveteria.')
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const isBlocked = perfil?.status_aprovacao === 'bloqueado'
  const isPending = !isUnitDisabled && !isBlocked
  const sorveteriaPhone =
    unidade?.whatsapp || sorveteria?.whatsapp || sorveteria?.responsavel_whatsapp || null
  const whatsAppUrl = sorveteriaPhone
    ? buildWhatsAppUrl(
        sorveteriaPhone,
        `Olá! Acabei de me cadastrar no app Picolé na Praia (e-mail: ${
          user?.email || ''
        }) e aguardo a aprovação do meu acesso.`
      )
    : null

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
              Seu cadastro como sorveteiro está aguardando liberação da{' '}
              <strong>{sorveteria?.nome || 'sorveteria vinculada'}</strong>.
            </>
          )}
        </p>

        {/* Identificação clara do e-mail logado e da sorveteria */}
        <div className="mt-4 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-left text-xs font-semibold text-slate-700">
          {user?.email && (
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-ocean-700" />
              <span className="truncate">
                E-mail logado: <strong className="text-slate-950">{user.email}</strong>
              </span>
            </p>
          )}
          <p className="flex items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0 text-ocean-700" />
            <span className="truncate">
              Sorveteria:{' '}
              <strong className="text-slate-950">{sorveteria?.nome || 'Não vinculada'}</strong>
            </span>
          </p>
          {unidade && (
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-ocean-700" />
              <span className="truncate">
                Unidade:{' '}
                <span className="rounded-md bg-ocean-100 px-2 py-0.5 text-[11px] font-extrabold text-ocean-900">
                  {unidade.nome}
                </span>
              </span>
            </p>
          )}
        </div>

        {checkNotice && (
          <div className="mt-3 rounded-xl border border-ocean-200 bg-ocean-50 px-3 py-2 text-xs font-bold text-ocean-900">
            {checkNotice}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleCheck}
            disabled={checking}
            className="btn-primary w-full"
          >
            <RefreshCw className={`h-5 w-5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Verificando...' : 'Verificar se já fui aprovado'}</span>
          </button>

          {isPending && whatsAppUrl && (
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp w-full"
            >
              <MessageCircle className="h-5 w-5" />
              <span>Pedir liberação no WhatsApp da Sorveteria</span>
            </a>
          )}

          <button type="button" onClick={handleSignOut} className="btn-secondary w-full">
            <LogOut className="h-5 w-5" />
            <span>Sair / Trocar de conta</span>
          </button>
        </div>
      </div>
    </div>
  )
}
