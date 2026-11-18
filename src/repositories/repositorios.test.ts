import { criarDbEmMemoria, criarDbMigrado } from '../test/dbEmMemoria';
import { migrateDbIfNeeded } from '../db/migrate';
import { LATEST_VERSION } from '../db/migrations';
import {
  arquivarCliente,
  arquivarFerramenta,
  arquivarMaterial,
  criarCliente,
  criarFerramenta,
  criarFuncionario,
  criarMaterial,
  editarCliente,
  editarMaterial,
  listarClientes,
  listarFerramentas,
  listarFuncionarios,
  listarMateriais,
} from './cadastros';
import {
  adicionarNaReceita,
  criarServico,
  editarItemReceita,
  editarServico,
  listarReceita,
  receitaParaSugestao,
  removerDaReceita,
} from './servicos';
import {
  aprovarOrcamento,
  arquivarOrcamento,
  listarOrcamentos,
  mudarStatusOrcamento,
  obterOrcamentoCompleto,
  recusarOrcamento,
  salvarOrcamento,
  voltarParaPendente,
} from './orcamentos';
import {
  agendarAtendimento,
  equipeDoAtendimento,
  listarAtendimentos,
  mudarStatusAtendimento,
} from './atendimentos';
import { carregarDashboard } from './dashboard';
import type { OrcamentoInput } from '../domain/schemas';

type TestDb = Awaited<ReturnType<typeof criarDbMigrado>>;

describe('migrações', () => {
  test('banco novo chega na última versão com foreign_keys ligado', async () => {
    const db = await criarDbMigrado();
    expect(db.raw.pragma('user_version', { simple: true })).toBe(LATEST_VERSION);
    expect(db.raw.pragma('foreign_keys', { simple: true })).toBe(1);
  });

  test('rodar de novo não faz nada', async () => {
    const db = await criarDbMigrado();
    await expect(migrateDbIfNeeded(db)).resolves.toBeUndefined();
  });

  test('banco de versão maior que a do app é recusado', async () => {
    const db = criarDbEmMemoria();
    db.raw.pragma(`user_version = ${LATEST_VERSION + 1}`);
    await expect(migrateDbIfNeeded(db)).rejects.toThrow(/Atualize o app/);
  });

  test('banco v1 sobe para a versão atual mantendo os dados', async () => {
    const { MIGRATIONS } = jest.requireActual('../db/migrations') as typeof import('../db/migrations');
    const db = criarDbEmMemoria();
    db.raw.exec(MIGRATIONS[0]);
    db.raw.pragma('user_version = 1');
    db.raw.exec("INSERT INTO clientes (nome) VALUES ('Antigo')");
    await migrateDbIfNeeded(db);
    expect(db.raw.pragma('user_version', { simple: true })).toBe(LATEST_VERSION);
    expect(db.raw.prepare('SELECT nome FROM clientes').get()).toEqual({ nome: 'Antigo' });
  });
});

// ---------------- Fixture: um catálogo pequeno ----------------

async function catalogo(db: TestDb) {
  const cliente = await criarCliente(db, { nome: 'Marcos Andrade', telefone: '(51) 99123-4567', cidade: 'Cachoeirinha' });
  const tinta = await criarMaterial(db, { nome: 'Tinta Acrílica 18L', unidade: 'lata 18L', preco: 21000 });
  const massa = await criarMaterial(db, { nome: 'Massa Corrida 25kg', unidade: 'balde', preco: 4500 });
  const pintura = await criarServico(db, { nome: 'Pintura Interna', precoM2: 2500 });
  const textura = await criarServico(db, { nome: 'Textura', precoM2: 4000 });
  const escada = await criarFerramenta(db, { nome: 'Escada 7 degraus', valorCompra: 15000 });
  const carlos = await criarFuncionario(db, { nome: 'Carlos Souza', diaria: 15000 });
  const roberto = await criarFuncionario(db, { nome: 'Roberto Lima', diaria: 15000 });
  return { cliente, tinta, massa, pintura, textura, escada, carlos, roberto };
}

type Catalogo = Awaited<ReturnType<typeof catalogo>>;

const orcamentoBase = (c: Catalogo, mudancas: Partial<OrcamentoInput> = {}): OrcamentoInput => ({
  clienteId: c.cliente,
  servicos: [{ servicoId: c.pintura, metrosQuadrados: 80 }],
  materiais: [
    { materialId: c.tinta, quantidade: 3 },
    { materialId: c.massa, quantidade: 6 },
  ],
  ferramentas: [{ ferramentaId: c.escada }],
  funcionarios: [
    { funcionarioId: c.carlos, dias: 2 },
    { funcionarioId: c.roberto, dias: 2 },
  ],
  ...mudancas,
});

describe('cadastros', () => {
  let db: TestDb;
  let c: Catalogo;
  beforeEach(async () => {
    db = await criarDbMigrado();
    c = await catalogo(db);
  });

  test('cliente: criar, editar, buscar e arquivar', async () => {
    await criarCliente(db, { nome: 'Juliana Ferreira' });
    await editarCliente(db, c.cliente, { nome: 'Marcos A.', telefone: '' });
    expect((await listarClientes(db)).map((x) => x.nome)).toEqual(['Juliana Ferreira', 'Marcos A.']);
    expect((await listarClientes(db, { busca: 'juli' })).map((x) => x.nome)).toEqual(['Juliana Ferreira']);

    const editado = (await listarClientes(db, { busca: 'Marcos' }))[0];
    expect(editado.telefone).toBeNull(); // string vazia vira NULL

    await arquivarCliente(db, c.cliente);
    expect((await listarClientes(db)).map((x) => x.nome)).toEqual(['Juliana Ferreira']);
    expect(await listarClientes(db, { incluirArquivados: true })).toHaveLength(2);
  });

  test('busca trata % e _ como texto', async () => {
    await criarCliente(db, { nome: '100% Tintas' });
    expect(await listarClientes(db, { busca: '%' })).toHaveLength(1);
  });

  test('validação devolve mensagem em português', async () => {
    await expect(criarCliente(db, { nome: '   ' })).rejects.toThrow('Informe o nome.');
    await expect(criarMaterial(db, { nome: 'X', unidade: 'un', preco: -1 })).rejects.toThrow(/negativo/);
    await expect(criarMaterial(db, { nome: 'X', unidade: 'un', preco: 10.5 })).rejects.toThrow(/inválido/);
  });

  test('funcionários com status', async () => {
    const f = await criarFuncionario(db, { nome: 'Pedro', diaria: 13000, status: 'ferias' });
    expect((await listarFuncionarios(db, { status: 'ferias' })).map((x) => x.id)).toEqual([f]);
    expect(await listarFuncionarios(db, { status: 'ativo' })).toHaveLength(2);
  });

  test('ferramentas e materiais arquivados somem da lista', async () => {
    await arquivarFerramenta(db, c.escada);
    await arquivarMaterial(db, c.massa);
    expect(await listarFerramentas(db)).toHaveLength(0);
    expect((await listarMateriais(db)).map((m) => m.id)).toEqual([c.tinta]);
  });

  test('receita: adicionar, editar consumo, remover', async () => {
    await adicionarNaReceita(db, c.pintura, { materialId: c.tinta, tipoCalculo: 'por_m2', consumo: 0.03 });
    await adicionarNaReceita(db, c.pintura, { materialId: c.massa, tipoCalculo: 'fixo', consumo: 2 });
    await expect(
      adicionarNaReceita(db, c.pintura, { materialId: c.tinta, tipoCalculo: 'fixo', consumo: 1 })
    ).rejects.toThrow(/já está na receita/);

    await editarItemReceita(db, c.pintura, { materialId: c.tinta, tipoCalculo: 'por_m2', consumo: 0.05 });
    expect((await listarReceita(db, c.pintura)).find((l) => l.material_id === c.tinta)?.consumo).toBe(0.05);

    await removerDaReceita(db, c.pintura, c.massa);
    expect(await listarReceita(db, c.pintura)).toHaveLength(1);
  });

  test('receita: material arquivado não entra e é ignorado na sugestão', async () => {
    await adicionarNaReceita(db, c.pintura, { materialId: c.tinta, tipoCalculo: 'por_m2', consumo: 0.03 });
    await arquivarMaterial(db, c.tinta);
    expect(await receitaParaSugestao(db, c.pintura)).toEqual([]);
    await expect(
      adicionarNaReceita(db, c.pintura, { materialId: c.tinta, tipoCalculo: 'fixo', consumo: 1 })
    ).rejects.toThrow(/arquivado/);
  });
});

describe('orçamentos', () => {
  let db: TestDb;
  let c: Catalogo;
  beforeEach(async () => {
    db = await criarDbMigrado();
    c = await catalogo(db);
  });

  test('cria com todos os filhos e grava total_cliente e lucro', async () => {
    const id = await salvarOrcamento(db, orcamentoBase(c));
    const o = (await obterOrcamentoCompleto(db, id))!;
    expect(o.status).toBe('pendente');
    expect(o.servicos).toHaveLength(1);
    expect(o.materiais).toHaveLength(2);
    expect(o.ferramentas).toHaveLength(1);
    expect(o.funcionarios).toHaveLength(2);
    // padrões do schema: materiais cobrados, ferramentas ocultas
    expect(o.total_cliente).toBe(290000);
    expect(o.lucro).toBe(290000 - 90000 - 15000 - 60000);
    expect(o.calculo.totalCliente).toBe(o.total_cliente);
  });

  test('congela os preços: mudar o catálogo não muda orçamento antigo', async () => {
    const id = await salvarOrcamento(db, orcamentoBase(c));
    await editarMaterial(db, c.tinta, { nome: 'Tinta Acrílica 18L', unidade: 'lata 18L', preco: 99900 });
    await editarServico(db, c.pintura, { nome: 'Pintura Interna', precoM2: 9900 });

    // Reabrir e salvar de novo também mantém o preço congelado.
    await salvarOrcamento(db, orcamentoBase(c, { observacoes: 'editado' }), id);
    const o = (await obterOrcamentoCompleto(db, id))!;
    expect(o.materiais.find((m) => m.material_id === c.tinta)?.preco_no_momento).toBe(21000);
    expect(o.servicos[0].preco_m2_no_momento).toBe(2500);
    expect(o.total_cliente).toBe(290000);

    // Item novo no mesmo orçamento pega o preço atual.
    const novo = await salvarOrcamento(db, orcamentoBase(c));
    expect((await obterOrcamentoCompleto(db, novo))!.servicos[0].preco_m2_no_momento).toBe(9900);
  });

  test('preço editado na linha vence o catálogo', async () => {
    const id = await salvarOrcamento(
      db,
      orcamentoBase(c, { ferramentas: [{ ferramentaId: c.escada, preco: 5000 }], ferramentasModo: 'cobrado' })
    );
    const o = (await obterOrcamentoCompleto(db, id))!;
    expect(o.ferramentas[0].preco_no_momento).toBe(5000);
    expect(o.calculo.ferramentasCobradas).toBe(5000);
  });

  test('edição substitui os filhos e recalcula', async () => {
    const id = await salvarOrcamento(db, orcamentoBase(c));
    await salvarOrcamento(
      db,
      orcamentoBase(c, {
        servicos: [
          { servicoId: c.pintura, metrosQuadrados: 80 },
          { servicoId: c.textura, metrosQuadrados: 20 },
        ],
        materiais: [],
        ferramentas: [],
        funcionarios: [],
        descontoPct: 10,
      }),
      id
    );
    const o = (await obterOrcamentoCompleto(db, id))!;
    expect(o.servicos).toHaveLength(2);
    expect(o.materiais).toHaveLength(0);
    expect(o.total_cliente).toBe(280000 - 28000);
    expect(o.lucro).toBe(o.total_cliente);
  });

  test('erro no meio desfaz tudo (transação)', async () => {
    const id = await salvarOrcamento(db, orcamentoBase(c));
    await expect(
      salvarOrcamento(db, orcamentoBase(c, { materiais: [{ materialId: 9999, quantidade: 1 }] }), id)
    ).rejects.toThrow(/não encontrado/);
    const o = (await obterOrcamentoCompleto(db, id))!;
    expect(o.materiais).toHaveLength(2);
    expect(o.total_cliente).toBe(290000);
  });

  test('itens repetidos são recusados com mensagem clara', async () => {
    await expect(
      salvarOrcamento(db, orcamentoBase(c, {
        servicos: [
          { servicoId: c.pintura, metrosQuadrados: 10 },
          { servicoId: c.pintura, metrosQuadrados: 20 },
        ],
      }))
    ).rejects.toThrow(/Junte as metragens/);
  });

  test('precisa de pelo menos um serviço', async () => {
    await expect(salvarOrcamento(db, orcamentoBase(c, { servicos: [] }))).rejects.toThrow(/pelo menos um serviço/);
  });

  test('item arquivado não entra em orçamento novo, mas orçamento antigo continua editável', async () => {
    const id = await salvarOrcamento(db, orcamentoBase(c));
    await arquivarMaterial(db, c.tinta);
    await arquivarCliente(db, c.cliente);

    await expect(salvarOrcamento(db, orcamentoBase(c))).rejects.toThrow(/arquivado/);
    await expect(salvarOrcamento(db, orcamentoBase(c, { observacoes: 'ok' }), id)).resolves.toBe(id);

    const o = (await obterOrcamentoCompleto(db, id))!;
    expect(o.materiais.map((m) => m.nome)).toContain('Tinta Acrílica 18L');
  });

  test('listar com filtros e ordenação', async () => {
    const outro = await criarCliente(db, { nome: 'Juliana' });
    const a = await salvarOrcamento(db, orcamentoBase(c));
    const b = await salvarOrcamento(db, orcamentoBase(c, { clienteId: outro }));
    const d = await salvarOrcamento(db, orcamentoBase(c));
    db.raw.exec(`UPDATE orcamentos SET criado_em = '2026-10-10 12:00:00' WHERE id = ${a}`);
    await aprovarOrcamento(db, b);
    await arquivarOrcamento(db, d);

    expect((await listarOrcamentos(db)).map((o) => o.id)).toEqual([b, a]);
    expect((await listarOrcamentos(db, { ordem: 'antigos' })).map((o) => o.id)).toEqual([a, b]);
    expect((await listarOrcamentos(db, { status: 'aprovado' })).map((o) => o.id)).toEqual([b]);
    expect((await listarOrcamentos(db, { clienteId: outro }))[0].cliente_nome).toBe('Juliana');
    expect((await listarOrcamentos(db, { de: '2026-10-01 00:00:00', ate: '2026-11-01 00:00:00' })).map((o) => o.id)).toEqual([a]);
    expect(await listarOrcamentos(db, { incluirArquivados: true })).toHaveLength(3);
  });
});

describe('status e atendimentos', () => {
  let db: TestDb;
  let c: Catalogo;
  let id: number;
  beforeEach(async () => {
    db = await criarDbMigrado();
    c = await catalogo(db);
    id = await salvarOrcamento(db, orcamentoBase(c));
  });

  const atendimentoDe = async (orcId: number) => (await obterOrcamentoCompleto(db, orcId))!.atendimento;

  test('aprovar cria atendimento aguardando agendamento, sem data', async () => {
    await aprovarOrcamento(db, id, new Date('2026-11-17T15:00:00Z'));
    const o = (await obterOrcamentoCompleto(db, id))!;
    expect(o.status).toBe('aprovado');
    expect(o.aprovado_em).toBe('2026-11-17 15:00:00');
    expect(o.atendimento).toMatchObject({ status: 'aguardando_agendamento', data_agendada: null });
  });

  test('aprovar de novo não duplica atendimento', async () => {
    await aprovarOrcamento(db, id);
    await aprovarOrcamento(db, id);
    expect(await listarAtendimentos(db)).toHaveLength(1);
  });

  test('recusar apaga o atendimento gerado', async () => {
    await aprovarOrcamento(db, id);
    await recusarOrcamento(db, id);
    const o = (await obterOrcamentoCompleto(db, id))!;
    expect(o.status).toBe('recusado');
    expect(o.aprovado_em).toBeNull();
    expect(o.atendimento).toBeNull();
  });

  test('aprovado → pendente apaga o atendimento se ainda aguarda agendamento', async () => {
    await aprovarOrcamento(db, id);
    await agendarAtendimento(db, (await atendimentoDe(id))!.id, '2026-11-20');
    await voltarParaPendente(db, id);
    expect(await atendimentoDe(id)).toBeNull();
  });

  test.each(['em_andamento', 'aguardando_cliente', 'concluido'] as const)(
    'aprovado → pendente/recusado é bloqueado com atendimento %s',
    async (status) => {
      await aprovarOrcamento(db, id);
      await mudarStatusAtendimento(db, (await atendimentoDe(id))!.id, status);
      await expect(voltarParaPendente(db, id)).rejects.toThrow(/Volte o atendimento/);
      await expect(recusarOrcamento(db, id)).rejects.toThrow(/Volte o atendimento/);
      const o = (await obterOrcamentoCompleto(db, id))!;
      expect(o.status).toBe('aprovado');
      expect(o.atendimento?.status).toBe(status);
    }
  );

  test('recusado pode voltar a pendente e ser aprovado', async () => {
    await recusarOrcamento(db, id);
    await mudarStatusOrcamento(db, id, 'pendente');
    await aprovarOrcamento(db, id);
    expect((await atendimentoDe(id))?.status).toBe('aguardando_agendamento');
  });

  test('agendar, reagendar e listar (sem data primeiro)', async () => {
    const id2 = await salvarOrcamento(db, orcamentoBase(c));
    await aprovarOrcamento(db, id);
    await aprovarOrcamento(db, id2);
    const at1 = (await atendimentoDe(id))!.id;
    await agendarAtendimento(db, at1, '2026-11-25');
    await agendarAtendimento(db, at1, '2026-11-28');
    await expect(agendarAtendimento(db, at1, '28/11/2026')).rejects.toThrow(/inválida/);

    const lista = await listarAtendimentos(db);
    expect(lista.map((a) => a.orcamento_id)).toEqual([id2, id]);
    expect(lista[1].data_agendada).toBe('2026-11-28');
    expect(lista[1].cliente_nome).toBe('Marcos Andrade');
  });

  test('equipe do atendimento vem da equipe orçada', async () => {
    await aprovarOrcamento(db, id);
    const equipe = await equipeDoAtendimento(db, (await atendimentoDe(id))!.id);
    expect(equipe.map((e) => e.nome)).toEqual(['Carlos Souza', 'Roberto Lima']);
  });
});

describe('dashboard', () => {
  test('previsto e lucro dos aprovados NO MÊS da aprovação', async () => {
    const db = await criarDbMigrado();
    const c = await catalogo(db);
    const hoje = new Date('2026-11-17T12:00:00-03:00');

    const novembro = await salvarOrcamento(db, orcamentoBase(c));
    const outubro = await salvarOrcamento(db, orcamentoBase(c));
    const pendente = await salvarOrcamento(db, orcamentoBase(c, { materiaisModo: 'oculto' }));
    const arquivado = await salvarOrcamento(db, orcamentoBase(c));

    await aprovarOrcamento(db, novembro, new Date('2026-11-01T00:30:00-03:00')); // = 03:30 UTC
    await aprovarOrcamento(db, outubro, new Date('2026-10-31T23:30:00-03:00')); // = 01/11 02:30 UTC, mas é outubro no Brasil
    await aprovarOrcamento(db, arquivado, hoje);
    await arquivarOrcamento(db, arquivado);

    const d = await carregarDashboard(db, hoje);
    expect(d.aprovadosMes).toBe(1);
    expect(d.previstoMes).toBe(290000);
    expect(d.lucroPrevistoMes).toBe(125000);
    expect(d.pendentesQtd).toBe(1);
    expect(d.pendentesValor).toBe(200000);
    expect(d.valorFerramentas).toBe(15000);
    expect(d.recentes.map((o) => o.id)).toEqual([pendente, outubro, novembro]);
  });
});
