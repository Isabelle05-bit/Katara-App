import type { ItemReceita } from '../../domain/calculo';
import { criarDbMigrado } from '../../test/dbEmMemoria';
import { criarCliente, criarFuncionario, criarMaterial } from '../../repositories/cadastros';
import { criarServico } from '../../repositories/servicos';
import { obterOrcamentoCompleto, salvarOrcamento } from '../../repositories/orcamentos';
import {
  aplicarSugestao,
  calcularDoForm,
  erroDoPasso,
  formDeOrcamento,
  formVazio,
  paraInput,
  validadeEmDias,
  type FormOrcamento,
} from './formulario';

const catalogo = new Map([
  [1, { nome: 'Tinta 18L', unidade: 'lata', preco: 21000 }],
  [2, { nome: 'Massa 25kg', unidade: 'balde', preco: 4500 }],
  [3, { nome: 'Lixa', unidade: 'un', preco: 300 }],
]);
const receitas = new Map<number, ItemReceita[]>([
  [10, [
    { materialId: 1, tipoCalculo: 'por_m2', consumo: 0.03 },
    { materialId: 2, tipoCalculo: 'fixo', consumo: 2 },
  ]],
  [20, [{ materialId: 1, tipoCalculo: 'por_m2', consumo: 0.03 }]],
]);

const comServicos = (m2: number): FormOrcamento => ({
  ...formVazio(new Date(2026, 10, 17)),
  clienteId: 1,
  servicos: [{ servicoId: 10, nome: 'Pintura', metrosQuadrados: m2, precoM2: 2500 }],
});

describe('aplicarSugestao', () => {
  test('cria linhas sugeridas a partir da receita', () => {
    const f = aplicarSugestao(comServicos(80), receitas, catalogo);
    expect(f.materiais.map((m) => [m.materialId, m.quantidade, m.origem])).toEqual([
      [1, 3, 'sugerido'],
      [2, 2, 'sugerido'],
    ]);
    expect(f.chaveSugestao).toBe('10:80');
  });

  test('metragem mudou: sugeridos não editados são recalculados, editados ficam', () => {
    let f = aplicarSugestao(comServicos(80), receitas, catalogo);
    f = { ...f, materiais: f.materiais.map((m) => (m.materialId === 2 ? { ...m, quantidade: 5, editado: true } : m)) };
    f = aplicarSugestao({ ...f, servicos: [{ ...f.servicos[0], metrosQuadrados: 200 }] }, receitas, catalogo);
    expect(f.materiais.find((m) => m.materialId === 1)?.quantidade).toBe(6);
    expect(f.materiais.find((m) => m.materialId === 2)?.quantidade).toBe(5);
  });

  test('manual continua e removido não volta', () => {
    let f = aplicarSugestao(comServicos(80), receitas, catalogo);
    f = {
      ...f,
      materiais: [
        ...f.materiais.filter((m) => m.materialId !== 2),
        { materialId: 3, nome: 'Lixa', unidade: 'un', quantidade: 10, preco: 300, origem: 'manual', editado: false },
      ],
      materiaisIgnorados: [2],
    };
    f = aplicarSugestao(f, receitas, catalogo);
    expect(f.materiais.map((m) => m.materialId).sort()).toEqual([1, 3]);
  });

  test('mesmo material em dois serviços vira uma linha', () => {
    const f = aplicarSugestao(
      {
        ...comServicos(20), // 0,6
        servicos: [
          { servicoId: 10, nome: 'Pintura', metrosQuadrados: 20, precoM2: 2500 },
          { servicoId: 20, nome: 'Teto', metrosQuadrados: 20, precoM2: 2000 }, // 0,6
        ],
      },
      receitas,
      catalogo
    );
    expect(f.materiais.filter((m) => m.materialId === 1)).toHaveLength(1);
    expect(f.materiais.find((m) => m.materialId === 1)?.quantidade).toBe(2); // 1,2 → 2
  });

  test('serviço sem receita não sugere nada', () => {
    const f = aplicarSugestao({ ...comServicos(80), servicos: [{ servicoId: 99, nome: 'X', metrosQuadrados: 80, precoM2: 1 }] }, receitas, catalogo);
    expect(f.materiais).toEqual([]);
  });
});

describe('passos', () => {
  test('cliente obrigatório', () => {
    expect(erroDoPasso(0, formVazio())).toMatch(/cliente/);
    expect(erroDoPasso(0, comServicos(1))).toBeNull();
  });
  test('serviço com metragem obrigatório', () => {
    expect(erroDoPasso(1, { ...comServicos(1), servicos: [] })).toMatch(/pelo menos um/);
    expect(erroDoPasso(1, comServicos(0))).toMatch(/metragem de "Pintura"/);
    expect(erroDoPasso(1, comServicos(10))).toBeNull();
  });
  test('demais passos são livres', () => {
    for (const p of [2, 3, 4, 5]) expect(erroDoPasso(p, comServicos(10))).toBeNull();
  });
});

test('validade em dias usa o dia local', () => {
  expect(validadeEmDias(15, new Date(2026, 10, 17, 23, 30))).toBe('2026-12-02');
});

test('cálculo ao vivo bate com o domínio e tolera metragem vazia', () => {
  const f = aplicarSugestao(comServicos(80), receitas, catalogo);
  expect(calcularDoForm(f).totalCliente).toBe(200000 + 63000 + 9000);
  expect(calcularDoForm({ ...f, servicos: [{ ...f.servicos[0], metrosQuadrados: null }] }).subtotalServicos).toBe(0);
});

test('ida e volta: salvar pelo formulário e reabrir para editar', async () => {
  const db = await criarDbMigrado();
  const cliente = await criarCliente(db, { nome: 'Ana' });
  const servico = await criarServico(db, { nome: 'Pintura', precoM2: 2500 });
  const tinta = await criarMaterial(db, { nome: 'Tinta', unidade: 'lata', preco: 21000 });
  const func = await criarFuncionario(db, { nome: 'Carlos', diaria: 15000 });

  const f: FormOrcamento = {
    ...formVazio(new Date(2026, 10, 17)),
    clienteId: cliente,
    servicos: [{ servicoId: servico, nome: 'Pintura', metrosQuadrados: 12.5, precoM2: 3000 }], // preço editado
    materiais: [{ materialId: tinta, nome: 'Tinta', unidade: 'lata', quantidade: 2, preco: 21000, origem: 'sugerido', editado: false }],
    funcionarios: [{ funcionarioId: func, nome: 'Carlos', diaria: 15000, dias: 3 }],
    descontoPct: 5,
    observacoes: 'Portão incluso',
  };
  const id = await salvarOrcamento(db, paraInput(f));
  const o = (await obterOrcamentoCompleto(db, id))!;
  expect(o.total_cliente).toBe(calcularDoForm(f).totalCliente);

  const reaberto = formDeOrcamento(o);
  expect(reaberto.servicos[0]).toMatchObject({ metrosQuadrados: 12.5, precoM2: 3000 });
  expect(reaberto.materiais[0]).toMatchObject({ quantidade: 2, editado: true });
  expect(reaberto.observacoes).toBe('Portão incluso');
  expect(calcularDoForm(reaberto)).toEqual(o.calculo);
});
