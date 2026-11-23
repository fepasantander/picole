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
  Plus,
  Snowflake,
  X,
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
import type {
  CategoriaSabor,
  Jornada,
  JornadaItem,
  JornadaItemInsert,
  Sabor,
} from '../../types/database'

interface SeparationRow {
  rowKey: string
  item_id?: string
  sabor_id: string
  categoria_nome: string
  categoria_ordem: number
  sabor_nome: string
  sabor_ordem: number
  qtd_pedida: number
  isNewSuggestion?: boolean
}

interface CatalogFlavorOption {
  sabor_id: string
  categoria_nome: string
  categoria_ordem: number
  sabor_nome: string
  sabor_ordem: number
}

export function SorveteriaSeparacaoPage() {
  const { id } = useParams<{ id: string }>()
  const { sorveteria } = useAuth()
  const [jornada, setJornada] = useState<Jornada | null>(null)
  const [rows, setRows] = useState<SeparationRow[]>([])
  const [separatedQty, setSeparatedQty] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmedNow, setConfirmedNow] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Modal: Sugerir novo sabor do catálogo
  const [showCatalogModal, setShowCatalogModal] = useState(false)
  const [catalogOptions, setCatalogOptions] = useState<CatalogFlavorOption[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(false)

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
    const sortedItems = sortNumericItems((iData ?? []) as JornadaItem[])

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

    const mappedRows: SeparationRow[] = sortedItems.map((it) => ({
      rowKey: it.id,
      item_id: it.id,
      sabor_id: it.sabor_id,
      categoria_nome: it.categoria_nome,
      categoria_ordem: it.categoria_ordem,
      sabor_nome: it.sabor_nome,
      sabor_ordem: it.sabor_ordem,
      qtd_pedida: it.qtd_pedida,
    }))

    const initialMap: Record<string, number> = {}
    const shouldPrefillPedida =
      typedJornada.status === 'carga_solicitada' || typedJornada.status === 'pedido_alterado'
    for (const item of sortedItems) {
      initialMap[item.id] = shouldPrefillPedida ? item.qtd_pedida : item.qtd_separada
    }

    setJornada(typedJornada)
    setRows(mappedRows)
    setSeparatedQty(initialMap)
    if (iErr) setErrorMsg('Erro ao carregar itens do romaneio.')
    setLoading(false)
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const grouped = useMemo(() => groupNumericItems(rows), [rows])

  const totalPedido = useMemo(
    () => rows.reduce((acc, it) => acc + (it.qtd_pedida || 0), 0),
    [rows]
  )
  const totalSeparado = useMemo(
    () => rows.reduce((acc, it) => acc + (separatedQty[it.rowKey] ?? 0), 0),
    [rows, separatedQty]
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

  const openSuggestFlavorModal = async () => {
    if (!jornada) return
    setShowCatalogModal(true)
    setLoadingCatalog(true)

    const [{ data: catData }, { data: sabData }] = await Promise.all([
      supabase
        .from('categorias_sabores')
        .select('*')
        .eq('marca_id', jornada.marca_id)
        .eq('ativa', true)
        .order('ordem', { ascending: true }),
      supabase
        .from('sabores')
        .select('*')
        .eq('marca_id', jornada.marca_id)
        .eq('ativo', true)
        .order('ordem', { ascending: true }),
    ])

    const cats = (catData ?? []) as CategoriaSabor[]
    const sabs = (sabData ?? []) as Sabor[]
    const catMap = new Map(cats.map((c) => [c.id, c]))
    const existingSaborIds = new Set(rows.map((r) => r.sabor_id))

    const opts: CatalogFlavorOption[] = []
    for (const s of sabs) {
      if (existingSaborIds.has(s.id)) continue
      const cat = catMap.get(s.categoria_id)
      if (!cat) continue
      opts.push({
        sabor_id: s.id,
        categoria_nome: cat.nome,
        categoria_ordem: cat.ordem,
        sabor_nome: s.nome,
        sabor_ordem: s.ordem,
      })
    }

    setCatalogOptions(sortNumericItems(opts))
    setLoadingCatalog(false)
  }

  const handleAddSuggestedFlavor = (opt: CatalogFlavorOption) => {
    const key = `new-${opt.sabor_id}`
    const newRow: SeparationRow = {
      rowKey: key,
      sabor_id: opt.sabor_id,
      categoria_nome: opt.categoria_nome,
      categoria_ordem: opt.categoria_ordem,
      sabor_nome: opt.sabor_nome,
      sabor_ordem: opt.sabor_ordem,
      qtd_pedida: 0,
      isNewSuggestion: true,
    }
    setRows((prev) => sortNumericItems([...prev, newRow]))
    setSeparatedQty((prev) => ({ ...prev, [key]: 1 }))
    setCatalogOptions((prev) => prev.filter((o) => o.sabor_id !== opt.sabor_id))
  }

  const handleConfirmSeparation = async () => {
    if (!jornada) return
    setSaving(true)
    setErrorMsg(null)

    try {
      const existingRows = rows.filter((r) => Boolean(r.item_id))
      const newRows = rows.filter((r) => !r.item_id && (separatedQty[r.rowKey] ?? 0) > 0)

      if (existingRows.length > 0) {
        const results = await Promise.all(
          existingRows.map((row) =>
            supabase
              .from('jornada_itens')
              .update({
                qtd_separada: Math.trunc(Number(separatedQty[row.rowKey] ?? 0)),
                conferido_sorveteiro: false,
              })
              .eq('id', row.item_id!)
          )
        )
        const failed = results.find((r) => r.error)
        if (failed?.error) {
          setErrorMsg(`Erro ao salvar quantidades: ${failed.error.message}`)
          setSaving(false)
          return
        }
      }

      if (newRows.length > 0) {
        const inserts: JornadaItemInsert[] = newRows.map((row) => ({
          jornada_id: jornada.id,
          sabor_id: row.sabor_id,
          categoria_nome: row.categoria_nome,
          categoria_ordem: Math.trunc(Number(row.categoria_ordem)),
          sabor_nome: row.sabor_nome,
          sabor_ordem: Math.trunc(Number(row.sabor_ordem)),
          qtd_pedida: 0,
          qtd_separada: Math.trunc(Number(separatedQty[row.rowKey] ?? 0)),
          conferido_sorveteiro: false,
          qtd_restante_caixa: 0,
          qtd_devolvida_final: 0,
        }))

        const { error: insertErr } = await supabase.from('jornada_itens').insert(inserts)
        if (insertErr) {
          setErrorMsg(`Erro ao inserir novos sabores sugeridos: ${insertErr.message}`)
          setSaving(false)
          return
        }
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

      await loadData()
      setConfirmedNow(true)
    } catch {
      setErrorMsg('Erro inesperado ao confirmar separação.')
    } finally {
      setSaving(false)
    }
  }

  const groupedCatalogOptions = useMemo(
    () => groupNumericItems(catalogOptions),
    [catalogOptions]
  )

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

        {jornada &&
          (jornada.status === 'sobras_registrada' || jornada.status === 'jornada_finalizada') && (
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
                  <JornadaStatusBadge jornada={jornada} />
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
                Sugestão de Gelo Seco: {dryIce.displayLabel} (base: {dryIce.formattedBaseKg} kg /{' '}
                {dryIce.qtdPicoles} picolés)
              </span>
            </div>

            {canSeparate && jornada.bloqueado_edicao_sorveteiro && (
              <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">
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

          {/* Button: + Sugerir novo sabor do catálogo */}
          {canSeparate && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={openSuggestFlavorModal}
                className="btn-secondary w-full border-ocean-300 bg-ocean-50 text-ocean-950 hover:bg-ocean-100 sm:w-auto"
              >
                <Plus className="h-5 w-5 text-ocean-700" />
                <span>+ Sugerir novo sabor do catálogo</span>
              </button>
            </div>
          )}

          {/* Items list strictly ordered by categoria_ordem ASC, sabor_ordem ASC */}
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
                  {group.items.map((row) => {
                    const currentSep = separatedQty[row.rowKey] ?? 0
                    const isNew = row.qtd_pedida === 0
                    const isIncreased = !isNew && currentSep > row.qtd_pedida

                    return (
                      <div
                        key={row.rowKey}
                        className={`flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between ${
                          isNew ? 'border-l-4 border-l-emerald-500 bg-emerald-50/40' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-base font-extrabold text-slate-950">
                            {formatFlavorLabel(row.categoria_ordem, row.sabor_ordem, row.sabor_nome)}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs font-bold">
                            <span className="text-slate-500">
                              Solicitado:{' '}
                              <strong className="text-slate-900">{row.qtd_pedida}</strong>
                            </span>
                            {isNew && (
                              <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-900">
                                Novo sabor sugerido
                              </span>
                            )}
                            {isIncreased && (
                              <span className="rounded bg-sky-100 px-2 py-0.5 text-sky-900">
                                +{currentSep - row.qtd_pedida} acréscimo sugerido
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <span className="text-xs font-extrabold uppercase text-slate-500 sm:hidden">
                            Separado
                          </span>
                          <QuantityStepper
                            value={currentSep}
                            disabled={!canSeparate || saving}
                            label={`Separado ${row.sabor_nome}`}
                            onChange={(val) =>
                              setSeparatedQty((prev) => ({ ...prev, [row.rowKey]: val }))
                            }
                          />
                        </div>
                      </div>
                    )
                  })}
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
                  <p className="text-2xl font-black text-ocean-900">{totalSeparado} picolés</p>
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

      {/* Modal: Sugerir novo sabor do catálogo */}
      {showCatalogModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-950">
                  Sugerir novo sabor ({jornada?.marca?.nome})
                </h2>
                <p className="text-xs font-medium text-slate-500">
                  Toque em um sabor para adicioná-lo à separação.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingCatalog ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-7 w-7 animate-spin text-ocean-700" />
                </div>
              ) : groupedCatalogOptions.length === 0 ? (
                <p className="py-8 text-center text-sm font-bold text-slate-600">
                  Todos os sabores ativos desta marca já estão no romaneio.
                </p>
              ) : (
                <div className="space-y-3">
                  {groupedCatalogOptions.map((g) => (
                    <div key={`${g.categoria_ordem}-${g.categoria_nome}`} className="card overflow-hidden">
                      <div className="bg-slate-100 px-3 py-2 text-xs font-extrabold text-ocean-900">
                        {formatCategoryTitle(g.categoria_ordem, g.categoria_nome)}
                      </div>
                      <div className="divide-y divide-slate-100">
                        {g.items.map((opt) => (
                          <button
                            key={opt.sabor_id}
                            type="button"
                            onClick={() => handleAddSuggestedFlavor(opt)}
                            className="flex min-h-[48px] w-full items-center justify-between px-3 py-2.5 text-left hover:bg-ocean-50"
                          >
                            <span className="text-sm font-bold text-slate-900">
                              {formatFlavorLabel(
                                opt.categoria_ordem,
                                opt.sabor_ordem,
                                opt.sabor_nome
                              )}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-lg bg-ocean-700 px-2.5 py-1 text-xs font-extrabold text-white">
                              <Plus className="h-3.5 w-3.5" /> Adicionar
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 p-4">
              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="btn-secondary w-full"
              >
                Concluir seleção
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
