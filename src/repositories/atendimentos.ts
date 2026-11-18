import type { Db, SqlParam } from '../db/tipos';
import { statusAtendimentoSchema, validar } from '../domain/schemas';
import { ErroDeRegra, type StatusAtendimento } from '../domain/tipos';

/**
 * Atendimentos nascem e morrem junto com a aprovação do orçamento
 * (ver mudarStatusOrcamento). Aqui só se agenda, reagenda e muda status.
 *
 * Equipe do atendimento: reaproveita orcamento_funcionarios (a equipe
 * orçada). Não há tabela própria na v1.
 *
 * [ABERTO] Se a data muda o status sozinha: por enquanto NÃO. Data e status
 * são independentes e o Anderson muda o status manualmente.
 */

export interface AtendimentoResumo {
  id: number;
  orcamento_id: number;
  data_agendada: string | null;
  status: StatusAtendimento;
  arquivado: number;
  cliente_nome: string;
  cliente_telefone: string | null;
  cliente_endereco: string | null;
  cliente_cidade: string | null;
  total_cliente: number;
}

export function listarAtendimentos(
  db: Db,
  f: { status?: StatusAtendimento; incluirArquivados?: boolean } = {}
) {
  const where: string[] = [];
  const params: SqlParam[] = [];
  if (!f.incluirArquivados) where.push('a.arquivado = 0');
  if (f.status) { where.push('a.status = ?'); params.push(f.status); }
  // Sem data primeiro (precisam ser agendados), depois por data crescente.
  return db.getAllAsync<AtendimentoResumo>(
    `SELECT a.*, c.nome AS cliente_nome, c.telefone AS cliente_telefone, c.endereco AS cliente_endereco,
            c.cidade AS cliente_cidade, o.total_cliente
       FROM atendimentos a
       JOIN orcamentos o ON o.id = a.orcamento_id
       JOIN clientes c ON c.id = o.cliente_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY a.data_agendada IS NOT NULL, a.data_agendada, a.id`,
    params
  );
}

export function obterAtendimento(db: Db, id: number) {
  return db.getFirstAsync<{ id: number; orcamento_id: number; data_agendada: string | null; status: StatusAtendimento; arquivado: number }>(
    'SELECT * FROM atendimentos WHERE id = ?', [id]);
}

export function equipeDoAtendimento(db: Db, atendimentoId: number) {
  return db.getAllAsync<{ funcionario_id: number; nome: string; dias: number; status: string }>(
    `SELECT ofu.funcionario_id, f.nome, ofu.dias, f.status
       FROM atendimentos a
       JOIN orcamento_funcionarios ofu ON ofu.orcamento_id = a.orcamento_id
       JOIN funcionarios f ON f.id = ofu.funcionario_id
      WHERE a.id = ? ORDER BY f.nome COLLATE NOCASE`,
    [atendimentoId]
  );
}

/** Agenda ou reagenda (data "AAAA-MM-DD"). null remove a data. */
export async function agendarAtendimento(db: Db, id: number, data: string | null) {
  if (data !== null && !/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new ErroDeRegra('Data inválida.');
  const r = await db.runAsync('UPDATE atendimentos SET data_agendada = ? WHERE id = ?', [data, id]);
  if (r.changes === 0) throw new ErroDeRegra('Atendimento não encontrado.');
}

export async function mudarStatusAtendimento(db: Db, id: number, status: StatusAtendimento) {
  const s = validar(statusAtendimentoSchema, status);
  const r = await db.runAsync('UPDATE atendimentos SET status = ? WHERE id = ?', [s, id]);
  if (r.changes === 0) throw new ErroDeRegra('Atendimento não encontrado.');
}

export async function arquivarAtendimento(db: Db, id: number, arquivado = true) {
  const r = await db.runAsync('UPDATE atendimentos SET arquivado = ? WHERE id = ?', [arquivado ? 1 : 0, id]);
  if (r.changes === 0) throw new ErroDeRegra('Atendimento não encontrado.');
}
