/// <reference types="node" />
import Database from 'better-sqlite3';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decidirPorVersao, lerCabecalhoSqlite, mensagemVersao, nomeArquivoBackup } from './cabecalho';

describe('lerCabecalhoSqlite', () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'katara-'));
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  test('lê o user_version de um arquivo SQLite real', () => {
    const caminho = join(dir, 'b.db');
    const db = new Database(caminho);
    db.exec('CREATE TABLE t (x)');
    db.pragma('user_version = 258'); // > 255 testa os bytes big-endian
    db.close();
    expect(lerCabecalhoSqlite(new Uint8Array(readFileSync(caminho)))).toEqual({ valido: true, userVersion: 258 });
  });

  test('recusa arquivo que não é SQLite', () => {
    const r = lerCabecalhoSqlite(new TextEncoder().encode('%PDF-1.7'.padEnd(200, ' ')));
    expect(r).toMatchObject({ valido: false });
  });

  test('recusa arquivo pequeno demais', () => {
    expect(lerCabecalhoSqlite(new Uint8Array(10))).toMatchObject({ valido: false });
  });
});

test('decisão por versão', () => {
  expect(decidirPorVersao(1, 2)).toBe('migrar');
  expect(decidirPorVersao(2, 2)).toBe('igual');
  expect(decidirPorVersao(3, 2)).toBe('recusar');
  expect(mensagemVersao(3, 2)).toMatch(/Atualize o app/);
  expect(mensagemVersao(0, 2)).toMatch(/vazio/);
  expect(mensagemVersao(1, 2)).toBeNull();
});

test('nome do backup', () => {
  expect(nomeArquivoBackup(new Date(2026, 0, 5))).toBe('katara-backup-2026-01-05.db');
});
