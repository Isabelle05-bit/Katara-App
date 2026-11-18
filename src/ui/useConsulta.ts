import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';

/**
 * Carrega dados do banco e RECARREGA toda vez que a tela volta a ficar em
 * foco (ex.: salvou um cliente e voltou para a lista). Expõe os 3 estados
 * que toda lista precisa: carregando, erro, dados.
 *
 * `deps`: quando mudam (ex.: filtro), a consulta roda de novo.
 */
export function useConsulta<T>(consulta: (db: SQLiteDatabase) => Promise<T>, deps: unknown[] = []) {
  const db = useSQLiteContext();
  const [dados, setDados] = useState<T | undefined>(undefined);
  const [erro, setErro] = useState<unknown>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const pedido = useRef(0);
  const temDados = useRef(false);

  // Sempre a versão mais recente da consulta (ela fecha sobre filtros da tela).
  const consultaAtual = useRef(consulta);
  useEffect(() => {
    consultaAtual.current = consulta;
  });

  const carregar = useCallback(
    async (modo: 'inicial' | 'atualizar' = 'inicial') => {
      const meu = ++pedido.current;
      if (modo === 'atualizar') setAtualizando(true);
      else if (!temDados.current) setCarregando(true);
      try {
        const r = await consultaAtual.current(db);
        if (meu === pedido.current) {
          temDados.current = true;
          setDados(r);
          setErro(null);
        }
      } catch (e) {
        if (meu === pedido.current) setErro(e);
      } finally {
        if (meu === pedido.current) {
          setCarregando(false);
          setAtualizando(false);
        }
      }
    },
    [db]
  );

  const chave = JSON.stringify(deps);
  useFocusEffect(
    useCallback(() => {
      // `chave` entra aqui de propósito: filtro mudou → consulta de novo.
      if (chave !== undefined) carregar();
    }, [carregar, chave])
  );

  return {
    dados,
    erro,
    carregando: carregando && dados === undefined,
    atualizando,
    recarregar: () => carregar('atualizar'),
  };
}
