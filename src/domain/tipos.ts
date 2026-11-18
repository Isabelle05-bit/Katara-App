// Valores aceitos pelos CHECK do schema (src/db/migrations.ts). Mantenha em sincronia.

export const MODOS_COBRANCA = ['cobrado', 'informado', 'oculto'] as const;
export type ModoCobranca = (typeof MODOS_COBRANCA)[number];

export const DESCONTO_BASES = ['servicos', 'total'] as const;
export type DescontoBase = (typeof DESCONTO_BASES)[number];

export const TIPOS_CALCULO = ['por_m2', 'fixo'] as const;
export type TipoCalculo = (typeof TIPOS_CALCULO)[number];

export const STATUS_FUNCIONARIO = ['ativo', 'inativo', 'ferias'] as const;
export type StatusFuncionario = (typeof STATUS_FUNCIONARIO)[number];

export const STATUS_ORCAMENTO = ['pendente', 'aprovado', 'recusado'] as const;
export type StatusOrcamento = (typeof STATUS_ORCAMENTO)[number];

export const STATUS_ATENDIMENTO = [
  'aguardando_agendamento',
  'em_andamento',
  'aguardando_cliente',
  'concluido',
] as const;
export type StatusAtendimento = (typeof STATUS_ATENDIMENTO)[number];

export const ROTULO_STATUS_ATENDIMENTO: Record<StatusAtendimento, string> = {
  aguardando_agendamento: 'Aguardando agendamento',
  em_andamento: 'Em andamento',
  aguardando_cliente: 'Aguardando cliente',
  concluido: 'Concluído',
};

export const ROTULO_STATUS_ORCAMENTO: Record<StatusOrcamento, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
};

/** Erro de regra de negócio, com mensagem pronta para mostrar ao Anderson. */
export class ErroDeRegra extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeRegra';
  }
}
