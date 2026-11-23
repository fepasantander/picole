import type { StatusAprovacao, StatusJornada } from '../types/database'

export const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

export function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '')
}

export function formatCPF(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function formatPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2')
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string {
  const digits = onlyDigits(phone)
  const fullNumber = digits.startsWith('55') ? digits : `55${digits}`
  const encoded = encodeURIComponent(message)
  if (!digits) {
    return `https://wa.me/?text=${encoded}`
  }
  return `https://wa.me/${fullNumber}?text=${encoded}`
}

export function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function calculateDryIceKg(
  totalPicoles: number,
  kgPorLote?: number | null,
  qtdPicoles?: number | null
): {
  kg: number
  formattedKg: string
  kgPorLote: number
  qtdPicoles: number
  formattedBaseKg: string
} {
  const baseKg = kgPorLote && kgPorLote > 0 ? Number(kgPorLote) : 1
  const baseQtd = qtdPicoles && qtdPicoles > 0 ? Math.trunc(Number(qtdPicoles)) : 100
  const raw = totalPicoles > 0 ? (totalPicoles / baseQtd) * baseKg : 0
  const rounded = Math.round(raw * 100) / 100

  const formatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

  return {
    kg: rounded,
    formattedKg: formatter.format(rounded),
    kgPorLote: baseKg,
    qtdPicoles: baseQtd,
    formattedBaseKg: formatter.format(baseKg),
  }
}

export const JORNADA_STATUS_META: Record<
  StatusJornada,
  { label: string; badgeClass: string; description: string }
> = {
  carga_solicitada: {
    label: 'Carga solicitada',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    description: 'Aguardando separação pela sorveteria',
  },
  pedido_alterado: {
    label: 'Pedido alterado',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-300',
    description: 'Sorveteiro alterou itens — nova conferência necessária',
  },
  carga_separada: {
    label: 'Carga separada',
    badgeClass: 'bg-sky-100 text-sky-900 border-sky-300',
    description: 'Pronta para conferência e retirada do sorveteiro',
  },
  carga_confirmada: {
    label: 'Em vendas (na praia)',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    description: 'Carga conferida e retirada pelo sorveteiro',
  },
  sobras_registrada: {
    label: 'Sobras registradas',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
    description: 'Aguardando conferência presencial e fechamento mútuo',
  },
  jornada_finalizada: {
    label: 'Jornada finalizada',
    badgeClass: 'bg-slate-200 text-slate-900 border-slate-400',
    description: 'Fechamento confirmado por sorveteria e sorveteiro',
  },
}

export const APROVACAO_STATUS_META: Record<
  StatusAprovacao,
  { label: string; badgeClass: string }
> = {
  pendente: {
    label: 'Pendente',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  aprovado: {
    label: 'Aprovado',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  },
  bloqueado: {
    label: 'Bloqueado',
    badgeClass: 'bg-red-100 text-red-900 border-red-300',
  },
}
