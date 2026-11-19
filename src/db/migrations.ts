/**
 * Migrações do banco da Katara Pinturas.
 *
 * Regras:
 * - Cada item do array é UMA versão do banco. O índice + 1 é o número da versão
 *   (posição 0 = versão 1, posição 1 = versão 2...).
 * - NUNCA edite uma migração que já foi para o celular de alguém. Para mudar
 *   o banco, adicione uma nova migração no final do array.
 * - Dinheiro sempre em centavos (INTEGER). Datas em texto ISO (AAAA-MM-DD ou
 *   AAAA-MM-DD HH:MM:SS, em UTC quando vierem do datetime('now')).
 */

import { V3_CATALOGO_INICIAL } from './catalogoInicial';

const V1_SCHEMA_INICIAL = `
-- ============ CADASTROS ============

CREATE TABLE clientes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nome        TEXT NOT NULL,
  telefone    TEXT,
  cidade      TEXT,
  endereco    TEXT,
  observacoes TEXT,
  arquivado   INTEGER NOT NULL DEFAULT 0 CHECK (arquivado IN (0, 1))
);

CREATE TABLE funcionarios (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nome        TEXT NOT NULL,
  diaria      INTEGER NOT NULL DEFAULT 0 CHECK (diaria >= 0),          -- centavos
  status      TEXT NOT NULL DEFAULT 'ativo'
              CHECK (status IN ('ativo', 'inativo', 'ferias')),
  observacoes TEXT,
  arquivado   INTEGER NOT NULL DEFAULT 0 CHECK (arquivado IN (0, 1))
);

CREATE TABLE materiais (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nome      TEXT NOT NULL,
  unidade   TEXT NOT NULL,                                              -- ex.: lata 18L, kg, un
  categoria TEXT,
  preco     INTEGER NOT NULL DEFAULT 0 CHECK (preco >= 0),              -- centavos
  loja      TEXT,
  arquivado INTEGER NOT NULL DEFAULT 0 CHECK (arquivado IN (0, 1))
);

CREATE TABLE servicos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nome        TEXT NOT NULL,
  preco_m2    INTEGER NOT NULL DEFAULT 0 CHECK (preco_m2 >= 0),         -- centavos por m²
  descricao   TEXT,
  observacoes TEXT,
  arquivado   INTEGER NOT NULL DEFAULT 0 CHECK (arquivado IN (0, 1))
);

-- Receita: quais materiais cada serviço usa e quanto.
-- por_m2: quantidade = metragem × consumo | fixo: quantidade = consumo
CREATE TABLE servico_materiais (
  servico_id   INTEGER NOT NULL REFERENCES servicos(id),
  material_id  INTEGER NOT NULL REFERENCES materiais(id),
  tipo_calculo TEXT NOT NULL CHECK (tipo_calculo IN ('por_m2', 'fixo')),
  consumo      REAL NOT NULL CHECK (consumo > 0),
  PRIMARY KEY (servico_id, material_id)
);

CREATE TABLE ferramentas (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nome         TEXT NOT NULL,
  valor_compra INTEGER NOT NULL DEFAULT 0 CHECK (valor_compra >= 0),    -- centavos
  arquivado    INTEGER NOT NULL DEFAULT 0 CHECK (arquivado IN (0, 1))
);

-- ============ ORÇAMENTOS ============

CREATE TABLE orcamentos (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id       INTEGER NOT NULL REFERENCES clientes(id),
  criado_em        TEXT NOT NULL DEFAULT (datetime('now')),
  validade         TEXT,
  status           TEXT NOT NULL DEFAULT 'pendente'
                   CHECK (status IN ('pendente', 'aprovado', 'recusado')),
  desconto_pct     REAL NOT NULL DEFAULT 0
                   CHECK (desconto_pct >= 0 AND desconto_pct <= 100),
  desconto_base    TEXT NOT NULL DEFAULT 'servicos'
                   CHECK (desconto_base IN ('servicos', 'total')),
  materiais_modo   TEXT NOT NULL DEFAULT 'cobrado'
                   CHECK (materiais_modo IN ('cobrado', 'informado', 'oculto')),
  ferramentas_modo TEXT NOT NULL DEFAULT 'oculto'
                   CHECK (ferramentas_modo IN ('cobrado', 'informado', 'oculto')),
  total_cliente    INTEGER NOT NULL DEFAULT 0,                          -- centavos, gravado
  lucro            INTEGER NOT NULL DEFAULT 0,                          -- centavos, gravado (pode ser negativo)
  observacoes      TEXT,
  arquivado        INTEGER NOT NULL DEFAULT 0 CHECK (arquivado IN (0, 1))
);

CREATE TABLE orcamento_servicos (
  orcamento_id        INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  servico_id          INTEGER NOT NULL REFERENCES servicos(id),
  metros_quadrados    REAL NOT NULL CHECK (metros_quadrados > 0),
  preco_m2_no_momento INTEGER NOT NULL CHECK (preco_m2_no_momento >= 0),
  PRIMARY KEY (orcamento_id, servico_id)
);

CREATE TABLE orcamento_materiais (
  orcamento_id     INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  material_id      INTEGER NOT NULL REFERENCES materiais(id),
  quantidade       INTEGER NOT NULL CHECK (quantidade > 0),             -- já arredondada para cima
  preco_no_momento INTEGER NOT NULL CHECK (preco_no_momento >= 0),
  PRIMARY KEY (orcamento_id, material_id)
);

-- Ferramentas são opcionais: um orçamento com zero linhas aqui é válido.
CREATE TABLE orcamento_ferramentas (
  orcamento_id     INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  ferramenta_id    INTEGER NOT NULL REFERENCES ferramentas(id),
  preco_no_momento INTEGER NOT NULL CHECK (preco_no_momento >= 0),
  PRIMARY KEY (orcamento_id, ferramenta_id)
);

CREATE TABLE orcamento_funcionarios (
  orcamento_id      INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  funcionario_id    INTEGER NOT NULL REFERENCES funcionarios(id),
  diaria_no_momento INTEGER NOT NULL CHECK (diaria_no_momento >= 0),
  dias              INTEGER NOT NULL CHECK (dias > 0),
  PRIMARY KEY (orcamento_id, funcionario_id)
);

-- ============ ATENDIMENTOS ============

-- Um orçamento aprovado gera no máximo um atendimento (UNIQUE).
-- data_agendada é NULL enquanto estiver "aguardando_agendamento".
CREATE TABLE atendimentos (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  orcamento_id   INTEGER NOT NULL UNIQUE REFERENCES orcamentos(id) ON DELETE CASCADE,
  data_agendada  TEXT,
  status         TEXT NOT NULL DEFAULT 'aguardando_agendamento'
                 CHECK (status IN ('aguardando_agendamento', 'em_andamento',
                                   'aguardando_cliente', 'concluido')),
  arquivado      INTEGER NOT NULL DEFAULT 0 CHECK (arquivado IN (0, 1))
);

-- ============ ÍNDICES ============
-- A chave primária composta já indexa a primeira coluna. Aqui ficam as demais
-- colunas que as telas vão filtrar ou juntar.

CREATE INDEX idx_orcamentos_cliente        ON orcamentos(cliente_id);
CREATE INDEX idx_orcamentos_status_criado  ON orcamentos(status, criado_em);
CREATE INDEX idx_atendimentos_status       ON atendimentos(status);
CREATE INDEX idx_servico_materiais_mat     ON servico_materiais(material_id);
CREATE INDEX idx_orc_servicos_servico      ON orcamento_servicos(servico_id);
CREATE INDEX idx_orc_materiais_material    ON orcamento_materiais(material_id);
CREATE INDEX idx_orc_ferramentas_ferr      ON orcamento_ferramentas(ferramenta_id);
CREATE INDEX idx_orc_funcionarios_func     ON orcamento_funcionarios(funcionario_id);
`;

// Dashboard: "previsto dos aprovados do mês" precisa saber QUANDO foi aprovado,
// não quando foi criado (um orçamento de outubro aprovado em novembro é receita
// de novembro). Preenchido em UTC ao aprovar; volta a NULL ao sair de aprovado.
const V2_APROVADO_EM = `
ALTER TABLE orcamentos ADD COLUMN aprovado_em TEXT;
CREATE INDEX idx_orcamentos_aprovado_em ON orcamentos(aprovado_em);
`;

export const MIGRATIONS: readonly string[] = [V1_SCHEMA_INICIAL, V2_APROVADO_EM, V3_CATALOGO_INICIAL];

export const LATEST_VERSION = MIGRATIONS.length;
