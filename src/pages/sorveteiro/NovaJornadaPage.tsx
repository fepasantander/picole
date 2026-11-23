import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Edit3,
  Loader2,
  MessageCircle,
  Send,
  Snowflake,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Layout } from '../../components/Layout'
import { QuantityStepper } from '../../components/QuantityStepper'
import {
  formatCategoryTitle,
  formatFlavorLabel,
  groupNumericItems,
} from '../../lib/ordering'
import { buildWhatsAppUrl, calculateDryIceKg } from '../../lib/format'
import type {
  CategoriaSabor,
  JornadaInsert,
  JornadaItemInsert,
  Marca,
  Sabor,
} from '../../types/database'

interface CatalogRow {
  sabor_id: string
  categoria_nome: string
  categoria_ordem: number
  sabor_nome: string
  sabor_ordem: number
}

export function NovaJornadaPage() {
  const { perfil, sorveteria } = useAuth()

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [marcas, setMarcas] = useState<Marca[]>([])
  const [selectedMarca, setSelectedMarca] = useState<Marca | null>(null)
  const [catalogRows, setCatalogRows] = useState<CatalogRow[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const [loadingMarcas, setLoadingMarcas] = useState(true)
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [createdJornadaId, setCreatedJornadaId] = useState<string | null>(null)
  const [createdShortCode, setCreatedShortCode] = useState<string | null>(null)

  useEffect(() => {
    async function loadMarcas() {
      if (!perfil?.sorveteria_id) return
      setLoadingMarcas(true)
      const { data } = await supabase
        .from('marcas')
        .select('*')
        .eq('sorveteria_id', perfil.sorveteria_id)
        .eq('ativa', true)
        .order('ordem', { ascending: true })

      setMarcas((data ?? []) as Marca[])
      setLoadingMarcas(false)
    }
    loadMarcas()
  }, [perfil?.sorveteria_id])

  const handleSelectMarca = async (marca: Marca) => {
    setSelectedMarca(marca)
    setErrorMsg(null)
    setLoadingCatalog(true)
    setStep(2)

    const [{ data: catData }, { data: sabData }] = await Promise.all([
      supabase
        .from('categorias_sabores')
        .select('*')
        .eq('marca_id', marca.id)
        .eq('ativa', true)
        .order('ordem', { ascending: true }),
      supabase
        .from('sabores')
        .select('*')
        .eq('marca_id', marca.id)
        .eq('ativo', true)
        .order('ordem', { ascending: true }),
    ])

    const cats = (catData ?? []) as CategoriaSabor[]
    const sabs = (sabData ?? []) as Sabor[]
    const catMap = new Map(cats.map((c) => [c.id, c]))

    const rows: CatalogRow[] = []
    for (const s of sabs) {
      const cat = catMap.get(s.categoria_id)
      if (!cat) continue
      rows.push({
        sabor_id: s.id,
        categoria_nome: cat.nome,
        categoria_ordem: cat.ordem,
        sabor_nome: s.nome,
        sabor_ordem: s.ordem,
      })
    }

    setCatalogRows(rows)
    setQuantities({})
    setLoadingCatalog(false)
  }

  const groupedAll = useMemo(() => groupNumericItems(catalogRows), [catalogRows])

  const selectedRows = useMemo(
    () => catalogRows.filter((r) => (quantities[r.sabor_id] ?? 0) > 0),
    [catalogRows, quantities]
  )

  const groupedSelected = useMemo(() => groupNumericItems(selectedRows), [selectedRows])

  const totalPicoles = useMemo(
    () => selectedRows.reduce((sum, r) => sum + (quantities[r.sabor_id] ?? 0), 0),
    [selectedRows, quantities]
  )

  const dryIce = useMemo(
    () =>
      calculateDryIceKg(
        totalPicoles,
        sorveteria?.gelo_seco_kg_por_lote,
        sorveteria?.gelo_seco_qtd_picoles
      ),
    [totalPicoles, sorveteria?.gelo_seco_kg_por_lote, sorveteria?.gelo_seco_qtd_picoles]
  )

  const formatSupabaseError = (
    prefix: string,
    err: { message?: string; details?: string | null; hint?: string | null } | null
  ) => {
    if (!err) return `${prefix}: tente novamente.`
    const parts = [err.message, err.details, err.hint].filter(Boolean)
    return `${prefix}: ${parts.join(' | ')}`
  }

  const handleConfirmPedido = async () => {
    if (!perfil?.sorveteria_id || !selectedMarca || selectedRows.length === 0) return
    setSubmitting(true)
    setErrorMsg(null)

    try {
      const jornadaPayload: JornadaInsert = {
        sorveteria_id: perfil.sorveteria_id,
        sorveteiro_id: perfil.id,
        marca_id: selectedMarca.id,
        status: 'carga_solicitada',
        bloqueado_edicao_sorveteiro: false,
        gelo_seco_sugerido_kg: dryIce.kg,
      }

      const { data: jornadaData, error: jErr } = await supabase
        .from('jornadas')
        .insert(jornadaPayload)
        .select('id, codigo_curto')
        .single()

      if (jErr || !jornadaData) {
        console.error('Erro ao inserir jornada:', jErr)
        setErrorMsg(formatSupabaseError('Erro ao criar pedido', jErr))
        setSubmitting(false)
        return
      }

      const itemsPayload: JornadaItemInsert[] = selectedRows.map((row) => ({
        jornada_id: jornadaData.id,
        sabor_id: row.sabor_id,
        categoria_nome: row.categoria_nome,
        categoria_ordem: Math.trunc(Number(row.categoria_ordem)),
        sabor_nome: row.sabor_nome,
        sabor_ordem: Math.trunc(Number(row.sabor_ordem)),
        qtd_pedida: Math.trunc(Number(quantities[row.sabor_id] ?? 0)),
        qtd_separada: 0,
        conferido_sorveteiro: false,
        qtd_restante_caixa: 0,
        qtd_devolvida_final: 0,
      }))

      const { error: itemsErr } = await supabase.from('jornada_itens').insert(itemsPayload)
      if (itemsErr) {
        console.error('Erro ao inserir jornada_itens:', itemsErr)
        setErrorMsg(formatSupabaseError('Pedido criado, mas erro ao salvar itens', itemsErr))
        setSubmitting(false)
        return
      }

      setCreatedJornadaId(jornadaData.id)
      setCreatedShortCode(jornadaData.codigo_curto || jornadaData.id.slice(0, 6).toUpperCase())
      setStep(4)
    } catch (err) {
      console.error('Erro inesperado ao enviar pedido:', err)
      setErrorMsg('Erro inesperado ao enviar pedido.')
    } finally {
      setSubmitting(false)
    }
  }

  const jornadaLink = createdJornadaId ? `${window.location.origin}/jornada/${createdJornadaId}` : ''
  const whatsAppHref = buildWhatsAppUrl(
    sorveteria?.whatsapp,
    `Olá! Acabei de solicitar minha carga de sorvetes (${selectedMarca?.nome || ''} - ${totalPicoles} picolés).\nCódigo: #${createdShortCode || ''}\nAcompanhe o romaneio: ${jornadaLink}`
  )

  return (
    <Layout>
      {/* Stepper Indicator */}
      {step < 4 && (
        <div className="mb-5">
          <div className="mb-3 flex items-center justify-between">
            <Link
              to="/app"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-ocean-800"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar</span>
            </Link>
            <span className="rounded-full bg-ocean-100 px-3 py-1 text-xs font-extrabold text-ocean-900">
              Passo {step} de 3
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {['1. Marca', '2. Sabores', '3. Revisão'].map((label, idx) => {
              const num = idx + 1
              const active = step >= num
              return (
                <div
                  key={label}
                  className={`rounded-xl px-3 py-2 text-center text-xs font-extrabold ${
                    active ? 'bg-ocean-700 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {label}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: Choose Active Brand */}
      {step === 1 && (
        <section>
          <h1 className="text-2xl font-extrabold text-slate-950">Escolha a marca</h1>
          <p className="mt-1 text-sm font-medium text-slate-600">
            Selecione a marca de picolés para montar o seu romaneio de carga.
          </p>

          {loadingMarcas ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-ocean-700" />
            </div>
          ) : marcas.length === 0 ? (
            <div className="card mt-5 p-8 text-center">
              <p className="text-base font-bold text-slate-700">
                Nenhuma marca ativa encontrada nesta sorveteria.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Peça à sorveteria para ativar as marcas no painel de catálogo.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {marcas.map((marca) => (
                <button
                  key={marca.id}
                  type="button"
                  onClick={() => handleSelectMarca(marca)}
                  className="card flex min-h-[76px] items-center justify-between p-5 text-left transition-all hover:border-ocean-500 hover:bg-ocean-50/40 active:scale-[0.99]"
                >
                  <span className="text-lg font-extrabold text-slate-950">{marca.nome}</span>
                  <ArrowRight className="h-5 w-5 text-ocean-700" />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* STEP 2: Choose Quantities in Strict Numeric Order */}
      {step === 2 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-950">
                {selectedMarca?.nome} — Escolha as quantidades
              </h1>
              <p className="text-sm font-medium text-slate-600">
                Informe quantos picolés de cada sabor você deseja retirar.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-secondary min-h-[44px] px-4 py-2 text-sm"
            >
              Trocar marca
            </button>
          </div>

          {loadingCatalog ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-ocean-700" />
            </div>
          ) : groupedAll.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-base font-bold text-slate-700">
                Nenhum sabor ativo cadastrado para {selectedMarca?.nome}.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedAll.map((group) => (
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
                    {group.items.map((row) => (
                      <div
                        key={row.sabor_id}
                        className="flex flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <p className="text-base font-bold text-slate-950">
                          {formatFlavorLabel(row.categoria_ordem, row.sabor_ordem, row.sabor_nome)}
                        </p>
                        <QuantityStepper
                          value={quantities[row.sabor_id] ?? 0}
                          label={row.sabor_nome}
                          onChange={(val) =>
                            setQuantities((prev) => ({ ...prev, [row.sabor_id]: val }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sticky Review Footer */}
          <div className="sticky bottom-16 z-20 rounded-2xl border-2 border-ocean-200 bg-white/95 p-4 shadow-lg backdrop-blur md:bottom-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase text-slate-500">Total do pedido</p>
                <p className="text-2xl font-black text-ocean-900">
                  {totalPicoles} picolés{' '}
                  <span className="text-sm font-bold text-slate-500">
                    ({selectedRows.length} {selectedRows.length === 1 ? 'sabor' : 'sabores'})
                  </span>
                </p>
              </div>
              <button
                type="button"
                disabled={totalPicoles === 0}
                onClick={() => setStep(3)}
                className="btn-primary w-full sm:w-auto"
              >
                <span>Revisar Pedido</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* STEP 3: Review Screen (only qtd_pedida > 0 in strict numeric order) */}
      {step === 3 && (
        <section className="space-y-5">
          <div className="card p-5">
            <h1 className="text-2xl font-extrabold text-slate-950">Revisão do Pedido</h1>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Confira os sabores e quantidades antes de enviar para a sorveteria.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ocean-50 px-4 py-3">
              <span className="text-sm font-extrabold text-ocean-950">
                Marca: {selectedMarca?.nome}
              </span>
              <span className="text-xl font-black text-ocean-900">
                Total: {totalPicoles} picolés
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-3.5 py-2.5 text-sm font-extrabold text-sky-950">
              <Snowflake className="h-5 w-5 shrink-0 text-sky-700" />
              <span>
                Sugestão de Gelo Seco: {dryIce.formattedKg} kg (base: {dryIce.formattedBaseKg} kg /{' '}
                {dryIce.qtdPicoles} picolés)
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {groupedSelected.map((group) => (
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
                  {group.items.map((row) => (
                    <div
                      key={row.sabor_id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <span className="text-base font-bold text-slate-900">
                        {formatFlavorLabel(row.categoria_ordem, row.sabor_ordem, row.sabor_nome)}
                      </span>
                      <span className="rounded-xl bg-ocean-100 px-3.5 py-1.5 text-lg font-black text-ocean-950">
                        {quantities[row.sabor_id]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setStep(2)}
              className="btn-secondary w-full"
            >
              <Edit3 className="h-5 w-5" />
              <span>Editar quantidades</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirmPedido}
              className="btn-success w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Enviando pedido...</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  <span>Confirmar Pedido</span>
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* STEP 4: Success + WhatsApp Share */}
      {step === 4 && createdJornadaId && (
        <section className="mx-auto max-w-lg">
          <div className="card p-6 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <h1 className="text-2xl font-black text-slate-950">Pedido enviado com sucesso!</h1>
            <p className="mt-2 text-base font-medium text-slate-700">
              Romaneio <strong className="font-mono">#{createdShortCode}</strong> ({totalPicoles}{' '}
              picolés de {selectedMarca?.nome}) registrado e aguardando separação.
            </p>

            <div className="mt-6 space-y-3">
              <a
                href={whatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp w-full"
              >
                <MessageCircle className="h-5 w-5" />
                <span>Compartilhar com Sorveteria via WhatsApp</span>
              </a>

              <Link to={`/jornada/${createdJornadaId}`} className="btn-primary w-full">
                <span>Acompanhar minha jornada</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>
      )}
    </Layout>
  )
}
