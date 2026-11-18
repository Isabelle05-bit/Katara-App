import type { Db } from './tipos';
import { LATEST_VERSION, MIGRATIONS } from './migrations';

/**
 * Chamada pelo <SQLiteProvider onInit={...}> toda vez que o app abre o banco.
 *
 * 1. Liga as configurações que valem por conexão (foreign keys e WAL).
 * 2. Lê a versão do banco (PRAGMA user_version).
 * 3. Roda, em ordem, só as migrações que ainda não rodaram.
 */
export async function migrateDbIfNeeded(db: Db): Promise<void> {
  // Precisa vir ANTES de qualquer transação: o SQLite ignora este PRAGMA
  // se for executado dentro de uma.
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  const currentVersion = row?.user_version ?? 0;

  // Backup restaurado de uma versão mais nova do app: recusa, não tenta adivinhar.
  if (currentVersion > LATEST_VERSION) {
    throw new Error(
      `Este banco é da versão ${currentVersion}, mas o app só entende até a versão ${LATEST_VERSION}. ` +
        'Atualize o app antes de usar este arquivo.'
    );
  }

  for (let version = currentVersion + 1; version <= LATEST_VERSION; version++) {
    // Cada migração roda numa transação junto com a troca do user_version:
    // ou aplica tudo, ou não aplica nada.
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version - 1]);
      // PRAGMA não aceita parâmetro "?", por isso a interpolação.
      // É seguro: `version` é um número que nós mesmos controlamos.
      await db.execAsync(`PRAGMA user_version = ${version}`);
    });
  }
}
