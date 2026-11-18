import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';
import {
  backupDatabaseAsync,
  defaultDatabaseDirectory,
  deleteDatabaseAsync,
  openDatabaseAsync,
  type SQLiteDatabase,
} from 'expo-sqlite';
import { migrateDbIfNeeded } from '../db/migrate';
import { LATEST_VERSION } from '../db/migrations';
import { lerCabecalhoSqlite, mensagemVersao, nomeArquivoBackup, TAMANHO_CABECALHO } from './cabecalho';

/**
 * Backup e restauração do banco inteiro (escopo, seção 8).
 *
 * Exportar: wal_checkpoint(TRUNCATE) joga tudo do -wal para o .db; aí o .db
 * sozinho é uma cópia completa. Copiamos com nome datado e abrimos o menu de
 * compartilhar (Drive, WhatsApp, e-mail...).
 *
 * Restaurar: em vez de fechar a conexão e trocar o arquivo por baixo do
 * SQLiteProvider (que guarda a conexão em cache no modo Suspense e devolveria
 * uma conexão fechada), usamos a API de backup online do SQLite:
 * backupDatabaseAsync copia o arquivo escolhido PARA DENTRO da conexão aberta,
 * página por página, de forma atômica. Depois rodamos as migrações.
 */

const paraUri = (caminho: string) => (caminho.startsWith('file://') ? caminho : `file://${caminho}`);

const NOME_TEMP_RESTAURACAO = 'restaurando-backup.db';

function pastaSegurancas() {
  const pasta = new Directory(Paths.document, 'backups-de-seguranca');
  if (!pasta.exists) pasta.create({ intermediates: true });
  return pasta;
}

async function copiarBancoAtual(db: SQLiteDatabase, destino: File) {
  await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE)');
  if (destino.exists) destino.delete();
  await new File(paraUri(db.databasePath)).copy(destino);
}

export async function exportarBackup(db: SQLiteDatabase, agora = new Date()): Promise<File> {
  const destino = new File(Paths.cache, nomeArquivoBackup(agora));
  await copiarBancoAtual(db, destino);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(destino.uri, {
      mimeType: 'application/octet-stream',
      dialogTitle: 'Salvar backup da Katara',
    });
  }
  return destino;
}

export type BackupEscolhido =
  | { ok: true; arquivo: File; userVersion: number; precisaMigrar: boolean }
  | { ok: false; cancelado: boolean; motivo?: string };

/** Passo 1: escolher o arquivo e validar cabeçalho + versão. Não altera nada. */
export async function escolherBackup(): Promise<BackupEscolhido> {
  const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
  if (r.canceled || !r.assets?.length) return { ok: false, cancelado: true };

  const arquivo = new File(r.assets[0].uri);
  const handle = arquivo.open();
  let cabecalho: Uint8Array;
  try {
    cabecalho = handle.readBytesSync(TAMANHO_CABECALHO);
  } finally {
    handle.close();
  }

  const leitura = lerCabecalhoSqlite(cabecalho);
  if (!leitura.valido) return { ok: false, cancelado: false, motivo: leitura.motivo };

  const erroVersao = mensagemVersao(leitura.userVersion, LATEST_VERSION);
  if (erroVersao) return { ok: false, cancelado: false, motivo: erroVersao };

  return { ok: true, arquivo, userVersion: leitura.userVersion, precisaMigrar: leitura.userVersion < LATEST_VERSION };
}

/**
 * Passo 2 (depois que o Anderson CONFIRMAR): guarda uma cópia de segurança do
 * banco atual, substitui o conteúdo pelo backup e roda as migrações.
 * Retorna o arquivo de segurança, para poder desfazer.
 */
export async function restaurarBackup(db: SQLiteDatabase, arquivo: File, agora = new Date()): Promise<File> {
  const carimbo = agora.toISOString().replace(/[:.]/g, '-');
  const seguranca = new File(pastaSegurancas(), `antes-de-restaurar-${carimbo}.db`);
  await copiarBancoAtual(db, seguranca);

  // Copia o escolhido para a pasta de bancos e abre como banco separado.
  await deleteDatabaseAsync(NOME_TEMP_RESTAURACAO).catch(() => {});
  await arquivo.copy(new File(paraUri(defaultDatabaseDirectory), NOME_TEMP_RESTAURACAO));
  const origem = await openDatabaseAsync(NOME_TEMP_RESTAURACAO);

  try {
    const check = await origem.getFirstAsync<{ quick_check: string }>('PRAGMA quick_check');
    if (check?.quick_check !== 'ok') {
      throw new Error('O arquivo de backup está corrompido. Nada foi alterado.');
    }
    await backupDatabaseAsync({ sourceDatabase: origem, destDatabase: db });
  } finally {
    await origem.closeAsync();
    await deleteDatabaseAsync(NOME_TEMP_RESTAURACAO).catch(() => {});
  }

  // Backup de versão anterior: atualiza o schema. Mesma versão: só religa os PRAGMAs.
  await migrateDbIfNeeded(db);
  return seguranca;
}
