/**
 * O subconjunto do SQLiteDatabase (expo-sqlite) que os repositórios usam.
 *
 * Os repositórios dependem desta interface, e não do expo-sqlite direto, para
 * que os testes rodem no Node com better-sqlite3 (src/test/dbEmMemoria.ts)
 * executando as MESMAS migrações do app.
 */
export type SqlParam = string | number | null;

export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: SqlParam[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getFirstAsync<T>(sql: string, params: SqlParam[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params: SqlParam[]): Promise<T[]>;
  withTransactionAsync(fn: () => Promise<void>): Promise<void>;
}

/** withTransactionAsync que devolve um valor. */
export async function emTransacao<T>(db: Db, fn: () => Promise<T>): Promise<T> {
  let resultado!: T;
  await db.withTransactionAsync(async () => {
    resultado = await fn();
  });
  return resultado;
}

export const bool = (v: number | boolean) => (v ? 1 : 0);
