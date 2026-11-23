import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  ClipboardList,
  Home,
  LogOut,
  Package,
  PlusCircle,
  Snowflake,
  Users,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { InstallPWABanner } from './InstallPWABanner'

interface LayoutProps {
  children: React.ReactNode
  title?: string
}

export function Layout({ children, title }: LayoutProps) {
  const { perfil, sorveteria, signOut } = useAuth()
  const navigate = useNavigate()

  const isSorveteria = perfil?.role === 'sorveteria'

  const navItems = isSorveteria
    ? [
        { to: '/sorveteria/jornadas', label: 'Romaneios', icon: ClipboardList },
        { to: '/sorveteria/equipe', label: 'Sorveteiros', icon: Users },
        { to: '/sorveteria/catalogo', label: 'Catálogo', icon: Package },
      ]
    : [
        { to: '/app', label: 'Início', icon: Home, end: true },
        { to: '/app/nova-jornada', label: 'Nova Carga', icon: PlusCircle },
      ]

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
          <Link
            to={isSorveteria ? '/sorveteria/jornadas' : '/app'}
            className="flex min-w-0 items-center gap-2.5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ocean-700 text-white shadow-sm">
              <Snowflake className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-extrabold leading-tight text-slate-950">
                Picole
              </p>
              <p className="truncate text-xs font-semibold text-slate-500">
                {sorveteria?.nome || (isSorveteria ? 'Painel Sorveteria' : 'App Sorveteiro')}
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
                    `inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                      isActive
                        ? 'bg-ocean-700 text-white'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          {/* User + Sign out */}
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-slate-900">{perfil?.nome}</p>
              <p className="text-xs font-medium capitalize text-slate-500">
                {perfil?.role === 'sorveteria' ? 'Sorveteria' : perfil?.praia_atuacao || 'Sorveteiro'}
              </p>
            </div>
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

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 md:pb-10">
        {title && (
          <h1 className="mb-5 text-2xl font-extrabold tracking-tight text-slate-950">
            {title}
          </h1>
        )}
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
        aria-label="Navegação inferior"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-xs font-extrabold transition-colors ${
                    isActive
                      ? 'bg-ocean-50 text-ocean-800'
                      : 'text-slate-600 hover:text-slate-950'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
