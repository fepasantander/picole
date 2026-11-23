import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  Power,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import { createEphemeralAuthClient, supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { ESTADOS_BR, formatPhone, onlyDigits } from '../../lib/format'
import type { Perfil, Sorveteria } from '../../types/database'

interface SorveteriaComGestor extends Sorveteria {
  gestorNome?: string | null
}

export function SuperadminSorveteriasPage() {
  const [sorveterias, setSorveterias] = useState<SorveteriaComGestor[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Modal: Nova Sorveteria
  const [showNewModal, setShowNewModal] = useState(false)
  const [nome, setNome] = useState('')
  const [contato, setContato] = useState('')
  const [estado, setEstado] = useState('')
  const [cidade, setCidade] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  // Modal: Vincular Gestor (role = 'sorveteria')
  const [managerTarget, setManagerTarget] = useState<SorveteriaComGestor | null>(null)
  const [gestorNome, setGestorNome] = useState('')
  const [gestorWhatsapp, setGestorWhatsapp] = useState('')
  const [gestorEmail, setGestorEmail] = useState('')
  const [gestorPassword, setGestorPassword] = useState('')

  // Modal: Confirmar Exclusão
  const [deleteTarget, setDeleteTarget] = useState<SorveteriaComGestor | null>(null)

  const loadSorveterias = useCallback(async () => {
    setLoading(true)
    const [{ data: unitsData }, { data: managersData }] = await Promise.all([
      supabase.from('sorveterias').select('*').order('created_at', { ascending: false }),
      supabase
        .from('perfis')
        .select('id, sorveteria_id, nome')
        .eq('role', 'sorveteria')
        .order('created_at', { ascending: true }),
    ])

    const gestorByUnit = new Map<string, string>()
    for (const m of (managersData ?? []) as Array<Pick<Perfil, 'id' | 'sorveteria_id' | 'nome'>>) {
      if (m.sorveteria_id && !gestorByUnit.has(m.sorveteria_id)) {
        gestorByUnit.set(m.sorveteria_id, m.nome)
      }
    }

    const list: SorveteriaComGestor[] = ((unitsData ?? []) as Sorveteria[]).map((u) => ({
      ...u,
      gestorNome: gestorByUnit.get(u.id) ?? null,
    }))

    setSorveterias(list)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadSorveterias()
  }, [loadSorveterias])

  const toggleAtivo = async (unit: SorveteriaComGestor) => {
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
      contato: contato.trim() || null,
      estado: estado.toUpperCase(),
      cidade: cidade.trim(),
      whatsapp: onlyDigits(whatsapp) || null,
      ativo: true,
    })

    if (error) {
      setErrorMsg(`Erro ao cadastrar sorveteria: ${error.message}`)
    } else {
      setNome('')
      setContato('')
      setEstado('')
      setCidade('')
      setWhatsapp('')
      setShowNewModal(false)
      setFeedback('Nova sorveteria cadastrada e ativada!')
      await loadSorveterias()
    }
    setBusy(false)
  }

  const handleDeleteUnit = async () => {
    if (!deleteTarget) return
    setBusy(true)
    setErrorMsg(null)
    setFeedback(null)

    const { error } = await supabase.from('sorveterias').delete().eq('id', deleteTarget.id)

    if (error) {
      const isFk =
        error.code === '23503' ||
        error.message.toLowerCase().includes('foreign key') ||
        (error.details ?? '').toLowerCase().includes('referenced')
      setErrorMsg(
        isFk
          ? `Não é possível excluir "${deleteTarget.nome}" pois existem usuários, marcas ou jornadas vinculados a esta unidade. Utilize o botão "Desligar" para suspender o acesso.`
          : `Erro ao excluir sorveteria: ${error.message}`
      )
      setDeleteTarget(null)
    } else {
      setFeedback(`Sorveteria "${deleteTarget.nome}" excluída permanentemente.`)
      setDeleteTarget(null)
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
        const msgLower = (signUpErr?.message ?? '').toLowerCase()
        const isAlreadyRegistered =
          signUpErr?.status === 422 ||
          msgLower.includes('already registered') ||
          msgLower.includes('already exists')
        setErrorMsg(
          isAlreadyRegistered
            ? 'Este e-mail já possui cadastro na plataforma. Utilize outro e-mail para o gestor.'
            : `Erro ao criar conta do gestor: ${signUpErr?.message || 'tente novamente.'}`
        )
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
      await loadSorveterias()
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
          Cadastre, edite, ative/desligue unidades e vincule gestores.
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
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[740px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-100 text-xs font-extrabold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3.5">Nome</th>
                  <th className="px-4 py-3.5">Contato</th>
                  <th className="px-4 py-3.5">Cidade</th>
                  <th className="px-3 py-3.5 text-center">UF</th>
                  <th className="px-4 py-3.5">Telefone</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sorveterias.map((unit) => {
                  const contatoDisplay =
                    unit.responsavel_nome?.trim() || unit.contato?.trim() || unit.gestorNome || '—'
                  return (
                    <tr
                      key={unit.id}
                      className={`transition-colors ${
                        !unit.ativo ? 'bg-red-50/40' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/superadmin/sorveterias/${unit.id}`}
                            className="font-extrabold text-ocean-900 hover:underline"
                          >
                            {unit.nome}
                          </Link>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                              unit.ativo
                                ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
                                : 'border-red-300 bg-red-100 text-red-900'
                            }`}
                          >
                            {unit.ativo ? 'Ativa' : 'Desligada'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">
                        {contatoDisplay}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">{unit.cidade}</td>
                      <td className="px-3 py-3.5 text-center font-bold text-slate-800">
                        {unit.estado}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">
                        {unit.whatsapp ? formatPhone(unit.whatsapp) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Link
                            to={`/superadmin/sorveterias/${unit.id}`}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                            title="Editar / Visualizar sorveteria"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setManagerTarget(unit)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-ocean-300 bg-ocean-50 text-ocean-800 hover:bg-ocean-100"
                            title="Vincular Gestor"
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleAtivo(unit)}
                            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                              unit.ativo
                                ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'border-slate-300 bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                            title={unit.ativo ? 'Desligar sorveteria' : 'Ligar sorveteria'}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(unit)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50"
                            title="Excluir sorveteria"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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
              <h2 className="text-xl font-extrabold text-slate-950">Nova Sorveteria</h2>
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

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">Contato</label>
                <input
                  type="text"
                  value={contato}
                  onChange={(e) => setContato(e.target.value)}
                  placeholder="Nome do responsável"
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
                <label className="mb-1 block text-sm font-bold text-slate-800">Telefone</label>
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

      {/* Modal: Confirmar Exclusão */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border-2 border-red-300 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-3.5 text-red-950">
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
              <div>
                <h2 className="text-lg font-black text-red-800">Excluir Sorveteria?</h2>
                <p className="mt-1 text-xs font-semibold text-red-900">
                  Tem certeza que deseja excluir permanentemente{' '}
                  <strong>{deleteTarget.nome}</strong> ({deleteTarget.cidade}/{deleteTarget.estado}
                  )? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary w-full"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleDeleteUnit}
                className="btn-danger w-full"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                <span>Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
