/**
 * Regras de digitação dos campos (puras, testadas em entrada.test.ts).
 */

const MAX_DIGITOS_DINHEIRO = 11; // até R$ 999.999.999,99

/**
 * Campo de dinheiro "de caixa eletrônico": o que se digita são centavos.
 * Digitar 1, 2, 3, 4 mostra R$ 12,34. Apagar tira o último dígito.
 * Qualquer coisa que não seja dígito é ignorada.
 */
export function digitosParaCentavos(texto: string): number {
  const digitos = texto.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITOS_DINHEIRO);
  return digitos ? Number(digitos) : 0;
}

/**
 * Texto de número decimal digitado (m², %, consumo). Aceita vírgula ou ponto.
 * Devolve o texto "limpo" para mostrar e o número (ou null se vazio/inválido).
 */
export function lerDecimal(texto: string, casas = 2): { texto: string; valor: number | null } {
  let t = texto.replace(/\./g, ',').replace(/[^\d,]/g, '');
  const i = t.indexOf(',');
  if (i >= 0) t = t.slice(0, i + 1) + t.slice(i + 1).replace(/,/g, '').slice(0, casas);
  if (t.startsWith(',')) t = '0' + t;
  if (t === '') return { texto: '', valor: null };
  const valor = Number(t.replace(',', '.'));
  return { texto: t, valor: Number.isFinite(valor) ? valor : null };
}

/** Número → texto com vírgula, sem zeros sobrando ("12,5", "80"). */
export function decimalParaTexto(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '';
  return String(Math.round(valor * 1000) / 1000).replace('.', ',');
}
