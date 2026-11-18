/**
 * Validação PURA de um arquivo de backup a partir dos primeiros 100 bytes
 * (o cabeçalho do SQLite). Sem dependência de Expo, testável no Node.
 *
 * Formato: https://www.sqlite.org/fileformat.html#the_database_header
 * - bytes 0..15: "SQLite format 3\0"
 * - bytes 60..63: user_version (inteiro de 4 bytes, big-endian)
 */

const ASSINATURA = 'SQLite format 3\u0000';
export const TAMANHO_CABECALHO = 100;

export type ResultadoCabecalho =
  | { valido: true; userVersion: number }
  | { valido: false; motivo: string };

export function lerCabecalhoSqlite(bytes: Uint8Array): ResultadoCabecalho {
  if (bytes.length < TAMANHO_CABECALHO) {
    return { valido: false, motivo: 'O arquivo é pequeno demais para ser um backup do app.' };
  }
  for (let i = 0; i < ASSINATURA.length; i++) {
    if (bytes[i] !== ASSINATURA.charCodeAt(i)) {
      return { valido: false, motivo: 'Este arquivo não é um backup do app (não é um banco SQLite).' };
    }
  }
  const userVersion = ((bytes[60] << 24) | (bytes[61] << 16) | (bytes[62] << 8) | bytes[63]) >>> 0;
  return { valido: true, userVersion };
}

export type DecisaoVersao = 'igual' | 'migrar' | 'recusar';

/** Menor: restaura e roda as migrações. Maior: recusa. */
export function decidirPorVersao(versaoArquivo: number, versaoApp: number): DecisaoVersao {
  if (versaoArquivo > versaoApp) return 'recusar';
  if (versaoArquivo < versaoApp) return 'migrar';
  return 'igual';
}

export function mensagemVersao(versaoArquivo: number, versaoApp: number): string | null {
  if (versaoArquivo === 0) return 'Este arquivo é um banco vazio, não um backup do app.';
  if (decidirPorVersao(versaoArquivo, versaoApp) === 'recusar') {
    return (
      `Este backup foi feito por uma versão mais nova do app (banco v${versaoArquivo}; ` +
      `este app entende até v${versaoApp}). Atualize o app e tente de novo.`
    );
  }
  return null;
}

const pad = (n: number) => n.toString().padStart(2, '0');

/** "katara-backup-AAAA-MM-DD.db" (data local). */
export function nomeArquivoBackup(data = new Date()): string {
  return `katara-backup-${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}.db`;
}
