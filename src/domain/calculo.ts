import { multiplicarCentavos, percentualDe } from '../lib/dinheiro';
import type { DescontoBase, ModoCobranca, TipoCalculo } from './tipos';

/**
 * Regras de cálculo do orçamento (escopo, seção 5). Funções PURAS: sem banco,
 * sem tela. Todos os valores de dinheiro entram e saem em centavos inteiros.
 *
 * Arredondamento (regra única): cada LINHA é arredondada para centavos
 * (meio para cima) antes de somar, e o desconto é arredondado uma vez sobre a
 * base. Assim, o que aparece linha a linha no PDF sempre soma o total.
 * Metragem e percentual são considerados com precisão de 2 casas decimais.
 */

export interface LinhaServico {
  metrosQuadrados: number;
  precoM2: number; // centavos
}
export interface LinhaMaterial {
  quantidade: number;
  preco: number; // centavos
}
export interface LinhaFerramenta {
  preco: number; // centavos
}
export interface LinhaFuncionario {
  diaria: number; // centavos
  dias: number;
}

export interface EntradaCalculo {
  servicos: LinhaServico[];
  materiais: LinhaMaterial[];
  ferramentas: LinhaFerramenta[];
  funcionarios: LinhaFuncionario[];
  descontoPct: number; // 0–100
  descontoBase: DescontoBase;
  materiaisModo: ModoCobranca;
  ferramentasModo: ModoCobranca;
}

export interface ResultadoCalculo {
  subtotalServicos: number;
  materiaisCobrados: number;
  ferramentasCobradas: number;
  baseDesconto: number;
  desconto: number;
  totalCliente: number;
  custoMaterial: number;
  custoFerramenta: number;
  custoEquipe: number;
  lucro: number;
}

const soma = (valores: number[]) => valores.reduce((a, b) => a + b, 0);

export const totalLinhaServico = (s: LinhaServico) => multiplicarCentavos(s.precoM2, s.metrosQuadrados);
export const totalLinhaMaterial = (m: LinhaMaterial) => multiplicarCentavos(m.preco, m.quantidade);
export const totalLinhaFuncionario = (f: LinhaFuncionario) => multiplicarCentavos(f.diaria, f.dias);

export function calcularOrcamento(e: EntradaCalculo): ResultadoCalculo {
  if (e.descontoPct < 0 || e.descontoPct > 100) {
    throw new Error('O desconto precisa estar entre 0% e 100%.');
  }

  const subtotalServicos = soma(e.servicos.map(totalLinhaServico));
  const custoMaterial = soma(e.materiais.map(totalLinhaMaterial));
  const custoFerramenta = soma(e.ferramentas.map((f) => f.preco));
  const custoEquipe = soma(e.funcionarios.map(totalLinhaFuncionario));

  // O modo só decide o que o cliente vê e paga; o custo entra no lucro sempre.
  const materiaisCobrados = e.materiaisModo === 'cobrado' ? custoMaterial : 0;
  const ferramentasCobradas = e.ferramentasModo === 'cobrado' ? custoFerramenta : 0;

  const baseDesconto =
    e.descontoBase === 'servicos'
      ? subtotalServicos
      : subtotalServicos + materiaisCobrados + ferramentasCobradas;
  const desconto = percentualDe(baseDesconto, e.descontoPct);

  const totalCliente = subtotalServicos + materiaisCobrados + ferramentasCobradas - desconto;
  const lucro = totalCliente - custoMaterial - custoFerramenta - custoEquipe;

  return {
    subtotalServicos,
    materiaisCobrados,
    ferramentasCobradas,
    baseDesconto,
    desconto,
    totalCliente,
    custoMaterial,
    custoFerramenta,
    custoEquipe,
    lucro,
  };
}

// ---------------- Sugestão de materiais (receita) ----------------

export interface ItemReceita {
  materialId: number;
  tipoCalculo: TipoCalculo;
  consumo: number;
}

/** Tolerância para não arredondar 3,0000000001 para 4 por erro de ponto flutuante. */
const EPS = 1e-9;

/** por_m2 = metragem × consumo; fixo = consumo. Sempre arredonda para cima. */
export function quantidadeSugerida(item: Pick<ItemReceita, 'tipoCalculo' | 'consumo'>, metragem: number): number {
  const bruto = item.tipoCalculo === 'por_m2' ? metragem * item.consumo : item.consumo;
  return Math.max(1, Math.ceil(bruto - EPS));
}

export function sugerirMateriais(
  receita: ItemReceita[],
  metragem: number
): { materialId: number; quantidade: number }[] {
  return receita.map((item) => ({
    materialId: item.materialId,
    quantidade: quantidadeSugerida(item, metragem),
  }));
}

/**
 * Sugestão para o orçamento inteiro: a mesma tinta usada em dois serviços vira
 * UMA linha. Somamos o consumo bruto antes de arredondar para cima (comprar
 * 0,6 + 0,6 lata = 2 latas, e não 1 + 1 = 2 por acaso; 0,4 + 0,4 = 1 lata).
 */
export function sugerirMateriaisDoOrcamento(
  servicos: { metragem: number; receita: ItemReceita[] }[]
): { materialId: number; quantidade: number }[] {
  const brutoPorMaterial = new Map<number, number>();
  for (const s of servicos) {
    for (const item of s.receita) {
      const bruto = item.tipoCalculo === 'por_m2' ? s.metragem * item.consumo : item.consumo;
      brutoPorMaterial.set(item.materialId, (brutoPorMaterial.get(item.materialId) ?? 0) + bruto);
    }
  }
  return [...brutoPorMaterial].map(([materialId, bruto]) => ({
    materialId,
    quantidade: Math.max(1, Math.ceil(bruto - EPS)),
  }));
}
