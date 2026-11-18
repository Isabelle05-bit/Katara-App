import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { STATUS_ATENDIMENTO, type StatusAtendimento } from '../../domain/tipos';
import { formatarData } from '../../lib/datas';
import { formatarBRL } from '../../lib/dinheiro';
import {
  agendarAtendimento,
  arquivarAtendimento,
  equipeDoAtendimento,
  mudarStatusAtendimento,
  obterAtendimento,
} from '../../repositories/atendimentos';
import { obterOrcamentoCompleto } from '../../repositories/orcamentos';
import { Aviso, Badge, Card, Carregando, ErroCarregar, Secao, Segmentado } from '../../ui/Blocos';
import { Botao } from '../../ui/Botao';
import { CampoData } from '../../ui/Campos';
import { useFeedback } from '../../ui/Feedback';
import { Tela } from '../../ui/Tela';
import { Texto } from '../../ui/Texto';
import { cor, STATUS_ATEND } from '../../ui/tema';
import { useConsulta } from '../../ui/useConsulta';

const OPCOES = STATUS_ATENDIMENTO.map((s) => ({ valor: s, rotulo: STATUS_ATEND[s].rotulo }));

export default function DetalheAtendimento() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const db = useSQLiteContext();
  const { avisar, confirmar } = useFeedback();

  const { dados, erro, carregando, recarregar } = useConsulta(
    async (db) => {
      const a = await obterAtendimento(db, id);
      if (!a) return null;
      const [orcamento, equipe] = await Promise.all([obterOrcamentoCompleto(db, a.orcamento_id), equipeDoAtendimento(db, id)]);
      return { a, orcamento: orcamento!, equipe };
    },
    [id]
  );

  if (carregando) {
    return (
      <Tela titulo="Atendimento" voltar>
        <Carregando />
      </Tela>
    );
  }
  if (erro || !dados) {
    return (
      <Tela titulo="Atendimento" voltar>
        {erro ? (
          <ErroCarregar onTentar={recarregar} />
        ) : (
          <Aviso tipo="erro" texto="Este atendimento não existe mais (o orçamento pode ter voltado para pendente ou sido recusado)." />
        )}
      </Tela>
    );
  }

  const { a, orcamento: o, equipe } = dados;
  const st = STATUS_ATEND[a.status];

  const agendar = async (data: string | null) => {
    try {
      await agendarAtendimento(db, id, data);
      avisar(data ? `Agendado para ${formatarData(data)}.` : 'Data removida.');
      recarregar();
    } catch (e) {
      avisar(e, 'erro');
    }
  };

  const mudarStatus = async (novo: StatusAtendimento) => {
    if (novo === a.status) return;
    try {
      await mudarStatusAtendimento(db, id, novo);
      avisar(`Status: ${STATUS_ATEND[novo].rotulo}`);
      recarregar();
    } catch (e) {
      avisar(e, 'erro');
    }
  };

  const arquivar = async () => {
    if (a.arquivado) {
      await arquivarAtendimento(db, id, false);
      avisar('Atendimento voltou para a lista.');
      recarregar();
      return;
    }
    const ok = await confirmar({
      titulo: `Arquivar atendimento de ${o.cliente.nome}?`,
      texto: 'Ele some da lista, mas nada é excluído. O orçamento continua aprovado.',
      botao: 'Arquivar',
      perigo: true,
    });
    if (!ok) return;
    try {
      await arquivarAtendimento(db, id, true);
      avisar('Atendimento arquivado.');
      router.back();
    } catch (e) {
      avisar(e, 'erro');
    }
  };

  const endereco = [o.cliente.endereco, o.cliente.cidade].filter(Boolean).join(' · ');

  return (
    <Tela titulo="Atendimento" voltar>
      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Texto variante="valor" style={{ fontSize: 26, lineHeight: 30, flex: 1 }}>
            {o.cliente.nome}
          </Texto>
          <Badge texto={st.rotulo} corTexto={st.cor} />
        </View>
        <Texto variante="apoio">{o.servicos.map((s) => s.nome).join(', ')}</Texto>
        {o.cliente.telefone ? <Texto variante="apoio">{o.cliente.telefone}</Texto> : null}
        {endereco ? <Texto variante="legenda">{endereco}</Texto> : null}
        <Botao
          titulo={`Ver orçamento #${o.id} · ${formatarBRL(o.total_cliente)}`}
          variante="secundario"
          icone="orcamentos"
          onPress={() => router.push({ pathname: '/orcamento/[id]', params: { id: String(o.id) } })}
        />
      </Card>

      <Secao titulo="Agendamento">
        <CampoData rotulo={a.data_agendada ? 'Data marcada (toque para reagendar)' : 'Data do serviço'} valor={a.data_agendada} onChange={agendar} />
        {a.data_agendada ? (
          <Botao titulo="Remover data" variante="contorno" onPress={() => agendar(null)} />
        ) : (
          <Texto variante="legenda" cor={cor.amarelo}>
            Ainda sem data. Combine com o cliente e marque aqui.
          </Texto>
        )}
      </Secao>

      <Secao titulo="Status">
        <Segmentado rotulo="Status do atendimento" vertical opcoes={OPCOES} valor={a.status} onChange={mudarStatus} />
        {a.status !== 'aguardando_agendamento' ? (
          <Texto variante="legenda">
            Enquanto o atendimento não estiver em “Aguardando agendamento”, o orçamento não pode voltar para pendente.
          </Texto>
        ) : null}
      </Secao>

      <Secao titulo="Funcionários">
        {equipe.length === 0 ? (
          <Texto variante="apoio">Nenhum funcionário no orçamento. Para incluir, edite o orçamento no passo Equipe.</Texto>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {equipe.map((f) => (
              <View
                key={f.funcionario_id}
                style={{ backgroundColor: cor.superficie2, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: cor.bordaForte }}
              >
                <Texto variante="corpoForte" style={{ fontSize: 14 }}>
                  {f.nome} · {f.dias} {f.dias === 1 ? 'dia' : 'dias'}
                </Texto>
              </View>
            ))}
          </View>
        )}
      </Secao>

      <Botao
        titulo={a.arquivado ? 'Desarquivar atendimento' : 'Arquivar atendimento'}
        icone="arquivar"
        variante="perigo"
        onPress={arquivar}
      />
    </Tela>
  );
}
