import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  PackageMinus,
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

export function JornadaSobrasPage() {
  const { id } = useParams<{ id: string }>()
  const [jornada, setJornada] = useState<Jornada | null>(null)
  const [items, setItems] = useState<JornadaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewingSobras, setReviewingSobras] = useState(false)
  const [savingSobras, setSavingSobras] = useState(false)
  const [confirmingFechamento, setConfirmingFechamento] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!id) return
    const [{ data: jData, error: jErr }, { data: iData }] = await Promise.all([
      supabase
        .from('jornadas')
        .select('*, marca:marcas(id, nome)')
        .eq('id', id)
        .single(),
      supabase.from('jornada_itens').select('*').eq('jornada_id', id),
    ])

    if (jErr || !jData) {
      setErrorMsg('Jornada não encontrada.')
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

  // Realtime subscription so devolvido_final and mutual closing update live
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`sorveteiro-sobras-${id}`)
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

  const activeItems = useMemo(
    () => items.filter((it) => (it.qtd_separada || 0) > 0),
    [items]
  )
  const grouped = useMemo(() => groupNumericItems(activeItems), [activeItems])

  const isEmVendas = jornada?.status === 'carga_confirmada'
  const isSobrasRegistrada = jornada?.status === 'sobras_registrada'
  const isFinalizada = jornada?.status === 'jornada_finalizada'

  const totals = useMemo(() => {
    let retirado = 0
    let restante = 0
    let devolvidoFinal = 0
    for (const it of activeItems) {
      retirado += it.qtd_separada || 0
      restante += it.qtd_restante_caixa ?? 0
      devolvidoFinal += it.qtd_devolvida_final ?? it.qtd_restante_caixa ?? 0
    }
    const sobrasUsadas = isEmVendas ? restante : devolvidoFinal
    return {
      retirado,
      sobras: sobrasUsadas,
      vendido: Math.max(0, retirado - sobrasUsadas),
    }
  }, [activeItems, isEmVendas])

  const handleChangeRestante = async (item: JornadaItem, nextValue: number) => {
    const clamped = Math.max(0, Math.min(item.qtd_separada, nextValue))
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, qtd_restante_caixa: clamped } : it))
    )

    await supabase
      .from('jornada_itens')
      .update({ qtd_restante_caixa: clamped })
      .eq('id', item.id)
  }

  const handleConfirmarSobras = async () => {
    if (!jornada) return
    setSavingSobras(true)
    setErrorMsg(null)

    try {
      // Copy qtd_restante_caixa -> qtd_devolvida_final as baseline for sorveteria conference
      await Promise.all(
        activeItems.map((it) =>
          supabase
            .from('jornada_itens')
            .update({
              qtd_restante_caixa: it.qtd_restante_caixa,
              qtd_devolvida_final: it.qtd_restante_caixa,
            })
            .eq('id', it.id)
        )
      )

      const nowIso = new Date().toISOString()
      const { error } = await supabase
        .from('jornadas')
        .update({
          status: 'sobras_registrada',
          sobras_registradas_em: nowIso,
        })
        .eq('id', jornada.id)

      if (error) {
        setErrorMsg(`Erro ao confirmar sobras: ${error.message}`)
        setSavingSobras(false)
        return
      }

      setJornada((prev) =>
        prev
          ? {
              ...prev,
              status: 'sobras_registrada',
              sobras_registradas_em: nowIso,
            }
          : prev
      )
      setItems((prev) =>
        prev.map((it) => ({ ...it, qtd_devolvida_final: it.qtd_restante_caixa }))
      )
      setReviewingSobras(false)
    } catch {
      setErrorMsg('Erro inesperado ao confirmar sobras.')
    } finally {
      setSavingSobras(false)
    }
  }

  const handleConfirmFechamentoSorveteiro = async () => {
    if (!jornada) return
    setConfirmingFechamento(true)
    setErrorMsg(null)

    try {
      const { data: fresh } = await supabase
        .from('jornadas')
        .select('confirmado_fechamento_sorveteria_em')
        .eq('id', jornada.id)
        .single()

      const nowIso = new Date().toISOString()
      const sorveteriaJaConfirmou = Boolean(fresh?.confirmado_fechamento_sorveteria_em)

      const updatePayload: Partial<Jornada> = {
        confirmado_fechamento_sorveteiro_em: nowIso,
      }

      if (sorveteriaJaConfirmou) {
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
      setConfirmingFechamento(false)
    }
  }

  return (
    <Layout>
      <div className="mb-4">
        <Link
          to="/app"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-ocean-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Minhas jornadas</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-ocean-700" />
        </div>
      ) : !jornada ? (
        <div className="card p-8 text-center">
          <p className="text-base font-bold text-red-700">{errorMsg || 'Jornada não encontrada.'}</p>
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
              {isEmVendas ? 'Estoque Atual na Caixa' : 'Resumo Final de Fechamento'}
            </h1>
            <p className="mt-0.5 text-sm font-semibold text-slate-600">
              Marca: <strong className="text-slate-950">{jornada.marca?.nome || '—'}</strong>
            </p>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Prominent Alert when Sobras Confirmed */}
          {isSobrasRegistrada && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border-2 border-red-500 bg-red-600 p-5 text-white shadow-md"
            >
              <AlertTriangle className="mt-0.5 h-8 w-8 shrink-0 text-sun-400" />
              <div>
                <h2 className="text-xl font-black">
                  Sobras confirmada, não venda mais nenhum sorvete
                </h2>
                <p className="mt-1 text-sm font-semibold text-red-50">
                  Apresente a caixa na sorveteria para conferência presencial. Os números abaixo são
                  atualizados em tempo real.
                </p>
              </div>
            </div>
          )}

          {/* Prominent Finalized Banner */}
          {isFinalizada && (
            <div className="flex items-center gap-3 rounded-2xl border-2 border-emerald-500 bg-emerald-600 p-5 text-white shadow-md">
              <ShieldCheck className="h-9 w-9 shrink-0" />
              <div>
                <h2 className="text-xl font-black">Jornada finalizada</h2>
                <p className="text-sm font-semibold text-emerald-50">
                  Fechamento confirmado por você e pela sorveteria em{' '}
                  {formatDateTime(jornada.finalizada_em)}.
                </p>
              </div>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4 text-center">
              <p className="text-xs font-extrabold uppercase text-slate-500">Retirado</p>
              <p className="mt-1 text-3xl font-black text-slate-950">{totals.retirado}</p>
            </div>
            <div className="card border-purple-200 bg-purple-50/50 p-4 text-center">
              <p className="text-xs font-extrabold uppercase text-purple-800">
                {isEmVendas ? 'Na Caixa' : 'Devolvido'}
              </p>
              <p className="mt-1 text-3xl font-black text-purple-950">{totals.sobras}</p>
            </div>
            <div className="card border-emerald-300 bg-emerald-50 p-4 text-center">
              <p className="text-xs font-extrabold uppercase text-emerald-800">Vendido</p>
              <p className="mt-1 text-3xl font-black text-emerald-950">{totals.vendido}</p>
            </div>
          </div>

          {/* MODE 1: Em vendas — live box stock with QuantityStepper */}
          {isEmVendas && (
            <>
              <div className="rounded-xl border border-ocean-200 bg-ocean-50 px-4 py-3 text-sm font-bold text-ocean-950">
                Toque em <strong>[-]</strong> a cada venda na praia ou ajuste o restante da caixa ao
                final do dia.
              </div>

              <div className="space-y-4">
                {grouped.map((group) => (
                  <div
                    key={`${group.categoria_ordem}-${group.categoria_nome}`}
                    className="card overflow-hidden"
                  >
                    <div className="border-b border-slate-200 bg-slate-100 px-4 py-3">
                      <h2 className="text-base font-extrabold text-slate-950">
                        {formatCategoryTitle(group.categoria_ordem, group.categoria_nome)}
                      </h2>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {group.items.map((item) => {
                        const vendidoItem = Math.max(
                          0,
                          item.qtd_separada - item.qtd_restante_caixa
                        )
                        return (
                          <div
                            key={item.id}
                            className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="text-base font-extrabold text-slate-950">
                                {formatFlavorLabel(
                                  item.categoria_ordem,
                                  item.sabor_ordem,
                                  item.sabor_nome
                                )}
                              </p>
                              <p className="text-xs font-bold text-slate-500">
                                Retirado: <strong className="text-slate-900">{item.qtd_separada}</strong>{' '}
                                · Vendido:{' '}
                                <strong className="text-emerald-800">{vendidoItem}</strong>
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-3 sm:justify-end">
                              <span className="text-xs font-extrabold uppercase text-slate-500 sm:hidden">
                                Restante na caixa
                              </span>
                              <QuantityStepper
                                value={item.qtd_restante_caixa}
                                max={item.qtd_separada}
                                label={`Restante na caixa ${item.sabor_nome}`}
                                onChange={(val) => handleChangeRestante(item, val)}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Sticky CTA to Review & Confirm Sobras */}
              <div className="sticky bottom-16 z-20 rounded-2xl border-2 border-purple-300 bg-white/95 p-4 shadow-lg backdrop-blur md:bottom-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-extrabold uppercase text-slate-500">
                      Sobras na caixa para devolver
                    </p>
                    <p className="text-2xl font-black text-purple-950">{totals.sobras} picolés</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReviewingSobras(true)}
                    className="btn-primary w-full bg-purple-700 hover:bg-purple-800 sm:w-auto"
                  >
                    <PackageMinus className="h-5 w-5" />
                    <span>Encerrar Dia e Confirmar Sobras</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* MODE 2: Sobras registradas ou Jornada finalizada */}
          {(isSobrasRegistrada || isFinalizada) && (
            <>
              {/* Mutual confirmation status */}
              <div className="card p-4">
                <h2 className="mb-3 text-sm font-extrabold uppercase text-slate-600">
                  Confirmação de Fechamento
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
                          : 'Aguardando conferência presencial'}
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
                      <p className="text-sm font-extrabold">Você (Sorveteiro)</p>
                      <p className="text-xs font-semibold">
                        {jornada.confirmado_fechamento_sorveteiro_em
                          ? `Confirmado em ${formatDateTime(jornada.confirmado_fechamento_sorveteiro_em)}`
                          : 'Aguardando sua confirmação'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Numeric summary table updated in Realtime */}
              <div className="space-y-4">
                {grouped.map((group) => (
                  <div
                    key={`${group.categoria_ordem}-${group.categoria_nome}`}
                    className="card overflow-hidden"
                  >
                    <div className="border-b border-slate-200 bg-slate-100 px-4 py-3">
                      <h3 className="text-base font-extrabold text-slate-950">
                        {formatCategoryTitle(group.categoria_ordem, group.categoria_nome)}
                      </h3>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase text-slate-600">
                          <tr>
                            <th className="px-4 py-2.5">Sabor</th>
                            <th className="px-3 py-2.5 text-center">Retirado</th>
                            <th className="px-3 py-2.5 text-center">Devolvido</th>
                            <th className="px-4 py-2.5 text-center">Vendido</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.items.map((item) => {
                            const devolvido =
                              item.qtd_devolvida_final ?? item.qtd_restante_caixa ?? 0
                            const vendido = Math.max(0, item.qtd_separada - devolvido)
                            return (
                              <tr key={item.id}>
                                <td className="px-4 py-3 font-extrabold text-slate-950">
                                  {formatFlavorLabel(
                                    item.categoria_ordem,
                                    item.sabor_ordem,
                                    item.sabor_nome
                                  )}
                                </td>
                                <td className="px-3 py-3 text-center font-bold text-slate-700">
                                  {item.qtd_separada}
                                </td>
                                <td className="px-3 py-3 text-center font-black text-purple-900">
                                  {devolvido}
                                </td>
                                <td className="px-4 py-3 text-center font-black text-emerald-800">
                                  {vendido}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              {/* Confirm Closing CTA (Sorveteiro) */}
              {isSobrasRegistrada && !jornada.confirmado_fechamento_sorveteiro_em && (
                <div className="sticky bottom-16 z-20 rounded-2xl border-2 border-emerald-300 bg-white/95 p-4 shadow-lg backdrop-blur md:bottom-4">
                  <button
                    type="button"
                    disabled={confirmingFechamento}
                    onClick={handleConfirmFechamentoSorveteiro}
                    className="btn-success w-full"
                  >
                    {confirmingFechamento ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Confirmando fechamento...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-5 w-5" />
                        <span>Confirmar Fechamento (Sorveteiro)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Review & Confirm Sobras Modal */}
      {reviewingSobras && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/65 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black text-slate-950">Confirmar Sobras do Dia</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Confira as sobras abaixo. Após confirmar, você não poderá mais vender nenhum picolé
              desta carga.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-3 text-center">
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-500">Retirado</p>
                <p className="text-xl font-black text-slate-950">{totals.retirado}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase text-purple-800">Sobras</p>
                <p className="text-xl font-black text-purple-950">{totals.sobras}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase text-emerald-800">Vendido</p>
                <p className="text-xl font-black text-emerald-950">{totals.vendido}</p>
              </div>
            </div>

            <div className="mt-4 max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
              {activeItems.map((it) => (
                <div key={it.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="font-bold text-slate-900">
                    {formatFlavorLabel(it.categoria_ordem, it.sabor_ordem, it.sabor_nome)}
                  </span>
                  <span className="font-black text-purple-900">
                    {it.qtd_restante_caixa} sobra(s)
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={savingSobras}
                onClick={() => setReviewingSobras(false)}
                className="btn-secondary w-full"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={savingSobras}
                onClick={handleConfirmarSobras}
                className="btn-primary w-full bg-purple-700 hover:bg-purple-800"
              >
                {savingSobras ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                <span>Confirmar Sobras</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
