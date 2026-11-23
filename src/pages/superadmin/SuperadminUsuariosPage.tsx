import React, { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Loader2,
  Plus,
  Search,
  UserCheck,
  X,
} from 'lucide-react'
import { createEphemeralAuthClient, supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { AprovacaoStatusBadge } from '../../components/StatusBadge'
import { formatCPF, formatPhone, onlyDigits } from '../../lib/format'
import type { Perfil, Sorveteria, StatusAprovacao } from '../../types/database'

interface PerfilComUnidade extends Perfil {
  sorveteriaNome?: string
}

export function SuperadminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<PerfilComUnidade[]>([])
  const [sorveterias, setSorveterias] = useState<Sorveteria[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'todos' | 'sorveteria' | 'sorveteiro'>('todos')
  const [unitFilter, setUnitFilter] = useState<string>('todas')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // New user modal
  const [showNewModal, setShowNewModal] = useState(false)
  const [newRole, setNewRole] = useState<'sorveteria' | 'sorveteiro'>('sorveteiro')
  const [newSorveteriaId, setNewSorveteriaId] = useState('')
  const [newNome, setNewNome] = useState('')
  const [newCpf, setNewCpf] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPraia, setNewPraia] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [creating, setCreating] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: uData }, { data: sData }] = await Promise.all([
      supabase
        .from('perfis')
        .select('*')
        .in('role', ['sorveteria', 'sorveteiro'])
        .order('created_at', { ascending: false }),
      supabase.from('sorveterias').select('*').order('nome'),
    ])

    const units = (sData ?? []) as Sorveteria[]
    const unitMap = new Map(units.map((u) => [u.id, `${u.nome} (${u.cidade}/${u.estado})`]))

    setSorveterias(units)
    setUsuarios(
      ((uData ?? []) as Perfil[]).map((u) => ({
        ...u,
        sorveteriaNome: u.sorveteria_id ? unitMap.get(u.sorveteria_id) : 'Sem unidade',
      }))
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const updateStatus = async (id: string, nextStatus: StatusAprovacao) => {
    setSavingId(id)
    setFeedback(null)
    const { error } = await supabase
      .from('perfis')
      .update({ status_aprovacao: nextStatus })
      .eq('id', id)

    if (!error) {
      setUsuarios((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status_aprovacao: nextStatus } : u))
      )
      setFeedback(`Status atualizado para "${nextStatus}".`)
    }
    setSavingId(null)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSorveteriaId) {
      setErrorMsg('Selecione a sorveteria.')
      return
    }
    setCreating(true)
    setErrorMsg(null)
    setFeedback(null)

    try {
      const unit = sorveterias.find((s) => s.id === newSorveteriaId)
      const secondary = createEphemeralAuthClient()
      const { data: signUpData, error: signUpErr } = await secondary.auth.signUp({
        email: newEmail.trim(),
        password: newPassword,
        options: {
          data: { nome: newNome.trim(), role: newRole },
        },
      })

      if (signUpErr || !signUpData.user?.id) {
        setErrorMsg(`Erro ao criar conta: ${signUpErr?.message || 'tente novamente.'}`)
        setCreating(false)
        return
      }

      const { error: pErr } = await supabase.from('perfis').upsert({
        id: signUpData.user.id,
        sorveteria_id: newSorveteriaId,
        role: newRole,
        nome: newNome.trim(),
        cpf: onlyDigits(newCpf) || null,
        telefone_whatsapp: onlyDigits(newPhone) || null,
        estado: unit?.estado || null,
        cidade: unit?.cidade || null,
        praia_atuacao: newRole === 'sorveteiro' ? newPraia.trim() || null : null,
        status_aprovacao: 'aprovado',
      })

      if (pErr) {
        setErrorMsg(`Erro ao salvar perfil: ${pErr.message}`)
        setCreating(false)
        return
      }

      setShowNewModal(false)
      setNewNome('')
      setNewCpf('')
      setNewPhone('')
      setNewPraia('')
      setNewEmail('')
      setNewPassword('')
      setFeedback('Usuário cadastrado e aprovado!')
      await loadData()
    } catch {
      setErrorMsg('Erro inesperado ao cadastrar usuário.')
    } finally {
      setCreating(false)
    }
  }

  const filtered = usuarios.filter((u) => {
    if (roleFilter !== 'todos' && u.role !== roleFilter) return false
    if (unitFilter !== 'todas' && u.sorveteria_id !== unitFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      u.nome.toLowerCase().includes(q) ||
      (u.cpf ?? '').includes(onlyDigits(q) || q) ||
      (u.sorveteriaNome ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <Layout title="Usuários Globais">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">
          Gerencie gestores de sorveterias e sorveteiros de todas as unidades.
        </p>
        <button type="button" onClick={() => setShowNewModal(true)} className="btn-primary">
          <Plus className="h-5 w-5" />
          <span>Novo Usuário</span>
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

      {/* Filters */}
      <div className="card mb-5 grid grid-cols-1 gap-3 p-4 md:grid-cols-12">
        <div className="relative md:col-span-5">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nome, CPF ou unidade..."
            className="input-field pl-11"
          />
        </div>

        <select
          value={unitFilter}
          onChange={(e) => setUnitFilter(e.target.value)}
          className="input-field md:col-span-4"
        >
          <option value="todas">Todas as sorveterias</option>
          {sorveterias.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome} ({s.cidade}/{s.estado})
            </option>
          ))}
        </select>

        <select
          value={roleFilter}
          onChange={(e) =>
            setRoleFilter(e.target.value as 'todos' | 'sorveteria' | 'sorveteiro')
          }
          className="input-field md:col-span-3"
        >
          <option value="todos">Todos os perfis</option>
          <option value="sorveteria">Gestores (Sorveteria)</option>
          <option value="sorveteiro">Sorveteiros</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-ocean-700" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-sm font-bold text-slate-600">
          Nenhum usuário encontrado neste filtro.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => (
            <div
              key={u.id}
              className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase ${
                      u.role === 'sorveteria'
                        ? 'bg-slate-900 text-white'
                        : 'bg-ocean-100 text-ocean-900'
                    }`}
                  >
                    {u.role === 'sorveteria' ? 'Gestor Sorveteria' : 'Sorveteiro'}
                  </span>
                  <AprovacaoStatusBadge status={u.status_aprovacao} />
                </div>
                <h2 className="truncate text-base font-extrabold text-slate-950">{u.nome}</h2>
                <p className="text-xs font-semibold text-slate-600">
                  Unidade: <strong className="text-slate-900">{u.sorveteriaNome}</strong>
                  {u.telefone_whatsapp && ` · ${formatPhone(u.telefone_whatsapp)}`}
                  {u.cpf && ` · CPF ${formatCPF(u.cpf)}`}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                {u.status_aprovacao !== 'aprovado' ? (
                  <button
                    type="button"
                    disabled={savingId === u.id}
                    onClick={() => updateStatus(u.id, 'aprovado')}
                    className="btn-success min-h-[44px] px-4 py-2 text-sm"
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>Aprovar</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={savingId === u.id}
                    onClick={() => updateStatus(u.id, 'bloqueado')}
                    className="btn-danger min-h-[44px] px-4 py-2 text-sm"
                  >
                    <Ban className="h-4 w-4" />
                    <span>Bloquear</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Novo Usuário */}
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-950">Cadastrar Usuário</h2>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">Perfil *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'sorveteria' | 'sorveteiro')}
                  className="input-field"
                >
                  <option value="sorveteiro">Sorveteiro</option>
                  <option value="sorveteria">Gestor Sorveteria</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">Sorveteria *</label>
                <select
                  required
                  value={newSorveteriaId}
                  onChange={(e) => setNewSorveteriaId(e.target.value)}
                  className="input-field"
                >
                  <option value="">Selecione a unidade</option>
                  {sorveterias.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} ({s.cidade}/{s.estado})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">Nome *</label>
                <input
                  type="text"
                  required
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">CPF</label>
                  <input
                    type="text"
                    value={newCpf}
                    onChange={(e) => setNewCpf(formatCPF(e.target.value))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">WhatsApp</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(formatPhone(e.target.value))}
                    className="input-field"
                  />
                </div>
              </div>

              {newRole === 'sorveteiro' && (
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">
                    Praia de atuação
                  </label>
                  <input
                    type="text"
                    value={newPraia}
                    onChange={(e) => setNewPraia(e.target.value)}
                    className="input-field"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">E-mail *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">
                  Senha (mín. 6) *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
                <button type="submit" disabled={creating} className="btn-primary w-full">
                  {creating ? 'Salvando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
