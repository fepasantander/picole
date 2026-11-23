export type UserRole = 'superadmin' | 'sorveteria' | 'sorveteiro'

export type StatusAprovacao = 'pendente' | 'aprovado' | 'bloqueado'

export type TipoCobranca = 'setup' | 'mensalidade'
export type StatusCobranca = 'pendente' | 'enviada' | 'paga' | 'cancelada'

export type StatusJornada =
  | 'carga_solicitada'
  | 'pedido_alterado'
  | 'carga_separada'
  | 'carga_confirmada'
  | 'sobras_registrada'
  | 'jornada_finalizada'

export interface Sorveteria {
  id: string
  nome: string
  estado: string
  cidade: string
  whatsapp: string | null
  ativo: boolean
  gelo_seco_kg_por_lote?: number | null
  gelo_seco_qtd_picoles?: number | null
  created_at?: string
}

export interface Perfil {
  id: string
  sorveteria_id: string | null
  role: UserRole
  nome: string
  cpf: string | null
  telefone_whatsapp: string | null
  estado: string | null
  cidade: string | null
  praia_atuacao: string | null
  status_aprovacao: StatusAprovacao
  created_at?: string
}

export interface Marca {
  id: string
  sorveteria_id: string
  nome: string
  ordem: number
  ativa: boolean
}

export interface CategoriaSabor {
  id: string
  marca_id: string
  nome: string
  ordem: number
  ativa: boolean
}

export interface Sabor {
  id: string
  categoria_id: string
  marca_id: string
  nome: string
  ordem: number
  ativo: boolean
}

export interface Jornada {
  id: string
  codigo_curto: string | null
  sorveteria_id: string
  sorveteiro_id: string
  marca_id: string
  status: StatusJornada
  bloqueado_edicao_sorveteiro: boolean
  gelo_seco_sugerido_kg?: number | null
  confirmado_retirada_em: string | null
  metodo_confirmacao_retirada: string | null
  sobras_registradas_em: string | null
  confirmado_fechamento_sorveteiro_em: string | null
  confirmado_fechamento_sorveteria_em: string | null
  finalizada_em: string | null
  created_at?: string
  updated_at?: string
  // Optional joined relations
  marca?: Pick<Marca, 'id' | 'nome'> | null
  sorveteiro?: Pick<Perfil, 'id' | 'nome' | 'telefone_whatsapp' | 'praia_atuacao'> | null
  sorveteria?: Pick<
    Sorveteria,
    'id' | 'nome' | 'whatsapp' | 'gelo_seco_kg_por_lote' | 'gelo_seco_qtd_picoles'
  > | null
}

export interface JornadaItem {
  id: string
  jornada_id: string
  sabor_id: string
  categoria_nome: string
  categoria_ordem: number
  sabor_nome: string
  sabor_ordem: number
  qtd_pedida: number
  qtd_separada: number
  conferido_sorveteiro: boolean
  qtd_restante_caixa: number
  qtd_devolvida_final: number
  conferido_fechamento_sorveteiro?: boolean
  conferido_fechamento_sorveteria?: boolean
}

export interface JornadaInsert {
  sorveteria_id: string
  sorveteiro_id: string
  marca_id: string
  status?: StatusJornada
  bloqueado_edicao_sorveteiro?: boolean
  gelo_seco_sugerido_kg?: number | null
}

export interface JornadaItemInsert {
  jornada_id: string
  sabor_id: string
  categoria_nome: string
  categoria_ordem: number
  sabor_nome: string
  sabor_ordem: number
  qtd_pedida: number
  qtd_separada?: number
  conferido_sorveteiro?: boolean
  qtd_restante_caixa?: number
  qtd_devolvida_final?: number
}

export interface CobrancaSorveteria {
  id: string
  sorveteria_id: string
  tipo: TipoCobranca
  descricao: string
  valor: number
  vencimento: string | null
  link_pagamento: string | null
  status: StatusCobranca
  created_at?: string
  sorveteria?: Pick<Sorveteria, 'id' | 'nome' | 'whatsapp' | 'cidade' | 'estado'> | null
}
