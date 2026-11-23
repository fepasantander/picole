import React, { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Power,
  UserPlus,
  X,
} from 'lucide-react'
import { createEphemeralAuthClient, supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { ESTADOS_BR, formatPhone, onlyDigits } from '../../lib/format'
import type { Sorveteria } from '../../types/database'

export function SuperadminSorveteriasPage() {
  const [sorveterias, setSorveterias] = useState<Sorveteria[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // New Sorveteria Form
  const [showNewModal, setShowNewModal] = useState(false)
  const [nome, setNome] = useState('')
  const [estado, setEstado] = useState('')
  const [cidade, setCidade] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  // New Manager (role = 'sorveteria') Modal
  const [managerTarget, setManagerTarget] = useState<Sorveteria | null>(null)
  const [gestorNome, setGestorNome] = useState('')
  const [gestorWhatsapp, setGestorWhatsapp] = useState('')
  const [gestorEmail, setGestorEmail] = useState('')
  const [gestorPassword, setGestorPassword] = useState('')

  const loadSorveterias = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sorveterias')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setSorveterias(data as Sorveteria[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadSorveterias()
  }, [loadSorveterias])

  const toggleAtivo = async (unit: Sorveteria) => {
    const next = !unit.ativo
    setSorveterias((prev) => prev.map((s) => (s.id === unit.id ? { ...s, ativo: next } : s)))
    const { error } = await supabase
      .from('sorveterias')
      .update({ ativo: next })
      .eq('id', unit.id)

    if (error) {
      setErrorMsg(`Erro ao atualizar status da sorveteria: ${error.message}`)
      await loadSorveterias()
    } else {
      setFeedback(
        next
          ? `Sorveteria "${unit.nome}" ativada com sucesso.`
          : `Sorveteria "${unit.nome}" desativada — acesso dos usuários bloqueado.`
      )
    }
  }

  const handleCreateSorveteria = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErrorMsg(null)
    setFeedback(null)

    const { error } = await supabase.from('sorveterias').insert({
      nome: nome.trim(),
      estado: estado.toUpperCase(),
      cidade: cidade.trim(),
      whatsapp: onlyDigits(whatsapp) || null,
      ativo: true,
    })

    if (error) {
      setErrorMsg(`Erro ao cadastrar sorveteria: ${error.message}`)
    } else {
      setNome('')
      setEstado('')
      setCidade('')
      setWhatsapp('')
      setShowNewModal(false)
      setFeedback('Nova sorveteria cadastrada e ativada!')
      await loadSorveterias()
    }
    setBusy(false)
  }

  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!managerTarget) return
    setBusy(true)
    setErrorMsg(null)
    setFeedback(null)

    try {
      const secondary = createEphemeralAuthClient()
      const { data: signUpData, error: signUpErr } = await secondary.auth.signUp({
        email: gestorEmail.trim(),
        password: gestorPassword,
        options: {
          data: {
            nome: gestorNome.trim(),
            role: 'sorveteria',
          },
        },
      })

      if (signUpErr || !signUpData.user?.id) {
        setErrorMsg(`Erro ao criar conta do gestor: ${signUpErr?.message || 'tente novamente.'}`)
        setBusy(false)
        return
      }

      const { error: perfilErr } = await supabase.from('perfis').upsert({
        id: signUpData.user.id,
        sorveteria_id: managerTarget.id,
        role: 'sorveteria',
        nome: gestorNome.trim(),
        telefone_whatsapp: onlyDigits(gestorWhatsapp) || null,
        estado: managerTarget.estado,
        cidade: managerTarget.cidade,
        status_aprovacao: 'aprovado',
      })

      if (perfilErr) {
        setErrorMsg(`Conta criada, mas erro ao vincular perfil: ${perfilErr.message}`)
        setBusy(false)
        return
      }

      setFeedback(`Gestor "${gestorNome.trim()}" vinculado à sorveteria ${managerTarget.nome}!`)
      setManagerTarget(null)
      setGestorNome('')
      setGestorWhatsapp('')
      setGestorEmail('')
      setGestorPassword('')
    } catch {
      setErrorMsg('Erro inesperado ao criar gestor.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Layout title="Sorveterias (Global)">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">
          Cadastre unidades, ative/desative o acesso operacional e vincule gestores.
        </p>
        <button type="button" onClick={() => setShowNewModal(true)} className="btn-primary">
          <Plus className="h-5 w-5" />
          <span>Nova Sorveteria</span>
        </button>
      </div>

      {feedback && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            <span>{feedback}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-ocean-700" />
        </div>
      ) : sorveterias.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-base font-bold text-slate-700">Nenhuma sorveteria cadastrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sorveterias.map((unit) => (
            <div
              key={unit.id}
              className={`card p-5 ${!unit.ativo ? 'border-red-200 bg-red-50/30' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      unit.ativo ? 'bg-ocean-100 text-ocean-800' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-950">{unit.nome}</h2>
                    <p className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>
                        {unit.cidade}/{unit.estado}
                      </span>
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-extrabold uppercase ${
                    unit.ativo
                      ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
                      : 'border-red-300 bg-red-100 text-red-900'
                  }`}
                >
                  {unit.ativo ? 'Ativa' : 'Desligada'}
                </span>
              </div>

              {unit.whatsapp && (
                <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>{formatPhone(unit.whatsapp)}</span>
                </p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => toggleAtivo(unit)}
                  className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition-colors ${
                    unit.ativo
                      ? 'border border-red-300 bg-white text-red-700 hover:bg-red-50'
                      : 'bg-emerald-700 text-white hover:bg-emerald-800'
                  }`}
                >
                  <Power className="h-4 w-4" />
                  <span>{unit.ativo ? 'Desligar' : 'Ativar'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setManagerTarget(unit)}
                  className="btn-secondary min-h-[44px] px-3 py-2 text-sm"
                >
                  <UserPlus className="h-4 w-4 text-ocean-700" />
                  <span>Novo Gestor</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Nova Sorveteria */}
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-950">Cadastrar Sorveteria</h2>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSorveteria} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">
                  Nome da Sorveteria *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Sorveteria Sol & Mar"
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">UF *</label>
                  <select
                    required
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
                  <label className="mb-1 block text-sm font-bold text-slate-800">Cidade *</label>
                  <input
                    type="text"
                    required
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Ex: Guarujá"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">WhatsApp</label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                  placeholder="(00) 90000-0000"
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="btn-secondary w-full"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={busy} className="btn-primary w-full">
                  {busy ? 'Salvando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Criar/Vincular Gestor */}
      {managerTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-950">Vincular Gestor</h2>
                <p className="text-xs font-semibold text-slate-500">{managerTarget.nome}</p>
              </div>
              <button
                type="button"
                onClick={() => setManagerTarget(null)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManager} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">
                  Nome completo *
                </label>
                <input
                  type="text"
                  required
                  value={gestorNome}
                  onChange={(e) => setGestorNome(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">WhatsApp</label>
                <input
                  type="tel"
                  value={gestorWhatsapp}
                  onChange={(e) => setGestorWhatsapp(formatPhone(e.target.value))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">E-mail *</label>
                <input
                  type="email"
                  required
                  value={gestorEmail}
                  onChange={(e) => setGestorEmail(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">
                  Senha inicial (mín. 6) *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={gestorPassword}
                  onChange={(e) => setGestorPassword(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setManagerTarget(null)}
                  className="btn-secondary w-full"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={busy} className="btn-primary w-full">
                  {busy ? 'Criando...' : 'Criar Gestor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
