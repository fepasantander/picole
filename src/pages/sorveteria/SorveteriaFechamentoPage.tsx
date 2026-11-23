import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { QuantityStepper } from '../../components/QuantityStepper'
import { JornadaStatusBadge } from '../../components/StatusBadge'
import {
  formatCategoryTitle,
  formatFlavorLabel,
  groupNumericItems,
  sortNumericItems,
} from '../../lib/ordering'
import { formatDateTime } from '../../lib/format'
import type { Jornada, JornadaItem } from '../../types/database'

export function SorveteriaFechamentoPage() {
  const { id } = useParams<{ id: string }>()
  const [jornada, setJornada] = useState<Jornada | null>(null)
  const [items, setItems] = useState<JornadaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!id) return
    const [{ data: jData, error: jErr }, { data: iData }] = await Promise.all([
      supabase
        .from('jornadas')
        .select(
          `
          *,
          marca:marcas(id, nome),
          sorveteiro:perfis!jornadas_sorveteiro_id_fkey(id, nome, telefone_whatsapp, praia_atuacao)
        `
        )
        .eq('id', id)
        .single(),
      supabase.from('jornada_itens').select('*').eq('jornada_id', id),
    ])

    if (jErr || !jData) {
      setErrorMsg('Romaneio não encontrado.')
      setLoading(false)
      return
    }

    setJornada(jData as Jornada)
    setItems(sortNumericItems((iData ?? []) as JornadaItem[]))
    setLoading(false)
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Realtime subscription to reflect sorveteiro's mutual confirmation immediately
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`sorveteria-fechamento-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jornadas', filter: `id=eq.${id}` },
        (payload) => {
          setJornada((prev) => (prev ? { ...prev, ...(payload.new as Partial<Jornada>) } : prev))
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jornada_itens', filter: `jornada_id=eq.${id}` },
        (payload) => {
          const updated = payload.new as JornadaItem
          setItems((prev) =>
            sortNumericItems(prev.map((it) => (it.id === updated.id ? { ...it, ...updated } : it)))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  const grouped = useMemo(() => groupNumericItems(items), [items])

  const totals = useMemo(() => {
    let retirado = 0
    let devolvido = 0
    for (const it of items) {
      retirado += it.qtd_separada || 0
      devolvido += it.qtd_devolvida_final ?? it.qtd_restante_caixa ?? 0
    }
    return {
      retirado,
      devolvido,
      vendido: Math.max(0, retirado - devolvido),
    }
  }, [items])

  const isFinalizada = jornada?.status === 'jornada_finalizada'
  const isSobrasRegistrada = jornada?.status === 'sobras_registrada'
  const canEditDevolvida = isSobrasRegistrada && !jornada?.confirmado_fechamento_sorveteria_em

  const handleChangeDevolvida = async (item: JornadaItem, nextValue: number) => {
    const clamped = Math.max(0, Math.min(item.qtd_separada, nextValue))
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, qtd_devolvida_final: clamped } : it))
    )

    const { error } = await supabase
      .from('jornada_itens')
      .update({ qtd_devolvida_final: clamped })
      .eq('id', item.id)

    if (error) {
      setErrorMsg(`Erro ao atualizar sobra de ${item.sabor_nome}: ${error.message}`)
    }
  }

  const handleConfirmFechamentoSorveteria = async () => {
    if (!jornada) return
    setConfirming(true)
    setErrorMsg(null)

    try {
      // Re-fetch latest jornada to check if sorveteiro already confirmed
      const { data: fresh } = await supabase
        .from('jornadas')
        .select('confirmado_fechamento_sorveteiro_em')
        .eq('id', jornada.id)
        .single()

      const nowIso = new Date().toISOString()
      const sorveteiroJaConfirmou = Boolean(fresh?.confirmado_fechamento_sorveteiro_em)

      const updatePayload: Partial<Jornada> = {
        confirmado_fechamento_sorveteria_em: nowIso,
      }

      if (sorveteiroJaConfirmou) {
        updatePayload.status = 'jornada_finalizada'
        updatePayload.finalizada_em = nowIso
      }

      const { error } = await supabase
        .from('jornadas')
        .update(updatePayload)
        .eq('id', jornada.id)

      if (error) {
        setErrorMsg(`Erro ao confirmar fechamento: ${error.message}`)
      } else {
        setJornada((prev) => (prev ? { ...prev, ...updatePayload } : prev))
      }
    } catch {
      setErrorMsg('Erro inesperado ao confirmar fechamento.')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <Layout>
      <div className="mb-4">
        <Link
          to="/sorveteria/jornadas"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-ocean-800 hover:text-ocean-950"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para fila de romaneios</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-ocean-700" />
        </div>
      ) : !jornada ? (
        <div className="card p-8 text-center">
          <p className="text-base font-bold text-red-700">{errorMsg || 'Romaneio não encontrado.'}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Header */}
          <div className="card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-extrabold text-ocean-800">
                #{jornada.codigo_curto || jornada.id.slice(0, 6).toUpperCase()}
              </span>
              <JornadaStatusBadge status={jornada.status} />
            </div>
            <h1 className="mt-2 text-2xl font-extrabold text-slate-950">
              Conferência Presencial de Sobras
            </h1>
            <p className="mt-0.5 text-sm font-semibold text-slate-600">
              Sorveteiro: <strong className="text-slate-900">{jornada.sorveteiro?.nome}</strong> ·
              Marca: <strong className="text-slate-900">{jornada.marca?.nome}</strong>
            </p>
          </div>

          {!isSobrasRegistrada && !isFinalizada && (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-950">
              Esta jornada ainda não teve as sobras registradas pelo sorveteiro. Aguarde o status{' '}
              <strong>Sobras registradas</strong> para iniciar a conferência presencial.
            </div>
          )}

          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Summary KPIs (quantities only, zero monetary values) */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4 text-center">
              <p className="text-xs font-extrabold uppercase text-slate-500">Total Retirado</p>
              <p className="mt-1 text-3xl font-black text-slate-950">{totals.retirado}</p>
            </div>
            <div className="card border-purple-200 bg-purple-50/50 p-4 text-center">
              <p className="text-xs font-extrabold uppercase text-purple-800">
                Devolvido (Sobras)
              </p>
              <p className="mt-1 text-3xl font-black text-purple-950">{totals.devolvido}</p>
            </div>
            <div className="card border-emerald-300 bg-emerald-50 p-4 text-center">
              <p className="text-xs font-extrabold uppercase text-emerald-800">Total Vendido</p>
              <p className="mt-1 text-3xl font-black text-emerald-950">{totals.vendido}</p>
            </div>
          </div>

          {/* Mutual Confirmation Status */}
          <div className="card p-4">
            <h2 className="mb-3 text-sm font-extrabold uppercase text-slate-600">
              Confirmação de Fechamento Mútuo
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  jornada.confirmado_fechamento_sorveteria_em
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                {jornada.confirmado_fechamento_sorveteria_em ? (
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-700" />
                ) : (
                  <Clock className="h-6 w-6 shrink-0 text-slate-400" />
                )}
                <div>
                  <p className="text-sm font-extrabold">Sorveteria</p>
                  <p className="text-xs font-semibold">
                    {jornada.confirmado_fechamento_sorveteria_em
                      ? `Confirmado em ${formatDateTime(jornada.confirmado_fechamento_sorveteria_em)}`
                      : 'Aguardando confirmação'}
                  </p>
                </div>
              </div>

              <div
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  jornada.confirmado_fechamento_sorveteiro_em
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                {jornada.confirmado_fechamento_sorveteiro_em ? (
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-700" />
                ) : (
                  <Clock className="h-6 w-6 shrink-0 text-slate-400" />
                )}
                <div>
                  <p className="text-sm font-extrabold">Sorveteiro</p>
                  <p className="text-xs font-semibold">
                    {jornada.confirmado_fechamento_sorveteiro_em
                      ? `Confirmado em ${formatDateTime(jornada.confirmado_fechamento_sorveteiro_em)}`
                      : 'Aguardando confirmação no celular'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {isFinalizada && (
            <div className="flex items-center gap-3 rounded-2xl border-2 border-emerald-500 bg-emerald-600 p-5 text-white shadow-md">
              <ShieldCheck className="h-9 w-9 shrink-0" />
              <div>
                <h2 className="text-xl font-black">Jornada finalizada</h2>
                <p className="text-sm font-semibold text-emerald-50">
                  Ambas as partes confirmaram o fechamento das quantidades.
                </p>
              </div>
            </div>
          )}

          {/* Side-by-side list in strict numeric order */}
          <div className="space-y-4">
            {grouped.map((group) => (
              <div key={`${group.categoria_ordem}-${group.categoria_nome}`} className="card overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-100 px-4 py-3">
                  <h2 className="text-base font-extrabold text-slate-950">
                    {formatCategoryTitle(group.categoria_ordem, group.categoria_nome)}
                  </h2>
                </div>

                <div className="divide-y divide-slate-100">
                  {group.items.map((item) => {
                    const devolvida = item.qtd_devolvida_final ?? item.qtd_restante_caixa ?? 0
                    const vendido = Math.max(0, (item.qtd_separada || 0) - devolvida)
                    const divergente = devolvida !== item.qtd_restante_caixa

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 px-4 py-3.5 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="text-base font-extrabold text-slate-950">
                            {formatFlavorLabel(
                              item.categoria_ordem,
                              item.sabor_ordem,
                              item.sabor_nome
                            )}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-bold">
                            <span className="text-slate-600">
                              Retirado: <strong className="text-slate-950">{item.qtd_separada}</strong>
                            </span>
                            <span className="text-slate-600">
                              Informado na praia:{' '}
                              <strong className="text-slate-950">{item.qtd_restante_caixa}</strong>
                            </span>
                            <span className="text-emerald-800">
                              Vendido: <strong>{vendido}</strong>
                            </span>
                            {divergente && (
                              <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-900">
                                Ajustado presencialmente
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 md:justify-end">
                          <span className="text-xs font-extrabold uppercase text-slate-500 md:hidden">
                            Devolvido Final
                          </span>
                          <QuantityStepper
                            value={devolvida}
                            max={item.qtd_separada}
                            disabled={!canEditDevolvida}
                            label={`Devolvido final ${item.sabor_nome}`}
                            onChange={(val) => handleChangeDevolvida(item, val)}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Confirm Closing CTA */}
          {isSobrasRegistrada && !jornada.confirmado_fechamento_sorveteria_em && (
            <div className="sticky bottom-16 z-20 rounded-2xl border-2 border-emerald-300 bg-white/95 p-4 shadow-lg backdrop-blur md:bottom-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase text-slate-500">
                    Resumo para fechamento
                  </p>
                  <p className="text-base font-extrabold text-slate-950">
                    Retirado: {totals.retirado} · Sobras: {totals.devolvido} ·{' '}
                    <span className="text-emerald-800">Vendido: {totals.vendido}</span>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={confirming}
                  onClick={handleConfirmFechamentoSorveteria}
                  className="btn-success w-full sm:w-auto"
                >
                  {confirming ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Confirmando...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-5 w-5" />
                      <span>Confirmar Fechamento (Sorveteria)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
