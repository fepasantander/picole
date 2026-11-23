import React, { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Power,
  Save,
  UserPlus,
  Users,
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
import type { Perfil, Sorveteria } from '../../types/database'

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

  // Reset password by email
  const [resetEmail, setResetEmail] = useState('')
  const [sendingReset, setSendingReset] = useState(false)
  const [resetFeedback, setResetFeedback] = useState<string | null>(null)
  const [resetError, setResetError] = useState<string | null>(null)

  // Novo gestor form
  const [gestorNome, setGestorNome] = useState('')
  const [gestorWhatsapp, setGestorWhatsapp] = useState('')
  const [gestorEmail, setGestorEmail] = useState('')
  const [gestorPassword, setGestorPassword] = useState('')
  const [creatingGestor, setCreatingGestor] = useState(false)
  const [gestorFeedback, setGestorFeedback] = useState<string | null>(null)
  const [gestorError, setGestorError] = useState<string | null>(null)

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
    setResetEmail(s.email_contato || '')

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

  const handleSendPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail.trim()) return
    setSendingReset(true)
    setResetFeedback(null)
    setResetError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/login`,
    })

    if (error) {
      setResetError(`Erro ao enviar reset de senha: ${error.message}`)
    } else {
      setResetFeedback(
        `E-mail de redefinição de senha enviado para ${resetEmail.trim()} com sucesso!`
      )
    }
    setSendingReset(false)
  }

  const handleCreateGestor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!unit) return
    setCreatingGestor(true)
    setGestorFeedback(null)
    setGestorError(null)

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
        setGestorError(
          isAlreadyRegistered
            ? 'Este e-mail já possui cadastro na plataforma (por exemplo, usado pelo Superadmin ou por outro usuário). Utilize outro e-mail para o gestor.'
            : `Erro ao criar conta do gestor: ${signUpErr?.message || 'tente novamente.'}`
        )
        setCreatingGestor(false)
        return
      }

      const { error: perfilErr } = await supabase.from('perfis').upsert({
        id: signUpData.user.id,
        sorveteria_id: unit.id,
        role: 'sorveteria',
        nome: gestorNome.trim(),
        telefone_whatsapp: onlyDigits(gestorWhatsapp) || null,
        estado: unit.estado,
        cidade: unit.cidade,
        status_aprovacao: 'aprovado',
      })

      if (perfilErr) {
        setGestorError(`Conta criada, mas erro ao vincular perfil: ${perfilErr.message}`)
        setCreatingGestor(false)
        return
      }

      setGestorFeedback(`Gestor "${gestorNome.trim()}" criado e vinculado com sucesso!`)
      setGestorNome('')
      setGestorWhatsapp('')
      setGestorEmail('')
      setGestorPassword('')
      await loadData()
    } catch {
      setGestorError('Erro inesperado ao cadastrar gestor.')
    } finally {
      setCreatingGestor(false)
    }
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
          <p className="text-base font-bold text-red-700">{errorMsg || 'Sorveteria não encontrada.'}</p>
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

          {/* Section 2: Gestão de Acesso do Responsável / Gestor */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Gestores Vinculados + Reset de Senha */}
            <section className="card space-y-5 p-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ocean-100 text-ocean-800">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-950">Gestores Vinculados</h2>
                  <p className="text-xs font-medium text-slate-500">
                    Usuários com acesso ao painel administrativo desta sorveteria.
                  </p>
                </div>
              </div>

              {gestores.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                  Nenhum gestor vinculado ainda. Crie um acesso no formulário ao lado.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {gestores.map((g) => (
                    <div
                      key={g.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-extrabold text-slate-950">{g.nome}</p>
                        <p className="text-xs font-medium text-slate-500">
                          {g.telefone_whatsapp ? formatPhone(g.telefone_whatsapp) : 'Sem WhatsApp'}
                        </p>
                      </div>
                      <AprovacaoStatusBadge status={g.status_aprovacao} />
                    </div>
                  ))}
                </div>
              )}

              {/* Enviar Reset de Senha */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
                  <KeyRound className="h-4 w-4 text-ocean-700" />
                  <span>Enviar Reset de Senha ao Gestor</span>
                </h3>

                {resetFeedback && (
                  <div className="mb-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-900">
                    {resetFeedback}
                  </div>
                )}
                {resetError && (
                  <div className="mb-3 rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-bold text-red-900">
                    {resetError}
                  </div>
                )}

                <form onSubmit={handleSendPasswordReset} className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="E-mail de login do gestor"
                    className="input-field flex-1"
                  />
                  <button
                    type="submit"
                    disabled={sendingReset}
                    className="btn-secondary shrink-0 text-sm"
                  >
                    {sendingReset ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4 text-ocean-700" />
                    )}
                    <span>Enviar Reset de Senha</span>
                  </button>
                </form>
              </div>
            </section>

            {/* Novo Gestor */}
            <section className="card p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-950">
                    Criar / Vincular Novo Gestor
                  </h2>
                  <p className="text-xs font-medium text-slate-500">
                    Gera acesso imediato (`role = &apos;sorveteria&apos;`) para esta unidade.
                  </p>
                </div>
              </div>

              {gestorFeedback && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                  <span>{gestorFeedback}</span>
                </div>
              )}

              {gestorError && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-bold text-red-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <span>{gestorError}</span>
                </div>
              )}

              <form onSubmit={handleCreateGestor} className="space-y-3.5">
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
                    placeholder="(00) 90000-0000"
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
                    required
                    minLength={6}
                    value={gestorPassword}
                    onChange={(e) => setGestorPassword(e.target.value)}
                    className="input-field"
                  />
                </div>
                <button type="submit" disabled={creatingGestor} className="btn-primary w-full">
                  {creatingGestor ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Criando gestor...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-5 w-5" />
                      <span>Criar e Vincular Gestor</span>
                    </>
                  )}
                </button>
              </form>
            </section>
          </div>
        </div>
      )}
    </Layout>
  )
}
