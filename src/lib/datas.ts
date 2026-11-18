/**
 * Datas no banco:
 * - Só data (validade, data_agendada): "AAAA-MM-DD", sem fuso.
 * - Momento (criado_em, aprovado_em): "AAAA-MM-DD HH:MM:SS" em UTC, igual ao
 *   datetime('now') do SQLite. Na tela, convertemos para o horário local
 *   (Brasil, -03:00). Sem isso, um orçamento criado às 22h do dia 31 apareceria
 *   como do dia seguinte (já é 01h em UTC).
 */

const pad = (n: number) => n.toString().padStart(2, '0');

/** Date → "AAAA-MM-DD" usando o dia LOCAL. */
export function paraIsoData(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Date → "AAAA-MM-DD HH:MM:SS" em UTC (mesmo formato do datetime('now')). */
export function paraUtcSql(d: Date): string {
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}

/** "AAAA-MM-DD HH:MM:SS" (UTC) → Date. */
export function deUtcSql(s: string): Date {
  return new Date(s.replace(' ', 'T') + 'Z');
}

/** "AAAA-MM-DD" → Date local à meia-noite. */
export function deIsoData(s: string): Date {
  const [a, m, d] = s.split('-').map(Number);
  return new Date(a, m - 1, d);
}

/**
 * Formata para dd/mm/aaaa.
 * - "AAAA-MM-DD" é tratado como data pura (sem conversão de fuso).
 * - "AAAA-MM-DD HH:MM:SS" é tratado como UTC e convertido para o dia local.
 */
export function formatarData(valor: string | Date | null | undefined): string {
  if (!valor) return '';
  let d: Date;
  if (valor instanceof Date) d = valor;
  else if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) d = deIsoData(valor);
  else d = deUtcSql(valor);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** "dd/mm/aaaa" digitado → "AAAA-MM-DD", ou null se inválido. */
export function lerDataBR(texto: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const [, dd, mm, aaaa] = m;
  const d = new Date(Number(aaaa), Number(mm) - 1, Number(dd));
  if (d.getDate() !== Number(dd) || d.getMonth() !== Number(mm) - 1) return null;
  return `${aaaa}-${mm}-${dd}`;
}

/**
 * Intervalo [inicio, fim) de um mês LOCAL, em strings UTC comparáveis com
 * criado_em / aprovado_em no SQL.
 */
export function intervaloDoMesUtc(ano: number, mes1a12: number): { inicio: string; fim: string } {
  return {
    inicio: paraUtcSql(new Date(ano, mes1a12 - 1, 1)),
    fim: paraUtcSql(new Date(ano, mes1a12, 1)),
  };
}
