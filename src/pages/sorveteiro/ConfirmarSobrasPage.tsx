import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import {
  formatCategoryTitle,
  formatFlavorLabel,
  groupNumericItems,
  sortNumericItems,
} from '../../lib/ordering'
import type { Jornada, JornadaItem } from '../../types/database'

export function ConfirmarSobrasPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [jornada, setJornada] = useState<Jornada | null>(null)
  const [items, setItems] = useState<JornadaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showZerados, setShowZerados] = useState(false)
  const [saving, setSaving] = useState(false)
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

    const typed = jData as Jornada
    if (typed.status === 'sobras_registrada' || typed.status === 'jornada_finalizada') {
      navigate(`/jornada/${typed.id}/sobras`, { replace: true })
      return
    }

    setJornada(typed)
    setItems(sortNumericItems((iData ?? []) as JornadaItem[]))
    setLoading(false)
  }, [id, navigate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const activeItems = useMemo(
    () => items.filter((it) => (it.qtd_separada || 0) > 0),
    [items]
  )

  const visibleItems = useMemo(() => {
    if (showZerados) return activeItems
    return activeItems.filter((it) => (it.qtd_restante_caixa || 0) > 0)
  }, [activeItems, showZerados])

  const groupedVisible = useMemo(() => groupNumericItems(visibleItems), [visibleItems])

  const zeradosCount = useMemo(
    () => activeItems.filter((it) => (it.qtd_restante_caixa || 0) === 0).length,
    [activeItems]
  )

  const totals = useMemo(() => {
    let retirado = 0
    let sobras = 0
    for (const it of activeItems) {
      retirado += it.qtd_separada || 0
      sobras += it.qtd_restante_caixa || 0
    }
    return {
      retirado,
      sobras,
      vendido: Math.max(0, retirado - sobras),
    }
  }, [activeItems])

  const handleConfirmarSobras = async () => {
    if (!jornada) return
    setSaving(true)
    setErrorMsg(null)

    try {
      const results = await Promise.all(
        activeItems.map((it) =>
          supabase
            .from('jornada_itens')
            .update({
              qtd_restante_caixa: it.qtd_restante_caixa,
              qtd_devolvida_final: it.qtd_restante_caixa,
              conferido_fechamento_sorveteiro: false,
              conferido_fechamento_sorveteria: false,
            })
            .eq('id', it.id)
        )
      )

      const failedItem = results.find((r) => r.error)
      if (failedItem?.error) {
        setErrorMsg(`Erro ao gravar sobras dos itens: ${failedItem.error.message}`)
        setSaving(false)
        return
      }

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
        setSaving(false)
        return
      }

      navigate(`/jornada/${jornada.id}/sobras`, { replace: true })
    } catch {
      setErrorMsg('Erro inesperado ao confirmar sobras.')
      setSaving(false)
    }
  }

  return (
    <Layout>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-ocean-700" />
        </div>
      ) : !jornada ? (
        <div className="card p-8 text-center">
          <p className="text-base font-bold text-red-700">{errorMsg || 'Jornada não encontrada.'}</p>
        </div>
      ) : (
        <div className="space-y-3 pb-24">
          {/* Compact Top Bar */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-black text-slate-950">Confirmar Sobras do Dia</h1>
              <p className="text-xs font-semibold text-slate-600">
                #{jornada.codigo_curto || jornada.id.slice(0, 6).toUpperCase()} ·{' '}
                {jornada.marca?.nome || 'Marca'}
              </p>
            </div>
            {zeradosCount > 0 && (
              <button
                type="button"
                onClick={() => setShowZerados((prev) => !prev)}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                {showZerados ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                <span>
                  {showZerados ? 'Ocultar zerados' : `Mostrar zerados (${zeradosCount})`}
                </span>
              </button>
            )}
          </div>

          {/* 3 Compact KPIs side-by-side */}
          <div className="grid grid-cols-3 gap-2">
            <div className="card px-3 py-2.5 text-center">
              <p className="text-[11px] font-extrabold uppercase text-slate-500">Retirado</p>
              <p className="text-2xl font-black text-slate-950">{totals.retirado}</p>
            </div>
            <div className="card border-purple-300 bg-purple-50/70 px-3 py-2.5 text-center">
              <p className="text-[11px] font-extrabold uppercase text-purple-800">Sobras</p>
              <p className="text-2xl font-black text-purple-950">{totals.sobras}</p>
            </div>
            <div className="card border-emerald-300 bg-emerald-50/70 px-3 py-2.5 text-center">
              <p className="text-[11px] font-extrabold uppercase text-emerald-800">Vendido</p>
              <p className="text-2xl font-black text-emerald-950">{totals.vendido}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
            <span>
              Após confirmar, você não poderá mais vender nenhum picolé desta carga.
            </span>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-bold text-red-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Dense single-line-per-flavor numeric list */}
          {groupedVisible.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-base font-extrabold text-emerald-800">
                Nenhuma sobra na caixa — você vendeu 100% da carga!
              </p>
              <p className="mt-1 text-xs font-medium text-slate-600">
                Toque em &ldquo;Confirmar Sobras&rdquo; abaixo para encerrar o dia com 0 sobras.
              </p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-100 text-[11px] font-extrabold uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Sabor</th>
                    <th className="px-2 py-2 text-center">Ret.</th>
                    <th className="px-2 py-2 text-center text-purple-900">Sobra</th>
                    <th className="px-3 py-2 text-center text-emerald-800">Vend.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupedVisible.map((group) => (
                    <React.Fragment key={`group-${group.categoria_ordem}-${group.categoria_nome}`}>
                      <tr className="bg-slate-50">
                        <td
                          colSpan={4}
                          className="px-3 py-1.5 text-xs font-extrabold text-ocean-900"
                        >
                          {formatCategoryTitle(group.categoria_ordem, group.categoria_nome)}
                        </td>
                      </tr>
                      {group.items.map((item) => {
                        const sobra = item.qtd_restante_caixa || 0
                        const vendido = Math.max(0, item.qtd_separada - sobra)
                        return (
                          <tr key={item.id} className="leading-tight">
                            <td className="px-3 py-2 font-bold text-slate-900">
                              {formatFlavorLabel(
                                item.categoria_ordem,
                                item.sabor_ordem,
                                item.sabor_nome
                              )}
                            </td>
                            <td className="px-2 py-2 text-center font-semibold text-slate-600">
                              {item.qtd_separada}
                            </td>
                            <td className="px-2 py-2 text-center font-black text-purple-900">
                              {sobra}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-emerald-800">
                              {vendido}
                            </td>
                          </tr>
                        )
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Fixed Bottom Footer */}
          <div className="fixed bottom-16 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur md:bottom-0">
            <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3">
              <Link
                to={`/jornada/${jornada.id}/sobras`}
                className="btn-secondary w-full"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Voltar</span>
              </Link>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmarSobras}
                className="btn-primary w-full bg-purple-700 hover:bg-purple-800"
              >
                {saving ? (
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
