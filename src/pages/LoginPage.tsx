import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff, Loader2, LogIn, Snowflake, UserPlus } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { InstallPWABanner } from '../components/InstallPWABanner'

export function LoginPage() {
  const { user, perfil, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fromPath = (location.state as { from?: string } | null)?.from

  useEffect(() => {
    if (authLoading || !user) return
    if (!perfil) {
      navigate('/aguardando-aprovacao', { replace: true })
      return
    }
    if (perfil.role === 'sorveteiro' && perfil.status_aprovacao !== 'aprovado') {
      navigate('/aguardando-aprovacao', { replace: true })
      return
    }
    if (fromPath && fromPath !== '/login') {
      navigate(fromPath, { replace: true })
      return
    }
    navigate(perfil.role === 'sorveteria' ? '/sorveteria/jornadas' : '/app', { replace: true })
  }, [authLoading, user, perfil, fromPath, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSubmitting(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) {
        if (error.message.toLowerCase().includes('invalid login')) {
          setErrorMsg('E-mail ou senha incorretos. Verifique e tente novamente.')
        } else {
          setErrorMsg(error.message)
        }
      }
    } catch {
      setErrorMsg('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-ocean-900 via-ocean-800 to-slate-100">
      <InstallPWABanner variant="banner" />

      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-5">
          {/* Brand Header */}
          <div className="text-center text-white">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-sun-400 text-ocean-900 shadow-lg">
              <Snowflake className="h-9 w-9 stroke-[2.5]" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Picole</h1>
            <p className="mt-1 text-sm font-semibold text-ocean-100">
              Romaneio digital para sorveterias e sorveteiros
            </p>
          </div>

          {!isSupabaseConfigured && (
            <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-sm font-semibold text-amber-950">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <p className="font-extrabold">Configure a chave do Supabase</p>
                  <p className="mt-0.5 text-xs font-medium text-amber-900">
                    Substitua <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> no arquivo{' '}
                    <code className="font-mono">.env</code> pela sua chave pública anon do Supabase.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Login Card */}
          <div className="card p-6 shadow-xl">
            <h2 className="text-xl font-extrabold text-slate-950">Entrar na conta</h2>
            <p className="mt-1 text-sm text-slate-600">
              Use seu e-mail e senha cadastrados na plataforma.
            </p>

            {errorMsg && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-3.5 text-sm font-semibold text-red-900"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-bold text-slate-800">
                  E-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="input-field"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-bold text-slate-800">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="input-field pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    <span>Entrar</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
              <Link to="/cadastro-sorveteiro" className="btn-secondary w-full">
                <UserPlus className="h-5 w-5 text-ocean-700" />
                <span>Sou sorveteiro — Quero me cadastrar</span>
              </Link>

              <InstallPWABanner variant="button" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
