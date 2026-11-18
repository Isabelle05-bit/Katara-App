import { totalLinhaFuncionario, totalLinhaMaterial, totalLinhaServico } from '../domain/calculo';
import { formatarBRL } from '../lib/dinheiro';
import { formatarData, paraIsoData } from '../lib/datas';
import type { OrcamentoCompleto } from '../repositories/orcamentos';

/**
 * Geradores do HTML do PDF. Funções PURAS: dados entram, string sai.
 * O expo-print converte o HTML em PDF (src/pdf/gerarPdf.ts).
 *
 * Fundo branco (economiza tinta). Sem fontes da web: o celular pode estar
 * offline, então usamos a sans-serif do sistema.
 */

export const EMPRESA = {
  nome: 'Katara Pinturas & Efeitos',
  cidade: 'Cachoeirinha, RS',
  instagram: '@katara.pinturas',
  whatsapp: '(51) 99338-6333',
};

export type VersaoPdf = 'cliente' | 'interno';

export interface OpcoesPdf {
  versao: VersaoPdf;
  /** Logo em data URI (versão para fundo claro). Sem logo, sai só o nome. */
  logoDataUri?: string;
  /** Texto de condições (pagamento, prazo). Só na versão cliente. */
  condicoes?: string;
  /** Data de emissão (padrão: hoje). */
  emitidoEm?: Date;
}

const COR = { vermelho: '#e7402c', verde: '#1a7f74', texto: '#1a1a1a', suave: '#6b6b6b', linha: '#e4e4e4' };

export function escaparHtml(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const num = (n: number) => n.toString().replace('.', ',');
const quebraLinhas = (s: string) => escaparHtml(s).replace(/\n/g, '<br>');

function tabela(titulo: string, cabecalho: string[], linhas: string[][], nota?: string): string {
  if (linhas.length === 0) return '';
  const ths = cabecalho.map((c, i) => `<th${i > 0 ? ' class="num"' : ''}>${c}</th>`).join('');
  const trs = linhas
    .map((l) => `<tr>${l.map((c, i) => `<td${i > 0 ? ' class="num"' : ''}>${c}</td>`).join('')}</tr>`)
    .join('');
  return `
  <section>
    <h2>${titulo}</h2>
    ${nota ? `<p class="nota">${nota}</p>` : ''}
    <table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
  </section>`;
}

function linhaResumo(rotulo: string, valor: string, classe = ''): string {
  return `<tr class="${classe}"><td>${rotulo}</td><td class="num">${valor}</td></tr>`;
}

export function gerarHtmlOrcamento(o: OrcamentoCompleto, opcoes: OpcoesPdf): string {
  const interno = opcoes.versao === 'interno';
  const c = o.calculo;
  const emitido = formatarData(opcoes.emitidoEm ?? new Date());

  // ---- Serviços ----
  const servicos = tabela(
    'Serviços',
    ['Serviço', 'Área (m²)', 'Preço/m²', 'Total'],
    o.servicos.map((s) => [
      `<strong>${escaparHtml(s.nome)}</strong>${s.descricao ? `<div class="desc">${escaparHtml(s.descricao)}</div>` : ''}`,
      num(s.metros_quadrados),
      formatarBRL(s.preco_m2_no_momento),
      formatarBRL(totalLinhaServico({ metrosQuadrados: s.metros_quadrados, precoM2: s.preco_m2_no_momento })),
    ])
  );

  // ---- Materiais / ferramentas: cliente vê só se cobrado ou informado; interno vê sempre ----
  const mostraMateriais = interno || o.materiais_modo !== 'oculto';
  const materiais = mostraMateriais
    ? tabela(
        'Materiais',
        ['Material', 'Qtd.', 'Preço un.', 'Total'],
        o.materiais.map((m) => [
          escaparHtml(m.nome) + (m.unidade ? ` <span class="desc">(${escaparHtml(m.unidade)})</span>` : ''),
          num(m.quantidade),
          formatarBRL(m.preco_no_momento),
          formatarBRL(totalLinhaMaterial({ quantidade: m.quantidade, preco: m.preco_no_momento })),
        ]),
        notaModo(o.materiais_modo, interno)
      )
    : '';

  const mostraFerramentas = interno || o.ferramentas_modo !== 'oculto';
  const ferramentas = mostraFerramentas
    ? tabela(
        'Ferramentas',
        ['Ferramenta', 'Valor'],
        o.ferramentas.map((f) => [escaparHtml(f.nome), formatarBRL(f.preco_no_momento)]),
        notaModo(o.ferramentas_modo, interno)
      )
    : '';

  const equipe = interno
    ? tabela(
        'Equipe',
        ['Funcionário', 'Dias', 'Diária', 'Total'],
        o.funcionarios.map((f) => [
          escaparHtml(f.nome),
          num(f.dias),
          formatarBRL(f.diaria_no_momento),
          formatarBRL(totalLinhaFuncionario({ diaria: f.diaria_no_momento, dias: f.dias })),
        ])
      )
    : '';

  // ---- Resumo: a ordem respeita a base do desconto ----
  const linhasDesconto =
    c.desconto > 0
      ? linhaResumo(`Desconto (${num(o.desconto_pct)}%)`, '− ' + formatarBRL(c.desconto), 'desconto')
      : '';
  const linhasCobrados =
    (c.materiaisCobrados > 0 ? linhaResumo('Materiais', formatarBRL(c.materiaisCobrados)) : '') +
    (c.ferramentasCobradas > 0 ? linhaResumo('Ferramentas', formatarBRL(c.ferramentasCobradas)) : '');

  const resumoCliente =
    linhaResumo('Subtotal dos serviços', formatarBRL(c.subtotalServicos)) +
    (o.desconto_base === 'servicos' ? linhasDesconto + linhasCobrados : linhasCobrados + linhasDesconto) +
    linhaResumo('Total', formatarBRL(c.totalCliente), 'total');

  const resumoInterno = interno
    ? `
    <section>
      <h2>Custos e lucro (uso interno)</h2>
      <table class="resumo">
        ${linhaResumo('Recebido do cliente', formatarBRL(c.totalCliente))}
        ${linhaResumo('Materiais', '− ' + formatarBRL(c.custoMaterial))}
        ${linhaResumo('Ferramentas', '− ' + formatarBRL(c.custoFerramenta))}
        ${linhaResumo('Equipe', '− ' + formatarBRL(c.custoEquipe))}
        ${linhaResumo('Lucro', formatarBRL(c.lucro), c.lucro < 0 ? 'total negativo' : 'total positivo')}
      </table>
    </section>`
    : '';

  const cli = o.cliente;
  const enderecoCliente = [cli.endereco, cli.cidade].filter(Boolean).map(escaparHtml).join(' · ');

  const condicoes =
    !interno && (opcoes.condicoes || o.validade)
      ? `<section><h2>Condições</h2>
           ${o.validade ? `<p>Orçamento válido até <strong>${formatarData(o.validade)}</strong>.</p>` : ''}
           ${opcoes.condicoes ? `<p>${quebraLinhas(opcoes.condicoes)}</p>` : ''}
         </section>`
      : '';

  const observacoes = o.observacoes
    ? `<section><h2>Observações</h2><p>${quebraLinhas(o.observacoes)}</p></section>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Orçamento nº ${o.id}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #fff; color: ${COR.texto}; font-family: -apple-system, Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; line-height: 1.45; }
  header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 3px solid ${COR.vermelho}; }
  header img { max-height: 64px; max-width: 180px; }
  .marca { font-size: 20px; font-weight: 900; letter-spacing: .3px; }
  .doc { text-align: right; }
  .doc .titulo { font-size: 16px; font-weight: 800; text-transform: uppercase; }
  .doc .interno { color: ${COR.vermelho}; font-weight: 800; }
  .suave, .desc, .nota { color: ${COR.suave}; }
  .desc { font-size: 11px; font-weight: 400; }
  .nota { font-size: 11px; font-style: italic; margin: 0 0 4px; }
  section { margin-top: 18px; page-break-inside: avoid; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .6px; color: ${COR.verde}; margin: 0 0 6px; }
  p { margin: 0 0 4px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10.5px; text-transform: uppercase; color: ${COR.suave}; border-bottom: 1px solid ${COR.texto}; padding: 4px 6px; }
  td { padding: 6px; border-bottom: 1px solid ${COR.linha}; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .resumo { width: 60%; margin-left: auto; }
  .resumo td { border: none; padding: 3px 6px; }
  .resumo .desconto td { color: ${COR.vermelho}; }
  .resumo .total td { border-top: 2px solid ${COR.texto}; font-size: 15px; font-weight: 800; padding-top: 6px; }
  .resumo .positivo td { color: ${COR.verde}; }
  .resumo .negativo td { color: ${COR.vermelho}; }
  footer { margin-top: 28px; padding-top: 8px; border-top: 1px solid ${COR.linha}; text-align: center; color: ${COR.suave}; font-size: 11px; }
</style>
</head>
<body>
  <header>
    <div>
      ${opcoes.logoDataUri ? `<img src="${escaparHtml(opcoes.logoDataUri)}" alt="${EMPRESA.nome}">` : `<div class="marca">${EMPRESA.nome}</div>`}
      <div class="suave">${EMPRESA.cidade} · WhatsApp ${EMPRESA.whatsapp}</div>
    </div>
    <div class="doc">
      <div class="titulo">Orçamento nº ${o.id}</div>
      ${interno ? '<div class="interno">USO INTERNO, NÃO ENVIAR AO CLIENTE</div>' : ''}
      <div class="suave">Emitido em ${emitido}</div>
    </div>
  </header>

  <section>
    <h2>Cliente</h2>
    <p><strong>${escaparHtml(cli.nome)}</strong>${cli.telefone ? ` · ${escaparHtml(cli.telefone)}` : ''}</p>
    ${enderecoCliente ? `<p class="suave">${enderecoCliente}</p>` : ''}
  </section>

  ${servicos}
  ${materiais}
  ${ferramentas}
  ${equipe}

  <section>
    <h2>Resumo</h2>
    <table class="resumo">${resumoCliente}</table>
  </section>

  ${resumoInterno}
  ${condicoes}
  ${observacoes}

  <footer>${EMPRESA.nome} · ${EMPRESA.instagram} · ${EMPRESA.whatsapp}</footer>
</body>
</html>`;
}

function notaModo(modo: OrcamentoCompleto['materiais_modo'], interno: boolean): string | undefined {
  if (modo === 'informado') return 'Valores informativos, não incluídos no total.';
  if (interno && modo === 'oculto') return 'Não aparece para o cliente. Entra só no custo.';
  return undefined;
}

/** "orcamento-maria-da-silva-2026-11-17.pdf" (interno: "orcamento-interno-..."). */
export function nomeArquivoPdf(o: Pick<OrcamentoCompleto, 'cliente'>, versao: VersaoPdf, data = new Date()): string {
  const slug =
    o.cliente.nome
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'cliente';
  return `orcamento-${versao === 'interno' ? 'interno-' : ''}${slug}-${paraIsoData(data)}.pdf`;
}
