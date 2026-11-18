import { emTransacao, type Db, type SqlParam } from '../db/tipos';
import { calcularOrcamento, type ResultadoCalculo } from '../domain/calculo';
import { orcamentoSchema, validar, type OrcamentoInput, type OrcamentoValidado } from '../domain/schemas';
import {
  ErroDeRegra,
  ROTULO_STATUS_ATENDIMENTO,
  ROTULO_STATUS_ORCAMENTO,
  type DescontoBase,
  type ModoCobranca,
  type StatusAtendimento,
  type StatusOrcamento,
} from '../domain/tipos';
import { paraUtcSql } from '../lib/datas';

// ---------------- Tipos de leitura ----------------

export interface OrcamentoRow {
  id: number;
  cliente_id: number;
  criado_em: string;
  aprovado_em: string | null;
  validade: string | null;
  status: StatusOrcamento;
  desconto_pct: number;
  desconto_base: DescontoBase;
  materiais_modo: ModoCobranca;
  ferramentas_modo: ModoCobranca;
  total_cliente: number;
  lucro: number;
  observacoes: string | null;
  arquivado: number;
}

export interface OrcamentoCompleto extends OrcamentoRow {
  cliente: { id: number; nome: string; telefone: string | null; cidade: string | null; endereco: string | null };
  servicos: { servico_id: number; nome: string; descricao: string | null; metros_quadrados: number; preco_m2_no_momento: number }[];
  materiais: { material_id: number; nome: string; unidade: string; quantidade: number; preco_no_momento: number }[];
  ferramentas: { ferramenta_id: number; nome: string; preco_no_momento: number }[];
  funcionarios: { funcionario_id: number; nome: string; diaria_no_momento: number; dias: number }[];
  atendimento: { id: number; status: StatusAtendimento; data_agendada: string | null } | null;
  calculo: ResultadoCalculo;
}

export interface OrcamentoResumo extends OrcamentoRow {
  cliente_nome: string;
}

// ---------------- Gravação ----------------

/**
 * Preço da linha, nesta ordem:
 * 1. editado na linha (veio no input);
 * 2. o que já estava congelado neste orçamento (edição não muda preço antigo);
 * 3. copiado do catálogo, só se o item NÃO estiver arquivado.
 */
async function resolverPreco(
  db: Db,
  opcoes: {
    tabela: 'servicos' | 'materiais' | 'ferramentas' | 'funcionarios';
    colunaPreco: string;
    id: number;
    editado: number | undefined;
    congelado: number | undefined;
    rotulo: string;
  }
): Promise<number> {
  const item = await db.getFirstAsync<{ preco: number; arquivado: number; nome: string }>(
    `SELECT ${opcoes.colunaPreco} AS preco, arquivado, nome FROM ${opcoes.tabela} WHERE id = ?`,
    [opcoes.id]
  );
  if (!item) throw new ErroDeRegra(`${opcoes.rotulo} não encontrado (id ${opcoes.id}).`);
  if (opcoes.congelado === undefined && item.arquivado) {
    throw new ErroDeRegra(`"${item.nome}" está arquivado e não pode ser adicionado a um orçamento.`);
  }
  return opcoes.editado ?? opcoes.congelado ?? item.preco;
}

function exigirSemRepetidos(ids: number[], mensagem: string) {
  if (new Set(ids).size !== ids.length) throw new ErroDeRegra(mensagem);
}

/**
 * Cria (sem id) ou edita (com id) um orçamento com todos os filhos, recalcula
 * total_cliente e lucro e grava tudo NA MESMA TRANSAÇÃO.
 * Não muda o status: para isso use mudarStatusOrcamento().
 */
export async function salvarOrcamento(db: Db, input: OrcamentoInput, id?: number): Promise<number> {
  const o: OrcamentoValidado = validar(orcamentoSchema, input);

  exigirSemRepetidos(
    o.servicos.map((s) => s.servicoId),
    'O mesmo serviço apareceu duas vezes. Junte as metragens numa linha só.'
  );
  exigirSemRepetidos(o.materiais.map((m) => m.materialId), 'O mesmo material apareceu duas vezes. Some as quantidades.');
  exigirSemRepetidos(o.ferramentas.map((f) => f.ferramentaId), 'A mesma ferramenta apareceu duas vezes.');
  exigirSemRepetidos(o.funcionarios.map((f) => f.funcionarioId), 'O mesmo funcionário apareceu duas vezes.');

  return emTransacao(db, async () => {
    const cliente = await db.getFirstAsync<{ arquivado: number }>('SELECT arquivado FROM clientes WHERE id = ?', [
      o.clienteId,
    ]);
    if (!cliente) throw new ErroDeRegra('Cliente não encontrado.');

    // Preços congelados que já existiam (só na edição).
    const congelados = { servicos: new Map<number, number>(), materiais: new Map<number, number>(), ferramentas: new Map<number, number>(), funcionarios: new Map<number, number>() };

    if (id !== undefined) {
      const atual = await db.getFirstAsync<{ cliente_id: number }>('SELECT cliente_id FROM orcamentos WHERE id = ?', [id]);
      if (!atual) throw new ErroDeRegra('Orçamento não encontrado.');
      if (cliente.arquivado && atual.cliente_id !== o.clienteId) {
        throw new ErroDeRegra('Este cliente está arquivado e não pode ser usado em um orçamento.');
      }
      for (const r of await db.getAllAsync<{ k: number; p: number }>(
        'SELECT servico_id k, preco_m2_no_momento p FROM orcamento_servicos WHERE orcamento_id = ?', [id]))
        congelados.servicos.set(r.k, r.p);
      for (const r of await db.getAllAsync<{ k: number; p: number }>(
        'SELECT material_id k, preco_no_momento p FROM orcamento_materiais WHERE orcamento_id = ?', [id]))
        congelados.materiais.set(r.k, r.p);
      for (const r of await db.getAllAsync<{ k: number; p: number }>(
        'SELECT ferramenta_id k, preco_no_momento p FROM orcamento_ferramentas WHERE orcamento_id = ?', [id]))
        congelados.ferramentas.set(r.k, r.p);
      for (const r of await db.getAllAsync<{ k: number; p: number }>(
        'SELECT funcionario_id k, diaria_no_momento p FROM orcamento_funcionarios WHERE orcamento_id = ?', [id]))
        congelados.funcionarios.set(r.k, r.p);
    } else if (cliente.arquivado) {
      throw new ErroDeRegra('Este cliente está arquivado e não pode ser usado em um orçamento.');
    }

    const servicos = [];
    for (const s of o.servicos) {
      servicos.push({
        ...s,
        preco: await resolverPreco(db, { tabela: 'servicos', colunaPreco: 'preco_m2', id: s.servicoId, editado: s.precoM2, congelado: congelados.servicos.get(s.servicoId), rotulo: 'Serviço' }),
      });
    }
    const materiais = [];
    for (const m of o.materiais) {
      materiais.push({
        ...m,
        preco: await resolverPreco(db, { tabela: 'materiais', colunaPreco: 'preco', id: m.materialId, editado: m.preco, congelado: congelados.materiais.get(m.materialId), rotulo: 'Material' }),
      });
    }
    const ferramentas = [];
    for (const f of o.ferramentas) {
      ferramentas.push({
        ...f,
        preco: await resolverPreco(db, { tabela: 'ferramentas', colunaPreco: 'valor_compra', id: f.ferramentaId, editado: f.preco, congelado: congelados.ferramentas.get(f.ferramentaId), rotulo: 'Ferramenta' }),
      });
    }
    const funcionarios = [];
    for (const f of o.funcionarios) {
      funcionarios.push({
        ...f,
        diaria: await resolverPreco(db, { tabela: 'funcionarios', colunaPreco: 'diaria', id: f.funcionarioId, editado: f.diaria, congelado: congelados.funcionarios.get(f.funcionarioId), rotulo: 'Funcionário' }),
      });
    }

    const calc = calcularOrcamento({
      servicos: servicos.map((s) => ({ metrosQuadrados: s.metrosQuadrados, precoM2: s.preco })),
      materiais: materiais.map((m) => ({ quantidade: m.quantidade, preco: m.preco })),
      ferramentas: ferramentas.map((f) => ({ preco: f.preco })),
      funcionarios: funcionarios.map((f) => ({ diaria: f.diaria, dias: f.dias })),
      descontoPct: o.descontoPct,
      descontoBase: o.descontoBase,
      materiaisModo: o.materiaisModo,
      ferramentasModo: o.ferramentasModo,
    });

    const cabecalho: SqlParam[] = [
      o.clienteId, o.validade, o.descontoPct, o.descontoBase, o.materiaisModo, o.ferramentasModo,
      calc.totalCliente, calc.lucro, o.observacoes,
    ];

    let orcamentoId: number;
    if (id === undefined) {
      const r = await db.runAsync(
        `INSERT INTO orcamentos (cliente_id, validade, desconto_pct, desconto_base, materiais_modo,
                                 ferramentas_modo, total_cliente, lucro, observacoes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        cabecalho
      );
      orcamentoId = r.lastInsertRowId;
    } else {
      orcamentoId = id;
      await db.runAsync(
        `UPDATE orcamentos SET cliente_id = ?, validade = ?, desconto_pct = ?, desconto_base = ?,
                materiais_modo = ?, ferramentas_modo = ?, total_cliente = ?, lucro = ?, observacoes = ?
          WHERE id = ?`,
        [...cabecalho, id]
      );
      for (const t of ['orcamento_servicos', 'orcamento_materiais', 'orcamento_ferramentas', 'orcamento_funcionarios']) {
        await db.runAsync(`DELETE FROM ${t} WHERE orcamento_id = ?`, [id]);
      }
    }

    for (const s of servicos) {
      await db.runAsync(
        'INSERT INTO orcamento_servicos (orcamento_id, servico_id, metros_quadrados, preco_m2_no_momento) VALUES (?, ?, ?, ?)',
        [orcamentoId, s.servicoId, s.metrosQuadrados, s.preco]
      );
    }
    for (const m of materiais) {
      await db.runAsync(
        'INSERT INTO orcamento_materiais (orcamento_id, material_id, quantidade, preco_no_momento) VALUES (?, ?, ?, ?)',
        [orcamentoId, m.materialId, m.quantidade, m.preco]
      );
    }
    for (const f of ferramentas) {
      await db.runAsync(
        'INSERT INTO orcamento_ferramentas (orcamento_id, ferramenta_id, preco_no_momento) VALUES (?, ?, ?)',
        [orcamentoId, f.ferramentaId, f.preco]
      );
    }
    for (const f of funcionarios) {
      await db.runAsync(
        'INSERT INTO orcamento_funcionarios (orcamento_id, funcionario_id, diaria_no_momento, dias) VALUES (?, ?, ?, ?)',
        [orcamentoId, f.funcionarioId, f.diaria, f.dias]
      );
    }
    return orcamentoId;
  });
}

// ---------------- Leitura ----------------

export async function obterOrcamentoCompleto(db: Db, id: number): Promise<OrcamentoCompleto | null> {
  const o = await db.getFirstAsync<OrcamentoRow>('SELECT * FROM orcamentos WHERE id = ?', [id]);
  if (!o) return null;

  const [cliente, servicos, materiais, ferramentas, funcionarios, atendimento] = await Promise.all([
    db.getFirstAsync<OrcamentoCompleto['cliente']>(
      'SELECT id, nome, telefone, cidade, endereco FROM clientes WHERE id = ?', [o.cliente_id]),
    db.getAllAsync<OrcamentoCompleto['servicos'][number]>(
      `SELECT os.servico_id, s.nome, s.descricao, os.metros_quadrados, os.preco_m2_no_momento
         FROM orcamento_servicos os JOIN servicos s ON s.id = os.servico_id
        WHERE os.orcamento_id = ? ORDER BY os.rowid`, [id]),
    db.getAllAsync<OrcamentoCompleto['materiais'][number]>(
      `SELECT om.material_id, m.nome, m.unidade, om.quantidade, om.preco_no_momento
         FROM orcamento_materiais om JOIN materiais m ON m.id = om.material_id
        WHERE om.orcamento_id = ? ORDER BY om.rowid`, [id]),
    db.getAllAsync<OrcamentoCompleto['ferramentas'][number]>(
      `SELECT ofe.ferramenta_id, f.nome, ofe.preco_no_momento
         FROM orcamento_ferramentas ofe JOIN ferramentas f ON f.id = ofe.ferramenta_id
        WHERE ofe.orcamento_id = ? ORDER BY ofe.rowid`, [id]),
    db.getAllAsync<OrcamentoCompleto['funcionarios'][number]>(
      `SELECT ofu.funcionario_id, f.nome, ofu.diaria_no_momento, ofu.dias
         FROM orcamento_funcionarios ofu JOIN funcionarios f ON f.id = ofu.funcionario_id
        WHERE ofu.orcamento_id = ? ORDER BY ofu.rowid`, [id]),
    db.getFirstAsync<NonNullable<OrcamentoCompleto['atendimento']>>(
      'SELECT id, status, data_agendada FROM atendimentos WHERE orcamento_id = ?', [id]),
  ]);

  const calculo = calcularOrcamento({
    servicos: servicos.map((s) => ({ metrosQuadrados: s.metros_quadrados, precoM2: s.preco_m2_no_momento })),
    materiais: materiais.map((m) => ({ quantidade: m.quantidade, preco: m.preco_no_momento })),
    ferramentas: ferramentas.map((f) => ({ preco: f.preco_no_momento })),
    funcionarios: funcionarios.map((f) => ({ diaria: f.diaria_no_momento, dias: f.dias })),
    descontoPct: o.desconto_pct,
    descontoBase: o.desconto_base,
    materiaisModo: o.materiais_modo,
    ferramentasModo: o.ferramentas_modo,
  });

  return { ...o, cliente: cliente!, servicos, materiais, ferramentas, funcionarios, atendimento, calculo };
}

export interface FiltrosOrcamento {
  status?: StatusOrcamento;
  clienteId?: number;
  /** "AAAA-MM-DD HH:MM:SS" UTC, inclusivo. Use intervaloDoMesUtc() para meses. */
  de?: string;
  /** "AAAA-MM-DD HH:MM:SS" UTC, exclusivo. */
  ate?: string;
  incluirArquivados?: boolean;
  ordem?: 'recentes' | 'antigos';
  limite?: number;
}

export function listarOrcamentos(db: Db, f: FiltrosOrcamento = {}) {
  const where: string[] = [];
  const params: SqlParam[] = [];
  if (!f.incluirArquivados) where.push('o.arquivado = 0');
  if (f.status) { where.push('o.status = ?'); params.push(f.status); }
  if (f.clienteId) { where.push('o.cliente_id = ?'); params.push(f.clienteId); }
  if (f.de) { where.push('o.criado_em >= ?'); params.push(f.de); }
  if (f.ate) { where.push('o.criado_em < ?'); params.push(f.ate); }
  const ordem = f.ordem === 'antigos' ? 'ASC' : 'DESC';
  let sql = `SELECT o.*, c.nome AS cliente_nome FROM orcamentos o JOIN clientes c ON c.id = o.cliente_id
             ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY o.criado_em ${ordem}, o.id ${ordem}`;
  if (f.limite) { sql += ' LIMIT ?'; params.push(f.limite); }
  return db.getAllAsync<OrcamentoResumo>(sql, params);
}

export async function arquivarOrcamento(db: Db, id: number, arquivado = true) {
  const r = await db.runAsync('UPDATE orcamentos SET arquivado = ? WHERE id = ?', [arquivado ? 1 : 0, id]);
  if (r.changes === 0) throw new ErroDeRegra('Orçamento não encontrado.');
}

// ---------------- Status (escopo, seção 6) ----------------

/**
 * pendente → aprovado: cria o atendimento em "aguardando_agendamento", sem data.
 * aprovado → pendente/recusado: apaga o atendimento, mas só se ele ainda estiver
 *   em "aguardando_agendamento"; senão bloqueia com mensagem clara.
 * recusado → pendente/aprovado: permitido.
 * Tudo em uma transação.
 */
export async function mudarStatusOrcamento(db: Db, id: number, novo: StatusOrcamento, agora = new Date()) {
  await emTransacao(db, async () => {
    const o = await db.getFirstAsync<{ status: StatusOrcamento }>('SELECT status FROM orcamentos WHERE id = ?', [id]);
    if (!o) throw new ErroDeRegra('Orçamento não encontrado.');
    if (o.status === novo) return;

    if (o.status === 'aprovado') {
      const at = await db.getFirstAsync<{ id: number; status: StatusAtendimento }>(
        'SELECT id, status FROM atendimentos WHERE orcamento_id = ?', [id]);
      if (at && at.status !== 'aguardando_agendamento') {
        throw new ErroDeRegra(
          `Não dá para mudar este orçamento para "${ROTULO_STATUS_ORCAMENTO[novo]}": o atendimento já está ` +
            `"${ROTULO_STATUS_ATENDIMENTO[at.status]}". Volte o atendimento para ` +
            '"Aguardando agendamento" primeiro.'
        );
      }
      if (at) await db.runAsync('DELETE FROM atendimentos WHERE id = ?', [at.id]);
    }

    if (novo === 'aprovado') {
      await db.runAsync("UPDATE orcamentos SET status = 'aprovado', aprovado_em = ? WHERE id = ?", [paraUtcSql(agora), id]);
      await db.runAsync(
        "INSERT INTO atendimentos (orcamento_id, status, data_agendada) VALUES (?, 'aguardando_agendamento', NULL)",
        [id]
      );
    } else {
      await db.runAsync('UPDATE orcamentos SET status = ?, aprovado_em = NULL WHERE id = ?', [novo, id]);
    }
  });
}

export const aprovarOrcamento = (db: Db, id: number, agora?: Date) => mudarStatusOrcamento(db, id, 'aprovado', agora);
export const recusarOrcamento = (db: Db, id: number) => mudarStatusOrcamento(db, id, 'recusado');
export const voltarParaPendente = (db: Db, id: number) => mudarStatusOrcamento(db, id, 'pendente');
