import React, { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Save, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Layout } from '../components/Layout'
import { ESTADOS_BR, formatPhone, onlyDigits } from '../lib/format'

export function ConfiguracoesPage() {
  const { user, perfil, refreshPerfil } = useAuth()

  // Dados cadastrais
  const [nome, setNome] = useState('')
  const [telefoneWhatsapp, setTelefoneWhatsapp] = useState('')
  const [estado, setEstado] = useState('')
  const [cidade, setCidade] = useState('')
  const [praiaAtuacao, setPraiaAtuacao] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Alterar senha
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    if (!perfil) return
    setNome(perfil.nome || '')
    setTelefoneWhatsapp(perfil.telefone_whatsapp ? formatPhone(perfil.telefone_whatsapp) : '')
    setEstado(perfil.estado || '')
    setCidade(perfil.cidade || '')
    setPraiaAtuacao(perfil.praia_atuacao || '')
  }, [perfil])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!perfil) return
    setSavingProfile(true)
    setProfileSuccess(null)
    setProfileError(null)

    const payload: Record<string, string | null> = {
      nome: nome.trim(),
      telefone_whatsapp: onlyDigits(telefoneWhatsapp) || null,
      estado: estado ? estado.toUpperCase() : null,
      cidade: cidade.trim() || null,
    }

    if (perfil.role === 'sorveteiro') {
      payload.praia_atuacao = praiaAtuacao.trim() || null
    }

    const { error } = await supabase.from('perfis').update(payload).eq('id', perfil.id)

    if (error) {
      setProfileError(`Erro ao salvar dados cadastrais: ${error.message}`)
    } else {
      await refreshPerfil()
      setProfileSuccess('Dados cadastrais atualizados com sucesso!')
    }
    setSavingProfile(false)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordSuccess(null)
    setPasswordError(null)

    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação de senha não confere com a nova senha.')
      return
    }

    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPasswordError(`Erro ao alterar senha: ${error.message}`)
    } else {
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSuccess('Senha de acesso alterada com sucesso!')
    }
    setSavingPassword(false)
  }

  return (
    <Layout title="Configurações">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Card 1: Dados Cadastrais */}
        <section className="card p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ocean-100 text-ocean-800">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-950">Dados Cadastrais</h2>
              <p className="text-xs font-medium text-slate-500">{user?.email}</p>
            </div>
          </div>

          {profileSuccess && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-bold text-emerald-900">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-900">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label htmlFor="cfg-nome" className="mb-1 block text-sm font-bold text-slate-800">
                Nome completo *
              </label>
              <input
                id="cfg-nome"
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="cfg-phone" className="mb-1 block text-sm font-bold text-slate-800">
                Telefone / WhatsApp
              </label>
              <input
                id="cfg-phone"
                type="tel"
                inputMode="tel"
                value={telefoneWhatsapp}
                onChange={(e) => setTelefoneWhatsapp(formatPhone(e.target.value))}
                placeholder="(00) 90000-0000"
                className="input-field"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="cfg-uf" className="mb-1 block text-sm font-bold text-slate-800">
                  Estado (UF)
                </label>
                <select
                  id="cfg-uf"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="input-field"
                >
                  <option value="">UF</option>
                  {ESTADOS_BR.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label htmlFor="cfg-cidade" className="mb-1 block text-sm font-bold text-slate-800">
                  Cidade
                </label>
                <input
                  id="cfg-cidade"
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            {perfil?.role === 'sorveteiro' && (
              <div>
                <label htmlFor="cfg-praia" className="mb-1 block text-sm font-bold text-slate-800">
                  Praia de atuação
                </label>
                <input
                  id="cfg-praia"
                  type="text"
                  value={praiaAtuacao}
                  onChange={(e) => setPraiaAtuacao(e.target.value)}
                  placeholder="Ex: Praia Grande, Juquehy..."
                  className="input-field"
                />
              </div>
            )}

            <button type="submit" disabled={savingProfile} className="btn-primary w-full">
              {savingProfile ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>Salvar Dados Cadastrais</span>
                </>
              )}
            </button>
          </form>
        </section>

        {/* Card 2: Alterar Senha de Acesso */}
        <section className="card p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-950">Alterar Senha de Acesso</h2>
              <p className="text-xs font-medium text-slate-500">
                Mínimo de 6 caracteres para maior segurança.
              </p>
            </div>
          </div>

          {passwordSuccess && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-bold text-emerald-900">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-900">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label htmlFor="cfg-new-pass" className="mb-1 block text-sm font-bold text-slate-800">
                Nova senha *
              </label>
              <input
                id="cfg-new-pass"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha"
                className="input-field"
              />
            </div>

            <div>
              <label
                htmlFor="cfg-confirm-pass"
                className="mb-1 block text-sm font-bold text-slate-800"
              >
                Confirmar nova senha *
              </label>
              <input
                id="cfg-confirm-pass"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="btn-primary w-full bg-slate-900 hover:bg-slate-800"
            >
              {savingPassword ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Atualizando senha...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-5 w-5" />
                  <span>Atualizar Senha</span>
                </>
              )}
            </button>
          </form>
        </section>
      </div>
    </Layout>
  )
}
