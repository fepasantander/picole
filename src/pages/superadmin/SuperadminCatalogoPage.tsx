import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { SorveteriaCatalogoPage } from '../sorveteria/SorveteriaCatalogoPage'
import type { Sorveteria } from '../../types/database'

export function SuperadminCatalogoPage() {
  const [sorveterias, setSorveterias] = useState<Sorveteria[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('sorveterias')
      .select('*')
      .order('nome')
      .then(({ data }) => {
        const list = (data ?? []) as Sorveteria[]
        setSorveterias(list)
        if (list.length > 0) setSelectedId(list[0].id)
        setLoading(false)
      })
  }, [])

  const selectedUnit = sorveterias.find((s) => s.id === selectedId) ?? null

  return (
    <Layout title="Catálogo Global">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-ocean-700" />
        </div>
      ) : sorveterias.length === 0 ? (
        <div className="card p-8 text-center text-sm font-bold text-slate-600">
          Cadastre uma sorveteria primeiro para gerenciar seu catálogo.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="card p-4">
            <label
              htmlFor="superadmin-unit-select"
              className="mb-1.5 block text-sm font-extrabold text-slate-800"
            >
              Selecione a Sorveteria
            </label>
            <select
              id="superadmin-unit-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="input-field max-w-xl"
            >
              {sorveterias.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} ({s.cidade}/{s.estado}) {s.ativo ? '' : '— Desligada'}
                </option>
              ))}
            </select>
          </div>

          {selectedUnit && (
            <SorveteriaCatalogoPage
              key={selectedUnit.id}
              sorveteriaOverride={selectedUnit}
              embedded
            />
          )}
        </div>
      )}
    </Layout>
  )
}
