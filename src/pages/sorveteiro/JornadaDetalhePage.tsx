import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Edit3,
  Fingerprint,
  KeyRound,
  Loader2,
  Lock,
  Save,
  Sun,
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
import {
  hasRegisteredBiometrics,
  isBiometricsAvailable,
  registerBiometrics,
  verifyBiometrics,
} from '../../lib/webauthn'
import type { CategoriaSabor, Jornada, JornadaItem, Sabor } from '../../types/database'

interface EditableRow {
  sabor_id: string
  item_id?: string
  categoria_nome: string
  categoria_ordem: number
  sabor_nome: string
  sabor_ordem: number
  qtd_pedida: number
}

export function JornadaDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const { user, perfil } = useAuth()
  const navigate = useNavigate()

  const [jornada, setJornada] = useState<Jornada | null>(null)
  const [items, setItems] = useState<JornadaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Edit mode (for carga_solicitada unlocked OR "Adicionar/Alterar itens" from carga_separada)
  const [editMode, setEditMode] = useState(false)
  const [editRows, setEditRows] = useState<EditableRow[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

  // Final withdrawal confirmation modal (password or WebAuthn biometrics)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmingRetirada, setConfirmingRetirada] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [bioAvailable, setBioAvailable] = useState(false)
  const [bioRegistered, setBioRegistered] = useState(false)
  const [justConfirmedRetirada, setJustConfirmedRetirada] = useState(false)

  useEffect(() => {
    isBiometricsAvailable().then((avail) => {
      setBioAvailable(avail)
      if (avail && user?.id) {
        setBioRegistered(hasRegisteredBiometrics(user.id))
      }
    })
  }, [user?.id])

  const loadData = useCallback(async () => {
    if (!id) return
    const [{ data: jData, error: jErr }, { data: iData }] = await Promise.all([
      supabase
        .from('jornadas')
        .select('*, marca:marcas(id, nome), sorveteria:sorveterias(id, nome, whatsapp)')
        .eq('id', id)
        .single(),
      supabase.from('jornada_itens').select('*').eq('jornada_id', id),
    ])

    if (jErr || !jData) {
      setErrorMsg('Jornada não encontrada.')
      setLoading(false)
      return
    }

    const typedJornada = jData as Jornada

    // If a sorveteria user opens /jornada/:id via WhatsApp link, redirect to back-office view
    if (perfil?.role === 'sorveteria') {
      if (
        typedJornada.status === 'sobras_registrada' ||
        typedJornada.status === 'jornada_finalizada'
      ) {
        navigate(`/sorveteria/jornadas/${typedJornada.id}/fechamento`, { replace: true })
      } else {
        navigate(`/sorveteria/jornadas/${typedJornada.id}`, { replace: true })
      }
      return
    }

    setJornada(typedJornada)
    setItems(sortNumericItems((iData ?? []) as JornadaItem[]))
    setLoading(false)
  }, [id, perfil?.role, navigate])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Realtime subscription so lock/separation updates reflect live
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`sorveteiro-jornada-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jornadas', filter: `id=eq.${id}` },
        (payload) => {
          const next = payload.new as Partial<Jornada>
          setJornada((prev) => (prev ? { ...prev, ...next } : prev))
          if (next.bloqueado_edicao_sorveteiro) {
            setEditMode(false)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jornada_itens', filter: `jornada_id=eq.${id}` },
        () => {
          loadData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, loadData])

  const groupedItems = useMemo(() => groupNumericItems(items), [items])
  const groupedEditRows = useMemo(() => groupNumericItems(editRows), [editRows])

  const separatedItems = useMemo(
    () => items.filter((it) => (it.qtd_separada || 0) > 0),
    [items]
  )

  const allSeparatedChecked = useMemo(() => {
    if (separatedItems.length === 0) return false
    return separatedItems.every((it) => it.conferido_sorveteiro)
  }, [separatedItems])

  const totalPedido = useMemo(
    () => items.reduce((sum, it) => sum + (it.qtd_pedida || 0), 0),
    [items]
  )
  const totalSeparado = useMemo(
    () => items.reduce((sum, it) => sum + (it.qtd_separada || 0), 0),
    [items]
  )

  const openEditMode = async () => {
    if (!jornada) return
    if (jornada.bloqueado_edicao_sorveteiro) return
    setLoadingCatalog(true)
    setErrorMsg(null)

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
    const existingBySabor = new Map(items.map((it) => [it.sabor_id, it]))

    const rows: EditableRow[] = []
    for (const s of sabs) {
      const cat = catMap.get(s.categoria_id)
      if (!cat) continue
      const existing = existingBySabor.get(s.id)
      rows.push({
        sabor_id: s.id,
        item_id: existing?.id,
        categoria_nome: cat.nome,
        categoria_ordem: cat.ordem,
        sabor_nome: s.nome,
        sabor_ordem: s.ordem,
        qtd_pedida: existing?.qtd_pedida ?? 0,
      })
    }

    // Ensure any existing item whose flavor was later deactivated still appears
    for (const it of items) {
      if (!rows.some((r) => r.sabor_id === it.sabor_id)) {
        rows.push({
          sabor_id: it.sabor_id,
          item_id: it.id,
          categoria_nome: it.categoria_nome,
          categoria_ordem: it.categoria_ordem,
          sabor_nome: it.sabor_nome,
          sabor_ordem: it.sabor_ordem,
          qtd_pedida: it.qtd_pedida,
        })
      }
    }

    setEditRows(sortNumericItems(rows))
    setEditMode(true)
    setLoadingCatalog(false)
  }

  const handleSaveEdit = async () => {
    if (!jornada) return
    const nonZero = editRows.filter((r) => r.qtd_pedida > 0)
    if (nonZero.length === 0) {
      setErrorMsg('Mantenha pelo menos 1 picolé no pedido.')
      return
    }

    setSavingEdit(true)
    setErrorMsg(null)

    try {
      // Check if anything actually changed
      const existingMap = new Map(items.map((it) => [it.sabor_id, it]))
      let changed = false

      for (const row of editRows) {
        const prev = existingMap.get(row.sabor_id)
        if ((prev?.qtd_pedida ?? 0) !== row.qtd_pedida) {
          changed = true
          break
        }
      }

      if (!changed) {
        setEditMode(false)
        setSavingEdit(false)
        return
      }

      // Check lock status on server before writing
      const { data: freshJ } = await supabase
        .from('jornadas')
        .select('bloqueado_edicao_sorveteiro, status')
        .eq('id', jornada.id)
        .single()

      if (freshJ?.bloqueado_edicao_sorveteiro) {
        setErrorMsg('A sorveteria já iniciou a separação da sua carga. Edição bloqueada.')
        setJornada((prev) => (prev ? { ...prev, bloqueado_edicao_sorveteiro: true } : prev))
        setEditMode(false)
        setSavingEdit(false)
        return
      }

      const toDeleteIds = editRows
        .filter((r) => r.item_id && r.qtd_pedida === 0)
        .map((r) => r.item_id as string)

      const toUpdate = editRows.filter((r) => r.item_id && r.qtd_pedida > 0)
      const toInsert = editRows.filter((r) => !r.item_id && r.qtd_pedida > 0)

      if (toDeleteIds.length > 0) {
        await supabase.from('jornada_itens').delete().in('id', toDeleteIds)
      }

      if (toUpdate.length > 0) {
        await Promise.all(
          toUpdate.map((r) =>
            supabase
              .from('jornada_itens')
              .update({
                qtd_pedida: r.qtd_pedida,
                conferido_sorveteiro: false,
              })
              .eq('id', r.item_id!)
          )
        )
      }

      if (toInsert.length > 0) {
        await supabase.from('jornada_itens').insert(
          toInsert.map((r) => ({
            jornada_id: jornada.id,
            sabor_id: r.sabor_id,
            categoria_nome: r.categoria_nome,
            categoria_ordem: r.categoria_ordem,
            sabor_nome: r.sabor_nome,
            sabor_ordem: r.sabor_ordem,
            qtd_pedida: r.qtd_pedida,
            qtd_separada: 0,
            conferido_sorveteiro: false,
            qtd_restante_caixa: 0,
            qtd_devolvida_final: 0,
          }))
        )
      }

      // If it was already separated, changing items sets status to pedido_alterado
      if (jornada.status === 'carga_separada') {
        await supabase
          .from('jornadas')
          .update({ status: 'pedido_alterado' })
          .eq('id', jornada.id)
      }

      await loadData()
      setEditMode(false)
    } catch {
      setErrorMsg('Erro ao salvar alterações do pedido.')
    } finally {
      setSavingEdit(false)
    }
  }

  const toggleItemChecked = async (item: JornadaItem) => {
    const next = !item.conferido_sorveteiro
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, conferido_sorveteiro: next } : it))
    )
    await supabase
      .from('jornada_itens')
      .update({ conferido_sorveteiro: next })
      .eq('id', item.id)
  }

  const finalizeRetirada = async (metodo: 'senha' | 'biometria') => {
    if (!jornada) return

    // Initialize qtd_restante_caixa = qtd_separada for all items
    await Promise.all(
      items.map((it) =>
        supabase
          .from('jornada_itens')
          .update({
            conferido_sorveteiro: true,
            qtd_restante_caixa: it.qtd_separada,
          })
          .eq('id', it.id)
      )
    )

    const nowIso = new Date().toISOString()
    const { error } = await supabase
      .from('jornadas')
      .update({
        status: 'carga_confirmada',
        confirmado_retirada_em: nowIso,
        metodo_confirmacao_retirada: metodo,
      })
      .eq('id', jornada.id)

    if (error) {
      setConfirmError(`Erro ao confirmar retirada: ${error.message}`)
      return
    }

    setJornada((prev) =>
      prev
        ? {
            ...prev,
            status: 'carga_confirmada',
            confirmado_retirada_em: nowIso,
            metodo_confirmacao_retirada: metodo,
          }
        : prev
    )
    setShowConfirmModal(false)
    setConfirmPassword('')
    setJustConfirmedRetirada(true)
  }

  const handleConfirmWithPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.email) {
      setConfirmError('E-mail do usuário não encontrado na sessão.')
      return
    }
    setConfirmingRetirada(true)
    setConfirmError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: confirmPassword,
    })

    if (error) {
      setConfirmError('Senha incorreta. Digite sua senha de acesso à plataforma.')
      setConfirmingRetirada(false)
      return
    }

    await finalizeRetirada('senha')
    setConfirmingRetirada(false)
  }

  const handleConfirmWithBiometrics = async () => {
    if (!user?.id || !user.email) return
    setConfirmingRetirada(true)
    setConfirmError(null)
    try {
      let ok = false
      if (!bioRegistered) {
        ok = await registerBiometrics(user.id, user.email, perfil?.nome || 'Sorveteiro')
        if (ok) setBioRegistered(true)
      } else {
        ok = await verifyBiometrics(user.id)
      }
      if (!ok) {
        setConfirmError('Não foi possível validar a biometria. Use sua senha.')
        setConfirmingRetirada(false)
        return
      }
      await finalizeRetirada('biometria')
    } catch {
      setConfirmError('Biometria cancelada ou indisponível. Confirme com sua senha.')
    } finally {
      setConfirmingRetirada(false)
    }
  }

  // Celebratory screen immediately after confirming withdrawal
  if (justConfirmedRetirada && jornada) {
    return (
      <Layout>
        <div className="mx-auto max-w-lg py-6">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-ocean-800 p-8 text-center text-white shadow-xl">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-sun-400 text-ocean-950 shadow-lg">
              <Sun className="h-11 w-11 stroke-[2.5]" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">
              Boas vendas, {perfil?.nome || 'Sorveteiro'}!
            </h1>
            <p className="mt-3 text-base font-semibold text-emerald-50">
              Retirada de <strong>{totalSeparado} picolés</strong> ({jornada.marca?.nome})
              confirmada com sucesso.
            </p>
            <Link
              to={`/jornada/${jornada.id}/sobras`}
              className="mt-7 inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-base font-black text-ocean-950 shadow-md hover:bg-slate-100"
            >
              <span>Controlar Estoque na Caixa / Sobras</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/app"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-ocean-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Minhas jornadas</span>
        </Link>

        {jornada &&
          (jornada.status === 'carga_confirmada' ||
            jornada.status === 'sobras_registrada' ||
            jornada.status === 'jornada_finalizada') && (
            <Link to={`/jornada/${jornada.id}/sobras`} className="btn-primary">
              <span>Ir para Estoque / Sobras</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          )}
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
              {jornada.marca?.nome || 'Romaneio'}
            </h1>
            <p className="mt-0.5 text-sm font-semibold text-slate-600">
              Total pedido: <strong className="text-slate-950">{totalPedido}</strong>
              {totalSeparado > 0 && (
                <>
                  {' '}
                  · Total separado: <strong className="text-ocean-800">{totalSeparado}</strong>
                </>
              )}
            </p>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Lock Warning */}
          {jornada.bloqueado_edicao_sorveteiro && (
            <div className="flex items-start gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-amber-950">
              <Lock className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" />
              <div>
                <p className="text-base font-extrabold">
                  A sorveteria já iniciou a separação da sua carga. Edição bloqueada.
                </p>
                <p className="mt-1 text-sm font-medium text-amber-900">
                  Aguarde a conclusão da separação para conferir e retirar seus picolés.
                </p>
              </div>
            </div>
          )}

          {/* EDIT MODE */}
          {editMode ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-ocean-200 bg-ocean-50 p-4 text-sm font-bold text-ocean-950">
                {jornada.status === 'carga_separada'
                  ? 'Atenção: ao alterar qualquer quantidade, o pedido voltará para a sorveteria com status "Pedido alterado" para nova conferência.'
                  : 'Altere as quantidades desejadas e toque em Salvar Alterações.'}
              </div>

              {groupedEditRows.map((group) => (
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
                        <span className="text-base font-bold text-slate-950">
                          {formatFlavorLabel(row.categoria_ordem, row.sabor_ordem, row.sabor_nome)}
                        </span>
                        <QuantityStepper
                          value={row.qtd_pedida}
                          label={row.sabor_nome}
                          onChange={(val) =>
                            setEditRows((prev) =>
                              prev.map((r) =>
                                r.sabor_id === row.sabor_id ? { ...r, qtd_pedida: val } : r
                              )
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="sticky bottom-16 z-20 grid grid-cols-2 gap-3 rounded-2xl border-2 border-ocean-200 bg-white/95 p-4 shadow-lg backdrop-blur md:bottom-4">
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => setEditMode(false)}
                  className="btn-secondary w-full"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={handleSaveEdit}
                  className="btn-primary w-full"
                >
                  {savingEdit ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="h-5 w-5" />
                  )}
                  <span>Salvar Pedido</span>
                </button>
              </div>
            </div>
          ) : jornada.status === 'carga_separada' ? (
            /* CASE B: CARGA SEPARADA — Cross-Check Table + Checkbox + Alterar button */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-300 bg-sky-50 p-4">
                <div>
                  <h2 className="text-base font-extrabold text-sky-950">
                    Conferência de Retirada
                  </h2>
                  <p className="text-sm font-medium text-sky-900">
                    Marque o checkbox de cada sabor conforme conferir fisicamente na caixa.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={loadingCatalog}
                  onClick={openEditMode}
                  className="btn-secondary w-full text-sm sm:w-auto"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Adicionar/Alterar itens do pedido</span>
                </button>
              </div>

              {groupedItems.map((group) => (
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
                    <table className="w-full text-left">
                      <thead className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase text-slate-600">
                        <tr>
                          <th className="px-4 py-2.5">Sabor</th>
                          <th className="px-3 py-2.5 text-center">Pedido</th>
                          <th className="px-3 py-2.5 text-center">Separado</th>
                          <th className="px-4 py-2.5 text-center">Conferido</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {group.items.map((item) => {
                          const hasSeparated = (item.qtd_separada || 0) > 0
                          const diff = item.qtd_separada !== item.qtd_pedida
                          return (
                            <tr
                              key={item.id}
                              onClick={() => hasSeparated && toggleItemChecked(item)}
                              className={`cursor-pointer transition-colors ${
                                item.conferido_sorveteiro
                                  ? 'bg-emerald-50/70'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="px-4 py-3.5 text-sm font-extrabold text-slate-950 sm:text-base">
                                {formatFlavorLabel(
                                  item.categoria_ordem,
                                  item.sabor_ordem,
                                  item.sabor_nome
                                )}
                              </td>
                              <td className="px-3 py-3.5 text-center text-base font-bold text-slate-600">
                                {item.qtd_pedida}
                              </td>
                              <td className="px-3 py-3.5 text-center">
                                <span
                                  className={`inline-block rounded-lg px-2.5 py-1 text-base font-black ${
                                    diff
                                      ? 'bg-amber-100 text-amber-950'
                                      : 'bg-ocean-100 text-ocean-950'
                                  }`}
                                >
                                  {item.qtd_separada}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                {hasSeparated ? (
                                  <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={item.conferido_sorveteiro}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleItemChecked(item)
                                    }}
                                    className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl border-2 transition-colors ${
                                      item.conferido_sorveteiro
                                        ? 'border-emerald-700 bg-emerald-600 text-white'
                                        : 'border-slate-400 bg-white text-transparent'
                                    }`}
                                  >
                                    <Check className="h-6 w-6 stroke-[3]" />
                                  </button>
                                ) : (
                                  <span className="text-xs font-bold text-slate-400">—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* Sticky Final Confirmation */}
              <div className="sticky bottom-16 z-20 rounded-2xl border-2 border-emerald-300 bg-white/95 p-4 shadow-lg backdrop-blur md:bottom-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-extrabold uppercase text-slate-500">
                      Itens conferidos
                    </p>
                    <p className="text-lg font-black text-slate-950">
                      {separatedItems.filter((i) => i.conferido_sorveteiro).length} de{' '}
                      {separatedItems.length} sabores
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!allSeparatedChecked}
                    onClick={() => {
                      setConfirmError(null)
                      setShowConfirmModal(true)
                    }}
                    className="btn-success w-full sm:w-auto"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Confirmar Retirada da Carga</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* CASE A / C: Solicitada / Pedido Alterado / Confirmada */
            <div className="space-y-4">
              {(jornada.status === 'carga_solicitada' || jornada.status === 'pedido_alterado') &&
                !jornada.bloqueado_edicao_sorveteiro && (
                  <button
                    type="button"
                    disabled={loadingCatalog}
                    onClick={openEditMode}
                    className="btn-secondary w-full sm:w-auto"
                  >
                    <Edit3 className="h-5 w-5" />
                    <span>{loadingCatalog ? 'Carregando...' : 'Editar quantidades do pedido'}</span>
                  </button>
                )}

              {groupedItems.map((group) => (
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
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <span className="text-base font-bold text-slate-900">
                          {formatFlavorLabel(
                            item.categoria_ordem,
                            item.sabor_ordem,
                            item.sabor_nome
                          )}
                        </span>
                        <span className="rounded-xl bg-slate-100 px-3.5 py-1.5 text-base font-black text-slate-950">
                          {jornada.status === 'carga_solicitada' ||
                          jornada.status === 'pedido_alterado'
                            ? item.qtd_pedida
                            : item.qtd_separada}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Password / Biometrics Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/65 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black text-slate-950">Assinar Retirada da Carga</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Confirme sua identidade para registrar a retirada de{' '}
              <strong>{totalSeparado} picolés</strong>.
            </p>

            {confirmError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-900">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <span>{confirmError}</span>
              </div>
            )}

            {bioAvailable && (
              <div className="mt-4">
                <button
                  type="button"
                  disabled={confirmingRetirada}
                  onClick={handleConfirmWithBiometrics}
                  className="btn-primary w-full bg-slate-900 hover:bg-slate-800"
                >
                  <Fingerprint className="h-5 w-5 text-sun-400" />
                  <span>
                    {bioRegistered
                      ? 'Confirmar com Biometria'
                      : 'Ativar e Confirmar com Biometria'}
                  </span>
                </button>
                <div className="my-4 flex items-center gap-3 text-xs font-bold uppercase text-slate-400">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span>ou com sua senha</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
              </div>
            )}

            <form onSubmit={handleConfirmWithPassword} className="mt-3 space-y-4">
              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-1.5 block text-sm font-bold text-slate-800"
                >
                  Senha da plataforma
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={confirmingRetirada}
                  onClick={() => setShowConfirmModal(false)}
                  className="btn-secondary w-full"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={confirmingRetirada || !confirmPassword}
                  className="btn-success w-full"
                >
                  {confirmingRetirada ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <KeyRound className="h-5 w-5" />
                  )}
                  <span>Confirmar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
