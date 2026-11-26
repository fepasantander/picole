import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Ban,
  CheckCircle2,
  Clock,
  Edit3,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldAlert,
  Snowflake,
  UserPlus,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Layout } from '../../components/Layout'
import { QuantityStepper } from '../../components/QuantityStepper'
import {
  SorveteriaCascadeSelector,
  type CascadeSelection,
} from '../../components/SorveteriaCascadeSelector'
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
  Sorveteria,
  SorveteriaUnidade,
  SorveteiroVinculo,
  StatusAprovacao,
} from '../../types/database'

interface CatalogRow {
  sabor_id: string
  categoria_nome: string
  categoria_ordem: number
  sabor_nome: string
  sabor_ordem: number
}

export function NovaJornadaPage() {
  const { user, perfil, refreshPerfil } = useAuth()

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Cascata UF -> Cidade -> Marca (Sorveteria) -> Unidade
  const [estado, setEstado] = useState(perfil?.estado || '')
  const [cidade, setCidade] = useState(perfil?.cidade || '')
  const [selectedSorveteriaId, setSelectedSorveteriaId] = useState(perfil?.sorveteria_id || '')
  const [selectedUnidadeId, setSelectedUnidadeId] = useState(perfil?.unidade_id || '')
  const [hasUnidades, setHasUnidades] = useState(false)

  // Dados da sorveteria / unidade / vínculo selecionados
  const [selectedSorveteria, setSelectedSorveteria] = useState<Sorveteria | null>(null)
  const [selectedUnidade, setSelectedUnidade] = useState<SorveteriaUnidade | null>(null)
  const [vinculo, setVinculo] = useState<SorveteiroVinculo | null>(null)
  const [loadingContext, setLoadingContext] = useState(false)
  const [requestingAccess, setRequestingAccess] = useState(false)
  const [checkingApproval, setCheckingApproval] = useState(false)

  // Marcas e sabores da sorveteria selecionada
  const [marcas, setMarcas] = useState<Marca[]>([])
  const [selectedMarca, setSelectedMarca] = useState<Marca | null>(null)
  const [catalogRows, setCatalogRows] = useState<CatalogRow[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [loadingCatalog, setLoadingCatalog] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [createdJornadaId, setCreatedJornadaId] = useState<string | null>(null)
  const [createdShortCode, setCreatedShortCode] = useState<string | null>(null)

  const handleCascadeChange = useCallback((next: CascadeSelection) => {
    setEstado(next.estado)
    setCidade(next.cidade)
    setHasUnidades(next.hasUnidades)
    setSelectedUnidadeId(next.unidadeId)
    setSelectedSorveteriaId((prev) => {
      if (prev !== next.sorveteriaId) {
        // Zera sabores/quantidades ao trocar de empresa para nunca misturar
        setSelectedMarca(null)
        setCatalogRows([])
        setQuantities({})
      }
      return next.sorveteriaId
    })
  }, [])

  // Carrega sorveteria, marcas ativas e status de vínculo sempre que selectedSorveteriaId mudar
  const loadSorveteriaContext = useCallback(async () => {
    if (!selectedSorveteriaId || !perfil?.id) {
      setSelectedSorveteria(null)
      setMarcas([])
      setVinculo(null)
      return
    }
    setLoadingContext(true)
    setErrorMsg(null)

    const [{ data: sorvData }, { data: marcasData }, { data: vincData }] = await Promise.all([
      supabase.from('sorveterias').select('*').eq('id', selectedSorveteriaId).maybeSingle(),
      supabase
        .from('marcas')
        .select('*')
        .eq('sorveteria_id', selectedSorveteriaId)
        .eq('ativa', true)
        .order('ordem', { ascending: true }),
      supabase
        .from('sorveteiro_vinculos')
        .select('*')
        .eq('sorveteiro_id', perfil.id)
        .eq('sorveteria_id', selectedSorveteriaId)
        .maybeSingle(),
    ])

    setSelectedSorveteria((sorvData as Sorveteria | null) ?? null)
    setMarcas((marcasData ?? []) as Marca[])
    setVinculo((vincData as SorveteiroVinculo | null) ?? null)
    setLoadingContext(false)
  }, [selectedSorveteriaId, perfil?.id])

  useEffect(() => {
    loadSorveteriaContext()
  }, [loadSorveteriaContext])

  // Carrega dados da unidade selecionada (ex.: whatsapp e nome)
  useEffect(() => {
    if (!selectedUnidadeId) {
      setSelectedUnidade(null)
      return
    }
    let active = true
    supabase
      .from('sorveteria_unidades')
      .select('*')
      .eq('id', selectedUnidadeId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setSelectedUnidade((data as SorveteriaUnidade | null) ?? null)
      })
    return () => {
      active = false
    }
  }, [selectedUnidadeId])

  // Status efetivo na sorveteria selecionada (compatível com cadastros legados antes de sorveteiro_vinculos)
  const effectiveStatus: StatusAprovacao | 'nao_vinculado' = useMemo(() => {
    if (vinculo) return vinculo.status_aprovacao
    if (
      selectedSorveteriaId &&
      selectedSorveteriaId === perfil?.sorveteria_id &&
      perfil?.status_aprovacao === 'aprovado'
    ) {
      return 'aprovado'
    }
    return 'nao_vinculado'
  }, [vinculo, selectedSorveteriaId, perfil?.sorveteria_id, perfil?.status_aprovacao])

  const handleSolicitarLiberacao = async () => {
    if (!perfil?.id || !selectedSorveteriaId) return
    setRequestingAccess(true)
    setErrorMsg(null)

    const { data, error } = await supabase
      .from('sorveteiro_vinculos')
      .upsert(
        {
          sorveteiro_id: perfil.id,
          sorveteria_id: selectedSorveteriaId,
          unidade_id: selectedUnidadeId || null,
          status_aprovacao: 'pendente',
        },
        { onConflict: 'sorveteiro_id,sorveteria_id' }
      )
      .select('*')
      .single()

    if (error) {
      setErrorMsg(`Erro ao solicitar liberação: ${error.message}`)
    } else if (data) {
      setVinculo(data as SorveteiroVinculo)
    }
    setRequestingAccess(false)
  }

  const handleVerificarAprovacao = async () => {
    setCheckingApproval(true)
    await loadSorveteriaContext()
    setCheckingApproval(false)
  }

  const handleSelectMarca = async (marca: Marca) => {
    if (hasUnidades && !selectedUnidadeId) {
      setErrorMsg('Selecione a Unidade de retirada antes de escolher a linha de produtos.')
      return
    }
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
        selectedSorveteria?.gelo_seco_kg_por_lote,
        selectedSorveteria?.gelo_seco_qtd_picoles
      ),
    [
      totalPicoles,
      selectedSorveteria?.gelo_seco_kg_por_lote,
      selectedSorveteria?.gelo_seco_qtd_picoles,
    ]
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
    if (!perfil?.id || !selectedSorveteriaId || !selectedMarca || selectedRows.length === 0) return
    setSubmitting(true)
    setErrorMsg(null)

    try {
      const jornadaPayload: JornadaInsert = {
        sorveteria_id: selectedSorveteriaId,
        unidade_id: selectedUnidadeId || null,
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

      // Memoriza a última sorveteria/unidade usada no perfil do sorveteiro
      await supabase
        .from('perfis')
        .update({
          sorveteria_id: selectedSorveteriaId,
          unidade_id: selectedUnidadeId || null,
          estado: estado ? estado.toUpperCase() : perfil.estado,
          cidade: cidade || perfil.cidade,
        })
        .eq('id', perfil.id)

      await refreshPerfil()

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

  const targetWhatsAppPhone =
    selectedUnidade?.whatsapp ||
    selectedSorveteria?.whatsapp ||
    selectedSorveteria?.responsavel_whatsapp ||
    null

  const approvalWhatsAppHref = targetWhatsAppPhone
    ? buildWhatsAppUrl(
        targetWhatsAppPhone,
        `Olá! Sou ${perfil?.nome || 'sorveteiro'} (${
          user?.email || ''
        }) e solicitei liberação para retirar picolés na ${selectedSorveteria?.nome || ''}${
          selectedUnidade ? ` (${selectedUnidade.nome})` : ''
        } pelo app Picolé na Praia.`
      )
    : null

  const jornadaLink = createdJornadaId ? `${window.location.origin}/jornada/${createdJornadaId}` : ''
  const whatsAppHref = buildWhatsAppUrl(
    targetWhatsAppPhone,
    `Olá! Acabei de solicitar minha carga de sorvetes (${selectedMarca?.nome || ''}${
      selectedUnidade ? ` · ${selectedUnidade.nome}` : ''
    } — ${totalPicoles} picolés).\nCódigo: #${createdShortCode || ''}\nAcompanhe o romaneio: ${jornadaLink}`
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
            {['1. Unidade & Marca', '2. Sabores', '3. Revisão'].map((label, idx) => {
              const num = idx + 1
              const active = step >= num
              return (
                <div
                  key={label}
                  className={`rounded-xl px-2 py-2 text-center text-xs font-extrabold ${
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

      {/* STEP 1: UF -> Cidade -> Marca (Sorveteria) -> Unidade + Status de Vínculo + Linha */}
      {step === 1 && (
        <section className="space-y-5">
          <div className="card p-5">
            <h1 className="text-xl font-black text-slate-950 sm:text-2xl">
              Onde você vai retirar esta carga?
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Você pode manter sua última unidade ou trocar livremente de cidade, sorveteria e
              unidade a cada jornada.
            </p>

            <div className="mt-4">
              <SorveteriaCascadeSelector
                value={{
                  estado,
                  cidade,
                  sorveteriaId: selectedSorveteriaId,
                  unidadeId: selectedUnidadeId,
                }}
                onChange={handleCascadeChange}
              />
            </div>
          </div>

          {selectedSorveteriaId && (
            <>
              {loadingContext ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-ocean-700" />
                </div>
              ) : effectiveStatus === 'nao_vinculado' ? (
                /* Sem vínculo ainda nesta sorveteria */
                <div className="card border-2 border-amber-300 bg-amber-50/70 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                    <ShieldAlert className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-black text-slate-950">
                    Você ainda não está habilitado na {selectedSorveteria?.nome}
                  </h2>
                  <p className="mt-1.5 text-sm font-medium text-slate-700">
                    Solicite liberação abaixo para retirar picolés nesta sorveteria. Seu acesso nas
                    outras sorveterias onde você já é aprovado continua funcionando normalmente.
                  </p>
                  <div className="mt-5 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
                    <button
                      type="button"
                      disabled={requestingAccess || (hasUnidades && !selectedUnidadeId)}
                      onClick={handleSolicitarLiberacao}
                      className="btn-primary w-full sm:w-auto"
                    >
                      {requestingAccess ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <UserPlus className="h-5 w-5" />
                      )}
                      <span>Solicitar liberação nesta sorveteria</span>
                    </button>
                  </div>
                  {hasUnidades && !selectedUnidadeId && (
                    <p className="mt-2 text-xs font-bold text-amber-900">
                      Selecione a Unidade acima para solicitar liberação.
                    </p>
                  )}
                </div>
              ) : effectiveStatus === 'pendente' ? (
                /* Vínculo pendente nesta sorveteria */
                <div className="card border-2 border-sky-300 bg-sky-50/70 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-800">
                    <Clock className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-black text-slate-950">
                    Cadastro aguardando liberação da {selectedSorveteria?.nome}
                  </h2>
                  <p className="mt-1.5 text-sm font-medium text-slate-700">
                    Assim que a sorveteria aprovar seu vínculo, os sabores serão liberados aqui
                    automaticamente.
                  </p>
                  <div className="mt-5 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
                    <button
                      type="button"
                      disabled={checkingApproval}
                      onClick={handleVerificarAprovacao}
                      className="btn-primary w-full sm:w-auto"
                    >
                      <RefreshCw
                        className={`h-5 w-5 ${checkingApproval ? 'animate-spin' : ''}`}
                      />
                      <span>Verificar aprovação agora</span>
                    </button>
                    {approvalWhatsAppHref && (
                      <a
                        href={approvalWhatsAppHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-whatsapp w-full sm:w-auto"
                      >
                        <MessageCircle className="h-5 w-5" />
                        <span>Avisar no WhatsApp da Sorveteria</span>
                      </a>
                    )}
                  </div>
                </div>
              ) : effectiveStatus === 'bloqueado' ? (
                /* Vínculo bloqueado nesta sorveteria */
                <div className="card border-2 border-red-300 bg-red-50/70 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-700">
                    <Ban className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-black text-red-950">
                    Acesso suspenso na {selectedSorveteria?.nome}
                  </h2>
                  <p className="mt-1.5 text-sm font-medium text-red-900">
                    Seu vínculo com esta marca está bloqueado no momento. Entre em contato com o
                    responsável da sorveteria ou selecione outra marca acima.
                  </p>
                </div>
              ) : (
                /* Aprovado! Liberar seleção da linha/marca de picolés */
                <div>
                  <h2 className="text-lg font-extrabold text-slate-950">
                    Escolha a linha de picolés ({selectedSorveteria?.nome})
                  </h2>
                  <p className="mt-0.5 text-sm font-medium text-slate-600">
                    {hasUnidades && !selectedUnidadeId
                      ? 'Selecione a Unidade de retirada acima para continuar.'
                      : 'Toque na marca abaixo para montar seu pedido na ordem da câmara fria.'}
                  </p>

                  {marcas.length === 0 ? (
                    <div className="card mt-4 p-8 text-center">
                      <p className="text-base font-bold text-slate-700">
                        Nenhuma marca ativa encontrada nesta sorveteria.
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Peça à sorveteria para ativar as marcas no painel de catálogo.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {marcas.map((marca) => (
                        <button
                          key={marca.id}
                          type="button"
                          disabled={hasUnidades && !selectedUnidadeId}
                          onClick={() => handleSelectMarca(marca)}
                          className="card flex min-h-[76px] items-center justify-between p-5 text-left transition-all hover:border-ocean-500 hover:bg-ocean-50/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="text-lg font-extrabold text-slate-950">
                            {marca.nome}
                          </span>
                          <ArrowRight className="h-5 w-5 text-ocean-700" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
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
                {selectedSorveteria?.nome}
                {selectedUnidade ? ` · ${selectedUnidade.nome}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-secondary min-h-[44px] px-4 py-2 text-sm"
            >
              Trocar unidade / marca
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
              {selectedSorveteria?.nome}
              {selectedUnidade ? ` · ${selectedUnidade.nome}` : ''} ({cidade}/{estado})
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
                Sugestão de Gelo Seco: {dryIce.displayLabel} (base: {dryIce.formattedBaseKg} kg /{' '}
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
              picolés de {selectedMarca?.nome} — {selectedSorveteria?.nome}
              {selectedUnidade ? ` · ${selectedUnidade.nome}` : ''}) registrado e aguardando
              avaliação de estoque.
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
