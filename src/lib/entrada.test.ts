import { decimalParaTexto, digitosParaCentavos, lerDecimal } from './entrada';

describe('digitosParaCentavos (campo de dinheiro)', () => {
  test.each([
    ['', 0],
    ['1', 1],
    ['1234', 1234],
    ['R$ 12,34', 1234],
    ['R$ 12,345', 12345], // digitou mais um dígito
    ['R$ 0,0', 0],
    ['00012', 12],
    ['123456789012345', 12345678901], // limite
  ])('%p → %p', (texto, centavos) => {
    expect(digitosParaCentavos(texto)).toBe(centavos);
  });
});

describe('lerDecimal (m², %, consumo)', () => {
  test.each([
    ['80', '80', 80],
    ['12,5', '12,5', 12.5],
    ['12.5', '12,5', 12.5],
    [',5', '0,5', 0.5],
    ['1,234', '1,23', 1.23],
    ['1,2,3', '1,23', 1.23],
    ['abc', '', null],
    ['', '', null],
    ['10,', '10,', 10],
  ])('%p → texto %p, valor %p', (entrada, texto, valor) => {
    expect(lerDecimal(entrada)).toEqual({ texto, valor });
  });

  test('casas configuráveis (consumo com 3)', () => {
    expect(lerDecimal('0,0333', 3)).toEqual({ texto: '0,033', valor: 0.033 });
  });

  test('decimalParaTexto', () => {
    expect(decimalParaTexto(12.5)).toBe('12,5');
    expect(decimalParaTexto(80)).toBe('80');
    expect(decimalParaTexto(null)).toBe('');
  });
});
