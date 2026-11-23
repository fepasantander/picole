import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Clock, Loader2, PlusCircle, Snowflake } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Layout } from '../../components/Layout'
import { JornadaStatusBadge } from '../../components/StatusBadge'
import { formatDateTime } from '../../lib/format'
import type { Jornada } from '../../types/database'

export function SorveteiroHomePage() {
  const { perfil, sorveteria } = useAuth()
  const [jornadas, setJornadas] = useState<Jornada[]>([])
  const [loading, setLoading] = useState(true)

  const loadJornadas = useCallback(async () => {
    if (!perfil?.id) return
    const { data, error } = await supabase
      .from('jornadas')
      .select('*, marca:marcas(id, nome)')
      .eq('sorveteiro_id', perfil.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (!error && data) {
      setJornadas(data as Jornada[])
    }
    setLoading(false)
  }, [perfil?.id])

  useEffect(() => {
    loadJornadas()
  }, [loadJornadas])

  useEffect(() => {
    if (!perfil?.id) return
    const channel = supabase
      .channel(`sorveteiro-home-${perfil.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jornadas',
          filter: `sorveteiro_id=eq.${perfil.id}`,
        },
        () => {
          loadJornadas()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [perfil?.id, loadJornadas])

  const getJornadaLink = (j: Jornada) => {
    if (
      j.status === 'carga_confirmada' ||
      j.status === 'sobras_registrada' ||
      j.status === 'jornada_finalizada'
    ) {
      return `/jornada/${j.id}/sobras`
    }
    return `/jornada/${j.id}`
  }

  const activeJornadas = jornadas.filter((j) => j.status !== 'jornada_finalizada')
  const finishedJornadas = jornadas.filter((j) => j.status === 'jornada_finalizada')

  return (
    <Layout>
      {/* Hero Banner */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-ocean-800 to-ocean-950 p-5 text-white shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-ocean-200">
              {sorveteria?.nome || 'Sorveteria'}
            </p>
            <h1 className="mt-1 text-2xl font-black">Olá, {perfil?.nome?.split(' ')[0]}!</h1>
            {perfil?.praia_atuacao && (
              <p className="mt-0.5 text-sm font-semibold text-ocean-100">
                Praia: {perfil.praia_atuacao}
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sun-400 text-ocean-950">
            <Snowflake className="h-7 w-7" />
          </div>
        </div>

        <Link
          to="/app/nova-jornada"
          className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-sun-400 px-5 py-3 text-base font-black text-slate-950 shadow-sm transition-colors hover:bg-sun-500 sm:w-auto"
        >
          <PlusCircle className="h-5 w-5" />
          <span>Iniciar Nova Jornada (Pedir Carga)</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-ocean-700" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Jornadas */}
          <section>
            <h2 className="mb-3 text-lg font-extrabold text-slate-950">
              Jornadas em andamento ({activeJornadas.length})
            </h2>

            {activeJornadas.length === 0 ? (
              <div className="card p-6 text-center">
                <p className="text-base font-bold text-slate-700">
                  Você não tem nenhuma jornada ativa agora.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Toque em &ldquo;Iniciar Nova Jornada&rdquo; para montar seu pedido de picolés.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeJornadas.map((j) => (
                  <Link
                    key={j.id}
                    to={getJornadaLink(j)}
                    className="card flex items-center justify-between gap-3 p-4 transition-colors hover:border-ocean-400"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-extrabold text-ocean-800">
                          #{j.codigo_curto || j.id.slice(0, 6).toUpperCase()}
                        </span>
                        <JornadaStatusBadge jornada={j} />
                      </div>
                      <p className="truncate text-lg font-extrabold text-slate-950">
                        {j.marca?.nome || 'Marca'}
                      </p>
                      <p className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Criada em {formatDateTime(j.created_at)}</span>
                      </p>
                    </div>
                    <ChevronRight className="h-6 w-6 shrink-0 text-slate-400" />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Finished Jornadas */}
          {finishedJornadas.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-extrabold text-slate-950">
                Jornadas finalizadas ({finishedJornadas.length})
              </h2>
              <div className="space-y-2.5">
                {finishedJornadas.map((j) => (
                  <Link
                    key={j.id}
                    to={`/jornada/${j.id}/sobras`}
                    className="card flex items-center justify-between gap-3 p-4 opacity-90 transition-colors hover:border-slate-400"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-extrabold text-slate-600">
                          #{j.codigo_curto || j.id.slice(0, 6).toUpperCase()}
                        </span>
                        <JornadaStatusBadge jornada={j} />
                      </div>
                      <p className="truncate text-base font-extrabold text-slate-900">
                        {j.marca?.nome || 'Marca'}
                      </p>
                      <p className="text-xs font-semibold text-slate-500">
                        Finalizada em {formatDateTime(j.finalizada_em || j.created_at)}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </Layout>
  )
}
