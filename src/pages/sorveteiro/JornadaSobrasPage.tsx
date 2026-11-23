import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
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
  const [confirmingFechamento, setConfirmingFechamento] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!id) return
    const [{ data: jData, error: jErr }, { data: iData }] = await Promise.all([
      supabase.from('jornadas').select('*, marca:marcas(id, nome)').eq('id', id).single(),
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

  // Realtime subscription so devolvido_final, checkboxes and mutual closing update live
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

  const checkedCount = useMemo(
    () => activeItems.filter((it) => Boolean(it.conferido_fechamento_sorveteiro)).length,
    [activeItems]
  )
  const allCheckedSorveteiro = activeItems.length > 0 && checkedCount === activeItems.length

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

  const toggleConferidoFechamento = async (item: JornadaItem) => {
    if (!isSobrasRegistrada || Boolean(jornada?.confirmado_fechamento_sorveteiro_em)) return
    const next = !Boolean(item.conferido_fechamento_sorveteiro)
    setItems((prev) =>
      prev.map((it) =>
        it.id === item.id ? { ...it, conferido_fechamento_sorveteiro: next } : it
      )
    )
    const { error } = await supabase
      .from('jornada_itens')
      .update({ conferido_fechamento_sorveteiro: next })
      .eq('id', item.id)

    if (error) {
      setErrorMsg(`Erro ao atualizar conferência: ${error.message}`)
    }
  }

  const handleConfirmFechamentoSorveteiro = async () => {
    if (!jornada || !allCheckedSorveteiro) return
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
        <div className="space-y-4">
          {/* Header */}
          <div className="card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-extrabold text-ocean-800">
                #{jornada.codigo_curto || jornada.id.slice(0, 6).toUpperCase()}
              </span>
              <JornadaStatusBadge jornada={jornada} />
            </div>
            <h1 className="mt-1.5 text-xl font-extrabold text-slate-950 sm:text-2xl">
              {isEmVendas ? 'Estoque Atual na Caixa' : 'Conferência e Fechamento'}
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
              className="flex items-start gap-3 rounded-2xl border-2 border-red-500 bg-red-600 p-4 text-white shadow-md"
            >
              <AlertTriangle className="mt-0.5 h-7 w-7 shrink-0 text-sun-400" />
              <div>
                <h2 className="text-lg font-black sm:text-xl">
                  Sobras confirmada, não venda mais nenhum sorvete
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-red-50 sm:text-sm">
                  Confira cada sabor presencialmente com a sorveteria marcando o checkbox ao lado.
                  Os ajustes da sorveteria aparecem aqui em tempo real.
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
          <div className="grid grid-cols-3 gap-2.5">
            <div className="card p-3 text-center">
              <p className="text-[11px] font-extrabold uppercase text-slate-500">Retirado</p>
              <p className="mt-0.5 text-2xl font-black text-slate-950 sm:text-3xl">
                {totals.retirado}
              </p>
            </div>
            <div className="card border-purple-200 bg-purple-50/50 p-3 text-center">
              <p className="text-[11px] font-extrabold uppercase text-purple-800">
                {isEmVendas ? 'Na Caixa' : 'Devolvido'}
              </p>
              <p className="mt-0.5 text-2xl font-black text-purple-950 sm:text-3xl">
                {totals.sobras}
              </p>
            </div>
            <div className="card border-emerald-300 bg-emerald-50 p-3 text-center">
              <p className="text-[11px] font-extrabold uppercase text-emerald-800">Vendido</p>
              <p className="mt-0.5 text-2xl font-black text-emerald-950 sm:text-3xl">
                {totals.vendido}
              </p>
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
                    <div className="border-b border-slate-200 bg-slate-100 px-4 py-2.5">
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
                            className="flex flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
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
                                Retirado:{' '}
                                <strong className="text-slate-900">{item.qtd_separada}</strong> ·
                                Vendido:{' '}
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

              {/* Sticky CTA to dedicated Confirmar Sobras page */}
              <div className="sticky bottom-16 z-20 rounded-2xl border-2 border-purple-300 bg-white/95 p-4 shadow-lg backdrop-blur md:bottom-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-extrabold uppercase text-slate-500">
                      Sobras na caixa para devolver
                    </p>
                    <p className="text-2xl font-black text-purple-950">{totals.sobras} picolés</p>
                  </div>
                  <Link
                    to={`/jornada/${jornada.id}/sobras/confirmar`}
                    className="btn-primary w-full bg-purple-700 hover:bg-purple-800 sm:w-auto"
                  >
                    <PackageMinus className="h-5 w-5" />
                    <span>Encerrar Dia e Confirmar Sobras</span>
                  </Link>
                </div>
              </div>
            </>
          )}

          {/* MODE 2: Sobras registradas ou Jornada finalizada */}
          {(isSobrasRegistrada || isFinalizada) && (
            <>
              {/* Mutual confirmation status */}
              <div className="card p-3.5">
                <h2 className="mb-2.5 text-xs font-extrabold uppercase text-slate-600">
                  Confirmação de Fechamento Mútuo
                </h2>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 ${
                      jornada.confirmado_fechamento_sorveteria_em
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    {jornada.confirmado_fechamento_sorveteria_em ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
                    ) : (
                      <Clock className="h-5 w-5 shrink-0 text-slate-400" />
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
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 ${
                      jornada.confirmado_fechamento_sorveteiro_em
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    {jornada.confirmado_fechamento_sorveteiro_em ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
                    ) : (
                      <Clock className="h-5 w-5 shrink-0 text-slate-400" />
                    )}
                    <div>
                      <p className="text-sm font-extrabold">Você (Sorveteiro)</p>
                      <p className="text-xs font-semibold">
                        {jornada.confirmado_fechamento_sorveteiro_em
                          ? `Confirmado em ${formatDateTime(jornada.confirmado_fechamento_sorveteiro_em)}`
                          : `${checkedCount} de ${activeItems.length} sabores conferidos`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compact numeric table with individual checkbox per flavor */}
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-100 text-[11px] font-extrabold uppercase text-slate-600">
                      <tr>
                        <th className="px-3 py-2.5">Sabor</th>
                        <th className="px-2 py-2.5 text-center">Ret.</th>
                        <th className="px-2 py-2.5 text-center text-purple-900">Dev.</th>
                        <th className="px-2 py-2.5 text-center text-emerald-800">Vend.</th>
                        <th className="px-3 py-2.5 text-center">OK</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {grouped.map((group) => (
                        <React.Fragment
                          key={`${group.categoria_ordem}-${group.categoria_nome}`}
                        >
                          <tr className="bg-slate-50">
                            <td
                              colSpan={5}
                              className="px-3 py-1.5 text-xs font-extrabold text-ocean-900"
                            >
                              {formatCategoryTitle(group.categoria_ordem, group.categoria_nome)}
                            </td>
                          </tr>
                          {group.items.map((item) => {
                            const devolvido =
                              item.qtd_devolvida_final ?? item.qtd_restante_caixa ?? 0
                            const vendido = Math.max(0, item.qtd_separada - devolvido)
                            const checked = Boolean(item.conferido_fechamento_sorveteiro)
                            const sorveteriaChecked = Boolean(item.conferido_fechamento_sorveteria)
                            const canToggle =
                              isSobrasRegistrada && !jornada.confirmado_fechamento_sorveteiro_em

                            return (
                              <tr
                                key={item.id}
                                onClick={() => canToggle && toggleConferidoFechamento(item)}
                                className={`transition-colors ${
                                  canToggle ? 'cursor-pointer' : ''
                                } ${checked ? 'bg-emerald-50/70' : 'hover:bg-slate-50'}`}
                              >
                                <td className="px-3 py-2.5">
                                  <span className="block font-extrabold text-slate-950">
                                    {formatFlavorLabel(
                                      item.categoria_ordem,
                                      item.sabor_ordem,
                                      item.sabor_nome
                                    )}
                                  </span>
                                  {sorveteriaChecked && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                      <Check className="h-3 w-3" /> Sorveteria conferiu
                                    </span>
                                  )}
                                </td>
                                <td className="px-2 py-2.5 text-center font-bold text-slate-700">
                                  {item.qtd_separada}
                                </td>
                                <td className="px-2 py-2.5 text-center font-black text-purple-900">
                                  {devolvido}
                                </td>
                                <td className="px-2 py-2.5 text-center font-black text-emerald-800">
                                  {vendido}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={checked}
                                    disabled={!canToggle}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleConferidoFechamento(item)
                                    }}
                                    className={`mx-auto flex h-11 w-11 items-center justify-center rounded-xl border-2 transition-colors ${
                                      checked
                                        ? 'border-emerald-700 bg-emerald-600 text-white'
                                        : 'border-slate-400 bg-white text-transparent'
                                    } disabled:cursor-default`}
                                  >
                                    <Check className="h-5 w-5 stroke-[3]" />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Confirm Closing CTA (Sorveteiro) with double safety lock */}
              {isSobrasRegistrada && !jornada.confirmado_fechamento_sorveteiro_em && (
                <div className="sticky bottom-16 z-20 rounded-2xl border-2 border-emerald-300 bg-white/95 p-4 shadow-lg backdrop-blur md:bottom-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-extrabold uppercase text-slate-500">
                        Conferência presencial (Sorveteiro)
                      </p>
                      <p className="text-base font-black text-slate-950">
                        {checkedCount} de {activeItems.length} sabores marcados
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!allCheckedSorveteiro || confirmingFechamento}
                      onClick={handleConfirmFechamentoSorveteiro}
                      className="btn-success w-full sm:w-auto"
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
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Layout>
  )
}
