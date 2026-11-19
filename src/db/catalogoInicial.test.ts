import { criarDbEmMemoria } from '../test/dbEmMemoria';
import { LATEST_VERSION, MIGRATIONS } from './migrations';
import { migrateDbIfNeeded } from './migrate';

// Aqui NÃO usamos criarDbMigrado: ele limpa o catálogo para os outros testes.
// Este arquivo testa justamente o catálogo que a migração V3 carrega.

const contar = (db: ReturnType<typeof criarDbEmMemoria>, tabela: string) =>
  (db.raw.prepare(`SELECT COUNT(*) AS n FROM ${tabela}`).get() as { n: number }).n;

describe('migração V3: catálogo inicial', () => {
  test('é a terceira migração', () => {
    expect(LATEST_VERSION).toBe(3);
  });

  test('banco novo já nasce com o catálogo carregado', async () => {
    const db = criarDbEmMemoria();
    await migrateDbIfNeeded(db);
    expect(contar(db, 'materiais')).toBe(10);
    expect(contar(db, 'ferramentas')).toBe(5);
    expect(contar(db, 'servicos')).toBe(4);
    expect(contar(db, 'servico_materiais')).toBe(18);
  });

  test('integridade: receitas apontam para serviços e materiais que existem', async () => {
    const db = criarDbEmMemoria();
    await migrateDbIfNeeded(db);
    expect(db.raw.pragma('foreign_key_check')).toEqual([]);
  });

  test('preços em centavos, todos positivos, e nada arquivado', async () => {
    const db = criarDbEmMemoria();
    await migrateDbIfNeeded(db);
    const ruins = db.raw
      .prepare(
        `SELECT 1 FROM materiais WHERE preco <= 0 OR arquivado <> 0
         UNION ALL SELECT 1 FROM ferramentas WHERE valor_compra <= 0 OR arquivado <> 0
         UNION ALL SELECT 1 FROM servicos WHERE preco_m2 <= 0 OR arquivado <> 0`
      )
      .all();
    expect(ruins).toEqual([]);
  });

  test('banco v2 com dados sobe para v3 mantendo os dados e ganhando o catálogo', async () => {
    const db = criarDbEmMemoria();
    db.raw.exec(MIGRATIONS[0]);
    db.raw.exec(MIGRATIONS[1]);
    db.raw.pragma('user_version = 2');
    db.raw.exec("INSERT INTO clientes (nome) VALUES ('Antigo')");

    await migrateDbIfNeeded(db);

    expect(db.raw.pragma('user_version', { simple: true })).toBe(3);
    expect(db.raw.prepare('SELECT nome FROM clientes').get()).toEqual({ nome: 'Antigo' });
    expect(contar(db, 'materiais')).toBe(10);
  });
});
