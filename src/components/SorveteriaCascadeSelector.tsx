import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Sorveteria, SorveteriaUnidade } from '../types/database'

export interface CascadeSelection {
  estado: string
  cidade: string
  sorveteriaId: string
  unidadeId: string
  hasUnidades: boolean
}

interface SorveteriaCascadeSelectorProps {
  value: {
    estado: string
    cidade: string
    sorveteriaId: string
    unidadeId: string
  }
  onChange: (next: CascadeSelection) => void
}

/**
 * Fluxo em cascata: Estado (UF) → Cidade → Marca (Sorveteria) → Unidade.
 * Pré-seleciona automaticamente quando houver apenas 1 opção em cada nível.
 */
export function SorveteriaCascadeSelector({
  value,
  onChange,
}: SorveteriaCascadeSelectorProps) {
  const [sorveterias, setSorveterias] = useState<Sorveteria[]>([])
  const [loadingSorveterias, setLoadingSorveterias] = useState(true)

  const [unidades, setUnidades] = useState<SorveteriaUnidade[]>([])
  const [loadingUnidades, setLoadingUnidades] = useState(false)

  useEffect(() => {
    let active = true
    supabase
      .from('sorveterias')
      .select('*')
      .eq('ativo', true)
      .order('estado')
      .order('cidade')
      .order('nome')
      .then(({ data }) => {
        if (!active) return
        setSorveterias((data ?? []) as Sorveteria[])
        setLoadingSorveterias(false)
      })
    return () => {
      active = false
    }
  }, [])

  // 1. Estados disponíveis (apenas os que possuem sorveterias ativas)
  const estadosDisponiveis = useMemo(() => {
    const set = new Set<string>()
    for (const s of sorveterias) {
      if (s.estado) set.add(s.estado.toUpperCase())
    }
    return Array.from(set).sort()
  }, [sorveterias])

  // 2. Cidades disponíveis no Estado selecionado
  const cidadesDisponiveis = useMemo(() => {
    if (!value.estado) return []
    const set = new Set<string>()
    for (const s of sorveterias) {
      if (s.estado.toUpperCase() === value.estado.toUpperCase() && s.cidade) {
        set.add(s.cidade)
      }
    }
    return Array.from(set).sort()
  }, [sorveterias, value.estado])

  // 3. Marcas (Sorveterias) disponíveis na Cidade/UF selecionada
  const sorveteriasDisponiveis = useMemo(() => {
    if (!value.estado || !value.cidade) return []
    return sorveterias.filter(
      (s) =>
        s.estado.toUpperCase() === value.estado.toUpperCase() &&
        s.cidade.toLowerCase() === value.cidade.toLowerCase()
    )
  }, [sorveterias, value.estado, value.cidade])

  // Auto-seleção em cascata quando houver apenas 1 opção
  useEffect(() => {
    if (loadingSorveterias) return
    if (!value.estado && estadosDisponiveis.length === 1) {
      onChange({
        estado: estadosDisponiveis[0],
        cidade: '',
        sorveteriaId: '',
        unidadeId: '',
        hasUnidades: false,
      })
    }
  }, [loadingSorveterias, estadosDisponiveis, value.estado, onChange])

  useEffect(() => {
    if (loadingSorveterias || !value.estado) return
    if (!value.cidade && cidadesDisponiveis.length === 1) {
      onChange({
        estado: value.estado,
        cidade: cidadesDisponiveis[0],
        sorveteriaId: '',
        unidadeId: '',
        hasUnidades: false,
      })
    }
  }, [loadingSorveterias, value.estado, value.cidade, cidadesDisponiveis, onChange])

  useEffect(() => {
    if (loadingSorveterias || !value.estado || !value.cidade) return
    if (!value.sorveteriaId && sorveteriasDisponiveis.length === 1) {
      onChange({
        estado: value.estado,
        cidade: value.cidade,
        sorveteriaId: sorveteriasDisponiveis[0].id,
        unidadeId: '',
        hasUnidades: false,
      })
    }
  }, [
    loadingSorveterias,
    value.estado,
    value.cidade,
    value.sorveteriaId,
    sorveteriasDisponiveis,
    onChange,
  ])

  // 4. Carregar Unidades ativas da Marca (Sorveteria) selecionada
  useEffect(() => {
    if (!value.sorveteriaId) {
      setUnidades([])
      return
    }
    let active = true
    setLoadingUnidades(true)

    supabase
      .from('sorveteria_unidades')
      .select('*')
      .eq('sorveteria_id', value.sorveteriaId)
      .eq('ativo', true)
      .order('nome', { ascending: true })
      .then(({ data }) => {
        if (!active) return
        const list = (data ?? []) as SorveteriaUnidade[]
        setUnidades(list)
        setLoadingUnidades(false)

        const currentStillValid = list.some((u) => u.id === value.unidadeId)
        if (list.length === 1 && value.unidadeId !== list[0].id) {
          onChange({
            estado: value.estado,
            cidade: value.cidade,
            sorveteriaId: value.sorveteriaId,
            unidadeId: list[0].id,
            hasUnidades: true,
          })
        } else if (!currentStillValid) {
          onChange({
            estado: value.estado,
            cidade: value.cidade,
            sorveteriaId: value.sorveteriaId,
            unidadeId: '',
            hasUnidades: list.length > 0,
          })
        } else {
          onChange({
            estado: value.estado,
            cidade: value.cidade,
            sorveteriaId: value.sorveteriaId,
            unidadeId: value.unidadeId,
            hasUnidades: list.length > 0,
          })
        }
      })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.sorveteriaId])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* 1. Estado (UF) */}
        <div>
          <label htmlFor="cascade-estado" className="mb-1.5 block text-sm font-bold text-slate-800">
            1. Estado (UF) *
          </label>
          <select
            id="cascade-estado"
            required
            disabled={loadingSorveterias || estadosDisponiveis.length === 0}
            value={value.estado}
            onChange={(e) =>
              onChange({
                estado: e.target.value,
                cidade: '',
                sorveteriaId: '',
                unidadeId: '',
                hasUnidades: false,
              })
            }
            className="input-field disabled:bg-slate-100"
          >
            <option value="">
              {loadingSorveterias
                ? 'Carregando estados...'
                : estadosDisponiveis.length === 0
                  ? 'Nenhum estado disponível'
                  : 'Selecione o estado'}
            </option>
            {estadosDisponiveis.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Cidade */}
        <div>
          <label htmlFor="cascade-cidade" className="mb-1.5 block text-sm font-bold text-slate-800">
            2. Cidade *
          </label>
          <select
            id="cascade-cidade"
            required
            disabled={!value.estado || cidadesDisponiveis.length === 0}
            value={value.cidade}
            onChange={(e) =>
              onChange({
                estado: value.estado,
                cidade: e.target.value,
                sorveteriaId: '',
                unidadeId: '',
                hasUnidades: false,
              })
            }
            className="input-field disabled:bg-slate-100"
          >
            <option value="">
              {!value.estado
                ? 'Selecione o estado primeiro'
                : cidadesDisponiveis.length === 0
                  ? 'Nenhuma cidade disponível'
                  : 'Selecione a cidade'}
            </option>
            {cidadesDisponiveis.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Marca (Sorveteria) */}
      <div>
        <label
          htmlFor="cascade-sorveteria"
          className="mb-1.5 block text-sm font-bold text-slate-800"
        >
          3. Marca (Sorveteria) *
        </label>
        <select
          id="cascade-sorveteria"
          required
          disabled={!value.cidade || sorveteriasDisponiveis.length === 0}
          value={value.sorveteriaId}
          onChange={(e) =>
            onChange({
              estado: value.estado,
              cidade: value.cidade,
              sorveteriaId: e.target.value,
              unidadeId: '',
              hasUnidades: false,
            })
          }
          className="input-field disabled:bg-slate-100"
        >
          <option value="">
            {!value.cidade
              ? 'Selecione a cidade primeiro'
              : sorveteriasDisponiveis.length === 0
                ? 'Nenhuma sorveteria nesta cidade'
                : 'Selecione a sorveteria'}
          </option>
          {sorveteriasDisponiveis.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
      </div>

      {/* 4. Unidade */}
      <div>
        <label htmlFor="cascade-unidade" className="mb-1.5 block text-sm font-bold text-slate-800">
          4. Unidade {unidades.length > 0 ? '*' : ''}
        </label>
        {loadingUnidades ? (
          <div className="input-field flex items-center gap-2 bg-slate-50 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-ocean-700" />
            <span>Carregando unidades...</span>
          </div>
        ) : (
          <select
            id="cascade-unidade"
            required={unidades.length > 0}
            disabled={!value.sorveteriaId || unidades.length === 0}
            value={value.unidadeId}
            onChange={(e) =>
              onChange({
                estado: value.estado,
                cidade: value.cidade,
                sorveteriaId: value.sorveteriaId,
                unidadeId: e.target.value,
                hasUnidades: unidades.length > 0,
              })
            }
            className="input-field disabled:bg-slate-100"
          >
            <option value="">
              {!value.sorveteriaId
                ? 'Selecione a sorveteria primeiro'
                : unidades.length === 0
                  ? 'Unidade única (padrão da sorveteria)'
                  : 'Selecione a unidade de retirada'}
            </option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
