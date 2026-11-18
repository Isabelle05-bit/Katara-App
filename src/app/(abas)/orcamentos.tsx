import { useState } from 'react';
import { RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { StatusOrcamento } from '../../domain/tipos';
import { listarOrcamentos } from '../../repositories/orcamentos';
import { CardOrcamento } from '../../features/orcamento/CardOrcamento';
import { Carregando, Chip, Chips, ErroCarregar, EstadoVazio } from '../../ui/Blocos';
import { CampoTexto } from '../../ui/Campos';
import { Tela } from '../../ui/Tela';
import { cor } from '../../ui/tema';
import { useConsulta } from '../../ui/useConsulta';

type Filtro = 'todos' | StatusOrcamento;
const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'pendente', rotulo: 'Pendentes' },
  { valor: 'aprovado', rotulo: 'Aprovados' },
  { valor: 'recusado', rotulo: 'Recusados' },
];

/** Tira acento e caixa para a busca ("joao" acha "João"). */
const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Orcamentos() {
  const params = useLocalSearchParams<{ status?: string }>();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busca, setBusca] = useState('');

  // Vindo do Início ("Pendentes de resposta") com filtro pronto.
  const [statusVisto, setStatusVisto] = useState<string | undefined>(undefined);
  if (params.status !== statusVisto) {
    setStatusVisto(params.status);
    if (params.status && FILTROS.some((f) => f.valor === params.status)) setFiltro(params.status as Filtro);
  }

  const { dados, erro, carregando, atualizando, recarregar } = useConsulta(
    (db) => listarOrcamentos(db, { status: filtro === 'todos' ? undefined : filtro }),
    [filtro]
  );

  const termo = normalizar(busca.trim());
  const lista = (dados ?? []).filter((o) => !termo || normalizar(o.cliente_nome).includes(termo));
  const filtrando = !!termo || filtro !== 'todos';
  const novo = () => router.push('/orcamento/novo');

  return (
    <Tela
      titulo="Orçamentos"
      acao={{ titulo: 'Novo', onPress: novo }}
      comAbas
      refresh={<RefreshControl refreshing={atualizando} onRefresh={recarregar} tintColor={cor.texto2} />}
    >
      <CampoTexto
        rotulo="Buscar por cliente"
        placeholder="Nome do cliente"
        value={busca}
        onChangeText={setBusca}
        returnKeyType="search"
        autoCorrect={false}
      />
      <Chips>
        {FILTROS.map((f) => (
          <Chip key={f.valor} texto={f.rotulo} ativo={filtro === f.valor} onPress={() => setFiltro(f.valor)} />
        ))}
      </Chips>

      {carregando ? <Carregando texto="Carregando orçamentos…" /> : null}
      {erro && !dados ? <ErroCarregar onTentar={recarregar} /> : null}
      {dados && lista.length === 0 ? (
        filtrando ? (
          <EstadoVazio titulo="Nenhum orçamento encontrado" texto="Tente outro nome ou outro filtro." />
        ) : (
          <EstadoVazio
            titulo="Nenhum orçamento ainda"
            texto="Toque em “Novo orçamento” para criar o primeiro."
            acao={{ titulo: 'Novo orçamento', onPress: novo }}
          />
        )
      ) : null}
      {lista.map((o) => (
        <CardOrcamento key={o.id} o={o} />
      ))}
    </Tela>
  );
}
