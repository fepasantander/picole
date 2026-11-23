import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Lock,
  MessageCircle,
  PackageCheck,
  Snowflake,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Layout } from '../../components/Layout'
import { QuantityStepper } from '../../components/QuantityStepper'
import { JornadaStatusBadge } from '../../components/StatusBadge'
import {
  formatCategoryTitle,
  formatFlavorLabel,
  groupNumericItems,
  sortNumericItems,
} from '../../lib/ordering'
import { buildWhatsAppUrl, calculateDryIceKg } from '../../lib/format'
import type { Jornada, JornadaItem } from '../../types/database'

export function SorveteriaSeparacaoPage() {
  const { id } = useParams<{ id: string }>()
  const { sorveteria } = useAuth()
  const [jornada, setJornada] = useState<Jornada | null>(null)
  const [items, setItems] = useState<JornadaItem[]>([])
  const [separatedQty, setSeparatedQty] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmedNow, setConfirmedNow] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setErrorMsg(null)

    const [{ data: jData, error: jErr }, { data: iData, error: iErr }] = await Promise.all([
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

    const typedJornada = jData as Jornada
    const sortedItems = sortNumericItems(((iData ?? []) as JornadaItem[]))

    // Bloqueia edição do sorveteiro automaticamente ao abrir para separação
    if (
      (typedJornada.status === 'carga_solicitada' || typedJornada.status === 'pedido_alterado') &&
      !typedJornada.bloqueado_edicao_sorveteiro
    ) {
      const { error: lockErr } = await supabase
        .from('jornadas')
        .update({ bloqueado_edicao_sorveteiro: true })
        .eq('id', typedJornada.id)

      if (!lockErr) {
        typedJornada.bloqueado_edicao_sorveteiro = true
      }
    }

    const initialMap: Record<string, number> = {}
    for (const item of sortedItems) {
      const shouldPrefillPedida =
        typedJornada.status === 'carga_solicitada' || typedJornada.status === 'pedido_alterado'
      initialMap[item.id] = shouldPrefillPedida ? item.qtd_pedida : item.qtd_separada
    }

    setJornada(typedJornada)
    setItems(sortedItems)
    setSeparatedQty(initialMap)
    if (iErr) setErrorMsg('Erro ao carregar itens do romaneio.')
    setLoading(false)
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const grouped = useMemo(() => groupNumericItems(items), [items])

  const totalPedido = useMemo(
    () => items.reduce((acc, it) => acc + (it.qtd_pedida || 0), 0),
    [items]
  )
  const totalSeparado = useMemo(
    () => items.reduce((acc, it) => acc + (separatedQty[it.id] ?? it.qtd_separada ?? 0), 0),
    [items, separatedQty]
  )

  const dryIce = useMemo(
    () =>
      calculateDryIceKg(
        totalSeparado,
        sorveteria?.gelo_seco_kg_por_lote,
        sorveteria?.gelo_seco_qtd_picoles
      ),
    [totalSeparado, sorveteria?.gelo_seco_kg_por_lote, sorveteria?.gelo_seco_qtd_picoles]
  )

  const canSeparate =
    jornada?.status === 'carga_solicitada' || jornada?.status === 'pedido_alterado'

  const handleConfirmSeparation = async () => {
    if (!jornada) return
    setSaving(true)
    setErrorMsg(null)

    try {
      const updates = items.map((item) =>
        supabase
          .from('jornada_itens')
          .update({
            qtd_separada: separatedQty[item.id] ?? item.qtd_pedida,
            conferido_sorveteiro: false,
          })
          .eq('id', item.id)
      )

      const results = await Promise.all(updates)
      const failed = results.find((r) => r.error)
      if (failed?.error) {
        setErrorMsg(`Erro ao salvar quantidades: ${failed.error.message}`)
        setSaving(false)
        return
      }

      const { error: jErr } = await supabase
        .from('jornadas')
        .update({
          status: 'carga_separada',
          bloqueado_edicao_sorveteiro: false,
          gelo_seco_sugerido_kg: dryIce.kg,
        })
        .eq('id', jornada.id)

      if (jErr) {
        setErrorMsg(`Erro ao atualizar status da jornada: ${jErr.message}`)
        setSaving(false)
        return
      }

      setJornada((prev) =>
        prev
          ? {
              ...prev,
              status: 'carga_separada',
              bloqueado_edicao_sorveteiro: false,
              gelo_seco_sugerido_kg: dryIce.kg,
            }
          : prev
      )
      setConfirmedNow(true)
    } catch {
      setErrorMsg('Erro inesperado ao confirmar separação.')
    } finally {
      setSaving(false)
    }
  }

  const jornadaUrl = id ? `${window.location.origin}/jornada/${id}` : ''
  const whatsAppUrl = buildWhatsAppUrl(
    jornada?.sorveteiro?.telefone_whatsapp,
    `Sua carga de sorvetes está pronta para retirada\n${jornadaUrl}`
  )

  return (
    <Layout>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/sorveteria/jornadas"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-ocean-800 hover:text-ocean-950"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para fila de romaneios</span>
        </Link>

        {jornada && (jornada.status === 'sobras_registrada' || jornada.status === 'jornada_finalizada') && (
          <Link to={`/sorveteria/jornadas/${jornada.id}/fechamento`} className="btn-primary">
            <ClipboardCheck className="h-5 w-5" />
            <span>Ir para Conferência de Sobras</span>
          </Link>
        )}
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
          {/* Header Card */}
          <div className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-extrabold text-ocean-800">
                    #{jornada.codigo_curto || jornada.id.slice(0, 6).toUpperCase()}
                  </span>
                  <JornadaStatusBadge status={jornada.status} />
                </div>
                <h1 className="mt-2 text-2xl font-extrabold text-slate-950">
                  {jornada.sorveteiro?.nome || 'Sorveteiro'}
                </h1>
                <p className="mt-0.5 text-sm font-semibold text-slate-600">
                  Marca: <strong className="text-slate-900">{jornada.marca?.nome || '—'}</strong>
                  {jornada.sorveteiro?.praia_atuacao && (
                    <> · Praia: {jornada.sorveteiro.praia_atuacao}</>
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl bg-slate-100 px-4 py-2.5">
                  <p className="text-xs font-bold uppercase text-slate-500">Pedido</p>
                  <p className="text-2xl font-black text-slate-950">{totalPedido}</p>
                </div>
                <div className="rounded-xl bg-ocean-100 px-4 py-2.5">
                  <p className="text-xs font-bold uppercase text-ocean-800">Separado</p>
                  <p className="text-2xl font-black text-ocean-950">{totalSeparado}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-3.5 py-2.5 text-sm font-extrabold text-sky-950">
              <Snowflake className="h-5 w-5 shrink-0 text-sky-700" />
              <span>
                Sugestão de Gelo Seco: {dryIce.formattedKg} kg (base: {dryIce.formattedBaseKg} kg /{' '}
                {dryIce.qtdPicoles} picolés)
              </span>
            </div>

            {canSeparate && jornada.bloqueado_edicao_sorveteiro && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">
                <Lock className="h-5 w-5 shrink-0 text-amber-700" />
                <span>
                  Edição bloqueada para o sorveteiro enquanto você separa esta carga.
                </span>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success + WhatsApp CTA */}
          {(confirmedNow || jornada.status === 'carga_separada') && (
            <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-emerald-700" />
                <div className="flex-1">
                  <h2 className="text-lg font-extrabold text-emerald-950">
                    Separação confirmada com sucesso!
                  </h2>
                  <p className="mt-1 text-sm font-medium text-emerald-900">
                    Envie o link abaixo pelo WhatsApp para o sorveteiro conferir e confirmar a
                    retirada da carga.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <a
                      href={whatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-whatsapp w-full sm:w-auto"
                    >
                      <MessageCircle className="h-5 w-5" />
                      <span>Enviar via WhatsApp para Sorveteiro</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Items list strictly ordered by categoria_ordem ASC, sabor_ordem ASC */}
          <div className="space-y-4">
            {grouped.map((group) => (
              <div key={`${group.categoria_ordem}-${group.categoria_nome}`} className="card overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-100 px-4 py-3">
                  <h2 className="text-base font-extrabold text-slate-950">
                    {formatCategoryTitle(group.categoria_ordem, group.categoria_nome)}
                  </h2>
                </div>

                <div className="divide-y divide-slate-100">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-base font-extrabold text-slate-950">
                          {formatFlavorLabel(item.categoria_ordem, item.sabor_ordem, item.sabor_nome)}
                        </p>
                        <p className="text-xs font-bold text-slate-500">
                          Solicitado pelo sorveteiro:{' '}
                          <span className="text-slate-900">{item.qtd_pedida}</span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <span className="text-xs font-extrabold uppercase text-slate-500 sm:hidden">
                          Separado
                        </span>
                        <QuantityStepper
                          value={separatedQty[item.id] ?? 0}
                          disabled={!canSeparate || saving}
                          label={`Separado ${item.sabor_nome}`}
                          onChange={(val) =>
                            setSeparatedQty((prev) => ({ ...prev, [item.id]: val }))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sticky Confirm Action */}
          {canSeparate && (
            <div className="sticky bottom-16 z-20 rounded-2xl border-2 border-ocean-200 bg-white/95 p-4 shadow-lg backdrop-blur md:bottom-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase text-slate-500">
                    Total separado para retirada
                  </p>
                  <p className="text-2xl font-black text-ocean-900">
                    {totalSeparado} picolés
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleConfirmSeparation}
                  className="btn-success w-full sm:w-auto"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Confirmando...</span>
                    </>
                  ) : (
                    <>
                      <PackageCheck className="h-5 w-5" />
                      <span>Confirmar Separação</span>
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
