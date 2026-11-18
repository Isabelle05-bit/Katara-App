import { calcularOrcamento, sugerirMateriaisDoOrcamento, type ItemReceita, type ResultadoCalculo } from '../../domain/calculo';
import type { OrcamentoInput } from '../../domain/schemas';
import type { DescontoBase, ModoCobranca } from '../../domain/tipos';
import { paraIsoData } from '../../lib/datas';
import type { OrcamentoCompleto } from '../../repositories/orcamentos';

/**
 * Estado do formulário guiado do orçamento e as regras puras dele
 * (testadas em formulario.test.ts). A tela só desenha e chama estas funções.
 *
 * Todos os preços das linhas ficam no formulário: na criação vêm do catálogo,
 * na edição vêm do que estava congelado no orçamento. Por isso o salvar manda
 * sempre o preço explícito.
 */

export interface LinhaServicoForm {
  servicoId: number;
  nome: string;
  metrosQuadrados: number | null;
  precoM2: number;
}
export interface LinhaMaterialForm {
  materialId: number;
  nome: string;
  unidade: string;
  quantidade: number;
  preco: number;
  /** Veio da receita (sugerido) ou foi adicionado à mão. */
  origem: 'sugerido' | 'manual';
  /** O Anderson mexeu na quantidade: a sugestão não sobrescreve mais. */
  editado: boolean;
}
export interface LinhaFerramentaForm {
  ferramentaId: number;
  nome: string;
  preco: number;
}
export interface LinhaFuncionarioForm {
  funcionarioId: number;
  nome: string;
  diaria: number;
  dias: number;
}

export interface FormOrcamento {
  clienteId: number | null;
  servicos: LinhaServicoForm[];
  materiais: LinhaMaterialForm[];
  /** Sugeridos que o Anderson removeu: não voltam na próxima sugestão. */
  materiaisIgnorados: number[];
  /** Serviços+metragens da última sugestão aplicada. */
  chaveSugestao: string;
  ferramentas: LinhaFerramentaForm[];
  funcionarios: LinhaFuncionarioForm[];
  materiaisModo: ModoCobranca;
  ferramentasModo: ModoCobranca;
  descontoPct: number;
  descontoBase: DescontoBase;
  validade: string | null;
  observacoes: string;
}

export function formVazio(hoje = new Date()): FormOrcamento {
  return {
    clienteId: null,
    servicos: [],
    materiais: [],
    materiaisIgnorados: [],
    chaveSugestao: '',
    ferramentas: [],
    funcionarios: [],
    materiaisModo: 'cobrado',
    ferramentasModo: 'oculto',
    descontoPct: 0,
    descontoBase: 'servicos',
    validade: validadeEmDias(15, hoje),
    observacoes: '',
  };
}

export function validadeEmDias(dias: number, hoje = new Date()): string {
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + dias);
  return paraIsoData(d);
}

/** Carrega um orçamento salvo no formulário (editar ou duplicar). */
export function formDeOrcamento(o: OrcamentoCompleto): FormOrcamento {
  return {
    clienteId: o.cliente_id,
    servicos: o.servicos.map((s) => ({
      servicoId: s.servico_id,
      nome: s.nome,
      metrosQuadrados: s.metros_quadrados,
      precoM2: s.preco_m2_no_momento,
    })),
    // Já salvos contam como "editados": a sugestão não mexe neles.
    materiais: o.materiais.map((m) => ({
      materialId: m.material_id,
      nome: m.nome,
      unidade: m.unidade,
      quantidade: m.quantidade,
      preco: m.preco_no_momento,
      origem: 'manual',
      editado: true,
    })),
    materiaisIgnorados: [],
    chaveSugestao: chaveDaSugestao(o.servicos.map((s) => ({ servicoId: s.servico_id, metrosQuadrados: s.metros_quadrados }))),
    ferramentas: o.ferramentas.map((f) => ({ ferramentaId: f.ferramenta_id, nome: f.nome, preco: f.preco_no_momento })),
    funcionarios: o.funcionarios.map((f) => ({
      funcionarioId: f.funcionario_id,
      nome: f.nome,
      diaria: f.diaria_no_momento,
      dias: f.dias,
    })),
    materiaisModo: o.materiais_modo,
    ferramentasModo: o.ferramentas_modo,
    descontoPct: o.desconto_pct,
    descontoBase: o.desconto_base,
    validade: o.validade,
    observacoes: o.observacoes ?? '',
  };
}

export function calcularDoForm(f: FormOrcamento): ResultadoCalculo {
  return calcularOrcamento({
    servicos: f.servicos.map((s) => ({ metrosQuadrados: s.metrosQuadrados ?? 0, precoM2: s.precoM2 })),
    materiais: f.materiais.map((m) => ({ quantidade: m.quantidade, preco: m.preco })),
    ferramentas: f.ferramentas.map((x) => ({ preco: x.preco })),
    funcionarios: f.funcionarios.map((x) => ({ diaria: x.diaria, dias: x.dias })),
    descontoPct: Math.min(100, Math.max(0, f.descontoPct || 0)),
    descontoBase: f.descontoBase,
    materiaisModo: f.materiaisModo,
    ferramentasModo: f.ferramentasModo,
  });
}

export function paraInput(f: FormOrcamento): OrcamentoInput {
  return {
    clienteId: f.clienteId ?? 0,
    validade: f.validade,
    descontoPct: f.descontoPct || 0,
    descontoBase: f.descontoBase,
    materiaisModo: f.materiaisModo,
    ferramentasModo: f.ferramentasModo,
    observacoes: f.observacoes,
    servicos: f.servicos.map((s) => ({ servicoId: s.servicoId, metrosQuadrados: s.metrosQuadrados ?? 0, precoM2: s.precoM2 })),
    materiais: f.materiais.map((m) => ({ materialId: m.materialId, quantidade: m.quantidade, preco: m.preco })),
    ferramentas: f.ferramentas.map((x) => ({ ferramentaId: x.ferramentaId, preco: x.preco })),
    funcionarios: f.funcionarios.map((x) => ({ funcionarioId: x.funcionarioId, dias: x.dias, diaria: x.diaria })),
  };
}

// ---------------- Passos ----------------

export const PASSOS = [
  { titulo: 'Cliente', rotulo: 'Passo 1 de 6' },
  { titulo: 'Serviços e metragem', rotulo: 'Passo 2 de 6' },
  { titulo: 'Materiais', rotulo: 'Passo 3 de 6' },
  { titulo: 'Ferramentas', rotulo: 'Passo 4 de 6 · opcional' },
  { titulo: 'Equipe', rotulo: 'Passo 5 de 6' },
  { titulo: 'Fechamento', rotulo: 'Passo 6 de 6' },
] as const;

/** Mensagem que impede avançar, ou null. */
export function erroDoPasso(passo: number, f: FormOrcamento): string | null {
  if (passo === 0 && !f.clienteId) return 'Escolha o cliente para continuar.';
  if (passo === 1) {
    if (f.servicos.length === 0) return 'Adicione pelo menos um serviço.';
    const semMetragem = f.servicos.find((s) => !s.metrosQuadrados || s.metrosQuadrados <= 0);
    if (semMetragem) return `Informe a metragem de "${semMetragem.nome}".`;
  }
  if (passo === 5 && (f.descontoPct < 0 || f.descontoPct > 100)) return 'O desconto precisa estar entre 0% e 100%.';
  return null;
}

// ---------------- Sugestão de materiais ----------------

export function chaveDaSugestao(servicos: { servicoId: number; metrosQuadrados: number | null }[]): string {
  return servicos.map((s) => `${s.servicoId}:${s.metrosQuadrados ?? 0}`).join('|');
}

/**
 * Atualiza as linhas de material a partir das receitas dos serviços.
 * - sugeridas e não editadas: recebem a quantidade nova (ou saem, se não são mais sugeridas);
 * - editadas ou manuais: ficam como estão;
 * - removidas pelo Anderson (ignoradas): não voltam.
 */
export function aplicarSugestao(
  f: FormOrcamento,
  receitas: Map<number, ItemReceita[]>,
  catalogo: Map<number, { nome: string; unidade: string; preco: number }>
): FormOrcamento {
  const sugestoes = sugerirMateriaisDoOrcamento(
    f.servicos.map((s) => ({ metragem: s.metrosQuadrados ?? 0, receita: receitas.get(s.servicoId) ?? [] }))
  ).filter((s) => !f.materiaisIgnorados.includes(s.materialId) && catalogo.has(s.materialId));
  const porId = new Map(sugestoes.map((s) => [s.materialId, s.quantidade]));

  const mantidas = f.materiais
    .filter((m) => m.editado || m.origem === 'manual' || porId.has(m.materialId))
    .map((m) =>
      !m.editado && m.origem === 'sugerido' && porId.has(m.materialId)
        ? { ...m, quantidade: porId.get(m.materialId)! }
        : m
    );
  const jaTem = new Set(mantidas.map((m) => m.materialId));
  const novas: LinhaMaterialForm[] = sugestoes
    .filter((s) => !jaTem.has(s.materialId))
    .map((s) => {
      const c = catalogo.get(s.materialId)!;
      return { materialId: s.materialId, nome: c.nome, unidade: c.unidade, quantidade: s.quantidade, preco: c.preco, origem: 'sugerido', editado: false };
    });

  return { ...f, materiais: [...mantidas, ...novas], chaveSugestao: chaveDaSugestao(f.servicos) };
}

export const TEXTO_MODO: Record<ModoCobranca, string> = {
  cobrado: 'Entra no total do cliente e aparece no PDF.',
  informado: 'Aparece no PDF, mas não soma no total. O custo entra no seu lucro.',
  oculto: 'O cliente não vê. O custo entra no seu lucro.',
};

export const OPCOES_MODO = [
  { valor: 'cobrado', rotulo: 'Cobrar' },
  { valor: 'informado', rotulo: 'Só informar' },
  { valor: 'oculto', rotulo: 'Ocultar' },
] as const;
