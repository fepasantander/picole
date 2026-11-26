import React, { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Building2,
  Check,
  ClipboardList,
  Copy,
  CreditCard,
  ExternalLink,
  Home,
  Inbox,
  LogOut,
  Package,
  PlusCircle,
  RefreshCw,
  Settings,
  Snowflake,
  Users,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { formatBRL } from '../lib/format'
import { InstallPWABanner } from './InstallPWABanner'
import type { CobrancaSorveteria } from '../types/database'

interface LayoutProps {
  children: React.ReactNode
  title?: string
}

let spinUntilTimestamp = 0

export function Layout({ children, title }: LayoutProps) {
  const { perfil, sorveteria, refreshPerfil, signOut } = useAuth()
  const navigate = useNavigate()
  const [cobrancaPendente, setCobrancaPendente] = useState<CobrancaSorveteria | null>(null)
  const [pixCopied, setPixCopied] = useState(false)
  const [newLeadsCount, setNewLeadsCount] = useState(0)
  const [pendingSorveteirosCount, setPendingSorveteirosCount] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isSpinning, setIsSpinning] = useState(() => Date.now() < spinUntilTimestamp)

  useEffect(() => {
    if (!isSpinning) return
    const remaining = Math.max(100, spinUntilTimestamp - Date.now())
    const timer = window.setTimeout(() => setIsSpinning(false), remaining)
    return () => window.clearTimeout(timer)
  }, [isSpinning])

  const handleGlobalRefresh = () => {
    spinUntilTimestamp = Date.now() + 600
    setIsSpinning(true)
    setRefreshKey((k) => k + 1)
    void refreshPerfil()
    window.dispatchEvent(new CustomEvent('picole:refresh'))
  }

  const handleCopyPix = async (chave: string) => {
    try {
      await navigator.clipboard.writeText(chave)
      setPixCopied(true)
      setTimeout(() => setPixCopied(false), 2500)
    } catch {
      // fallback ignore
    }
  }

  const isSuperadmin = perfil?.role === 'superadmin'
  const isSorveteria = perfil?.role === 'sorveteria'

  useEffect(() => {
    if (!isSorveteria || !perfil?.sorveteria_id) {
      setCobrancaPendente(null)
      return
    }
    let active = true
    supabase
      .from('cobrancas_sorveterias')
      .select('*')
      .eq('sorveteria_id', perfil.sorveteria_id)
      .in('status', ['pendente', 'enviada'])
      .order('vencimento', { ascending: true })
      .limit(1)
      .then(({ data }) => {
        if (!active) return
        setCobrancaPendente(((data ?? [])[0] as CobrancaSorveteria | undefined) ?? null)
      })
    return () => {
      active = false
    }
  }, [isSorveteria, perfil?.sorveteria_id])

  useEffect(() => {
    if (!isSuperadmin) {
      setNewLeadsCount(0)
      return
    }
    let active = true

    const fetchNewLeadsCount = async () => {
      const { count } = await supabase
        .from('solicitacoes_reuniao')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'novo')
      if (active) setNewLeadsCount(count ?? 0)
    }

    fetchNewLeadsCount()

    const channel = supabase
      .channel('superadmin-leads-badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitacoes_reuniao' },
        () => {
          fetchNewLeadsCount()
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [isSuperadmin])

  useEffect(() => {
    if (!isSorveteria || !perfil?.sorveteria_id) {
      setPendingSorveteirosCount(0)
      return
    }
    let active = true
    const unitId = perfil.sorveteria_id

    const fetchPendingSorveteiros = async () => {
      const { count } = await supabase
        .from('perfis')
        .select('id', { count: 'exact', head: true })
        .eq('sorveteria_id', unitId)
        .eq('role', 'sorveteiro')
        .eq('status_aprovacao', 'pendente')
      if (active) setPendingSorveteirosCount(count ?? 0)
    }

    fetchPendingSorveteiros()

    const channel = supabase
      .channel(`sorveteria-pending-equipe-${unitId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'perfis',
          filter: `sorveteria_id=eq.${unitId}`,
        },
        () => {
          fetchPendingSorveteiros()
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [isSorveteria, perfil?.sorveteria_id])

  const navItems: Array<{
    to: string
    label: string
    icon: typeof Home
    end?: boolean
    badge?: number
  }> = isSuperadmin
    ? [
        { to: '/superadmin/sorveterias', label: 'Sorveterias', icon: Building2 },
        { to: '/superadmin/leads', label: 'Leads', icon: Inbox, badge: newLeadsCount },
        { to: '/superadmin/usuarios', label: 'Usuários', icon: Users },
        { to: '/superadmin/catalogo', label: 'Catálogo', icon: Package },
        { to: '/superadmin/cobrancas', label: 'Cobranças', icon: CreditCard },
        { to: '/superadmin/analytics', label: 'Analytics', icon: BarChart3 },
      ]
    : isSorveteria
      ? [
          { to: '/sorveteria/jornadas', label: 'Romaneios', icon: ClipboardList },
          {
            to: '/sorveteria/equipe',
            label: 'Sorveteiros',
            icon: Users,
            badge: pendingSorveteirosCount,
          },
          { to: '/sorveteria/catalogo', label: 'Catálogo', icon: Package },
          { to: '/sorveteria/analytics', label: 'Analytics', icon: BarChart3 },
          { to: '/sorveteria/configuracoes', label: 'Configurações', icon: Settings },
        ]
      : [
          { to: '/app', label: 'Início', icon: Home, end: true },
          { to: '/app/nova-jornada', label: 'Nova Carga', icon: PlusCircle },
          { to: '/app/configuracoes', label: 'Configurações', icon: Settings },
        ]

  const homeUrl = isSuperadmin
    ? '/superadmin/sorveterias'
    : isSorveteria
      ? '/sorveteria/jornadas'
      : '/app'

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <InstallPWABanner variant="banner" />

      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to={homeUrl} className="flex min-w-0 items-center gap-2.5">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
                isSuperadmin ? 'bg-slate-900' : 'bg-ocean-700'
              }`}
            >
              <Snowflake className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-extrabold leading-tight text-slate-950">
                Picole
              </p>
              <p className="truncate text-xs font-semibold text-slate-500">
                {isSuperadmin
                  ? 'Painel Superadmin'
                  : sorveteria?.nome || (isSorveteria ? 'Painel Sorveteria' : 'App Sorveteiro')}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition-colors ${
                      isActive
                        ? isSuperadmin
                          ? 'bg-slate-900 text-white'
                          : 'bg-ocean-700 text-white'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-400 px-1.5 text-[11px] font-black text-slate-950">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </nav>

          {/* User + Refresh + Sign out */}
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-slate-900">{perfil?.nome}</p>
              <p className="text-xs font-medium capitalize text-slate-500">
                {isSuperadmin
                  ? 'Superadmin'
                  : isSorveteria
                    ? 'Sorveteria'
                    : perfil?.praia_atuacao || 'Sorveteiro'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleGlobalRefresh}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-ocean-50 hover:text-ocean-800 active:scale-95"
              title="Atualizar dados da tela"
              aria-label="Atualizar dados da tela"
            >
              <RefreshCw className={`h-4 w-4 ${isSpinning ? 'animate-spin text-ocean-700' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 hover:bg-slate-100 hover:text-red-700"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Discreet SaaS Billing Notice for Sorveteria */}
      {isSorveteria && cobrancaPendente && (
        <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-amber-950">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-xs font-bold sm:text-sm">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <CreditCard className="h-4 w-4 shrink-0 text-amber-700" />
              <span>
                Cobrança em aberto ({cobrancaPendente.tipo === 'setup' ? 'Setup' : 'Mensalidade'}):{' '}
                <strong>{cobrancaPendente.descricao}</strong> —{' '}
                <strong>{formatBRL(cobrancaPendente.valor)}</strong>
                {cobrancaPendente.vencimento && ` (venc. ${cobrancaPendente.vencimento})`}
              </span>
              {cobrancaPendente.chave_pix && (
                <span className="rounded bg-amber-100 px-2 py-0.5 font-mono text-xs text-amber-950">
                  Pix: {cobrancaPendente.chave_pix}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {cobrancaPendente.chave_pix && (
                <button
                  type="button"
                  onClick={() => handleCopyPix(cobrancaPendente.chave_pix!)}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-400 bg-white px-2.5 py-1 text-xs font-extrabold text-amber-950 hover:bg-amber-100"
                >
                  {pixCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copiar Chave Pix</span>
                    </>
                  )}
                </button>
              )}
              {cobrancaPendente.link_pagamento && (
                <a
                  href={cobrancaPendente.link_pagamento}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-700 px-3 py-1 text-xs font-extrabold text-white hover:bg-amber-800"
                >
                  <span>Pagar agora</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main key={refreshKey} className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 md:pb-10">
        {title && (
          <h1 className="mb-5 text-2xl font-extrabold tracking-tight text-slate-950">{title}</h1>
        )}
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
        aria-label="Navegação inferior"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-extrabold transition-colors ${
                    isActive
                      ? 'bg-ocean-50 text-ocean-800'
                      : 'text-slate-600 hover:text-slate-950'
                  }`
                }
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badge != null && item.badge > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-slate-950">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="truncate">{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
