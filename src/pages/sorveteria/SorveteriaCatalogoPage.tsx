import React, { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Edit2,
  KeyRound,
  Loader2,
  Plus,
  Power,
  Save,
  Snowflake,
  Trash2,
  X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Layout } from '../../components/Layout'
import type { CategoriaSabor, Marca, Sabor, Sorveteria } from '../../types/database'

const PRESET_MARCAS = [
  'Ky-sabor',
  'Frutverão',
  'Ice Queen',
  'Nestlé',
  'Kibon',
  'Los Los',
  'Carvalho',
  'Napoleta',
  'Oggi',
]

interface SorveteriaCatalogoPageProps {
  sorveteriaOverride?: Sorveteria | null
  embedded?: boolean
}

export function SorveteriaCatalogoPage({
  sorveteriaOverride,
  embedded = false,
}: SorveteriaCatalogoPageProps = {}) {
  const { user, perfil, sorveteria: authSorveteria, refreshPerfil } = useAuth()
  const activeSorveteria = sorveteriaOverride !== undefined ? sorveteriaOverride : authSorveteria
  const activeSorveteriaId = activeSorveteria?.id ?? perfil?.sorveteria_id ?? null
  const showBrandPanel = embedded || perfil?.role === 'superadmin'

  const [marcas, setMarcas] = useState<Marca[]>([])
  const [selectedMarcaId, setSelectedMarcaId] = useState<string | null>(null)
  const [categorias, setCategorias] = useState<CategoriaSabor[]>([])
  const [sabores, setSabores] = useState<Sabor[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingBrandData, setLoadingBrandData] = useState(false)

  // Parâmetro de Gelo Seco
  const [geloKgPorLote, setGeloKgPorLote] = useState<string>('1')
  const [geloQtdPicoles, setGeloQtdPicoles] = useState<string>('100')
  const [savingGelo, setSavingGelo] = useState(false)
  const [geloSavedMsg, setGeloSavedMsg] = useState<string | null>(null)
  const [geloErrorMsg, setGeloErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (activeSorveteria) {
      setGeloKgPorLote(String(activeSorveteria.gelo_seco_kg_por_lote ?? 1))
      setGeloQtdPicoles(String(activeSorveteria.gelo_seco_qtd_picoles ?? 100))
    }
  }, [activeSorveteria])

  const handleSaveGeloSeco = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeSorveteriaId) return
    const kg = parseFloat(geloKgPorLote.replace(',', '.'))
    const qtd = parseInt(geloQtdPicoles, 10)
    if (!Number.isFinite(kg) || kg <= 0 || !Number.isFinite(qtd) || qtd <= 0) {
      setGeloErrorMsg('Informe valores numéricos maiores que zero para kg e quantidade de picolés.')
      return
    }

    setSavingGelo(true)
    setGeloSavedMsg(null)
    setGeloErrorMsg(null)

    const { data, error } = await supabase
      .from('sorveterias')
      .update({
        gelo_seco_kg_por_lote: kg,
        gelo_seco_qtd_picoles: qtd,
      })
      .eq('id', activeSorveteriaId)
      .select('id, gelo_seco_kg_por_lote, gelo_seco_qtd_picoles')
      .single()

    if (error || !data) {
      const isNoRows = error?.code === 'PGRST116' || (!error && !data)
      setGeloErrorMsg(
        isNoRows
          ? 'Nenhuma alteração foi persistida no banco (verifique permissões RLS de atualização na tabela sorveterias).'
          : `Erro ao salvar proporção de gelo seco: ${error?.message || 'tente novamente.'}`
      )
      setSavingGelo(false)
      return
    }

    setGeloKgPorLote(String(data.gelo_seco_kg_por_lote ?? kg))
    setGeloQtdPicoles(String(data.gelo_seco_qtd_picoles ?? qtd))
    await refreshPerfil()
    setGeloSavedMsg('Proporção de gelo seco atualizada com sucesso!')
    setSavingGelo(false)
  }

  // Forms
  const [newCategoriaNome, setNewCategoriaNome] = useState('')
  const [newSaborByCat, setNewSaborByCat] = useState<Record<string, string>>({})
  const [editingCat, setEditingCat] = useState<{ id: string; nome: string } | null>(null)
  const [editingSabor, setEditingSabor] = useState<{ id: string; nome: string } | null>(null)
  const [busy, setBusy] = useState(false)

  // Delete protected by password modal
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'categoria'; id: string; nome: string; saboresCount: number }
    | { type: 'sabor'; id: string; nome: string }
    | null
  >(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const loadMarcas = useCallback(async () => {
    if (!activeSorveteriaId) {
      setMarcas([])
      setSelectedMarcaId(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('marcas')
      .select('*')
      .eq('sorveteria_id', activeSorveteriaId)
      .order('ordem', { ascending: true })

    const list = (data ?? []) as Marca[]
    setMarcas(list)
    const firstActive = list.find((m) => m.ativa) ?? list[0] ?? null
    setSelectedMarcaId(firstActive?.id ?? null)
    setLoading(false)
  }, [activeSorveteriaId])

  const loadBrandCatalog = useCallback(async (marcaId: string) => {
    setLoadingBrandData(true)
    const [{ data: catData }, { data: sabData }] = await Promise.all([
      supabase
        .from('categorias_sabores')
        .select('*')
        .eq('marca_id', marcaId)
        .order('ordem', { ascending: true }),
      supabase
        .from('sabores')
        .select('*')
        .eq('marca_id', marcaId)
        .order('ordem', { ascending: true }),
    ])

    setCategorias(((catData ?? []) as CategoriaSabor[]).sort((a, b) => a.ordem - b.ordem))
    setSabores(((sabData ?? []) as Sabor[]).sort((a, b) => a.ordem - b.ordem))
    setLoadingBrandData(false)
  }, [])

  useEffect(() => {
    loadMarcas()
  }, [loadMarcas])

  useEffect(() => {
    if (selectedMarcaId) {
      loadBrandCatalog(selectedMarcaId)
    } else {
      setCategorias([])
      setSabores([])
    }
  }, [selectedMarcaId, loadBrandCatalog])

  const toggleMarca = async (marca: Marca) => {
    const next = !marca.ativa
    setMarcas((prev) => prev.map((m) => (m.id === marca.id ? { ...m, ativa: next } : m)))
    await supabase.from('marcas').update({ ativa: next }).eq('id', marca.id)
  }

  const addPresetMarca = async (nome: string) => {
    if (!activeSorveteriaId) return
    setBusy(true)
    const nextOrdem = marcas.length > 0 ? Math.max(...marcas.map((m) => m.ordem)) + 1 : 1
    const { data, error } = await supabase
      .from('marcas')
      .insert({
        sorveteria_id: activeSorveteriaId,
        nome,
        ordem: nextOrdem,
        ativa: true,
      })
      .select('*')
      .single()

    if (!error && data) {
      const created = data as Marca
      setMarcas((prev) => [...prev, created].sort((a, b) => a.ordem - b.ordem))
      setSelectedMarcaId(created.id)
    }
    setBusy(false)
  }

  const handleAddCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMarcaId || !newCategoriaNome.trim()) return
    setBusy(true)
    const nextOrdem = categorias.length > 0 ? Math.max(...categorias.map((c) => c.ordem)) + 1 : 1
    const { error } = await supabase.from('categorias_sabores').insert({
      marca_id: selectedMarcaId,
      nome: newCategoriaNome.trim(),
      ordem: nextOrdem,
      ativa: true,
    })
    if (!error) {
      setNewCategoriaNome('')
      await loadBrandCatalog(selectedMarcaId)
    }
    setBusy(false)
  }

  const handleSaveCategoriaEdit = async () => {
    if (!editingCat || !editingCat.nome.trim() || !selectedMarcaId) return
    setBusy(true)
    await supabase
      .from('categorias_sabores')
      .update({ nome: editingCat.nome.trim() })
      .eq('id', editingCat.id)
    setEditingCat(null)
    await loadBrandCatalog(selectedMarcaId)
    setBusy(false)
  }

  const toggleCategoriaAtiva = async (cat: CategoriaSabor) => {
    const next = !cat.ativa
    setCategorias((prev) => prev.map((c) => (c.id === cat.id ? { ...c, ativa: next } : c)))
    await supabase.from('categorias_sabores').update({ ativa: next }).eq('id', cat.id)
  }

  const moveCategoria = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= categorias.length || !selectedMarcaId) return
    const current = categorias[index]
    const target = categorias[targetIndex]

    setBusy(true)
    await Promise.all([
      supabase.from('categorias_sabores').update({ ordem: target.ordem }).eq('id', current.id),
      supabase.from('categorias_sabores').update({ ordem: current.ordem }).eq('id', target.id),
    ])
    await loadBrandCatalog(selectedMarcaId)
    setBusy(false)
  }

  const handleAddSabor = async (categoriaId: string) => {
    const nome = (newSaborByCat[categoriaId] ?? '').trim()
    if (!selectedMarcaId || !nome) return
    setBusy(true)
    const catSabores = sabores.filter((s) => s.categoria_id === categoriaId)
    const nextOrdem = catSabores.length > 0 ? Math.max(...catSabores.map((s) => s.ordem)) + 1 : 1

    const { error } = await supabase.from('sabores').insert({
      categoria_id: categoriaId,
      marca_id: selectedMarcaId,
      nome,
      ordem: nextOrdem,
      ativo: true,
    })

    if (!error) {
      setNewSaborByCat((prev) => ({ ...prev, [categoriaId]: '' }))
      await loadBrandCatalog(selectedMarcaId)
    }
    setBusy(false)
  }

  const handleSaveSaborEdit = async () => {
    if (!editingSabor || !editingSabor.nome.trim() || !selectedMarcaId) return
    setBusy(true)
    await supabase
      .from('sabores')
      .update({ nome: editingSabor.nome.trim() })
      .eq('id', editingSabor.id)
    setEditingSabor(null)
    await loadBrandCatalog(selectedMarcaId)
    setBusy(false)
  }

  const toggleSaborAtivo = async (sabor: Sabor) => {
    const next = !sabor.ativo
    setSabores((prev) => prev.map((s) => (s.id === sabor.id ? { ...s, ativo: next } : s)))
    await supabase.from('sabores').update({ ativo: next }).eq('id', sabor.id)
  }

  const moveSabor = async (catSabores: Sabor[], index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= catSabores.length || !selectedMarcaId) return
    const current = catSabores[index]
    const target = catSabores[targetIndex]

    setBusy(true)
    await Promise.all([
      supabase.from('sabores').update({ ordem: target.ordem }).eq('id', current.id),
      supabase.from('sabores').update({ ordem: current.ordem }).eq('id', target.id),
    ])
    await loadBrandCatalog(selectedMarcaId)
    setBusy(false)
  }

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deleteTarget || !user?.email || !selectedMarcaId) return
    setDeleting(true)
    setDeleteError(null)

    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword,
      })

      if (authErr) {
        setDeleteError('Senha incorreta. Digite sua senha de login para confirmar a exclusão.')
        setDeleting(false)
        return
      }

      if (deleteTarget.type === 'sabor') {
        const { error: delErr } = await supabase
          .from('sabores')
          .delete()
          .eq('id', deleteTarget.id)

        if (delErr) {
          const isFk =
            delErr.code === '23503' ||
            delErr.message.toLowerCase().includes('foreign key') ||
            (delErr.details ?? '').toLowerCase().includes('jornada_itens')
          setDeleteError(
            isFk
              ? 'Este sabor já está vinculado a históricos de romaneios anteriores e não pode ser excluído permanentemente. Utilize o botão de desativar (ligar/desligar) para ocultá-lo do app.'
              : `Erro ao excluir sabor: ${delErr.message}`
          )
          setDeleting(false)
          return
        }
      } else {
        // Excluir primeiro os sabores do grupo, depois o grupo
        const { error: sabDelErr } = await supabase
          .from('sabores')
          .delete()
          .eq('categoria_id', deleteTarget.id)

        if (sabDelErr) {
          const isFk =
            sabDelErr.code === '23503' ||
            sabDelErr.message.toLowerCase().includes('foreign key') ||
            (sabDelErr.details ?? '').toLowerCase().includes('jornada_itens')
          setDeleteError(
            isFk
              ? 'Um ou mais sabores deste grupo já estão vinculados a históricos de romaneios anteriores e não podem ser excluídos permanentemente. Desative o grupo usando o botão de ligar/desligar.'
              : `Erro ao excluir sabores do grupo: ${sabDelErr.message}`
          )
          setDeleting(false)
          return
        }

        const { error: catDelErr } = await supabase
          .from('categorias_sabores')
          .delete()
          .eq('id', deleteTarget.id)

        if (catDelErr) {
          setDeleteError(`Erro ao excluir grupo: ${catDelErr.message}`)
          setDeleting(false)
          return
        }
      }

      setDeleteTarget(null)
      setDeletePassword('')
      await loadBrandCatalog(selectedMarcaId)
    } catch {
      setDeleteError('Erro inesperado ao excluir item.')
    } finally {
      setDeleting(false)
    }
  }

  const activeMarcas = marcas.filter((m) => m.ativa)
  const existingNamesLower = new Set(marcas.map((m) => m.nome.toLowerCase()))
  const missingPresets = PRESET_MARCAS.filter((p) => !existingNamesLower.has(p.toLowerCase()))
  const selectedMarca = marcas.find((m) => m.id === selectedMarcaId) ?? null

  const content = (
    <>
      {/* Parâmetro de Gelo Seco */}
      <form
        onSubmit={handleSaveGeloSeco}
        className="card mb-5 space-y-3 border-sky-200 bg-sky-50/50 p-4"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-700 text-white">
              <Snowflake className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-950">Parâmetro de Gelo Seco</h2>
              <p className="text-xs font-medium text-slate-600">
                Proporção usada na sugestão automática de gelo seco nos pedidos e separações.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label
                htmlFor="gelo-kg"
                className="mb-1 block text-[11px] font-extrabold uppercase text-slate-600"
              >
                Kg por lote
              </label>
              <input
                id="gelo-kg"
                type="number"
                step="0.1"
                min="0.1"
                required
                value={geloKgPorLote}
                onChange={(e) => setGeloKgPorLote(e.target.value)}
                className="input-field min-h-[44px] w-24 py-1.5 text-center font-extrabold"
              />
            </div>
            <span className="pb-3 text-xs font-bold text-slate-600">kg a cada</span>
            <div>
              <label
                htmlFor="gelo-qtd"
                className="mb-1 block text-[11px] font-extrabold uppercase text-slate-600"
              >
                Qtd picolés
              </label>
              <input
                id="gelo-qtd"
                type="number"
                step="1"
                min="1"
                required
                value={geloQtdPicoles}
                onChange={(e) => setGeloQtdPicoles(e.target.value)}
                className="input-field min-h-[44px] w-28 py-1.5 text-center font-extrabold"
              />
            </div>
            <button
              type="submit"
              disabled={savingGelo}
              className="btn-primary min-h-[44px] px-4 py-2 text-sm"
            >
              {savingGelo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Salvar</span>
            </button>
          </div>
        </div>

        {geloSavedMsg && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-sm font-bold text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
              <span>{geloSavedMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setGeloSavedMsg(null)}
              className="text-emerald-700 hover:text-emerald-950"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {geloErrorMsg && (
          <div
            role="alert"
            className="flex items-start justify-between gap-2 rounded-xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm font-bold text-red-900"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <span>{geloErrorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setGeloErrorMsg(null)}
              className="text-red-700 hover:text-red-950"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-ocean-700" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Marcas Panel — visível apenas no Superadmin */}
          {showBrandPanel && (
            <section className="space-y-4 lg:col-span-4">
              <div className="card p-4">
                <h2 className="text-lg font-extrabold text-slate-950">Marcas</h2>
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  Ative ou desative as marcas disponíveis para os sorveteiros.
                </p>

                <div className="mt-4 space-y-2">
                  {marcas.map((marca) => {
                    const isSelected = marca.id === selectedMarcaId
                    return (
                      <div
                        key={marca.id}
                        className={`flex items-center justify-between gap-2 rounded-xl border-2 p-2.5 transition-colors ${
                          isSelected
                            ? 'border-ocean-600 bg-ocean-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedMarcaId(marca.id)}
                          className="min-h-[40px] flex-1 text-left"
                        >
                          <span className="block text-base font-extrabold text-slate-950">
                            {marca.nome}
                          </span>
                          <span
                            className={`text-xs font-bold ${
                              marca.ativa ? 'text-emerald-700' : 'text-slate-400'
                            }`}
                          >
                            {marca.ativa ? 'Ativa no app' : 'Desativada'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleMarca(marca)}
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 transition-colors ${
                            marca.ativa
                              ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'border-slate-300 bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                          title={marca.ativa ? 'Desativar marca' : 'Ativar marca'}
                        >
                          <Power className="h-5 w-5" />
                        </button>
                      </div>
                    )
                  })}
                </div>

                {missingPresets.length > 0 && (
                  <div className="mt-5 border-t border-slate-200 pt-4">
                    <p className="mb-2 text-xs font-extrabold uppercase text-slate-500">
                      Adicionar marca padrão
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {missingPresets.map((nome) => (
                        <button
                          key={nome}
                          type="button"
                          disabled={busy}
                          onClick={() => addPresetMarca(nome)}
                          className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs font-bold text-slate-800 hover:bg-ocean-50 hover:text-ocean-900"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>{nome}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Grupos de Sorvetes (Categorias) e Sabores Panel */}
          <section className={`space-y-4 ${showBrandPanel ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
            {!showBrandPanel && activeMarcas.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {activeMarcas.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMarcaId(m.id)}
                    className={`min-h-[44px] rounded-xl px-4 text-sm font-extrabold transition-colors ${
                      m.id === selectedMarcaId
                        ? 'bg-ocean-700 text-white'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {m.nome}
                  </button>
                ))}
              </div>
            )}
            {!selectedMarca ? (
              <div className="card p-8 text-center">
                <p className="text-base font-bold text-slate-700">
                  Selecione ou adicione uma marca para gerenciar categorias e sabores.
                </p>
              </div>
            ) : (
              <>
                <div className="card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-950">
                        {selectedMarca.nome}
                      </h2>
                      <p className="text-xs font-semibold text-slate-500">
                        A ordem numérica abaixo define a ordem exata em 100% das telas de romaneio.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleAddCategoria} className="mt-4 flex gap-2">
                    <input
                      type="text"
                      value={newCategoriaNome}
                      onChange={(e) => setNewCategoriaNome(e.target.value)}
                      placeholder="Nova categoria (ex: Linha Premium)"
                      className="input-field flex-1"
                    />
                    <button
                      type="submit"
                      disabled={busy || !newCategoriaNome.trim()}
                      className="btn-primary shrink-0"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="hidden sm:inline">Adicionar</span>
                    </button>
                  </form>
                </div>

                {loadingBrandData ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-ocean-700" />
                  </div>
                ) : categorias.length === 0 ? (
                  <div className="card p-8 text-center text-sm font-semibold text-slate-600">
                    Nenhuma categoria cadastrada para {selectedMarca.nome}.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {categorias.map((cat, catIdx) => {
                      const catSabores = sabores
                        .filter((s) => s.categoria_id === cat.id)
                        .sort((a, b) => a.ordem - b.ordem)

                      return (
                        <div key={cat.id} className="card overflow-hidden">
                          {/* Category Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-100 px-4 py-3">
                            {editingCat?.id === cat.id ? (
                              <div className="flex flex-1 items-center gap-2">
                                <input
                                  type="text"
                                  value={editingCat.nome}
                                  onChange={(e) =>
                                    setEditingCat({ ...editingCat, nome: e.target.value })
                                  }
                                  className="input-field min-h-[42px] py-1.5"
                                />
                                <button
                                  type="button"
                                  onClick={handleSaveCategoriaEdit}
                                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700 text-white"
                                >
                                  <Check className="h-5 w-5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCat(null)}
                                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-200 text-slate-700"
                                >
                                  <X className="h-5 w-5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg bg-ocean-700 px-2 text-sm font-extrabold text-white">
                                  {cat.ordem}
                                </span>
                                <h3
                                  className={`text-base font-extrabold ${
                                    cat.ativa ? 'text-slate-950' : 'text-slate-400 line-through'
                                  }`}
                                >
                                  {cat.nome}
                                </h3>
                              </div>
                            )}

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={busy || catIdx === 0}
                                onClick={() => moveCategoria(catIdx, -1)}
                                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-30"
                                title="Mover categoria para cima"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={busy || catIdx === categorias.length - 1}
                                onClick={() => moveCategoria(catIdx, 1)}
                                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-30"
                                title="Mover categoria para baixo"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCat({ id: cat.id, nome: cat.nome })}
                                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700"
                                title="Editar categoria"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleCategoriaAtiva(cat)}
                                className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
                                  cat.ativa
                                    ? 'border-emerald-600 bg-emerald-600 text-white'
                                    : 'border-slate-300 bg-white text-slate-400'
                                }`}
                                title={cat.ativa ? 'Desativar grupo' : 'Ativar grupo'}
                              >
                                <Power className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteError(null)
                                  setDeletePassword('')
                                  setDeleteTarget({
                                    type: 'categoria',
                                    id: cat.id,
                                    nome: cat.nome,
                                    saboresCount: catSabores.length,
                                  })
                                }}
                                className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50"
                                title="Excluir grupo"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Sabores List */}
                          <div className="divide-y divide-slate-100">
                            {catSabores.map((sabor, sIdx) => (
                              <div
                                key={sabor.id}
                                className="flex items-center justify-between gap-2 px-4 py-2.5"
                              >
                                {editingSabor?.id === sabor.id ? (
                                  <div className="flex flex-1 items-center gap-2">
                                    <input
                                      type="text"
                                      value={editingSabor.nome}
                                      onChange={(e) =>
                                        setEditingSabor({ ...editingSabor, nome: e.target.value })
                                      }
                                      className="input-field min-h-[40px] py-1"
                                    />
                                    <button
                                      type="button"
                                      onClick={handleSaveSaborEdit}
                                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-700 text-white"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingSabor(null)}
                                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200 text-slate-700"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex min-w-0 items-center gap-2">
                                    <span className="shrink-0 font-mono text-xs font-extrabold text-ocean-800">
                                      {cat.ordem}.{sabor.ordem}
                                    </span>
                                    <span
                                      className={`truncate text-sm font-bold ${
                                        sabor.ativo ? 'text-slate-900' : 'text-slate-400 line-through'
                                      }`}
                                    >
                                      {sabor.nome}
                                    </span>
                                  </div>
                                )}

                                <div className="flex shrink-0 items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={busy || sIdx === 0}
                                    onClick={() => moveSabor(catSabores, sIdx, -1)}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30"
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy || sIdx === catSabores.length - 1}
                                    onClick={() => moveSabor(catSabores, sIdx, 1)}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30"
                                  >
                                    <ArrowDown className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingSabor({ id: sabor.id, nome: sabor.nome })
                                    }
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleSaborAtivo(sabor)}
                                    className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                                      sabor.ativo
                                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-200 bg-slate-100 text-slate-400'
                                    }`}
                                    title={sabor.ativo ? 'Desativar sabor' : 'Ativar sabor'}
                                  >
                                    <Power className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeleteError(null)
                                      setDeletePassword('')
                                      setDeleteTarget({
                                        type: 'sabor',
                                        id: sabor.id,
                                        nome: sabor.nome,
                                      })
                                    }}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50"
                                    title="Excluir sabor"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Add Sabor */}
                          <div className="border-t border-slate-200 bg-slate-50 p-3">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newSaborByCat[cat.id] ?? ''}
                                onChange={(e) =>
                                  setNewSaborByCat((prev) => ({
                                    ...prev,
                                    [cat.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleAddSabor(cat.id)
                                  }
                                }}
                                placeholder={`Adicionar sabor em ${cat.ordem}. ${cat.nome}...`}
                                className="input-field min-h-[44px] flex-1 py-2 text-sm"
                              />
                              <button
                                type="button"
                                disabled={busy || !(newSaborByCat[cat.id] ?? '').trim()}
                                onClick={() => handleAddSabor(cat.id)}
                                className="btn-secondary min-h-[44px] shrink-0 px-4 py-2 text-sm"
                              >
                                <Plus className="h-4 w-4" />
                                <span>Sabor</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {/* Modal de CUIDADO: Exclusão protegida por senha */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border-2 border-red-300 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-3.5 text-red-950">
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
              <div>
                <h2 className="text-lg font-black text-red-800">CUIDADO: Ação irreversível!</h2>
                <p className="mt-1 text-xs font-semibold text-red-900">
                  {deleteTarget.type === 'categoria'
                    ? `Você está prestes a excluir permanentemente o grupo "${deleteTarget.nome}"${
                        deleteTarget.saboresCount > 0
                          ? ` e todos os seus ${deleteTarget.saboresCount} sabor(es)`
                          : ''
                      } do catálogo.`
                    : `Você está prestes a excluir permanentemente o sabor "${deleteTarget.nome}" do catálogo.`}
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-bold text-red-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <span>{deleteError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmDelete} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="delete-confirm-password"
                  className="mb-1.5 block text-sm font-bold text-slate-800"
                >
                  Digite sua senha de login para confirmar *
                </label>
                <input
                  id="delete-confirm-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Sua senha de acesso"
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    setDeleteTarget(null)
                    setDeletePassword('')
                    setDeleteError(null)
                  }}
                  className="btn-secondary w-full"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={deleting || !deletePassword}
                  className="btn-danger w-full"
                >
                  {deleting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <KeyRound className="h-5 w-5" />
                  )}
                  <span>Excluir</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )

  if (embedded) return content
  return <Layout title="Gestão de Catálogo">{content}</Layout>
}
