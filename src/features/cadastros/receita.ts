import type { SQLiteDatabase } from 'expo-sqlite';
import { emTransacao } from '../../db/tipos';
import type { TipoCalculo } from '../../domain/tipos';
import { adicionarNaReceita, editarItemReceita, removerDaReceita } from '../../repositories/servicos';

export interface LinhaReceitaForm {
  materialId: number;
  nome: string;
  unidade: string;
  tipoCalculo: TipoCalculo;
  consumo: number | null;
}

type Salva = { materialId: number; tipoCalculo: TipoCalculo; consumo: number };

/** O que mudar no banco para a receita salva virar a do formulário. */
export function diferencaReceita(antes: Salva[], depois: Salva[]) {
  const mapaAntes = new Map(antes.map((r) => [r.materialId, r]));
  const idsDepois = new Set(depois.map((r) => r.materialId));
  return {
    adicionar: depois.filter((r) => !mapaAntes.has(r.materialId)),
    editar: depois.filter((r) => {
      const a = mapaAntes.get(r.materialId);
      return a && (a.tipoCalculo !== r.tipoCalculo || a.consumo !== r.consumo);
    }),
    remover: antes.filter((r) => !idsDepois.has(r.materialId)).map((r) => r.materialId),
  };
}

export function erroDaReceita(linhas: LinhaReceitaForm[]): string | null {
  const sem = linhas.find((l) => !l.consumo || l.consumo <= 0);
  return sem ? `Informe o consumo de "${sem.nome}" na receita.` : null;
}

/** Grava a receita inteira numa transação (tudo ou nada). */
export async function salvarReceita(db: SQLiteDatabase, servicoId: number, antes: Salva[], linhas: LinhaReceitaForm[]) {
  const depois = linhas.map((l) => ({ materialId: l.materialId, tipoCalculo: l.tipoCalculo, consumo: l.consumo ?? 0 }));
  const d = diferencaReceita(antes, depois);
  await emTransacao(db, async () => {
    for (const id of d.remover) await removerDaReceita(db, servicoId, id);
    for (const r of d.editar) await editarItemReceita(db, servicoId, r);
    for (const r of d.adicionar) await adicionarNaReceita(db, servicoId, r);
  });
}
