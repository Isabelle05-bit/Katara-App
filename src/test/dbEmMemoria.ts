import Database from 'better-sqlite3';
import type { Db, SqlParam } from '../db/tipos';
import { migrateDbIfNeeded } from '../db/migrate';

/**
 * Banco SQLite em memória para testes, rodando as mesmas migrações do app.
 * Imita a API assíncrona do expo-sqlite por cima do better-sqlite3 (síncrono).
 */
export function criarDbEmMemoria(): Db & { raw: Database.Database } {
  const raw = new Database(':memory:');
  const db: Db & { raw: Database.Database } = {
    raw,
    async execAsync(sql) {
      raw.exec(sql);
    },
    async runAsync(sql, params: SqlParam[]) {
      const r = raw.prepare(sql).run(...params);
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: r.changes };
    },
    async getFirstAsync<T>(sql: string, params: SqlParam[]) {
      const stmt = raw.prepare(sql);
      if (!stmt.reader) {
        stmt.run(...params);
        return null;
      }
      return ((stmt.get(...params) as T | undefined) ?? null) as T | null;
    },
    async getAllAsync<T>(sql: string, params: SqlParam[]) {
      return raw.prepare(sql).all(...params) as T[];
    },
    async withTransactionAsync(fn) {
      raw.exec('BEGIN');
      try {
        await fn();
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return db;
}

export async function criarDbMigrado() {
  const db = criarDbEmMemoria();
  await migrateDbIfNeeded(db);
  return db;
}
