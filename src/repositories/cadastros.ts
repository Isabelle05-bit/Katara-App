import type { Db } from '../db/tipos';
import {
  clienteSchema,
  ferramentaSchema,
  funcionarioSchema,
  materialSchema,
  validar,
  type ClienteInput,
  type FerramentaInput,
  type FuncionarioInput,
  type MaterialInput,
} from '../domain/schemas';
import { ErroDeRegra, type StatusFuncionario } from '../domain/tipos';

/**
 * CRUD dos cadastros simples. Não existe exclusão: só ARQUIVAR.
 * Arquivado some das listas e dos dropdowns; orçamentos antigos continuam
 * intactos porque guardam o preço congelado (*_no_momento) e a FK continua válida.
 */

type TabelaCadastro = 'clientes' | 'funcionarios' | 'materiais' | 'servicos' | 'ferramentas';

export async function definirArquivado(db: Db, tabela: TabelaCadastro, id: number, arquivado: boolean) {
  const r = await db.runAsync(`UPDATE ${tabela} SET arquivado = ? WHERE id = ?`, [arquivado ? 1 : 0, id]);
  if (r.changes === 0) throw new ErroDeRegra('Registro não encontrado.');
}

/** Busca sem acento e sem diferenciar maiúsculas não é nativa do SQLite; usamos LIKE simples. */
const padraoBusca = (termo: string) => `%${termo.trim().replace(/[%_\\]/g, (c) => '\\' + c)}%`;

// ---------------- Clientes ----------------

export interface Cliente {
  id: number;
  nome: string;
  telefone: string | null;
  cidade: string | null;
  endereco: string | null;
  observacoes: string | null;
  arquivado: number;
}

export async function criarCliente(db: Db, input: ClienteInput): Promise<number> {
  const c = validar(clienteSchema, input);
  const r = await db.runAsync(
    'INSERT INTO clientes (nome, telefone, cidade, endereco, observacoes) VALUES (?, ?, ?, ?, ?)',
    [c.nome, c.telefone, c.cidade, c.endereco, c.observacoes]
  );
  return r.lastInsertRowId;
}

export async function editarCliente(db: Db, id: number, input: ClienteInput) {
  const c = validar(clienteSchema, input);
  await db.runAsync(
    'UPDATE clientes SET nome = ?, telefone = ?, cidade = ?, endereco = ?, observacoes = ? WHERE id = ?',
    [c.nome, c.telefone, c.cidade, c.endereco, c.observacoes, id]
  );
}

export function obterCliente(db: Db, id: number) {
  return db.getFirstAsync<Cliente>('SELECT * FROM clientes WHERE id = ?', [id]);
}

export function listarClientes(db: Db, opcoes: { busca?: string; incluirArquivados?: boolean } = {}) {
  const where: string[] = [];
  const params: string[] = [];
  if (!opcoes.incluirArquivados) where.push('arquivado = 0');
  if (opcoes.busca?.trim()) {
    where.push("nome LIKE ? ESCAPE '\\'");
    params.push(padraoBusca(opcoes.busca));
  }
  return db.getAllAsync<Cliente>(
    `SELECT * FROM clientes ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY nome COLLATE NOCASE`,
    params
  );
}

export const arquivarCliente = (db: Db, id: number) => definirArquivado(db, 'clientes', id, true);

// ---------------- Funcionários ----------------

export interface Funcionario {
  id: number;
  nome: string;
  diaria: number;
  status: StatusFuncionario;
  observacoes: string | null;
  arquivado: number;
}

export async function criarFuncionario(db: Db, input: FuncionarioInput): Promise<number> {
  const f = validar(funcionarioSchema, input);
  const r = await db.runAsync(
    'INSERT INTO funcionarios (nome, diaria, status, observacoes) VALUES (?, ?, ?, ?)',
    [f.nome, f.diaria, f.status, f.observacoes]
  );
  return r.lastInsertRowId;
}

export async function editarFuncionario(db: Db, id: number, input: FuncionarioInput) {
  const f = validar(funcionarioSchema, input);
  await db.runAsync('UPDATE funcionarios SET nome = ?, diaria = ?, status = ?, observacoes = ? WHERE id = ?', [
    f.nome,
    f.diaria,
    f.status,
    f.observacoes,
    id,
  ]);
}

export function listarFuncionarios(
  db: Db,
  opcoes: { status?: StatusFuncionario; incluirArquivados?: boolean } = {}
) {
  const where: string[] = [];
  const params: string[] = [];
  if (!opcoes.incluirArquivados) where.push('arquivado = 0');
  if (opcoes.status) {
    where.push('status = ?');
    params.push(opcoes.status);
  }
  return db.getAllAsync<Funcionario>(
    `SELECT * FROM funcionarios ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY nome COLLATE NOCASE`,
    params
  );
}

export const arquivarFuncionario = (db: Db, id: number) => definirArquivado(db, 'funcionarios', id, true);

// ---------------- Materiais ----------------

export interface Material {
  id: number;
  nome: string;
  unidade: string;
  categoria: string | null;
  preco: number;
  loja: string | null;
  arquivado: number;
}

export async function criarMaterial(db: Db, input: MaterialInput): Promise<number> {
  const m = validar(materialSchema, input);
  const r = await db.runAsync(
    'INSERT INTO materiais (nome, unidade, categoria, preco, loja) VALUES (?, ?, ?, ?, ?)',
    [m.nome, m.unidade, m.categoria, m.preco, m.loja]
  );
  return r.lastInsertRowId;
}

export async function editarMaterial(db: Db, id: number, input: MaterialInput) {
  const m = validar(materialSchema, input);
  await db.runAsync('UPDATE materiais SET nome = ?, unidade = ?, categoria = ?, preco = ?, loja = ? WHERE id = ?', [
    m.nome,
    m.unidade,
    m.categoria,
    m.preco,
    m.loja,
    id,
  ]);
}

export function listarMateriais(db: Db, opcoes: { busca?: string; incluirArquivados?: boolean } = {}) {
  const where: string[] = [];
  const params: string[] = [];
  if (!opcoes.incluirArquivados) where.push('arquivado = 0');
  if (opcoes.busca?.trim()) {
    where.push("nome LIKE ? ESCAPE '\\'");
    params.push(padraoBusca(opcoes.busca));
  }
  return db.getAllAsync<Material>(
    `SELECT * FROM materiais ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY nome COLLATE NOCASE`,
    params
  );
}

export const arquivarMaterial = (db: Db, id: number) => definirArquivado(db, 'materiais', id, true);

// ---------------- Ferramentas ----------------

export interface Ferramenta {
  id: number;
  nome: string;
  valor_compra: number;
  arquivado: number;
}

export async function criarFerramenta(db: Db, input: FerramentaInput): Promise<number> {
  const f = validar(ferramentaSchema, input);
  const r = await db.runAsync('INSERT INTO ferramentas (nome, valor_compra) VALUES (?, ?)', [f.nome, f.valorCompra]);
  return r.lastInsertRowId;
}

export async function editarFerramenta(db: Db, id: number, input: FerramentaInput) {
  const f = validar(ferramentaSchema, input);
  await db.runAsync('UPDATE ferramentas SET nome = ?, valor_compra = ? WHERE id = ?', [f.nome, f.valorCompra, id]);
}

export function listarFerramentas(db: Db, opcoes: { incluirArquivados?: boolean } = {}) {
  return db.getAllAsync<Ferramenta>(
    `SELECT * FROM ferramentas ${opcoes.incluirArquivados ? '' : 'WHERE arquivado = 0'} ORDER BY nome COLLATE NOCASE`,
    []
  );
}

export const arquivarFerramenta = (db: Db, id: number) => definirArquivado(db, 'ferramentas', id, true);
