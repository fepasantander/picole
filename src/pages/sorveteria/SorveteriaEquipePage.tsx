import React, { useCallback, useEffect, useState } from 'react'
import {
  Ban,
  CheckCircle2,
  Edit3,
  Loader2,
  MapPin,
  Phone,
  Search,
  UserCheck,
  X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Layout } from '../../components/Layout'
import { AprovacaoStatusBadge, JornadaStatusBadge } from '../../components/StatusBadge'
import { ESTADOS_BR, formatCPF, formatPhone, onlyDigits } from '../../lib/format'
import type { Jornada, Perfil, SorveteriaUnidade, StatusAprovacao } from '../../types/database'

interface SorveteiroComJornada extends Perfil {
  jornadaAtual?: Pick<Jornada, 'id' | 'status' | 'codigo_curto'> | null
  unidadeNome?: string | null
}

export function SorveteriaEquipePage() {
  const { perfil } = useAuth()
  const [equipe, setEquipe] = useState<SorveteiroComJornada[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | StatusAprovacao>('todos')
  const [editing, setEditing] = useState<Perfil | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const loadEquipe = useCallback(async () => {
    if (!perfil?.sorveteria_id) return
    setLoading(true)

    const [{ data: perfisData }, { data: jornadasData }, { data: unidadesData }] = await Promise.all([
      supabase
        .from('perfis')
        .select('*')
        .eq('sorveteria_id', perfil.sorveteria_id)
        .eq('role', 'sorveteiro')
        .order('created_at', { ascending: false }),
      supabase
        .from('jornadas')
        .select('id, sorveteiro_id, status, codigo_curto, created_at')
        .eq('sorveteria_id', perfil.sorveteria_id)
        .neq('status', 'jornada_finalizada')
        .order('created_at', { ascending: false }),
      supabase
        .from('sorveteria_unidades')
        .select('id, nome')
        .eq('sorveteria_id', perfil.sorveteria_id),
    ])

    const unidadeById = new Map<string, string>()
    for (const u of (unidadesData ?? []) as Array<Pick<SorveteriaUnidade, 'id' | 'nome'>>) {
      unidadeById.set(u.id, u.nome)
    }

    const latestBySorveteiro = new Map<string, Pick<Jornada, 'id' | 'status' | 'codigo_curto'>>()
    for (const j of (jornadasData ?? []) as Array<
      Pick<Jornada, 'id' | 'sorveteiro_id' | 'status' | 'codigo_curto'>
    >) {
      if (!latestBySorveteiro.has(j.sorveteiro_id)) {
        latestBySorveteiro.set(j.sorveteiro_id, {
          id: j.id,
          status: j.status,
          codigo_curto: j.codigo_curto,
        })
      }
    }

    const list: SorveteiroComJornada[] = ((perfisData ?? []) as Perfil[]).map((p) => ({
      ...p,
      jornadaAtual: latestBySorveteiro.get(p.id) ?? null,
      unidadeNome: p.unidade_id ? unidadeById.get(p.unidade_id) ?? null : null,
    }))

    setEquipe(list)
    setLoading(false)
  }, [perfil?.sorveteria_id])

  useEffect(() => {
    loadEquipe()
  }, [loadEquipe])

  const updateStatus = async (id: string, nextStatus: StatusAprovacao) => {
    setSavingId(id)
    setFeedback(null)
    const { error } = await supabase
      .from('perfis')
      .update({ status_aprovacao: nextStatus })
      .eq('id', id)

    if (!error) {
      setEquipe((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status_aprovacao: nextStatus } : item))
      )
      setFeedback(
        nextStatus === 'aprovado'
          ? 'Sorveteiro aprovado com sucesso.'
          : 'Vínculo do sorveteiro bloqueado.'
      )
    }
    setSavingId(null)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setSavingId(editing.id)
    setFeedback(null)

    const { error } = await supabase
      .from('perfis')
      .update({
        nome: editing.nome.trim(),
        cpf: onlyDigits(editing.cpf),
        telefone_whatsapp: onlyDigits(editing.telefone_whatsapp),
        estado: editing.estado?.toUpperCase() || null,
        cidade: editing.cidade?.trim() || null,
        praia_atuacao: editing.praia_atuacao?.trim() || null,
        status_aprovacao: editing.status_aprovacao,
      })
      .eq('id', editing.id)

    if (!error) {
      await loadEquipe()
      setEditing(null)
      setFeedback('Dados do sorveteiro atualizados.')
    }
    setSavingId(null)
  }

  const filtered = equipe.filter((s) => {
    if (statusFilter !== 'todos' && s.status_aprovacao !== statusFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      s.nome.toLowerCase().includes(q) ||
      (s.cpf ?? '').includes(onlyDigits(q) || q) ||
      (s.praia_atuacao ?? '').toLowerCase().includes(q) ||
      (s.cidade ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <Layout title="Gestão de Sorveteiros">
      {feedback && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            <span>{feedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-emerald-700 hover:text-emerald-950"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-5 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, CPF, praia ou cidade..."
              className="input-field pl-11"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(['todos', 'pendente', 'aprovado', 'bloqueado'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`min-h-[44px] rounded-xl px-4 text-sm font-bold capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-ocean-700 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-ocean-700" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-base font-bold text-slate-700">Nenhum sorveteiro encontrado.</p>
          <p className="mt-1 text-sm text-slate-500">
            Os sorveteiros que se cadastrarem vinculados à sua sorveteria aparecerão aqui.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="space-y-3 lg:hidden">
            {filtered.map((s) => (
              <div key={s.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-950">{s.nome}</h2>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <p className="text-xs font-semibold text-slate-500">
                        CPF: {s.cpf ? formatCPF(s.cpf) : '—'}
                      </p>
                      {s.unidadeNome && (
                        <span className="rounded-md border border-ocean-200 bg-ocean-50 px-2 py-0.5 text-[10px] font-extrabold text-ocean-900">
                          {s.unidadeNome}
                        </span>
                      )}
                    </div>
                  </div>
                  <AprovacaoStatusBadge status={s.status_aprovacao} />
                </div>

                <div className="mt-3 space-y-1.5 text-sm font-medium text-slate-700">
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{s.telefone_whatsapp ? formatPhone(s.telefone_whatsapp) : '—'}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span>
                      {s.praia_atuacao || 'Praia não informada'} — {s.cidade || '—'}/{s.estado || '—'}
                    </span>
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-xs font-bold uppercase text-slate-500">Jornada atual</span>
                  {s.jornadaAtual ? (
                    <JornadaStatusBadge status={s.jornadaAtual.status} />
                  ) : (
                    <span className="text-xs font-semibold text-slate-500">Sem jornada ativa</span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {s.status_aprovacao !== 'aprovado' ? (
                    <button
                      type="button"
                      disabled={savingId === s.id}
                      onClick={() => updateStatus(s.id, 'aprovado')}
                      className="btn-success w-full text-sm"
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>Aprovar</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={savingId === s.id}
                      onClick={() => updateStatus(s.id, 'bloqueado')}
                      className="btn-danger w-full text-sm"
                    >
                      <Ban className="h-4 w-4" />
                      <span>Bloquear</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setEditing(s)}
                    className="btn-secondary w-full text-sm"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Editar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="card hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-3.5">Sorveteiro</th>
                    <th className="px-4 py-3.5">CPF / WhatsApp</th>
                    <th className="px-4 py-3.5">Local / Praia</th>
                    <th className="px-4 py-3.5">Vínculo</th>
                    <th className="px-4 py-3.5">Jornada Atual</th>
                    <th className="px-4 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3.5">
                        <div className="font-extrabold text-slate-950">{s.nome}</div>
                        {s.unidadeNome && (
                          <span className="mt-1 inline-block rounded-md border border-ocean-200 bg-ocean-50 px-2 py-0.5 text-[10px] font-extrabold text-ocean-900">
                            {s.unidadeNome}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">
                        <div>{s.cpf ? formatCPF(s.cpf) : '—'}</div>
                        <div className="text-xs text-slate-500">
                          {s.telefone_whatsapp ? formatPhone(s.telefone_whatsapp) : '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">
                        <div className="font-semibold">{s.praia_atuacao || '—'}</div>
                        <div className="text-xs text-slate-500">
                          {s.cidade || '—'}/{s.estado || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <AprovacaoStatusBadge status={s.status_aprovacao} />
                      </td>
                      <td className="px-4 py-3.5">
                        {s.jornadaAtual ? (
                          <JornadaStatusBadge status={s.jornadaAtual.status} />
                        ) : (
                          <span className="text-xs font-semibold text-slate-500">Inativo</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          {s.status_aprovacao !== 'aprovado' ? (
                            <button
                              type="button"
                              disabled={savingId === s.id}
                              onClick={() => updateStatus(s.id, 'aprovado')}
                              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white hover:bg-emerald-800"
                            >
                              <UserCheck className="h-4 w-4" />
                              Aprovar
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={savingId === s.id}
                              onClick={() => updateStatus(s.id, 'bloqueado')}
                              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-red-700 px-3 text-xs font-bold text-white hover:bg-red-800"
                            >
                              <Ban className="h-4 w-4" />
                              Bloquear
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditing(s)}
                            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 hover:bg-slate-100"
                          >
                            <Edit3 className="h-4 w-4" />
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-950">Editar Sorveteiro</h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">Nome completo</label>
                <input
                  type="text"
                  required
                  value={editing.nome}
                  onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">CPF</label>
                  <input
                    type="text"
                    value={formatCPF(editing.cpf ?? '')}
                    onChange={(e) => setEditing({ ...editing, cpf: onlyDigits(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={formatPhone(editing.telefone_whatsapp ?? '')}
                    onChange={(e) =>
                      setEditing({ ...editing, telefone_whatsapp: onlyDigits(e.target.value) })
                    }
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">Estado (UF)</label>
                  <select
                    value={editing.estado ?? ''}
                    onChange={(e) => setEditing({ ...editing, estado: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Selecione</option>
                    {ESTADOS_BR.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">Cidade</label>
                  <input
                    type="text"
                    value={editing.cidade ?? ''}
                    onChange={(e) => setEditing({ ...editing, cidade: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">
                  Praia de atuação
                </label>
                <input
                  type="text"
                  value={editing.praia_atuacao ?? ''}
                  onChange={(e) => setEditing({ ...editing, praia_atuacao: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">
                  Status de aprovação
                </label>
                <select
                  value={editing.status_aprovacao}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      status_aprovacao: e.target.value as StatusAprovacao,
                    })
                  }
                  className="input-field"
                >
                  <option value="pendente">Pendente</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingId === editing.id}
                  className="btn-primary flex-1"
                >
                  {savingId === editing.id ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
