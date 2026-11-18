import { criarDbMigrado } from '../../test/dbEmMemoria';
import { criarMaterial } from '../../repositories/cadastros';
import { adicionarNaReceita, criarServico, listarReceita } from '../../repositories/servicos';
import { diferencaReceita, erroDaReceita, salvarReceita } from './receita';

test('diferencaReceita', () => {
  const d = diferencaReceita(
    [
      { materialId: 1, tipoCalculo: 'por_m2', consumo: 0.03 },
      { materialId: 2, tipoCalculo: 'fixo', consumo: 1 },
      { materialId: 3, tipoCalculo: 'fixo', consumo: 2 },
    ],
    [
      { materialId: 1, tipoCalculo: 'por_m2', consumo: 0.03 }, // igual
      { materialId: 2, tipoCalculo: 'fixo', consumo: 4 }, // editado
      { materialId: 4, tipoCalculo: 'por_m2', consumo: 0.1 }, // novo
    ]
  );
  expect(d.adicionar.map((r) => r.materialId)).toEqual([4]);
  expect(d.editar.map((r) => r.materialId)).toEqual([2]);
  expect(d.remover).toEqual([3]);
});

test('erroDaReceita exige consumo', () => {
  expect(erroDaReceita([{ materialId: 1, nome: 'Tinta', unidade: 'lata', tipoCalculo: 'fixo', consumo: null }])).toMatch(/consumo de "Tinta"/);
  expect(erroDaReceita([{ materialId: 1, nome: 'Tinta', unidade: 'lata', tipoCalculo: 'fixo', consumo: 1 }])).toBeNull();
});

test('salvarReceita grava a diferença no banco', async () => {
  const db = await criarDbMigrado();
  const servico = await criarServico(db, { nome: 'Pintura', precoM2: 2500 });
  const tinta = await criarMaterial(db, { nome: 'Tinta', unidade: 'lata', preco: 1 });
  const massa = await criarMaterial(db, { nome: 'Massa', unidade: 'balde', preco: 1 });
  const lixa = await criarMaterial(db, { nome: 'Lixa', unidade: 'un', preco: 1 });
  await adicionarNaReceita(db, servico, { materialId: tinta, tipoCalculo: 'por_m2', consumo: 0.03 });
  await adicionarNaReceita(db, servico, { materialId: massa, tipoCalculo: 'fixo', consumo: 1 });

  const antes = (await listarReceita(db, servico)).map((l) => ({ materialId: l.material_id, tipoCalculo: l.tipo_calculo, consumo: l.consumo }));
  await salvarReceita(db as never, servico, antes, [
    { materialId: tinta, nome: 'Tinta', unidade: 'lata', tipoCalculo: 'por_m2', consumo: 0.05 },
    { materialId: lixa, nome: 'Lixa', unidade: 'un', tipoCalculo: 'fixo', consumo: 10 },
  ]);

  const depois = await listarReceita(db, servico);
  expect(depois.map((l) => [l.material_nome, l.consumo])).toEqual([
    ['Lixa', 10],
    ['Tinta', 0.05],
  ]);
});
