import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight,
  ClipboardCheck,
  Clock,
  Loader2,
  PackageCheck,
  RefreshCw,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Layout } from '../../components/Layout'
import { JornadaStatusBadge } from '../../components/StatusBadge'
import { formatDateTime } from '../../lib/format'
import type { Jornada, StatusJornada } from '../../types/database'

type FilterTab = 'ativas' | 'separar' | 'sobras' | 'finalizadas' | 'todas'

export function SorveteriaJornadasPage() {
  const { perfil } = useAuth()
  const [jornadas, setJornadas] = useState<Jornada[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<FilterTab>('ativas')

  const loadJornadas = useCallback(async () => {
    if (!perfil?.sorveteria_id) return
    const { data, error } = await supabase
      .from('jornadas')
      .select(
        `
        *,
        marca:marcas(id, nome),
        sorveteiro:perfis!jornadas_sorveteiro_id_fkey(id, nome, telefone_whatsapp, praia_atuacao)
      `
      )
      .eq('sorveteria_id', perfil.sorveteria_id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && data) {
      setJornadas(data as Jornada[])
    }
    setLoading(false)
  }, [perfil?.sorveteria_id])

  useEffect(() => {
    loadJornadas()
  }, [loadJornadas])

  useEffect(() => {
    if (!perfil?.sorveteria_id) return
    const channel = supabase
      .channel(`sorveteria-jornadas-${perfil.sorveteria_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jornadas',
          filter: `sorveteria_id=eq.${perfil.sorveteria_id}`,
        },
        () => {
          loadJornadas()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [perfil?.sorveteria_id, loadJornadas])

  const filtered = jornadas.filter((j) => {
    if (tab === 'ativas') return j.status !== 'jornada_finalizada'
    if (tab === 'separar') {
      return (
        j.status === 'carga_solicitada' ||
        j.status === 'pedido_alterado' ||
        j.status === 'pedido_aprovado'
      )
    }
    if (tab === 'sobras') return j.status === 'sobras_registrada'
    if (tab === 'finalizadas') return j.status === 'jornada_finalizada'
    return true
  })

  const countBy = (statuses: StatusJornada[]) =>
    jornadas.filter((j) => statuses.includes(j.status)).length

  const getTargetUrl = (j: Jornada) => {
    if (j.status === 'sobras_registrada' || j.status === 'jornada_finalizada') {
      return `/sorveteria/jornadas/${j.id}/fechamento`
    }
    return `/sorveteria/jornadas/${j.id}`
  }

  return (
    <Layout title="Fila de Romaneios">
      {/* Quick Counters */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <button
          type="button"
          onClick={() => setTab('separar')}
          className="card p-4 text-left transition-colors hover:border-amber-400"
        >
          <p className="text-xs font-extrabold uppercase text-amber-800">Avaliar / Separar</p>
          <p className="mt-1 text-3xl font-black text-slate-950">
            {countBy(['carga_solicitada', 'pedido_alterado', 'pedido_aprovado'])}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setTab('ativas')}
          className="card p-4 text-left transition-colors hover:border-sky-400"
        >
          <p className="text-xs font-extrabold uppercase text-sky-800">Aceite / Retirada / Praia</p>
          <p className="mt-1 text-3xl font-black text-slate-950">
            {countBy(['aguardando_aceite_pedido', 'carga_separada', 'carga_confirmada'])}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setTab('sobras')}
          className="card p-4 text-left transition-colors hover:border-purple-400"
        >
          <p className="text-xs font-extrabold uppercase text-purple-800">Conferir Sobras</p>
          <p className="mt-1 text-3xl font-black text-slate-950">
            {countBy(['sobras_registrada'])}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setTab('finalizadas')}
          className="card p-4 text-left transition-colors hover:border-slate-400"
        >
          <p className="text-xs font-extrabold uppercase text-slate-600">Finalizadas</p>
          <p className="mt-1 text-3xl font-black text-slate-950">
            {countBy(['jornada_finalizada'])}
          </p>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'ativas', label: 'Ativas' },
              { id: 'separar', label: 'Para Separar' },
              { id: 'sobras', label: 'Conferir Sobras' },
              { id: 'finalizadas', label: 'Finalizadas' },
              { id: 'todas', label: 'Todas' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`min-h-[44px] rounded-xl px-4 text-sm font-bold transition-colors ${
                tab === item.id
                  ? 'bg-ocean-700 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={loadJornadas}
          className="btn-secondary min-h-[44px] px-4 py-2 text-sm"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Atualizar</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-ocean-700" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-base font-bold text-slate-700">Nenhum romaneio nesta aba.</p>
          <p className="mt-1 text-sm text-slate-500">
            Assim que um sorveteiro solicitar uma carga, ela aparecerá aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((j) => {
            const isClosing = j.status === 'sobras_registrada' || j.status === 'jornada_finalizada'
            return (
              <Link
                key={j.id}
                to={getTargetUrl(j)}
                className="card flex flex-col gap-3 p-4 transition-colors hover:border-ocean-400 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-ocean-800">
                      #{j.codigo_curto || j.id.slice(0, 6).toUpperCase()}
                    </span>
                    <JornadaStatusBadge jornada={j} />
                    {j.bloqueado_edicao_sorveteiro && (
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800">
                        Em separação
                      </span>
                    )}
                  </div>

                  <h2 className="truncate text-lg font-extrabold text-slate-950">
                    {j.sorveteiro?.nome || 'Sorveteiro'}
                  </h2>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-slate-600">
                    <span>Marca: <strong>{j.marca?.nome || '—'}</strong></span>
                    {j.sorveteiro?.praia_atuacao && (
                      <span>Praia: {j.sorveteiro.praia_atuacao}</span>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDateTime(j.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-end gap-2">
                  <span className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-ocean-50 px-4 text-sm font-extrabold text-ocean-900">
                    {isClosing ? (
                      <>
                        <ClipboardCheck className="h-4 w-4" />
                        <span>
                          {j.status === 'jornada_finalizada' ? 'Ver Resumo' : 'Conferir Sobras'}
                        </span>
                      </>
                    ) : (
                      <>
                        <PackageCheck className="h-4 w-4" />
                        <span>
                          {j.status === 'carga_solicitada' || j.status === 'pedido_alterado'
                            ? 'Avaliar Estoque'
                            : j.status === 'pedido_aprovado'
                              ? 'Separar Carga'
                              : j.status === 'carga_separada'
                                ? 'Conferência Presencial'
                                : 'Ver Romaneio'}
                        </span>
                      </>
                    )}
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
