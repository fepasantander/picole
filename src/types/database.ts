export type UserRole = 'sorveteria' | 'sorveteiro'

export type StatusAprovacao = 'pendente' | 'aprovado' | 'bloqueado'

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
  sorveteria?: Pick<Sorveteria, 'id' | 'nome' | 'whatsapp'> | null
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
}
