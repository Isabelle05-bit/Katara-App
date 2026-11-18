import { z } from 'zod';
import {
  DESCONTO_BASES,
  MODOS_COBRANCA,
  STATUS_ATENDIMENTO,
  STATUS_FUNCIONARIO,
  TIPOS_CALCULO,
} from './tipos';

/**
 * Validação das ENTRADAS dos repositórios (o que o formulário envia).
 * Dinheiro já chega em centavos: a tela converte com reaisParaCentavos().
 * Mensagens em português, prontas para aparecer embaixo do campo.
 */

const textoObrigatorio = (campo: string) =>
  z.string().trim().min(1, `Informe ${campo}.`).max(200, `${campo} muito longo.`);

/** Texto opcional: string vazia vira null (é o que vai para o banco). */
const textoOpcional = z
  .string()
  .trim()
  .max(1000)
  .nullish()
  .transform((v) => (v ? v : null));

const centavos = (campo: string) =>
  z
    .number()
    .int(`${campo} inválido.`)
    .min(0, `${campo} não pode ser negativo.`)
    .max(100_000_000_00, `${campo} alto demais.`);

const dataIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.')
  .nullish()
  .transform((v) => v ?? null);

const id = z.number().int().positive();

export const clienteSchema = z.object({
  nome: textoObrigatorio('o nome'),
  telefone: textoOpcional,
  cidade: textoOpcional,
  endereco: textoOpcional,
  observacoes: textoOpcional,
});
export type ClienteInput = z.input<typeof clienteSchema>;

export const funcionarioSchema = z.object({
  nome: textoObrigatorio('o nome'),
  diaria: centavos('Diária'),
  status: z.enum(STATUS_FUNCIONARIO).default('ativo'),
  observacoes: textoOpcional,
});
export type FuncionarioInput = z.input<typeof funcionarioSchema>;

export const materialSchema = z.object({
  nome: textoObrigatorio('o nome'),
  unidade: textoObrigatorio('a unidade (ex.: lata 18L)'),
  categoria: textoOpcional,
  preco: centavos('Preço'),
  loja: textoOpcional,
});
export type MaterialInput = z.input<typeof materialSchema>;

export const servicoSchema = z.object({
  nome: textoObrigatorio('o nome'),
  precoM2: centavos('Preço por m²'),
  descricao: textoOpcional,
  observacoes: textoOpcional,
});
export type ServicoInput = z.input<typeof servicoSchema>;

export const itemReceitaSchema = z.object({
  materialId: id,
  tipoCalculo: z.enum(TIPOS_CALCULO),
  consumo: z.number().positive('O consumo precisa ser maior que zero.'),
});
export type ItemReceitaInput = z.input<typeof itemReceitaSchema>;

export const ferramentaSchema = z.object({
  nome: textoObrigatorio('o nome'),
  valorCompra: centavos('Valor de compra'),
});
export type FerramentaInput = z.input<typeof ferramentaSchema>;

/**
 * Orçamento com todos os filhos. Preços das linhas são opcionais: se vierem,
 * foram editados na linha; se não vierem, o repositório mantém o preço já
 * congelado no orçamento ou copia o do catálogo.
 */
export const orcamentoSchema = z.object({
  clienteId: id,
  validade: dataIso,
  descontoPct: z.number().min(0, 'Desconto mínimo é 0%.').max(100, 'Desconto máximo é 100%.').default(0),
  descontoBase: z.enum(DESCONTO_BASES).default('servicos'),
  materiaisModo: z.enum(MODOS_COBRANCA).default('cobrado'),
  ferramentasModo: z.enum(MODOS_COBRANCA).default('oculto'),
  observacoes: textoOpcional,
  servicos: z
    .array(
      z.object({
        servicoId: id,
        metrosQuadrados: z.number().positive('Informe a metragem.'),
        precoM2: centavos('Preço por m²').optional(),
      })
    )
    .min(1, 'Adicione pelo menos um serviço.'),
  materiais: z
    .array(
      z.object({
        materialId: id,
        quantidade: z.number().int('Quantidade deve ser inteira.').positive('Quantidade deve ser maior que zero.'),
        preco: centavos('Preço').optional(),
      })
    )
    .default([]),
  ferramentas: z
    .array(z.object({ ferramentaId: id, preco: centavos('Preço').optional() }))
    .default([]),
  funcionarios: z
    .array(
      z.object({
        funcionarioId: id,
        dias: z.number().int('Dias deve ser inteiro.').positive('Informe os dias.'),
        diaria: centavos('Diária').optional(),
      })
    )
    .default([]),
});
export type OrcamentoInput = z.input<typeof orcamentoSchema>;
export type OrcamentoValidado = z.output<typeof orcamentoSchema>;

export const statusAtendimentoSchema = z.enum(STATUS_ATENDIMENTO);

/** Junta os erros do Zod numa única mensagem legível. */
export function mensagemDeErro(erro: z.ZodError): string {
  return erro.issues.map((i) => i.message).join('\n');
}

/** parse que lança ErroDeRegra com mensagem amigável. */
export function validar<S extends z.ZodType>(schema: S, dados: unknown): z.output<S> {
  const r = schema.safeParse(dados);
  if (!r.success) {
    const e = new Error(mensagemDeErro(r.error));
    e.name = 'ErroDeValidacao';
    throw e;
  }
  return r.data;
}
