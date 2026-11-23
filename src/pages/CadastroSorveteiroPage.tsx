import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ESTADOS_BR, formatCPF, formatPhone, onlyDigits } from '../lib/format'
import type { Sorveteria } from '../types/database'

export function CadastroSorveteiroPage() {
  const navigate = useNavigate()

  const [sorveterias, setSorveterias] = useState<Sorveteria[]>([])
  const [loadingSorveterias, setLoadingSorveterias] = useState(true)

  const [estado, setEstado] = useState('')
  const [cidade, setCidade] = useState('')
  const [sorveteriaId, setSorveteriaId] = useState('')
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefoneWhatsapp, setTelefoneWhatsapp] = useState('')
  const [praiaAtuacao, setPraiaAtuacao] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function fetchSorveterias() {
      setLoadingSorveterias(true)
      const { data, error } = await supabase
        .from('sorveterias')
        .select('*')
        .eq('ativo', true)
        .order('estado')
        .order('cidade')
        .order('nome')

      if (!error && data) {
        setSorveterias(data as Sorveteria[])
      }
      setLoadingSorveterias(false)
    }
    fetchSorveterias()
  }, [])

  const cidadesDisponiveis = useMemo(() => {
    if (!estado) return []
    const set = new Set<string>()
    for (const s of sorveterias) {
      if (s.estado.toUpperCase() === estado.toUpperCase()) {
        set.add(s.cidade)
      }
    }
    return Array.from(set).sort()
  }, [sorveterias, estado])

  const sorveteriasFiltradas = useMemo(() => {
    return sorveterias.filter((s) => {
      if (estado && s.estado.toUpperCase() !== estado.toUpperCase()) return false
      if (cidade && s.cidade.toLowerCase() !== cidade.toLowerCase()) return false
      return true
    })
  }, [sorveterias, estado, cidade])

  const handleEstadoChange = (nextEstado: string) => {
    setEstado(nextEstado)
    setCidade('')
    setSorveteriaId('')
  }

  const handleCidadeChange = (nextCidade: string) => {
    setCidade(nextCidade)
    setSorveteriaId('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!sorveteriaId) {
      setErrorMsg('Selecione a sorveteria vinculada.')
      return
    }
    if (onlyDigits(cpf).length !== 11) {
      setErrorMsg('Informe um CPF válido com 11 dígitos.')
      return
    }
    if (onlyDigits(telefoneWhatsapp).length < 10) {
      setErrorMsg('Informe um Telefone/WhatsApp válido com DDD.')
      return
    }
    if (password.length < 6) {
      setErrorMsg('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    setSubmitting(true)
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nome: nome.trim(),
            role: 'sorveteiro',
          },
        },
      })

      if (signUpError) {
        setErrorMsg(signUpError.message)
        setSubmitting(false)
        return
      }

      const userId = signUpData.user?.id
      if (!userId) {
        setErrorMsg('Conta criada, mas não foi possível obter o identificador do usuário.')
        setSubmitting(false)
        return
      }

      const { error: perfilError } = await supabase.from('perfis').upsert({
        id: userId,
        sorveteria_id: sorveteriaId,
        role: 'sorveteiro',
        nome: nome.trim(),
        cpf: onlyDigits(cpf),
        telefone_whatsapp: onlyDigits(telefoneWhatsapp),
        estado: estado.toUpperCase(),
        cidade: cidade.trim(),
        praia_atuacao: praiaAtuacao.trim(),
        status_aprovacao: 'pendente',
      })

      if (perfilError) {
        setErrorMsg(`Conta criada, mas houve erro ao salvar o perfil: ${perfilError.message}`)
        setSubmitting(false)
        return
      }

      setSuccess(true)
    } catch {
      setErrorMsg('Erro inesperado ao criar cadastro. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
        <div className="card w-full max-w-md p-6 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-950">Cadastro enviado!</h1>
          <p className="mt-2 text-base text-slate-700">
            Seu cadastro foi enviado para a sorveteria selecionada. Assim que a sorveteria aprovar o
            seu vínculo, você poderá solicitar cargas e registrar suas jornadas.
          </p>
          <button
            type="button"
            onClick={() => navigate('/aguardando-aprovacao', { replace: true })}
            className="btn-primary mt-6 w-full"
          >
            Ir para tela de acompanhamento
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto w-full max-w-xl">
        <Link
          to="/login"
          className="mb-4 inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-ocean-800 hover:text-ocean-950"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para o login</span>
        </Link>

        <div className="card p-6 shadow-md">
          <div className="mb-5">
            <h1 className="text-2xl font-extrabold text-slate-950">Cadastro de Sorveteiro</h1>
            <p className="mt-1 text-sm text-slate-600">
              Preencha seus dados para solicitar vínculo com a sua sorveteria.
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-3.5 text-sm font-semibold text-red-900"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="estado" className="mb-1.5 block text-sm font-bold text-slate-800">
                  Estado (UF) *
                </label>
                <select
                  id="estado"
                  required
                  value={estado}
                  onChange={(e) => handleEstadoChange(e.target.value)}
                  className="input-field"
                >
                  <option value="">Selecione o estado</option>
                  {ESTADOS_BR.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="cidade" className="mb-1.5 block text-sm font-bold text-slate-800">
                  Cidade *
                </label>
                {cidadesDisponiveis.length > 0 ? (
                  <select
                    id="cidade"
                    required
                    value={cidade}
                    onChange={(e) => handleCidadeChange(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Selecione a cidade</option>
                    {cidadesDisponiveis.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="cidade"
                    type="text"
                    required
                    value={cidade}
                    onChange={(e) => handleCidadeChange(e.target.value)}
                    placeholder={estado ? 'Digite sua cidade' : 'Selecione o estado primeiro'}
                    disabled={!estado}
                    className="input-field disabled:bg-slate-100"
                  />
                )}
              </div>
            </div>

            <div>
              <label htmlFor="sorveteria" className="mb-1.5 block text-sm font-bold text-slate-800">
                Sorveteria vinculada *
              </label>
              <select
                id="sorveteria"
                required
                value={sorveteriaId}
                onChange={(e) => setSorveteriaId(e.target.value)}
                disabled={loadingSorveterias || sorveteriasFiltradas.length === 0}
                className="input-field disabled:bg-slate-100"
              >
                <option value="">
                  {loadingSorveterias
                    ? 'Carregando sorveterias...'
                    : sorveteriasFiltradas.length === 0
                      ? 'Nenhuma sorveteria encontrada neste filtro'
                      : 'Selecione a sorveteria'}
                </option>
                {sorveteriasFiltradas.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome} ({s.cidade}/{s.estado})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="nome" className="mb-1.5 block text-sm font-bold text-slate-800">
                Nome completo *
              </label>
              <input
                id="nome"
                type="text"
                required
                autoComplete="name"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: João Silva"
                className="input-field"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="cpf" className="mb-1.5 block text-sm font-bold text-slate-800">
                  CPF *
                </label>
                <input
                  id="cpf"
                  type="text"
                  inputMode="numeric"
                  required
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className="input-field"
                />
              </div>

              <div>
                <label htmlFor="whatsapp" className="mb-1.5 block text-sm font-bold text-slate-800">
                  Telefone / WhatsApp *
                </label>
                <input
                  id="whatsapp"
                  type="tel"
                  inputMode="tel"
                  required
                  value={telefoneWhatsapp}
                  onChange={(e) => setTelefoneWhatsapp(formatPhone(e.target.value))}
                  placeholder="(00) 90000-0000"
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label htmlFor="praia" className="mb-1.5 block text-sm font-bold text-slate-800">
                Praia de atuação *
              </label>
              <input
                id="praia"
                type="text"
                required
                value={praiaAtuacao}
                onChange={(e) => setPraiaAtuacao(e.target.value)}
                placeholder="Ex: Praia Grande, Copacabana, Juquehy..."
                className="input-field"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-bold text-slate-800">
                  E-mail *
                </label>
                <input
                  id="email"
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
                  Senha (mín. 6 dígitos) *
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Crie uma senha"
                  className="input-field"
                />
              </div>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary mt-2 w-full">
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Enviando cadastro...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  <span>Finalizar Cadastro</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
