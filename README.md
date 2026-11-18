# Katara Pinturas — App de orçamentos

App Android para gerar orçamentos em PDF para a Katara Pinturas & Efeitos.

**Stack:** React Native + Expo (TypeScript), Expo Router, SQLite (`expo-sqlite`).

## Rodar

```bash
npm install
npx expo start
```

## Banco de dados

O schema fica em `src/db/migrations.ts` (uma string SQL por versão do banco).
`src/db/migrate.ts` roda as migrações pendentes quando o app abre, usando `PRAGMA user_version`.

Para mudar o banco, **nunca edite uma migração existente**: adicione uma nova no final do array.

## Testes e checagens

```bash
npm test            # Jest (lógica + repositórios com SQLite em memória)
npm run typecheck   # tsc --noEmit
npx expo lint
```

- `*.test.ts` rodam em ambiente Node. Os repositórios são testados com `better-sqlite3`
  executando **as mesmas migrações** do app (`src/test/dbEmMemoria.ts`).
- `*.test.tsx` rodam no preset `jest-expo` com React Native Testing Library.
- Os testes rodam no fuso `America/Sao_Paulo` (`jest.globalSetup.js`).

## Estrutura do back end

| Pasta | O quê |
|---|---|
| `src/lib` | Dinheiro (centavos ↔ reais, BRL) e datas (ISO/UTC ↔ dd/mm/aaaa) |
| `src/domain` | `calcularOrcamento`, sugestão de materiais, schemas Zod, tipos/status |
| `src/repositories` | CRUD dos cadastros, receita, orçamentos (transação + status), atendimentos, dashboard |
| `src/pdf` | Gerador de HTML puro (cliente/interno) + `expo-print` / `expo-sharing` |
| `src/backup` | Exportar/restaurar `.db` e validação pura do cabeçalho SQLite |

## Decisões registradas no código

- **Arredondamento:** cada linha é arredondada para centavos (meio para cima) antes de somar;
  o desconto é arredondado uma vez sobre a base. Metragem e % com precisão de 2 casas.
- **Preço da linha do orçamento:** editado na linha → senão o já congelado no orçamento →
  senão copia do catálogo (só se o item não estiver arquivado).
- **Migração 2:** `orcamentos.aprovado_em`. O dashboard soma os aprovados pelo mês da aprovação (horário local).
- **Aprovado → recusado** tem o mesmo bloqueio de aprovado → pendente (atendimento já iniciado).
- **Restaurar backup** usa a API de backup online do SQLite (`backupDatabaseAsync`) sobre a
  conexão aberta, em vez de fechar/trocar o arquivo: o `SQLiteProvider` com Suspense guarda a
  conexão em cache e devolveria uma conexão fechada.
- **Equipe do atendimento** reaproveita `orcamento_funcionarios`.
