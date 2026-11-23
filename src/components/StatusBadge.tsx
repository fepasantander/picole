import { APROVACAO_STATUS_META, JORNADA_STATUS_META } from '../lib/format'
import type { StatusAprovacao, StatusJornada } from '../types/database'

export function JornadaStatusBadge({ status }: { status: StatusJornada }) {
  const meta = JORNADA_STATUS_META[status] ?? {
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
