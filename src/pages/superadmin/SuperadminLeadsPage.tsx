import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Inbox,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Trash2,
  X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { buildWhatsAppUrl, formatDateTime, formatPhone, onlyDigits } from '../../lib/format'
import type { SolicitacaoReuniao, StatusLead } from '../../types/database'

const STATUS_TABS: Array<{ id: 'todos' | StatusLead; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'novo', label: 'Novo' },
  { id: 'em_contato', label: 'Em Contato' },
  { id: 'reuniao_agendada', label: 'Reunião Agendada' },
  { id: 'convertida', label: 'Convertida' },
  { id: 'descartada', label: 'Descartada' },
]

const STATUS_BADGE_CLASS: Record<StatusLead, string> = {
  novo: 'border-amber-300 bg-amber-100 text-amber-950',
  em_contato: 'border-sky-300 bg-sky-100 text-sky-950',
  reuniao_agendada: 'border-indigo-300 bg-indigo-100 text-indigo-950',
  convertida: 'border-emerald-300 bg-emerald-100 text-emerald-950',
  descartada: 'border-slate-300 bg-slate-100 text-slate-600',
}

export function SuperadminLeadsPage() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState<SolicitacaoReuniao[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'todos' | StatusLead>('todos')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SolicitacaoReuniao | null>(null)

  const loadLeads = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('solicitacoes_reuniao')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setErrorMsg(`Erro ao carregar leads: ${error.message}`)
    } else {
      setLeads((data ?? []) as SolicitacaoReuniao[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  const handleStatusChange = async (leadId: string, nextStatus: StatusLead) => {
    setBusyId(leadId)
    setErrorMsg(null)
    const { error } = await supabase
      .from('solicitacoes_reuniao')
      .update({ status: nextStatus })
      .eq('id', leadId)

    if (error) {
      setErrorMsg(`Erro ao atualizar status: ${error.message}`)
    } else {
      setLeads((prev) =>
        prev.map((item) => (item.id === leadId ? { ...item, status: nextStatus } : item))
      )
    }
    setBusyId(null)
  }

  const handleChamarWhatsApp = async (lead: SolicitacaoReuniao) => {
    const msg = `Olá ${lead.nome_responsavel}! Recebemos sua solicitação de reunião para a sorveteria ${lead.nome_sorveteria} no sistema Picolé na Praia. Podemos agendar nossa demonstração?`
    const url = buildWhatsAppUrl(lead.whatsapp, msg)
    window.open(url, '_blank', 'noopener,noreferrer')

    if (lead.status === 'novo') {
      await handleStatusChange(lead.id, 'em_contato')
    }
  }

  const handleConverterSorveteria = async (lead: SolicitacaoReuniao) => {
    setBusyId(lead.id)
    setErrorMsg(null)
    setFeedback(null)

    try {
      const phoneDigits = onlyDigits(lead.whatsapp) || null
      const { data: createdUnit, error: createErr } = await supabase
        .from('sorveterias')
        .insert({
          nome: lead.nome_sorveteria.trim(),
          estado: lead.estado.toUpperCase(),
          cidade: lead.cidade.trim(),
          whatsapp: phoneDigits,
          email_contato: lead.email?.trim().toLowerCase() || null,
          responsavel_nome: lead.nome_responsavel.trim(),
          contato: lead.nome_responsavel.trim(),
          responsavel_whatsapp: phoneDigits,
          ativo: true,
        })
        .select('id')
        .single()

      if (createErr || !createdUnit) {
        setErrorMsg(`Erro ao criar sorveteria: ${createErr?.message || 'tente novamente.'}`)
        setBusyId(null)
        return
      }

      const { error: updateErr } = await supabase
        .from('solicitacoes_reuniao')
        .update({
          status: 'convertida',
          sorveteria_convertida_id: createdUnit.id,
        })
        .eq('id', lead.id)

      if (updateErr) {
        setErrorMsg(`Sorveteria criada, mas erro ao atualizar lead: ${updateErr.message}`)
        setBusyId(null)
        return
      }

      navigate(`/superadmin/sorveterias/${createdUnit.id}`)
    } catch {
      setErrorMsg('Erro inesperado ao converter lead em sorveteria.')
      setBusyId(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id)
    setErrorMsg(null)
    const { error } = await supabase
      .from('solicitacoes_reuniao')
      .delete()
      .eq('id', deleteTarget.id)

    if (error) {
      setErrorMsg(`Erro ao excluir lead: ${error.message}`)
    } else {
      setLeads((prev) => prev.filter((item) => item.id !== deleteTarget.id))
      setFeedback(`Lead "${deleteTarget.nome_sorveteria}" removido com sucesso.`)
    }
    setDeleteTarget(null)
    setBusyId(null)
  }

  const filtered = leads.filter((l) => (tab === 'todos' ? true : l.status === tab))

  return (
    <Layout title="Leads & Reuniões">
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

      {/* Filter Tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {STATUS_TABS.map((item) => {
          const count =
            item.id === 'todos'
              ? leads.length
              : leads.filter((l) => l.status === item.id).length
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 text-sm font-bold transition-colors ${
                tab === item.id
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${
                  tab === item.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-ocean-700" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <Inbox className="mx-auto mb-2 h-9 w-9 text-slate-400" />
          <p className="text-base font-bold text-slate-700">Nenhum lead nesta aba.</p>
          <p className="mt-1 text-sm text-slate-500">
            As solicitações enviadas em /agendar-reuniao aparecerão aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => {
            const isBusy = busyId === lead.id
            const isConverted =
              lead.status === 'convertida' || Boolean(lead.sorveteria_convertida_id)

            return (
              <div key={lead.id} className="card p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  {/* Lead Details */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-extrabold text-slate-950">
                        {lead.nome_sorveteria}
                      </h2>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold uppercase ${
                          STATUS_BADGE_CLASS[lead.status]
                        }`}
                      >
                        {STATUS_TABS.find((t) => t.id === lead.status)?.label || lead.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-slate-700">
                      <span>
                        Responsável: <strong className="text-slate-950">{lead.nome_responsavel}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {lead.cidade}/{lead.estado}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {formatPhone(lead.whatsapp)}
                      </span>
                      {lead.qtd_carrinhos != null && (
                        <span>
                          Carrinhos: <strong className="text-slate-950">{lead.qtd_carrinhos}</strong>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDateTime(lead.created_at)}
                      </span>
                    </div>

                    {lead.email && (
                      <p className="text-xs font-semibold text-slate-500">E-mail: {lead.email}</p>
                    )}

                    {lead.observacoes && (
                      <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
                        {lead.observacoes}
                      </p>
                    )}
                  </div>

                  {/* Quick Status Selector + Actions */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
                    <select
                      aria-label={`Status do lead ${lead.nome_sorveteria}`}
                      disabled={isBusy}
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value as StatusLead)}
                      className="input-field min-h-[44px] w-full py-1.5 text-sm font-bold sm:w-44"
                    >
                      <option value="novo">Novo</option>
                      <option value="em_contato">Em Contato</option>
                      <option value="reuniao_agendada">Reunião Agendada</option>
                      <option value="convertida">Convertida</option>
                      <option value="descartada">Descartada</option>
                    </select>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleChamarWhatsApp(lead)}
                      className="btn-whatsapp min-h-[44px] px-3.5 py-2 text-sm"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>WhatsApp</span>
                    </button>

                    {isConverted && lead.sorveteria_convertida_id ? (
                      <Link
                        to={`/superadmin/sorveterias/${lead.sorveteria_convertida_id}`}
                        className="btn-secondary min-h-[44px] px-3.5 py-2 text-sm"
                      >
                        <Building2 className="h-4 w-4 text-ocean-700" />
                        <span>Ver Sorveteria</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      !isConverted && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleConverterSorveteria(lead)}
                          className="btn-primary min-h-[44px] px-3.5 py-2 text-sm"
                        >
                          {isBusy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Building2 className="h-4 w-4" />
                          )}
                          <span>Converter em Sorveteria</span>
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setDeleteTarget(lead)}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50"
                      title="Excluir lead"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
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
                <h2 className="text-lg font-black text-red-800">Excluir Lead?</h2>
                <p className="mt-1 text-xs font-semibold text-red-900">
                  Tem certeza que deseja excluir a solicitação de{' '}
                  <strong>{deleteTarget.nome_sorveteria}</strong> ({deleteTarget.nome_responsavel})?
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={busyId === deleteTarget.id}
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary w-full"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busyId === deleteTarget.id}
                onClick={handleConfirmDelete}
                className="btn-danger w-full"
              >
                {busyId === deleteTarget.id ? (
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
