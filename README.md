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
