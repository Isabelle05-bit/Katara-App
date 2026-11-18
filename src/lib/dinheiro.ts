/**
 * Dinheiro no app é SEMPRE inteiro em centavos. Reais só aparecem na tela/PDF.
 *
 * Regra única de arredondamento (decisão da fatia 1): meio para cima
 * ("half up"), aplicado em centavos inteiros. Como todos os valores do app são
 * >= 0 antes da subtração final, isso equivale ao arredondamento comercial.
 */

/** Divide inteiros arredondando meio para cima, sem erro de ponto flutuante. */
export function dividirArredondando(numerador: number, denominador: number): number {
  if (!Number.isInteger(numerador) || !Number.isInteger(denominador) || denominador <= 0) {
    throw new Error('dividirArredondando espera inteiros e denominador positivo');
  }
  const sinal = numerador < 0 ? -1 : 1;
  const abs = Math.abs(numerador);
  return sinal * Math.floor((2 * abs + denominador) / (2 * denominador));
}

/**
 * Converte um número decimal com até 2 casas para centésimos inteiros.
 * Ex.: 12.5 → 1250, 0.1 + 0.2 → 30. Usado para m² e percentual.
 */
export function paraCentesimos(valor: number): number {
  return Math.round(valor * 100);
}

/** Multiplica centavos por uma quantidade decimal (até 2 casas) e arredonda. */
export function multiplicarCentavos(centavos: number, quantidade: number): number {
  return dividirArredondando(centavos * paraCentesimos(quantidade), 100);
}

/** Aplica um percentual (0–100, até 2 casas) sobre centavos e arredonda. */
export function percentualDe(centavos: number, pct: number): number {
  return dividirArredondando(centavos * paraCentesimos(pct), 100 * 100);
}

/**
 * Converte o que o usuário digitou em reais para centavos.
 * Aceita "1.234,56", "1234,56", "1234.56", "R$ 12", "12,5".
 * Retorna null se não for um valor válido.
 */
export function reaisParaCentavos(texto: string | number): number | null {
  if (typeof texto === 'number') {
    return Number.isFinite(texto) ? Math.round(texto * 100) : null;
  }
  let s = texto.replace(/R\$/i, '').replace(/\s/g, '');
  if (s === '') return null;

  const negativo = s.startsWith('-');
  if (negativo) s = s.slice(1);

  if (s.includes(',')) {
    // Formato brasileiro: ponto é milhar, vírgula é decimal.
    s = s.replace(/\./g, '').replace(',', '.');
  } else if ((s.match(/\./g) ?? []).length > 1 || /^\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.234" ou "1.234.567" sem vírgula: pontos são milhar.
    s = s.replace(/\./g, '');
  }

  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;

  const [inteiro, frac = ''] = s.split('.');
  const centavos = Number(inteiro) * 100 + Number(frac.padEnd(2, '0'));
  return negativo ? -centavos : centavos;
}

/** Centavos → número em reais (só para exibição/inputs numéricos). */
export function centavosParaReais(centavos: number): number {
  return centavos / 100;
}

/** Formata centavos como "R$ 1.234,56" (sem depender do Intl do Hermes). */
export function formatarBRL(centavos: number): string {
  const negativo = centavos < 0;
  const abs = Math.abs(Math.round(centavos));
  const inteiro = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const frac = (abs % 100).toString().padStart(2, '0');
  return `${negativo ? '-' : ''}R$ ${inteiro},${frac}`;
}

/** Formata centavos para preencher um input: "1234,56". */
export function centavosParaTexto(centavos: number): string {
  return formatarBRL(centavos).replace('R$ ', '').replace(/\./g, '');
}
