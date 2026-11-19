import type { Db } from '../db/tipos';
import { intervaloDoMesUtc } from '../lib/datas';
import { listarOrcamentos, type OrcamentoResumo } from './orcamentos';

export interface Dashboard {
  /** Soma de total_cliente dos orçamentos APROVADOS no mês (por aprovado_em). */
  previstoMes: number;
  lucroPrevistoMes: number;
  aprovadosMes: number;
  pendentesQtd: number;
  pendentesValor: number;
  recentes: OrcamentoResumo[];
}

/**
 * Previsto do mês = orçamentos aprovados cujo aprovado_em cai no mês LOCAL.
 * Arquivados ficam de fora (arquivar = tirar da vista).
 */
export async function carregarDashboard(db: Db, hoje = new Date(), qtdRecentes = 5): Promise<Dashboard> {
  const { inicio, fim } = intervaloDoMesUtc(hoje.getFullYear(), hoje.getMonth() + 1);

  const [mes, pendentes, recentes] = await Promise.all([
    db.getFirstAsync<{ previsto: number; lucro: number; qtd: number }>(
      `SELECT COALESCE(SUM(total_cliente), 0) previsto, COALESCE(SUM(lucro), 0) lucro, COUNT(*) qtd
         FROM orcamentos
        WHERE status = 'aprovado' AND arquivado = 0 AND aprovado_em >= ? AND aprovado_em < ?`,
      [inicio, fim]
    ),
    db.getFirstAsync<{ qtd: number; valor: number }>(
      `SELECT COUNT(*) qtd, COALESCE(SUM(total_cliente), 0) valor
         FROM orcamentos WHERE status = 'pendente' AND arquivado = 0`,
      []
    ),
    listarOrcamentos(db, { limite: qtdRecentes }),
  ]);

  return {
    previstoMes: mes?.previsto ?? 0,
    lucroPrevistoMes: mes?.lucro ?? 0,
    aprovadosMes: mes?.qtd ?? 0,
    pendentesQtd: pendentes?.qtd ?? 0,
    pendentesValor: pendentes?.valor ?? 0,
    recentes,
  };
}
