/**
 * Migração V3: catálogo inicial (materiais, ferramentas, serviços e receitas).
 *
 * Preços de REFERÊNCIA pesquisados em 18/11/2026, em centavos. Não são preços
 * confirmados em lojas de Porto Alegre: a coluna `loja` de cada material diz a
 * origem e a data da consulta. Fontes e premissas: catalogo-seed-fontes.md
 * (documentos do projeto).
 *
 * Só INSERTs, sem apagar nem alterar nada: um banco que já tem dados continua
 * com eles. Os ids explícitos (1..N) assumem catálogo vazio, que é o caso do
 * app antes desta versão (decisão do projeto: o Anderson ainda não cadastrou
 * dados reais).
 */
export const V3_CATALOGO_INICIAL = `
-- materiais
INSERT INTO materiais (id, nome, unidade, categoria, preco, loja, arquivado) VALUES (1, 'Tinta acrílica Coral Rende Muito branca 18L', 'lata 18L', 'tinta', 42990, 'Telhanorte (preço online, referência; não é loja de POA) · consultado em 18/11/2026', 0);
INSERT INTO materiais (id, nome, unidade, categoria, preco, loja, arquivado) VALUES (2, 'Tinta acrílica Suvinil Toque Fosco Completo 18L', 'lata 18L', 'tinta', 66990, 'Telhanorte (preço online, referência; não é loja de POA) · consultado em 18/11/2026', 0);
INSERT INTO materiais (id, nome, unidade, categoria, preco, loja, arquivado) VALUES (3, 'Selador acrílico Coral branco 18L', 'lata 18L', 'preparo', 22990, 'Telhanorte (preço online, referência; não é loja de POA) · consultado em 18/11/2026', 0);
INSERT INTO materiais (id, nome, unidade, categoria, preco, loja, arquivado) VALUES (4, 'Massa corrida PVA Coral 25kg', 'balde 25kg', 'preparo', 12273, 'MadeiraMadeira (preço online, referência) · consultado em 18/11/2026', 0);
INSERT INTO materiais (id, nome, unidade, categoria, preco, loja, arquivado) VALUES (5, 'Massa corrida PVA Iquine 25kg', 'balde 25kg', 'preparo', 11400, 'Magazine Luiza (preço online, referência) · consultado em 18/11/2026', 0);
INSERT INTO materiais (id, nome, unidade, categoria, preco, loja, arquivado) VALUES (6, 'Massa corrida Suvinil Premium 25kg', 'lata 25kg', 'preparo', 13912, 'MadeiraMadeira (preço online, referência) · consultado em 18/11/2026', 0);
INSERT INTO materiais (id, nome, unidade, categoria, preco, loja, arquivado) VALUES (7, 'Massa acrílica Suvinil branca 25kg (áreas externas/úmidas)', 'lata 25kg', 'preparo', 23990, 'Telhanorte (preço online, referência; não é loja de POA) · consultado em 18/11/2026', 0);
INSERT INTO materiais (id, nome, unidade, categoria, preco, loja, arquivado) VALUES (8, 'Fita crepe 48mm x 50m', 'rolo', 'consumivel', 1242, 'Magazine Luiza (kit com 6 rolos) · consultado em 18/11/2026', 0);
INSERT INTO materiais (id, nome, unidade, categoria, preco, loja, arquivado) VALUES (9, 'Lona plástica preta 4m x 5m', 'unidade', 'consumivel', 3090, 'Telhanorte (preço online, referência; não é loja de POA) · consultado em 18/11/2026', 0);
INSERT INTO materiais (id, nome, unidade, categoria, preco, loja, arquivado) VALUES (10, 'Lixa Norton A237 grão 100 (folha)', 'folha', 'consumivel', 129, 'Telhanorte (preço online, referência; não é loja de POA) · consultado em 18/11/2026', 0);
-- ferramentas
INSERT INTO ferramentas (id, nome, valor_compra, arquivado) VALUES (1, 'Escada de alumínio 7 degraus (doméstica)', 25690, 0);
INSERT INTO ferramentas (id, nome, valor_compra, arquivado) VALUES (2, 'Rolo de lã 23cm com suporte (Condor)', 3390, 0);
INSERT INTO ferramentas (id, nome, valor_compra, arquivado) VALUES (3, 'Kit de pintura 3 peças (rolo de lã 23cm, bandeja e suporte)', 9069, 0);
INSERT INTO ferramentas (id, nome, valor_compra, arquivado) VALUES (4, 'Espátula de aço 10cm', 1690, 0);
INSERT INTO ferramentas (id, nome, valor_compra, arquivado) VALUES (5, 'Desempenadeira de aço lisa 42 x 12cm', 4290, 0);
-- servicos
INSERT INTO servicos (id, nome, preco_m2, descricao, observacoes, arquivado) VALUES (1, 'Pintura interna de parede (repintura, 2 demãos)', 2500, 'Repintura de paredes internas em bom estado, com proteção do ambiente e lixa leve.', 'Só mão de obra. Referência de mercado para pintor autônomo (faixas de R$ 12 a R$ 45 por m² nas fontes consultadas). Anderson deve ajustar ao próprio preço.', 0);
INSERT INTO servicos (id, nome, preco_m2, descricao, observacoes, arquivado) VALUES (2, 'Pintura de teto (2 demãos)', 2800, 'Pintura de teto/forro com proteção do ambiente e lixa leve.', 'Só mão de obra. Referência: R$ 18 a R$ 32 por m² de teto (Lar Pontual, 2026).', 0);
INSERT INTO servicos (id, nome, preco_m2, descricao, observacoes, arquivado) VALUES (3, 'Massa corrida + pintura interna', 5500, 'Correção com massa corrida (2 demãos), lixa, selador e 2 demãos de tinta em paredes internas.', 'Só mão de obra. Fontes divergem: acima de R$ 40 (Correio Braziliense) a R$ 65 (Monitor do Mercado).', 0);
INSERT INTO servicos (id, nome, preco_m2, descricao, observacoes, arquivado) VALUES (4, 'Pintura externa / fachada (selador + 2 demãos)', 4200, 'Selador e 2 demãos de tinta acrílica em paredes externas, sem andaime.', 'Só mão de obra, sem andaime ou acesso difícil. Referência: R$ 25 a R$ 45 por m² (Monitor do Mercado) e a partir de R$ 45 (fachada simples).', 0);
-- servico_materiais
INSERT INTO servico_materiais (servico_id, material_id, tipo_calculo, consumo) VALUES (1, 1, 'por_m2', 0.0059);
INSERT INTO servico_materiais (servico_id, material_id, tipo_calculo, consumo) VALUES (1, 8, 'por_m2', 0.02);
INSERT INTO servico_materiais (servico_id, material_id, tipo_calculo, consumo) VALUES (1, 9, 'por_m2', 0.015);
INSERT INTO servico_materiais (servico_id, material_id, tipo_calculo, consumo) VALUES (1, 10, 'por_m2', 0.1);
INSERT INTO servico_materiais (servico_id, material_id, tipo_calculo, consumo) VALUES (2, 1, 'por_m2', 0.0059);
INSERT INTO servico_materiais (servico_id, material_id, tipo_calculo, consumo) VALUES (2, 8, 'por_m2', 0.02);
INSERT INTO servico_materiais (servico_id, material_id, tipo_calculo, consumo) VALUES (2, 9, 'por_m2', 0.015);
INSERT INTO servico_materiais (servico_id, material_id, tipo_calculo, consumo) VALUES (2, 10, 'por_m2', 0.1);
INSERT INTO servico_materiais (servico_id, material_id, tipo_calculo, consumo) VALUES (3, 1, 'por_m2', 0.0059);
INSERT INTO servico_materiais (servico_id, material_id, tipo_calculo, consumo) VALUES (3, 3, 'por_m2', 0.01);
INSERT INTO servico_materiais (servico_id, material_id, tipo_calculo, consumo) VALUES (3, 4, 'por_m2', 0.04);
INSERT INTO servico_materiais (servico_id, material_id, tipo_calculo, consumo) VALUES (3, 8, 'por_m2', 0.02);
INSERT INTO servico_materiais (servico_id, material_id, tipo_calculo, consumo) VALUES (3, 9, 'por_m2', 0.015);
INSERT INTO servico_materiais (servico_id, material_id, tipo_calculo, consumo) VALUES (3, 10, 'por_m2', 0.3);
INSERT INTO servico_materiais (servico_id, material_id, tipo_calculo, consumo) VALUES (4, 1, 'por_m2', 0.0059);
INSERT INTO servico_materiais (servico_id, material_id, tipo_calculo, consumo) VALUES (4, 3, 'por_m2', 0.01);
INSERT INTO servico_materiais (servico_id, material_id, tipo_calculo, consumo) VALUES (4, 8, 'por_m2', 0.01);
INSERT INTO servico_materiais (servico_id, material_id, tipo_calculo, consumo) VALUES (4, 9, 'por_m2', 0.01);
`;
