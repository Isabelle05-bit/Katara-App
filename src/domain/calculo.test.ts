import {
  calcularOrcamento,
  quantidadeSugerida,
  sugerirMateriais,
  sugerirMateriaisDoOrcamento,
  type EntradaCalculo,
} from './calculo';

/**
 * Cenário base (valores em centavos):
 * - Serviço: 80 m² × R$ 25,00         = R$ 2.000,00
 * - Materiais: 3 × R$ 210 + 6 × R$ 45 = R$ 900,00
 * - Ferramentas: R$ 150,00
 * - Equipe: 2 pessoas × R$ 150 × 2 dias = R$ 600,00
 */
const base = (mudancas: Partial<EntradaCalculo> = {}): EntradaCalculo => ({
  servicos: [{ metrosQuadrados: 80, precoM2: 2500 }],
  materiais: [
    { quantidade: 3, preco: 21000 },
    { quantidade: 6, preco: 4500 },
  ],
  ferramentas: [{ preco: 15000 }],
  funcionarios: [
    { diaria: 15000, dias: 2 },
    { diaria: 15000, dias: 2 },
  ],
  descontoPct: 0,
  descontoBase: 'servicos',
  materiaisModo: 'cobrado',
  ferramentasModo: 'oculto',
  ...mudancas,
});

describe('calcularOrcamento', () => {
  test('custos entram no lucro sempre, independente do modo', () => {
    const r = calcularOrcamento(base());
    expect(r.subtotalServicos).toBe(200000);
    expect(r.custoMaterial).toBe(90000);
    expect(r.custoFerramenta).toBe(15000);
    expect(r.custoEquipe).toBe(60000);
    expect(r.materiaisCobrados).toBe(90000);
    expect(r.ferramentasCobradas).toBe(0); // oculto
    expect(r.totalCliente).toBe(290000);
    expect(r.lucro).toBe(290000 - 90000 - 15000 - 60000);
  });

  describe('modos de cobrança', () => {
    test.each(['informado', 'oculto'] as const)('materiais %s: cliente não paga, custo continua', (modo) => {
      const r = calcularOrcamento(base({ materiaisModo: modo }));
      expect(r.materiaisCobrados).toBe(0);
      expect(r.totalCliente).toBe(200000);
      expect(r.lucro).toBe(200000 - 165000);
    });

    test('ferramentas cobrado: entra no total pelo mesmo valor do custo', () => {
      const r = calcularOrcamento(base({ ferramentasModo: 'cobrado' }));
      expect(r.ferramentasCobradas).toBe(15000);
      expect(r.totalCliente).toBe(305000);
      expect(r.lucro).toBe(305000 - 165000);
    });

    test('tudo cobrado sem desconto: lucro = serviços − equipe', () => {
      const r = calcularOrcamento(base({ ferramentasModo: 'cobrado' }));
      expect(r.lucro).toBe(r.subtotalServicos - r.custoEquipe);
    });
  });

  describe('desconto', () => {
    test('base servicos: só o subtotal dos serviços recebe desconto', () => {
      const r = calcularOrcamento(base({ descontoPct: 10, descontoBase: 'servicos' }));
      expect(r.baseDesconto).toBe(200000);
      expect(r.desconto).toBe(20000);
      expect(r.totalCliente).toBe(270000);
      expect(r.lucro).toBe(270000 - 165000);
    });

    test('base total: serviços + itens cobrados recebem desconto', () => {
      const r = calcularOrcamento(base({ descontoPct: 10, descontoBase: 'total', ferramentasModo: 'cobrado' }));
      expect(r.baseDesconto).toBe(305000);
      expect(r.desconto).toBe(30500);
      expect(r.totalCliente).toBe(274500);
    });

    test('base total não inclui itens só informados', () => {
      const r = calcularOrcamento(base({ descontoPct: 10, descontoBase: 'total', materiaisModo: 'informado' }));
      expect(r.baseDesconto).toBe(200000);
    });

    test('desconto 0%', () => {
      expect(calcularOrcamento(base({ descontoPct: 0 })).desconto).toBe(0);
    });

    test('desconto 100% sobre serviços: cliente paga só os materiais cobrados', () => {
      const r = calcularOrcamento(base({ descontoPct: 100, descontoBase: 'servicos' }));
      expect(r.totalCliente).toBe(90000);
    });

    test('desconto 100% sobre o total: cliente paga zero e o lucro fica negativo', () => {
      const r = calcularOrcamento(base({ descontoPct: 100, descontoBase: 'total' }));
      expect(r.totalCliente).toBe(0);
      expect(r.lucro).toBe(-165000);
    });

    test.each([-1, 100.01])('desconto %p fora de 0–100 é recusado', (pct) => {
      expect(() => calcularOrcamento(base({ descontoPct: pct }))).toThrow(/entre 0% e 100%/);
    });
  });

  test('sem ferramentas é válido', () => {
    const r = calcularOrcamento(base({ ferramentas: [], ferramentasModo: 'cobrado' }));
    expect(r.custoFerramenta).toBe(0);
    expect(r.ferramentasCobradas).toBe(0);
    expect(r.lucro).toBe(290000 - 90000 - 60000);
  });

  test('lucro negativo quando os custos passam do total', () => {
    const r = calcularOrcamento(base({ servicos: [{ metrosQuadrados: 10, precoM2: 1000 }], materiaisModo: 'oculto' }));
    expect(r.totalCliente).toBe(10000);
    expect(r.lucro).toBe(10000 - 165000);
    expect(r.lucro).toBeLessThan(0);
  });

  test('vários serviços somam', () => {
    const r = calcularOrcamento(
      base({
        servicos: [
          { metrosQuadrados: 80, precoM2: 2500 },
          { metrosQuadrados: 20, precoM2: 4000 },
        ],
      })
    );
    expect(r.subtotalServicos).toBe(200000 + 80000);
  });

  test('orçamento vazio dá tudo zero', () => {
    const r = calcularOrcamento(base({ servicos: [], materiais: [], ferramentas: [], funcionarios: [] }));
    expect(r).toMatchObject({ totalCliente: 0, lucro: 0, desconto: 0 });
  });

  describe('arredondamento (regra: por linha, meio para cima, em centavos)', () => {
    test('metragem fracionada arredonda a linha', () => {
      // 12,5 m² × R$ 19,99 = 249,875 → R$ 249,88
      const r = calcularOrcamento(base({ servicos: [{ metrosQuadrados: 12.5, precoM2: 1999 }] }));
      expect(r.subtotalServicos).toBe(24988);
    });

    test('meio centavo arredonda para cima', () => {
      // 10% de R$ 0,05 = 0,5 centavo → 1 centavo
      const r = calcularOrcamento(
        base({ servicos: [{ metrosQuadrados: 1, precoM2: 5 }], materiais: [], descontoPct: 10 })
      );
      expect(r.desconto).toBe(1);
    });

    test('percentual fracionado', () => {
      // 7,5% de R$ 249,88 = 18,741 → R$ 18,74
      const r = calcularOrcamento(
        base({ servicos: [{ metrosQuadrados: 12.5, precoM2: 1999 }], descontoPct: 7.5 })
      );
      expect(r.desconto).toBe(1874);
    });

    test('sem erro de ponto flutuante (0,1 + 0,2 m²)', () => {
      const r = calcularOrcamento(base({ servicos: [{ metrosQuadrados: 0.1 + 0.2, precoM2: 1000 }] }));
      expect(r.subtotalServicos).toBe(300);
    });

    test('resultado é sempre inteiro', () => {
      const r = calcularOrcamento(
        base({
          servicos: [{ metrosQuadrados: 33.33, precoM2: 2717 }],
          descontoPct: 3.33,
          descontoBase: 'total',
        })
      );
      for (const v of Object.values(r)) expect(Number.isInteger(v)).toBe(true);
    });
  });
});

describe('sugestão de materiais', () => {
  test('por_m2: metragem × consumo, arredonda para cima', () => {
    // 80 m² × 0,03 lata/m² = 2,4 → 3 latas
    expect(quantidadeSugerida({ tipoCalculo: 'por_m2', consumo: 0.03 }, 80)).toBe(3);
  });

  test('por_m2 exato não sobe por erro de ponto flutuante', () => {
    // 100 × 0,03 = 3.0000000000000004 em JS
    expect(quantidadeSugerida({ tipoCalculo: 'por_m2', consumo: 0.03 }, 100)).toBe(3);
  });

  test('fixo: quantidade = consumo, independe da metragem', () => {
    expect(quantidadeSugerida({ tipoCalculo: 'fixo', consumo: 2 }, 500)).toBe(2);
    expect(quantidadeSugerida({ tipoCalculo: 'fixo', consumo: 1.5 }, 10)).toBe(2);
  });

  test('nunca sugere zero', () => {
    expect(quantidadeSugerida({ tipoCalculo: 'por_m2', consumo: 0.001 }, 1)).toBe(1);
  });

  test('sugerirMateriais aplica a receita inteira', () => {
    expect(
      sugerirMateriais(
        [
          { materialId: 1, tipoCalculo: 'por_m2', consumo: 0.03 },
          { materialId: 2, tipoCalculo: 'fixo', consumo: 1 },
        ],
        80
      )
    ).toEqual([
      { materialId: 1, quantidade: 3 },
      { materialId: 2, quantidade: 1 },
    ]);
  });

  test('mesmo material em dois serviços vira uma linha (soma antes de arredondar)', () => {
    const r = sugerirMateriaisDoOrcamento([
      { metragem: 20, receita: [{ materialId: 1, tipoCalculo: 'por_m2', consumo: 0.02 }] }, // 0,4
      {
        metragem: 20,
        receita: [
          { materialId: 1, tipoCalculo: 'por_m2', consumo: 0.02 }, // 0,4
          { materialId: 2, tipoCalculo: 'fixo', consumo: 1 },
        ],
      },
    ]);
    expect(r).toEqual([
      { materialId: 1, quantidade: 1 }, // 0,8 → 1 (e não 1 + 1)
      { materialId: 2, quantidade: 1 },
    ]);
  });
});
