import {
  centavosParaReais,
  centavosParaTexto,
  dividirArredondando,
  formatarBRL,
  percentualDe,
  reaisParaCentavos,
} from './dinheiro';
import { deUtcSql, formatarData, intervaloDoMesUtc, lerDataBR, paraIsoData, paraUtcSql } from './datas';

describe('dinheiro', () => {
  test.each([
    ['1.234,56', 123456],
    ['1234,56', 123456],
    ['1234.56', 123456],
    ['R$ 12', 1200],
    ['12,5', 1250],
    ['0,01', 1],
    ['1.234', 123400],
    ['1.234.567,89', 123456789],
    [' 3 ', 300],
    ['-10,00', -1000],
  ])('reaisParaCentavos(%p) = %p', (texto, esperado) => {
    expect(reaisParaCentavos(texto)).toBe(esperado);
  });

  test.each(['', 'abc', '12,345', '1,2,3', 'R$'])('reaisParaCentavos(%p) é inválido', (texto) => {
    expect(reaisParaCentavos(texto)).toBeNull();
  });

  test('reaisParaCentavos aceita número', () => {
    expect(reaisParaCentavos(19.99)).toBe(1999);
    expect(reaisParaCentavos(NaN)).toBeNull();
  });

  test.each([
    [123456, 'R$ 1.234,56'],
    [0, 'R$ 0,00'],
    [5, 'R$ 0,05'],
    [100000000, 'R$ 1.000.000,00'],
    [-165000, '-R$ 1.650,00'],
  ])('formatarBRL(%p) = %p', (c, esperado) => {
    expect(formatarBRL(c)).toBe(esperado);
  });

  test('ida e volta texto ↔ centavos', () => {
    expect(centavosParaTexto(123456)).toBe('1234,56');
    expect(reaisParaCentavos(centavosParaTexto(123456))).toBe(123456);
    expect(centavosParaReais(1999)).toBe(19.99);
  });

  test('dividirArredondando: meio para cima, simétrico nos negativos', () => {
    expect(dividirArredondando(5, 10)).toBe(1);
    expect(dividirArredondando(4, 10)).toBe(0);
    expect(dividirArredondando(-5, 10)).toBe(-1);
    expect(() => dividirArredondando(1.5, 10)).toThrow();
  });

  test('percentualDe', () => {
    expect(percentualDe(10000, 12.5)).toBe(1250);
    expect(percentualDe(333, 33.33)).toBe(111);
  });
});

describe('datas (fuso de Brasília, -03:00)', () => {
  test('datetime("now") às 01h UTC ainda é o dia anterior no Brasil', () => {
    expect(formatarData('2026-12-01 01:30:00')).toBe('30/11/2026');
  });

  test('data pura não sofre conversão de fuso', () => {
    expect(formatarData('2026-12-01')).toBe('01/12/2026');
  });

  test('vazio vira string vazia', () => {
    expect(formatarData(null)).toBe('');
  });

  test('ida e volta UTC', () => {
    const d = new Date(Date.UTC(2026, 10, 17, 2, 3, 4));
    expect(paraUtcSql(d)).toBe('2026-11-17 02:03:04');
    expect(deUtcSql('2026-11-17 02:03:04').getTime()).toBe(d.getTime());
  });

  test('paraIsoData usa o dia local', () => {
    expect(paraIsoData(new Date(Date.UTC(2026, 11, 1, 1, 0, 0)))).toBe('2026-11-30');
  });

  test('lerDataBR', () => {
    expect(lerDataBR('17/11/2026')).toBe('2026-11-17');
    expect(lerDataBR('31/02/2026')).toBeNull();
    expect(lerDataBR('2026-11-17')).toBeNull();
  });

  test('intervalo do mês local em UTC', () => {
    expect(intervaloDoMesUtc(2026, 11)).toEqual({
      inicio: '2026-11-01 03:00:00',
      fim: '2026-12-01 03:00:00',
    });
    expect(intervaloDoMesUtc(2026, 12).fim).toBe('2027-01-01 03:00:00');
  });
});
