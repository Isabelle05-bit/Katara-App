import type { Db } from '../db/tipos';
import { itemReceitaSchema, servicoSchema, validar, type ItemReceitaInput, type ServicoInput } from '../domain/schemas';
import { ErroDeRegra, type TipoCalculo } from '../domain/tipos';
import type { ItemReceita } from '../domain/calculo';
import { definirArquivado } from './cadastros';

export interface Servico {
  id: number;
  nome: string;
  preco_m2: number;
  descricao: string | null;
  observacoes: string | null;
  arquivado: number;
}

export interface LinhaReceita {
  material_id: number;
  material_nome: string;
  unidade: string;
  material_arquivado: number;
  tipo_calculo: TipoCalculo;
  consumo: number;
}

export async function criarServico(db: Db, input: ServicoInput): Promise<number> {
  const s = validar(servicoSchema, input);
  const r = await db.runAsync('INSERT INTO servicos (nome, preco_m2, descricao, observacoes) VALUES (?, ?, ?, ?)', [
    s.nome,
    s.precoM2,
    s.descricao,
    s.observacoes,
  ]);
  return r.lastInsertRowId;
}

export async function editarServico(db: Db, id: number, input: ServicoInput) {
  const s = validar(servicoSchema, input);
  await db.runAsync('UPDATE servicos SET nome = ?, preco_m2 = ?, descricao = ?, observacoes = ? WHERE id = ?', [
    s.nome,
    s.precoM2,
    s.descricao,
    s.observacoes,
    id,
  ]);
}

export function obterServico(db: Db, id: number) {
  return db.getFirstAsync<Servico>('SELECT * FROM servicos WHERE id = ?', [id]);
}

export function listarServicos(db: Db, opcoes: { incluirArquivados?: boolean } = {}) {
  return db.getAllAsync<Servico>(
    `SELECT * FROM servicos ${opcoes.incluirArquivados ? '' : 'WHERE arquivado = 0'} ORDER BY nome COLLATE NOCASE`,
    []
  );
}

export const arquivarServico = (db: Db, id: number) => definirArquivado(db, 'servicos', id, true);

// ---------------- Receita (servico_materiais) ----------------

export function listarReceita(db: Db, servicoId: number) {
  return db.getAllAsync<LinhaReceita>(
    `SELECT sm.material_id, m.nome AS material_nome, m.unidade, m.arquivado AS material_arquivado,
            sm.tipo_calculo, sm.consumo
       FROM servico_materiais sm
       JOIN materiais m ON m.id = sm.material_id
      WHERE sm.servico_id = ?
      ORDER BY m.nome COLLATE NOCASE`,
    [servicoId]
  );
}

/** Receita pronta para sugerirMateriais(); ignora materiais arquivados. */
export async function receitaParaSugestao(db: Db, servicoId: number): Promise<ItemReceita[]> {
  const linhas = await listarReceita(db, servicoId);
  return linhas
    .filter((l) => !l.material_arquivado)
    .map((l) => ({ materialId: l.material_id, tipoCalculo: l.tipo_calculo, consumo: l.consumo }));
}

export async function adicionarNaReceita(db: Db, servicoId: number, input: ItemReceitaInput) {
  const item = validar(itemReceitaSchema, input);
  const material = await db.getFirstAsync<{ arquivado: number }>('SELECT arquivado FROM materiais WHERE id = ?', [
    item.materialId,
  ]);
  if (!material) throw new ErroDeRegra('Material não encontrado.');
  if (material.arquivado) throw new ErroDeRegra('Este material está arquivado e não pode entrar na receita.');

  const existe = await db.getFirstAsync(
    'SELECT 1 FROM servico_materiais WHERE servico_id = ? AND material_id = ?',
    [servicoId, item.materialId]
  );
  if (existe) throw new ErroDeRegra('Este material já está na receita. Edite o consumo da linha existente.');

  await db.runAsync(
    'INSERT INTO servico_materiais (servico_id, material_id, tipo_calculo, consumo) VALUES (?, ?, ?, ?)',
    [servicoId, item.materialId, item.tipoCalculo, item.consumo]
  );
}

export async function editarItemReceita(db: Db, servicoId: number, input: ItemReceitaInput) {
  const item = validar(itemReceitaSchema, input);
  const r = await db.runAsync(
    'UPDATE servico_materiais SET tipo_calculo = ?, consumo = ? WHERE servico_id = ? AND material_id = ?',
    [item.tipoCalculo, item.consumo, servicoId, item.materialId]
  );
  if (r.changes === 0) throw new ErroDeRegra('Item da receita não encontrado.');
}

export async function removerDaReceita(db: Db, servicoId: number, materialId: number) {
  await db.runAsync('DELETE FROM servico_materiais WHERE servico_id = ? AND material_id = ?', [servicoId, materialId]);
}
