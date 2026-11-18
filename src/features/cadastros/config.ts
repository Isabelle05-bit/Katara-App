import type { SQLiteDatabase } from 'expo-sqlite';
import type { z } from 'zod';
import {
  clienteSchema,
  ferramentaSchema,
  funcionarioSchema,
  materialSchema,
  servicoSchema,
} from '../../domain/schemas';
import {
  arquivarCliente,
  arquivarFerramenta,
  arquivarFuncionario,
  arquivarMaterial,
  criarCliente,
  criarFerramenta,
  criarFuncionario,
  criarMaterial,
  editarCliente,
  editarFerramenta,
  editarFuncionario,
  editarMaterial,
} from '../../repositories/cadastros';
import { arquivarServico, criarServico, editarServico } from '../../repositories/servicos';
import type { Entidade } from './entidades';

/**
 * Formulário de cada cadastro descrito como dados: campos, schema Zod (o mesmo
 * que o repositório usa), como ler a linha do banco e como gravar.
 */
export type TipoCampo = 'texto' | 'telefone' | 'dinheiro' | 'area' | 'status';

export interface Campo {
  nome: string;
  rotulo: string;
  tipo: TipoCampo;
  ajuda?: string;
  placeholder?: string;
}

type Valores = Record<string, unknown>;

export interface ConfigCadastro {
  tabela: string;
  schema: z.ZodType<Valores, Valores>;
  campos: Campo[];
  vazio: Valores;
  daLinha: (linha: Record<string, unknown>) => Valores;
  criar: (db: SQLiteDatabase, v: Valores) => Promise<number>;
  editar: (db: SQLiteDatabase, id: number, v: Valores) => Promise<void>;
  arquivar: (db: SQLiteDatabase, id: number) => Promise<void>;
}

const s = (v: unknown) => (v == null ? '' : String(v));

export const CONFIG: Record<Entidade, ConfigCadastro> = {
  clientes: {
    tabela: 'clientes',
    schema: clienteSchema as any,
    campos: [
      { nome: 'nome', rotulo: 'Nome', tipo: 'texto' },
      { nome: 'telefone', rotulo: 'Telefone / WhatsApp', tipo: 'telefone', placeholder: '(51) 99999-9999' },
      { nome: 'cidade', rotulo: 'Cidade', tipo: 'texto' },
      { nome: 'endereco', rotulo: 'Endereço', tipo: 'texto' },
      { nome: 'observacoes', rotulo: 'Observações', tipo: 'area' },
    ],
    vazio: { nome: '', telefone: '', cidade: '', endereco: '', observacoes: '' },
    daLinha: (l) => ({ nome: s(l.nome), telefone: s(l.telefone), cidade: s(l.cidade), endereco: s(l.endereco), observacoes: s(l.observacoes) }),
    criar: (db, v) => criarCliente(db, v as any),
    editar: (db, id, v) => editarCliente(db, id, v as any),
    arquivar: arquivarCliente,
  },
  funcionarios: {
    tabela: 'funcionarios',
    schema: funcionarioSchema as any,
    campos: [
      { nome: 'nome', rotulo: 'Nome', tipo: 'texto' },
      { nome: 'diaria', rotulo: 'Diária', tipo: 'dinheiro', ajuda: 'Quanto você paga por dia de trabalho.' },
      { nome: 'status', rotulo: 'Situação', tipo: 'status', ajuda: 'Só funcionários ativos aparecem no orçamento.' },
      { nome: 'observacoes', rotulo: 'Observações', tipo: 'area' },
    ],
    vazio: { nome: '', diaria: 0, status: 'ativo', observacoes: '' },
    daLinha: (l) => ({ nome: s(l.nome), diaria: Number(l.diaria), status: l.status, observacoes: s(l.observacoes) }),
    criar: (db, v) => criarFuncionario(db, v as any),
    editar: (db, id, v) => editarFuncionario(db, id, v as any),
    arquivar: arquivarFuncionario,
  },
  materiais: {
    tabela: 'materiais',
    schema: materialSchema as any,
    campos: [
      { nome: 'nome', rotulo: 'Nome', tipo: 'texto', placeholder: 'Ex.: Tinta acrílica Suvinil 18L' },
      { nome: 'unidade', rotulo: 'Unidade', tipo: 'texto', placeholder: 'Ex.: lata 18L, balde, kg, unidade' },
      { nome: 'preco', rotulo: 'Preço por unidade', tipo: 'dinheiro' },
      { nome: 'categoria', rotulo: 'Categoria', tipo: 'texto', placeholder: 'Ex.: tinta, massa, lixa' },
      { nome: 'loja', rotulo: 'Loja', tipo: 'texto' },
    ],
    vazio: { nome: '', unidade: '', preco: 0, categoria: '', loja: '' },
    daLinha: (l) => ({ nome: s(l.nome), unidade: s(l.unidade), preco: Number(l.preco), categoria: s(l.categoria), loja: s(l.loja) }),
    criar: (db, v) => criarMaterial(db, v as any),
    editar: (db, id, v) => editarMaterial(db, id, v as any),
    arquivar: arquivarMaterial,
  },
  servicos: {
    tabela: 'servicos',
    schema: servicoSchema as any,
    campos: [
      { nome: 'nome', rotulo: 'Nome', tipo: 'texto', placeholder: 'Ex.: Pintura interna' },
      { nome: 'precoM2', rotulo: 'Preço por m²', tipo: 'dinheiro' },
      { nome: 'descricao', rotulo: 'Descrição (aparece no PDF)', tipo: 'area', placeholder: 'Ex.: Lixamento, massa corrida e duas demãos.' },
      { nome: 'observacoes', rotulo: 'Observações internas', tipo: 'area' },
    ],
    vazio: { nome: '', precoM2: 0, descricao: '', observacoes: '' },
    daLinha: (l) => ({ nome: s(l.nome), precoM2: Number(l.preco_m2), descricao: s(l.descricao), observacoes: s(l.observacoes) }),
    criar: (db, v) => criarServico(db, v as any),
    editar: (db, id, v) => editarServico(db, id, v as any),
    arquivar: arquivarServico,
  },
  ferramentas: {
    tabela: 'ferramentas',
    schema: ferramentaSchema as any,
    campos: [
      { nome: 'nome', rotulo: 'Nome', tipo: 'texto', placeholder: 'Ex.: Escada 7 degraus' },
      { nome: 'valorCompra', rotulo: 'Valor de compra', tipo: 'dinheiro', ajuda: 'Entra como custo quando a ferramenta é usada num orçamento.' },
    ],
    vazio: { nome: '', valorCompra: 0 },
    daLinha: (l) => ({ nome: s(l.nome), valorCompra: Number(l.valor_compra) }),
    criar: (db, v) => criarFerramenta(db, v as any),
    editar: (db, id, v) => editarFerramenta(db, id, v as any),
    arquivar: arquivarFerramenta,
  },
};
