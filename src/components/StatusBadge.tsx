import {
  APROVACAO_STATUS_META,
  getDynamicJornadaStatusMeta,
  JORNADA_STATUS_META,
} from '../lib/format'
import type { Jornada, StatusAprovacao, StatusJornada } from '../types/database'

interface JornadaStatusBadgeProps {
  status?: StatusJornada
  jornada?: Pick<
    Jornada,
    'status' | 'confirmado_fechamento_sorveteria_em' | 'confirmado_fechamento_sorveteiro_em'
  >
}

export function JornadaStatusBadge({ status, jornada }: JornadaStatusBadgeProps) {
  const meta = jornada
    ? getDynamicJornadaStatusMeta(jornada)
    : status
      ? JORNADA_STATUS_META[status] ?? {
          label: status,
          badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
        }
      : { label: '—', badgeClass: 'bg-slate-100 text-slate-800 border-slate-300' }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  )
}

export function AprovacaoStatusBadge({ status }: { status: StatusAprovacao }) {
  const meta = APROVACAO_STATUS_META[status] ?? {
    label: status,
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  )
}
