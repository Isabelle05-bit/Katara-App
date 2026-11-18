import { calcularOrcamento } from '../domain/calculo';
import type { OrcamentoCompleto } from '../repositories/orcamentos';
import { escaparHtml, gerarHtmlOrcamento, nomeArquivoPdf } from './html';

function orcamento(mudancas: Partial<OrcamentoCompleto> = {}): OrcamentoCompleto {
  const o: Omit<OrcamentoCompleto, 'calculo'> = {
    id: 42,
    cliente_id: 1,
    criado_em: '2026-11-17 15:00:00',
    aprovado_em: null,
    validade: '2026-12-17',
    status: 'pendente',
    desconto_pct: 10,
    desconto_base: 'servicos',
    materiais_modo: 'cobrado',
    ferramentas_modo: 'oculto',
    total_cliente: 0,
    lucro: 0,
    observacoes: null,
    arquivado: 0,
    cliente: { id: 1, nome: 'Marcos Andrade', telefone: '(51) 99123-4567', cidade: 'Cachoeirinha', endereco: 'Rua A, 10' },
    servicos: [{ servico_id: 1, nome: 'Pintura Interna', descricao: 'Duas demãos', metros_quadrados: 80, preco_m2_no_momento: 2500 }],
    materiais: [{ material_id: 1, nome: 'Tinta Acrílica 18L', unidade: 'lata', quantidade: 3, preco_no_momento: 21000 }],
    ferramentas: [{ ferramenta_id: 1, nome: 'Escada Telescópica', preco_no_momento: 15000 }],
    funcionarios: [{ funcionario_id: 1, nome: 'Carlos Souza', diaria_no_momento: 15000, dias: 2 }],
    atendimento: null,
    ...mudancas,
  };
  const calculo = calcularOrcamento({
    servicos: o.servicos.map((s) => ({ metrosQuadrados: s.metros_quadrados, precoM2: s.preco_m2_no_momento })),
    materiais: o.materiais.map((m) => ({ quantidade: m.quantidade, preco: m.preco_no_momento })),
    ferramentas: o.ferramentas.map((f) => ({ preco: f.preco_no_momento })),
    funcionarios: o.funcionarios.map((f) => ({ diaria: f.diaria_no_momento, dias: f.dias })),
    descontoPct: o.desconto_pct,
    descontoBase: o.desconto_base,
    materiaisModo: o.materiais_modo,
    ferramentasModo: o.ferramentas_modo,
  });
  return { ...o, calculo, total_cliente: calculo.totalCliente, lucro: calculo.lucro };
}

const emitidoEm = new Date(2026, 10, 17);

describe('PDF do cliente', () => {
  const html = gerarHtmlOrcamento(orcamento(), { versao: 'cliente', emitidoEm, condicoes: '50% na entrada.' });

  test('cabeçalho, cliente, rodapé e condições', () => {
    expect(html).toContain('Orçamento nº 42');
    expect(html).toContain('Emitido em 17/11/2026');
    expect(html).toContain('Marcos Andrade');
    expect(html).toContain('Rua A, 10 · Cachoeirinha');
    expect(html).toContain('@katara.pinturas · (51) 99338-6333');
    expect(html).toContain('válido até <strong>17/12/2026</strong>');
    expect(html).toContain('50% na entrada.');
  });

  test('fundo branco', () => {
    expect(html).toMatch(/body \{[^}]*background: #fff/);
  });

  test('resumo: subtotal → desconto → materiais → total', () => {
    const iSub = html.indexOf('Subtotal dos serviços');
    const iDesc = html.indexOf('Desconto (10%)');
    const iMat = html.indexOf('<td>Materiais</td>');
    const iTot = html.indexOf('<td>Total</td>');
    expect(iSub).toBeGreaterThan(0);
    expect(iSub < iDesc && iDesc < iMat && iMat < iTot).toBe(true);
    expect(html).toContain('R$ 2.430,00'); // 2000 − 200 + 630
  });

  test('base total: desconto vem depois dos itens cobrados', () => {
    const h = gerarHtmlOrcamento(orcamento({ desconto_base: 'total' }), { versao: 'cliente', emitidoEm });
    expect(h.indexOf('<td>Materiais</td>')).toBeLessThan(h.indexOf('Desconto (10%)'));
  });

  test('nunca mostra lucro, custos nem equipe', () => {
    expect(html).not.toMatch(/lucro/i);
    expect(html).not.toContain('Carlos Souza');
    expect(html).not.toContain('USO INTERNO');
  });

  test('ferramentas ocultas não aparecem; informadas aparecem com aviso', () => {
    expect(html).not.toContain('Escada Telescópica');
    const h = gerarHtmlOrcamento(orcamento({ ferramentas_modo: 'informado' }), { versao: 'cliente', emitidoEm });
    expect(h).toContain('Escada Telescópica');
    expect(h).toContain('não incluídos no total');
  });

  test('materiais ocultos não aparecem', () => {
    const h = gerarHtmlOrcamento(orcamento({ materiais_modo: 'oculto' }), { versao: 'cliente', emitidoEm });
    expect(h).not.toContain('Tinta Acrílica');
  });

  test('sem desconto não mostra linha de desconto', () => {
    const h = gerarHtmlOrcamento(orcamento({ desconto_pct: 0 }), { versao: 'cliente', emitidoEm });
    expect(h).not.toContain('Desconto');
  });

  test('logo opcional', () => {
    expect(html).toContain('<div class="marca">Katara Pinturas &amp; Efeitos</div>'.replace('&amp;', '&'));
    const h = gerarHtmlOrcamento(orcamento(), { versao: 'cliente', emitidoEm, logoDataUri: 'data:image/png;base64,AAA' });
    expect(h).toContain('<img src="data:image/png;base64,AAA"');
  });

  test('escapa HTML vindo do usuário', () => {
    const h = gerarHtmlOrcamento(
      orcamento({ cliente: { id: 1, nome: '<script>x</script>', telefone: null, cidade: null, endereco: null } }),
      { versao: 'cliente', emitidoEm }
    );
    expect(h).not.toContain('<script>');
    expect(h).toContain('&lt;script&gt;');
  });
});

describe('PDF interno', () => {
  const html = gerarHtmlOrcamento(orcamento(), { versao: 'interno', emitidoEm, condicoes: 'não deve sair' });

  test('mostra equipe, custos, lucro e itens ocultos', () => {
    expect(html).toContain('USO INTERNO');
    expect(html).toContain('Carlos Souza');
    expect(html).toContain('Escada Telescópica');
    expect(html).toContain('Entra só no custo');
    // lucro = 2430 − 630 − 150 − 300 = 1350
    expect(html).toContain('R$ 1.350,00');
    expect(html).not.toContain('não deve sair');
  });

  test('lucro negativo fica marcado', () => {
    const h = gerarHtmlOrcamento(orcamento({ desconto_pct: 100, desconto_base: 'total' }), { versao: 'interno', emitidoEm });
    expect(h).toContain('total negativo');
    expect(h).toContain('-R$ 1.080,00');
  });
});

test('nomeArquivoPdf previsível e sem acentos', () => {
  const o = orcamento({ cliente: { id: 1, nome: 'João da Silva & Filhos', telefone: null, cidade: null, endereco: null } });
  expect(nomeArquivoPdf(o, 'cliente', emitidoEm)).toBe('orcamento-joao-da-silva-filhos-2026-11-17.pdf');
  expect(nomeArquivoPdf(o, 'interno', emitidoEm)).toBe('orcamento-interno-joao-da-silva-filhos-2026-11-17.pdf');
});

test('escaparHtml', () => {
  expect(escaparHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
});
