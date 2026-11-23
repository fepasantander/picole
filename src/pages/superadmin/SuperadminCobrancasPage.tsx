import React, { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  MessageCircle,
  Plus,
  X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { buildWhatsAppUrl, formatBRL } from '../../lib/format'
import type { CobrancaSorveteria, Sorveteria, TipoCobranca } from '../../types/database'

export function SuperadminCobrancasPage() {
  const [cobrancas, setCobrancas] = useState<CobrancaSorveteria[]>([])
  const [sorveterias, setSorveterias] = useState<Sorveteria[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Form
  const [sorveteriaId, setSorveteriaId] = useState('')
  const [tipo, setTipo] = useState<TipoCobranca>('mensalidade')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [vencimento, setVencimento] = useState('')
  const [linkPagamento, setLinkPagamento] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: cData, error: cErr }, { data: sData }] = await Promise.all([
      supabase
        .from('cobrancas_sorveterias')
        .select('*, sorveteria:sorveterias(id, nome, whatsapp, cidade, estado)')
        .order('created_at', { ascending: false }),
      supabase.from('sorveterias').select('*').order('nome'),
    ])

    if (cErr) {
      setErrorMsg(`Erro ao carregar cobranças: ${cErr.message}`)
    } else {
      setCobrancas((cData ?? []) as CobrancaSorveteria[])
    }
    setSorveterias((sData ?? []) as Sorveteria[])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const numVal = parseFloat(valor.replace(',', '.'))
    if (!sorveteriaId || !Number.isFinite(numVal) || numVal <= 0) {
      setErrorMsg('Preencha sorveteria e um valor válido.')
      return
    }

    setSaving(true)
    setErrorMsg(null)

    const { error } = await supabase.from('cobrancas_sorveterias').insert({
      sorveteria_id: sorveteriaId,
      tipo,
      descricao: descricao.trim(),
      valor: numVal,
      vencimento: vencimento || null,
      link_pagamento: linkPagamento.trim() || null,
      status: 'pendente',
    })

    if (error) {
      setErrorMsg(`Erro ao criar cobrança: ${error.message}`)
    } else {
      setShowModal(false)
      setDescricao('')
      setValor('')
      setVencimento('')
      setLinkPagamento('')
      setFeedback('Cobrança criada com sucesso!')
      await loadData()
    }
    setSaving(false)
  }

  const handleEnviarWhatsApp = async (c: CobrancaSorveteria) => {
    const tipoLabel = c.tipo === 'setup' ? 'Setup' : 'Mensalidade'
    const lines = [
      `Olá ${c.sorveteria?.nome || ''}!`,
      `Segue a cobrança (${tipoLabel}) da plataforma Picole:`,
      `• Descrição: ${c.descricao}`,
      `• Valor: ${formatBRL(c.valor)}`,
      c.vencimento ? `• Vencimento: ${c.vencimento}` : null,
      c.link_pagamento ? `• Link de pagamento: ${c.link_pagamento}` : null,
    ].filter(Boolean)

    const url = buildWhatsAppUrl(c.sorveteria?.whatsapp, lines.join('\n'))
    window.open(url, '_blank', 'noopener,noreferrer')

    if (c.status === 'pendente') {
      const { error } = await supabase
        .from('cobrancas_sorveterias')
        .update({ status: 'enviada' })
        .eq('id', c.id)

      if (!error) {
        setCobrancas((prev) =>
          prev.map((item) => (item.id === c.id ? { ...item, status: 'enviada' } : item))
        )
      }
    }
  }

  const handleMarcarPaga = async (c: CobrancaSorveteria) => {
    const { error } = await supabase
      .from('cobrancas_sorveterias')
      .update({ status: 'paga' })
      .eq('id', c.id)

    if (!error) {
      setCobrancas((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, status: 'paga' } : item))
      )
      setFeedback('Cobrança marcada como paga!')
    }
  }

  const statusBadge = (st: CobrancaSorveteria['status']) => {
    if (st === 'paga') return 'border-emerald-300 bg-emerald-100 text-emerald-900'
    if (st === 'enviada') return 'border-sky-300 bg-sky-100 text-sky-900'
    if (st === 'cancelada') return 'border-slate-300 bg-slate-100 text-slate-600'
    return 'border-amber-300 bg-amber-100 text-amber-900'
  }

  return (
    <Layout title="Cobranças SaaS">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">
          Emita e acompanhe cobranças de Setup e Mensalidade das sorveterias.
        </p>
        <button type="button" onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="h-5 w-5" />
          <span>Nova Cobrança</span>
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
      ) : cobrancas.length === 0 ? (
        <div className="card p-8 text-center">
          <CreditCard className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          <p className="text-base font-bold text-slate-700">Nenhuma cobrança registrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cobrancas.map((c) => (
            <div
              key={c.id}
              className="card flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-extrabold uppercase text-white">
                    {c.tipo === 'setup' ? 'Setup' : 'Mensalidade'}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-extrabold uppercase ${statusBadge(
                      c.status
                    )}`}
                  >
                    {c.status}
                  </span>
                </div>
                <h2 className="text-lg font-extrabold text-slate-950">
                  {c.sorveteria?.nome || 'Sorveteria'} — {formatBRL(c.valor)}
                </h2>
                <p className="text-sm font-medium text-slate-700">{c.descricao}</p>
                {c.vencimento && (
                  <p className="text-xs font-semibold text-slate-500">Vencimento: {c.vencimento}</p>
                )}
              </div>

              {c.status !== 'paga' && c.status !== 'cancelada' && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleEnviarWhatsApp(c)}
                    className="btn-whatsapp min-h-[44px] px-4 py-2 text-sm"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Enviar Cobrança via WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarcarPaga(c)}
                    className="btn-success min-h-[44px] px-4 py-2 text-sm"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Marcar como Paga</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Nova Cobrança */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-950">Nova Cobrança SaaS</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">Sorveteria *</label>
                <select
                  required
                  value={sorveteriaId}
                  onChange={(e) => setSorveteriaId(e.target.value)}
                  className="input-field"
                >
                  <option value="">Selecione a sorveteria</option>
                  {sorveterias.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} ({s.cidade}/{s.estado})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">Tipo *</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as TipoCobranca)}
                    className="input-field"
                  >
                    <option value="mensalidade">Mensalidade</option>
                    <option value="setup">Setup</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="199.90"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">Descrição *</label>
                <input
                  type="text"
                  required
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Mensalidade Dezembro/2026"
                  className="input-field"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">Vencimento</label>
                <input
                  type="date"
                  value={vencimento}
                  onChange={(e) => setVencimento(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">
                  Link de pagamento (opcional)
                </label>
                <input
                  type="url"
                  value={linkPagamento}
                  onChange={(e) => setLinkPagamento(e.target.value)}
                  placeholder="https://..."
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary w-full"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-primary w-full">
                  {saving ? 'Salvando...' : 'Criar Cobrança'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
