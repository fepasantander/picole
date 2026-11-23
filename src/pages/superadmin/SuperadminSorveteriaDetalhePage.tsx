import React, { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Ban,
  Building2,
  CheckCircle2,
  Edit3,
  KeyRound,
  Loader2,
  Mail,
  Plus,
  Power,
  Save,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { createEphemeralAuthClient, supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { AprovacaoStatusBadge } from '../../components/StatusBadge'
import {
  ESTADOS_BR,
  formatCNPJ,
  formatCPF,
  formatPhone,
  onlyDigits,
} from '../../lib/format'
import type { Perfil, Sorveteria, StatusAprovacao } from '../../types/database'

export function SuperadminSorveteriaDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const [unit, setUnit] = useState<Sorveteria | null>(null)
  const [gestores, setGestores] = useState<Perfil[]>([])
  const [loading, setLoading] = useState(true)

  // Form fields (10 dados cadastrais completos)
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [estado, setEstado] = useState('')
  const [cidade, setCidade] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [endereco, setEndereco] = useState('')
  const [emailContato, setEmailContato] = useState('')
  const [responsavelNome, setResponsavelNome] = useState('')
  const [responsavelCpf, setResponsavelCpf] = useState('')
  const [responsavelWhatsapp, setResponsavelWhatsapp] = useState('')

  const [savingUnit, setSavingUnit] = useState(false)
  const [togglingUnit, setTogglingUnit] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Unified Gestores CRUD state
  const [gestorFeedback, setGestorFeedback] = useState<string | null>(null)
  const [gestorError, setGestorError] = useState<string | null>(null)
  const [busyGestorId, setBusyGestorId] = useState<string | null>(null)

  // Modal: + Novo Gestor
  const [showNewGestorModal, setShowNewGestorModal] = useState(false)
  const [newGestorNome, setNewGestorNome] = useState('')
  const [newGestorWhatsapp, setNewGestorWhatsapp] = useState('')
  const [newGestorEmail, setNewGestorEmail] = useState('')
  const [newGestorPassword, setNewGestorPassword] = useState('')
  const [creatingGestor, setCreatingGestor] = useState(false)
  const [newGestorModalError, setNewGestorModalError] = useState<string | null>(null)

  // Modal: Editar Gestor
  const [editingGestor, setEditingGestor] = useState<Perfil | null>(null)
  const [savingEditGestor, setSavingEditGestor] = useState(false)

  // Modal: Resetar Senha (quando registro antigo não tem e-mail salvo)
  const [resetEmailTarget, setResetEmailTarget] = useState<Perfil | null>(null)
  const [resetEmailInput, setResetEmailInput] = useState('')
  const [sendingReset, setSendingReset] = useState(false)

  // Modal: Excluir Gestor
  const [deleteGestorTarget, setDeleteGestorTarget] = useState<Perfil | null>(null)
  const [deletingGestor, setDeletingGestor] = useState(false)

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)

    const [{ data: uData, error: uErr }, { data: gData }] = await Promise.all([
      supabase.from('sorveterias').select('*').eq('id', id).single(),
      supabase
        .from('perfis')
        .select('*')
        .eq('sorveteria_id', id)
        .eq('role', 'sorveteria')
        .order('created_at', { ascending: false }),
    ])

    if (uErr || !uData) {
      setErrorMsg('Sorveteria não encontrada.')
      setLoading(false)
      return
    }

    const s = uData as Sorveteria
    setUnit(s)
    setNome(s.nome || '')
    setCnpj(s.cnpj ? formatCNPJ(s.cnpj) : '')
    setEstado(s.estado || '')
    setCidade(s.cidade || '')
    setWhatsapp(s.whatsapp ? formatPhone(s.whatsapp) : '')
    setEndereco(s.endereco || '')
    setEmailContato(s.email_contato || '')
    setResponsavelNome(s.responsavel_nome || s.contato || '')
    setResponsavelCpf(s.responsavel_cpf ? formatCPF(s.responsavel_cpf) : '')
    setResponsavelWhatsapp(s.responsavel_whatsapp ? formatPhone(s.responsavel_whatsapp) : '')

    setGestores((gData ?? []) as Perfil[])
    setLoading(false)
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!unit) return
    setSavingUnit(true)
    setFeedback(null)
    setErrorMsg(null)

    const { error } = await supabase
      .from('sorveterias')
      .update({
        nome: nome.trim(),
        cnpj: onlyDigits(cnpj) || null,
        estado: estado.toUpperCase(),
        cidade: cidade.trim(),
        whatsapp: onlyDigits(whatsapp) || null,
        endereco: endereco.trim() || null,
        email_contato: emailContato.trim() || null,
        responsavel_nome: responsavelNome.trim() || null,
        contato: responsavelNome.trim() || null,
        responsavel_cpf: onlyDigits(responsavelCpf) || null,
        responsavel_whatsapp: onlyDigits(responsavelWhatsapp) || null,
      })
      .eq('id', unit.id)

    if (error) {
      setErrorMsg(`Erro ao salvar dados da sorveteria: ${error.message}`)
    } else {
      setFeedback('Dados cadastrais da sorveteria salvos com sucesso!')
      await loadData()
    }
    setSavingUnit(false)
  }

  const handleToggleAtivo = async () => {
    if (!unit) return
    setTogglingUnit(true)
    setFeedback(null)
    setErrorMsg(null)

    const next = !unit.ativo
    const { error } = await supabase
      .from('sorveterias')
      .update({ ativo: next })
      .eq('id', unit.id)

    if (error) {
      setErrorMsg(`Erro ao alterar status da unidade: ${error.message}`)
    } else {
      setUnit((prev) => (prev ? { ...prev, ativo: next } : prev))
      setFeedback(
        next
          ? 'Unidade ativada com sucesso!'
          : 'Unidade desligada — o acesso operacional dos usuários foi bloqueado.'
      )
    }
    setTogglingUnit(false)
  }

  // --- CRUD Gestores da Unidade ---

  const openNewGestorModal = () => {
    setNewGestorNome('')
    setNewGestorWhatsapp('')
    setNewGestorEmail('')
    setNewGestorPassword('')
    setNewGestorModalError(null)
    setShowNewGestorModal(true)
  }

  const handleCreateGestor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!unit) return
    setCreatingGestor(true)
    setNewGestorModalError(null)
    setGestorFeedback(null)
    setGestorError(null)

    try {
      const cleanEmail = newGestorEmail.trim().toLowerCase()
      const secondary = createEphemeralAuthClient()
      const { data: signUpData, error: signUpErr } = await secondary.auth.signUp({
        email: cleanEmail,
        password: newGestorPassword,
        options: {
          data: {
            nome: newGestorNome.trim(),
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
        setNewGestorModalError(
          isAlreadyRegistered
            ? 'Este e-mail já possui cadastro na plataforma. Utilize outro e-mail para o gestor.'
            : `Erro ao criar conta do gestor: ${signUpErr?.message || 'tente novamente.'}`
        )
        setCreatingGestor(false)
        return
      }

      const { error: perfilErr } = await supabase.from('perfis').upsert({
        id: signUpData.user.id,
        sorveteria_id: unit.id,
        role: 'sorveteria',
        nome: newGestorNome.trim(),
        email: cleanEmail,
        telefone_whatsapp: onlyDigits(newGestorWhatsapp) || null,
        estado: unit.estado,
        cidade: unit.cidade,
        status_aprovacao: 'aprovado',
      })

      if (perfilErr) {
        setNewGestorModalError(`Conta criada, mas erro ao vincular perfil: ${perfilErr.message}`)
        setCreatingGestor(false)
        return
      }

      setShowNewGestorModal(false)
      setGestorFeedback(`Gestor "${newGestorNome.trim()}" criado e vinculado com sucesso!`)
      await loadData()
    } catch {
      setNewGestorModalError('Erro inesperado ao cadastrar gestor.')
    } finally {
      setCreatingGestor(false)
    }
  }

  const handleSaveEditGestor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingGestor) return
    setSavingEditGestor(true)
    setGestorFeedback(null)
    setGestorError(null)

    const { error } = await supabase
      .from('perfis')
      .update({
        nome: editingGestor.nome.trim(),
        telefone_whatsapp: onlyDigits(editingGestor.telefone_whatsapp) || null,
        email: editingGestor.email?.trim().toLowerCase() || null,
        status_aprovacao: editingGestor.status_aprovacao,
      })
      .eq('id', editingGestor.id)

    if (error) {
      setGestorError(`Erro ao atualizar gestor: ${error.message}`)
    } else {
      setEditingGestor(null)
      setGestorFeedback('Dados do gestor atualizados com sucesso!')
      await loadData()
    }
    setSavingEditGestor(false)
  }

  const handleToggleGestorStatus = async (g: Perfil) => {
    const nextStatus: StatusAprovacao = g.status_aprovacao === 'aprovado' ? 'bloqueado' : 'aprovado'
    setBusyGestorId(g.id)
    setGestorFeedback(null)
    setGestorError(null)

    const { error } = await supabase
      .from('perfis')
      .update({ status_aprovacao: nextStatus })
      .eq('id', g.id)

    if (error) {
      setGestorError(`Erro ao alterar status do gestor: ${error.message}`)
    } else {
      setGestores((prev) =>
        prev.map((item) => (item.id === g.id ? { ...item, status_aprovacao: nextStatus } : item))
      )
      setGestorFeedback(
        nextStatus === 'aprovado'
          ? `Acesso de "${g.nome}" reativado.`
          : `Acesso de "${g.nome}" bloqueado.`
      )
    }
    setBusyGestorId(null)
  }

  const sendResetPasswordEmail = async (email: string, gestorName: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) {
      setGestorError(`Erro ao enviar reset de senha para ${gestorName}: ${error.message}`)
    } else {
      setGestorFeedback(`E-mail de redefinição de senha enviado para ${email}!`)
    }
  }

  const handleClickResetPassword = async (g: Perfil) => {
    setGestorFeedback(null)
    setGestorError(null)

    if (!g.email?.trim()) {
      setResetEmailTarget(g)
      setResetEmailInput('')
      return
    }

    setBusyGestorId(g.id)
    await sendResetPasswordEmail(g.email.trim(), g.nome)
    setBusyGestorId(null)
  }

  const handleSaveEmailAndReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmailTarget || !resetEmailInput.trim()) return
    setSendingReset(true)
    setGestorFeedback(null)
    setGestorError(null)

    const cleanEmail = resetEmailInput.trim().toLowerCase()
    const { error: updateErr } = await supabase
      .from('perfis')
      .update({ email: cleanEmail })
      .eq('id', resetEmailTarget.id)

    if (updateErr) {
      setGestorError(`Erro ao salvar e-mail do gestor: ${updateErr.message}`)
      setSendingReset(false)
      return
    }

    setGestores((prev) =>
      prev.map((item) => (item.id === resetEmailTarget.id ? { ...item, email: cleanEmail } : item))
    )

    await sendResetPasswordEmail(cleanEmail, resetEmailTarget.nome)
    setResetEmailTarget(null)
    setResetEmailInput('')
    setSendingReset(false)
  }

  const handleConfirmDeleteGestor = async () => {
    if (!deleteGestorTarget) return
    setDeletingGestor(true)
    setGestorFeedback(null)
    setGestorError(null)

    const { error } = await supabase.from('perfis').delete().eq('id', deleteGestorTarget.id)

    if (error) {
      setGestorError(`Erro ao remover gestor: ${error.message}`)
    } else {
      setGestores((prev) => prev.filter((item) => item.id !== deleteGestorTarget.id))
      setGestorFeedback(`Gestor "${deleteGestorTarget.nome}" removido da unidade.`)
    }
    setDeleteGestorTarget(null)
    setDeletingGestor(false)
  }

  return (
    <Layout>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/superadmin/sorveterias"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-ocean-800 hover:text-ocean-950"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para Sorveterias</span>
        </Link>

        {unit && (
          <button
            type="button"
            disabled={togglingUnit}
            onClick={handleToggleAtivo}
            className={
              unit.ativo
                ? 'btn-danger min-h-[44px] px-4 py-2 text-sm'
                : 'btn-success min-h-[44px] px-4 py-2 text-sm'
            }
          >
            <Power className="h-4 w-4" />
            <span>{unit.ativo ? 'Desligar Unidade' : 'Ativar Unidade'}</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-ocean-700" />
        </div>
      ) : !unit ? (
        <div className="card p-8 text-center">
          <p className="text-base font-bold text-red-700">
            {errorMsg || 'Sorveteria não encontrada.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                  unit.ativo ? 'bg-ocean-100 text-ocean-800' : 'bg-red-100 text-red-700'
                }`}
              >
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-slate-950">{unit.nome}</h1>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-extrabold uppercase ${
                      unit.ativo
                        ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
                        : 'border-red-300 bg-red-100 text-red-900'
                    }`}
                  >
                    {unit.ativo ? 'Ativa' : 'Desligada'}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-600">
                  {unit.cidade}/{unit.estado}
                </p>
              </div>
            </div>
          </div>

          {feedback && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
              <span>{feedback}</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Dados Cadastrais Completos */}
          <section className="card p-5">
            <h2 className="mb-4 text-lg font-extrabold text-slate-950">
              Dados Cadastrais da Sorveteria
            </h2>

            <form onSubmit={handleSaveUnit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">
                    1. Nome Fantasia *
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">2. CNPJ</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    className="input-field"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-bold text-slate-800">3. UF *</label>
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
                    <label className="mb-1 block text-sm font-bold text-slate-800">
                      4. Cidade *
                    </label>
                    <input
                      type="text"
                      required
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">
                    5. Telefone Comercial
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                    placeholder="(00) 90000-0000"
                    className="input-field"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-bold text-slate-800">
                    6. Endereço Principal
                  </label>
                  <input
                    type="text"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Rua, número, bairro, complemento"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">
                    7. E-mail de Contato
                  </label>
                  <input
                    type="email"
                    value={emailContato}
                    onChange={(e) => setEmailContato(e.target.value)}
                    placeholder="contato@sorveteria.com"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">
                    8. Nome do Responsável
                  </label>
                  <input
                    type="text"
                    value={responsavelNome}
                    onChange={(e) => setResponsavelNome(e.target.value)}
                    placeholder="Nome completo do responsável"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">
                    9. CPF do Responsável
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={responsavelCpf}
                    onChange={(e) => setResponsavelCpf(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">
                    10. Telefone / WhatsApp do Responsável
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={responsavelWhatsapp}
                    onChange={(e) => setResponsavelWhatsapp(formatPhone(e.target.value))}
                    placeholder="(00) 90000-0000"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4">
                <button type="submit" disabled={savingUnit} className="btn-primary w-full sm:w-auto">
                  {savingUnit ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      <span>Salvar Dados da Sorveteria</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* Section 2: Módulo Unificado — Gestores da Unidade (CRUD Completo) */}
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ocean-100 text-ocean-800">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-950">Gestores da Unidade</h2>
                  <p className="text-xs font-medium text-slate-500">
                    Usuários com acesso administrativo ao painel desta sorveteria.
                  </p>
                </div>
              </div>

              <button type="button" onClick={openNewGestorModal} className="btn-primary">
                <Plus className="h-5 w-5" />
                <span>+ Novo Gestor</span>
              </button>
            </div>

            {gestorFeedback && (
              <div className="mx-5 mt-4 flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
                  <span>{gestorFeedback}</span>
                </div>
                <button type="button" onClick={() => setGestorFeedback(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {gestorError && (
              <div className="mx-5 mt-4 flex items-start justify-between gap-2 rounded-xl border border-red-300 bg-red-50 p-3.5 text-sm font-bold text-red-900">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <span>{gestorError}</span>
                </div>
                <button type="button" onClick={() => setGestorError(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {gestores.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-bold text-slate-600">
                  Nenhum gestor vinculado a esta unidade ainda.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Clique em &ldquo;+ Novo Gestor&rdquo; acima para criar o primeiro acesso.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto pt-2">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="border-y border-slate-200 bg-slate-50 text-xs font-extrabold uppercase text-slate-600">
                    <tr>
                      <th className="px-5 py-3">Nome</th>
                      <th className="px-4 py-3">WhatsApp</th>
                      <th className="px-4 py-3">E-mail</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {gestores.map((g) => {
                      const isRowBusy = busyGestorId === g.id
                      const isApproved = g.status_aprovacao === 'aprovado'
                      return (
                        <tr key={g.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3.5 font-extrabold text-slate-950">{g.nome}</td>
                          <td className="px-4 py-3.5 font-medium text-slate-700">
                            {g.telefone_whatsapp ? formatPhone(g.telefone_whatsapp) : '—'}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-slate-700">
                            {g.email || (
                              <span className="text-xs italic text-slate-400">Não informado</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <AprovacaoStatusBadge status={g.status_aprovacao} />
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={isRowBusy}
                                onClick={() => setEditingGestor(g)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                title="Editar gestor"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={isRowBusy}
                                onClick={() => handleClickResetPassword(g)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-ocean-300 bg-ocean-50 text-ocean-800 hover:bg-ocean-100"
                                title="Enviar Reset de Senha"
                              >
                                {isRowBusy ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <KeyRound className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                disabled={isRowBusy}
                                onClick={() => handleToggleGestorStatus(g)}
                                className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                                  isApproved
                                    ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                    : 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                                }`}
                                title={isApproved ? 'Bloquear gestor' : 'Reativar gestor'}
                              >
                                {isApproved ? (
                                  <Ban className="h-4 w-4" />
                                ) : (
                                  <UserCheck className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                disabled={isRowBusy}
                                onClick={() => setDeleteGestorTarget(g)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50"
                                title="Excluir gestor"
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
            )}
          </section>
        </div>
      )}

      {/* Modal: + Novo Gestor (campos limpos sem autofill do Superadmin) */}
      {showNewGestorModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ocean-100 text-ocean-800">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-950">Novo Gestor</h2>
                  <p className="text-xs font-semibold text-slate-500">{unit?.nome}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewGestorModal(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {newGestorModalError && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-bold text-red-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <span>{newGestorModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateGestor} autoComplete="off" className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">
                  Nome completo *
                </label>
                <input
                  type="text"
                  name="novo_gestor_nome"
                  autoComplete="off"
                  required
                  value={newGestorNome}
                  onChange={(e) => setNewGestorNome(e.target.value)}
                  placeholder="Nome do gestor"
                  className="input-field"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">WhatsApp</label>
                <input
                  type="tel"
                  name="novo_gestor_whatsapp"
                  autoComplete="off"
                  value={newGestorWhatsapp}
                  onChange={(e) => setNewGestorWhatsapp(formatPhone(e.target.value))}
                  placeholder="(00) 90000-0000"
                  className="input-field"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">E-mail *</label>
                <input
                  type="email"
                  name="novo_gestor_email"
                  autoComplete="off"
                  required
                  value={newGestorEmail}
                  onChange={(e) => setNewGestorEmail(e.target.value)}
                  placeholder="gestor@sorveteria.com"
                  className="input-field"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">
                  Senha inicial (mín. 6) *
                </label>
                <input
                  type="password"
                  name="novo_gestor_senha"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={newGestorPassword}
                  onChange={(e) => setNewGestorPassword(e.target.value)}
                  placeholder="Crie uma senha inicial"
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={creatingGestor}
                  onClick={() => setShowNewGestorModal(false)}
                  className="btn-secondary w-full"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={creatingGestor} className="btn-primary w-full">
                  {creatingGestor ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Criando...</span>
                    </>
                  ) : (
                    <span>Criar Gestor</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Gestor */}
      {editingGestor && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-950">Editar Gestor</h2>
              <button
                type="button"
                onClick={() => setEditingGestor(null)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditGestor} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">Nome *</label>
                <input
                  type="text"
                  required
                  value={editingGestor.nome}
                  onChange={(e) => setEditingGestor({ ...editingGestor, nome: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">WhatsApp</label>
                <input
                  type="tel"
                  value={
                    editingGestor.telefone_whatsapp
                      ? formatPhone(editingGestor.telefone_whatsapp)
                      : ''
                  }
                  onChange={(e) =>
                    setEditingGestor({
                      ...editingGestor,
                      telefone_whatsapp: onlyDigits(e.target.value),
                    })
                  }
                  placeholder="(00) 90000-0000"
                  className="input-field"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">E-mail</label>
                <input
                  type="email"
                  value={editingGestor.email ?? ''}
                  onChange={(e) => setEditingGestor({ ...editingGestor, email: e.target.value })}
                  placeholder="gestor@sorveteria.com"
                  className="input-field"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">Status</label>
                <select
                  value={editingGestor.status_aprovacao}
                  onChange={(e) =>
                    setEditingGestor({
                      ...editingGestor,
                      status_aprovacao: e.target.value as StatusAprovacao,
                    })
                  }
                  className="input-field"
                >
                  <option value="aprovado">Aprovado</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={savingEditGestor}
                  onClick={() => setEditingGestor(null)}
                  className="btn-secondary w-full"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={savingEditGestor} className="btn-primary w-full">
                  {savingEditGestor ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal rápido: Informar e-mail para Reset de Senha (registros antigos) */}
      {resetEmailTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-950">
                Informar E-mail para Reset de Senha
              </h2>
              <button
                type="button"
                onClick={() => setResetEmailTarget(null)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-xs font-medium text-slate-600">
              O perfil de <strong>{resetEmailTarget.nome}</strong> ainda não tem e-mail salvo.
              Informe o e-mail de login para salvar no cadastro e enviar o link de redefinição.
            </p>
            <form onSubmit={handleSaveEmailAndReset} className="space-y-4">
              <input
                type="email"
                required
                autoComplete="off"
                value={resetEmailInput}
                onChange={(e) => setResetEmailInput(e.target.value)}
                placeholder="email@sorveteria.com"
                className="input-field"
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={sendingReset}
                  onClick={() => setResetEmailTarget(null)}
                  className="btn-secondary w-full"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={sendingReset} className="btn-primary w-full">
                  {sendingReset ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  <span>Salvar e Enviar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão do Gestor */}
      {deleteGestorTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border-2 border-red-300 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-3.5 text-red-950">
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
              <div>
                <h2 className="text-lg font-black text-red-800">Remover Gestor?</h2>
                <p className="mt-1 text-xs font-semibold text-red-900">
                  Tem certeza que deseja remover <strong>{deleteGestorTarget.nome}</strong> da
                  unidade <strong>{unit?.nome}</strong>?
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={deletingGestor}
                onClick={() => setDeleteGestorTarget(null)}
                className="btn-secondary w-full"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingGestor}
                onClick={handleConfirmDeleteGestor}
                className="btn-danger w-full"
              >
                {deletingGestor ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
                <span>Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
