import { useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import { STATUS_ATENDIMENTO, type StatusAtendimento } from '../../domain/tipos';
import { formatarData } from '../../lib/datas';
import { listarAtendimentos } from '../../repositories/atendimentos';
import { Badge, Card, Carregando, Chip, Chips, ErroCarregar, EstadoVazio } from '../../ui/Blocos';
import { Tela } from '../../ui/Tela';
import { Texto } from '../../ui/Texto';
import { cor, STATUS_ATEND } from '../../ui/tema';
import { useConsulta } from '../../ui/useConsulta';

type Filtro = 'todos' | StatusAtendimento;

export default function Atendimentos() {
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const { dados, erro, carregando, atualizando, recarregar } = useConsulta(
    (db) => listarAtendimentos(db, { status: filtro === 'todos' ? undefined : filtro }),
    [filtro]
  );

  return (
    <Tela
      titulo="Atendimentos"
      comAbas
      refresh={<RefreshControl refreshing={atualizando} onRefresh={recarregar} tintColor={cor.texto2} />}
    >
      <Chips>
        <Chip texto="Todos" ativo={filtro === 'todos'} onPress={() => setFiltro('todos')} />
        {STATUS_ATENDIMENTO.map((s) => (
          <Chip key={s} texto={STATUS_ATEND[s].rotulo} ativo={filtro === s} onPress={() => setFiltro(s)} />
        ))}
      </Chips>

      {carregando ? <Carregando texto="Carregando atendimentos…" /> : null}
      {erro && !dados ? <ErroCarregar onTentar={recarregar} /> : null}
      {dados && dados.length === 0 ? (
        <EstadoVazio
          icone="atendimentos"
          titulo={filtro === 'todos' ? 'Nenhum atendimento ainda' : 'Nenhum atendimento aqui'}
          texto="Quando você aprovar um orçamento, o atendimento aparece nesta lista para ser agendado."
        />
      ) : null}

      {dados?.map((a) => {
        const st = STATUS_ATEND[a.status];
        return (
          <Card
            key={a.id}
            onPress={() => router.push({ pathname: '/atendimento/[id]', params: { id: String(a.id) } })}
            rotuloAcessivel={`${a.cliente_nome}, ${st.rotulo}, ${a.data_agendada ? 'agendado para ' + formatarData(a.data_agendada) : 'sem data marcada'}`}
            style={{ gap: 6, padding: 14, paddingHorizontal: 16, minHeight: 84 }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Texto variante="corpoForte" style={{ fontSize: 17, flex: 1 }} numberOfLines={1}>
                {a.cliente_nome}
              </Texto>
              <Badge texto={st.rotulo} corTexto={st.cor} />
            </View>
            <Texto variante="legenda">
              Orçamento #{a.orcamento_id}
              {a.cliente_cidade ? ` · ${a.cliente_cidade}` : ''}
            </Texto>
            <Texto variante="corpoForte" style={{ fontSize: 14 }} cor={a.data_agendada ? cor.texto : cor.amarelo}>
              {a.data_agendada ? `Agendado para ${formatarData(a.data_agendada)}` : 'Sem data marcada'}
            </Texto>
          </Card>
        );
      })}
    </Tela>
  );
}
