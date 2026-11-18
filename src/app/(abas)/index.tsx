import { useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { formatarBRL } from '../../lib/dinheiro';
import { carregarDashboard } from '../../repositories/dashboard';
import { CardOrcamento } from '../../features/orcamento/CardOrcamento';
import { Card, Carregando, ErroCarregar, EstadoVazio } from '../../ui/Blocos';
import { Botao } from '../../ui/Botao';
import { Icone } from '../../ui/Icone';
import { Tela } from '../../ui/Tela';
import { Texto } from '../../ui/Texto';
import { cor, gradiente } from '../../ui/tema';
import { useConsulta } from '../../ui/useConsulta';

const MESES = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export default function Inicio() {
  const hoje = new Date();
  const [deslocamento, setDeslocamento] = useState(0); // 0 = mês atual
  const mes = new Date(hoje.getFullYear(), hoje.getMonth() + deslocamento, 15);
  const { dados: d, erro, carregando, atualizando, recarregar } = useConsulta(
    (db) => carregarDashboard(db, mes),
    [deslocamento]
  );

  const novo = () => router.push('/orcamento/novo');

  return (
    <Tela
      titulo="Início"
      logo
      comAbas
      refresh={<RefreshControl refreshing={atualizando} onRefresh={recarregar} tintColor={cor.texto2} />}
    >
      <Texto variante="apoio" style={{ marginTop: -6, marginLeft: 4 }}>
        Pronto para o próximo orçamento?
      </Texto>

      {carregando ? <Carregando /> : null}
      {erro && !d ? <ErroCarregar onTentar={recarregar} /> : null}

      {d ? (
        <>
          <View style={estilos.destaque} accessibilityLabel={`Previsto em ${MESES_LONGOS[mes.getMonth()]}`}>
            <View style={estilos.bolha} />
            <View style={estilos.linhaMes}>
              <Texto variante="legenda" cor={cor.branco} style={{ opacity: 0.9 }}>
                Previsto no mês
              </Texto>
              <View style={estilos.seletorMes}>
                <SetaMes icone="esquerda" rotulo="Mês anterior" onPress={() => setDeslocamento((x) => x - 1)} />
                <Texto variante="corpoForte" cor={cor.branco} style={{ fontSize: 13, minWidth: 64, textAlign: 'center' }}>
                  {MESES[mes.getMonth()]} {mes.getFullYear()}
                </Texto>
                <SetaMes icone="direita" rotulo="Próximo mês" onPress={() => setDeslocamento((x) => x + 1)} />
              </View>
            </View>
            <View>
              <Texto variante="rotulo" cor={cor.branco} style={{ opacity: 0.85 }}>
                Total aprovado
              </Texto>
              <Texto variante="valorGrande" cor={cor.branco} adjustsFontSizeToFit numberOfLines={1}>
                {formatarBRL(d.previstoMes)}
              </Texto>
              <Texto variante="legenda" cor={cor.branco} style={{ opacity: 0.9 }}>
                {d.aprovadosMes === 0
                  ? 'Nenhum orçamento aprovado neste mês'
                  : d.aprovadosMes === 1
                    ? '1 orçamento aprovado'
                    : `${d.aprovadosMes} orçamentos aprovados`}
              </Texto>
            </View>
            <View style={estilos.lucro}>
              <Texto variante="corpo" cor={cor.branco} style={{ fontSize: 13, flex: 1 }}>
                Lucro líquido previsto
              </Texto>
              <Texto variante="corpoForte" cor={cor.branco} style={{ fontSize: 17 }}>
                {formatarBRL(d.lucroPrevistoMes)}
              </Texto>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Card style={{ flex: 1, gap: 6, padding: 14 }}>
              <Texto variante="rotulo">Valor em ferramentas</Texto>
              <Texto variante="valor" adjustsFontSizeToFit numberOfLines={1}>
                {formatarBRL(d.valorFerramentas)}
              </Texto>
            </Card>
            <Card
              style={{ flex: 1, gap: 6, padding: 14, borderColor: 'rgba(255,200,87,0.35)' }}
              onPress={() => router.push({ pathname: '/orcamentos', params: { status: 'pendente' } })}
              rotuloAcessivel={`${d.pendentesQtd} orçamentos pendentes de resposta, ${formatarBRL(d.pendentesValor)}. Toque para ver.`}
            >
              <Texto variante="rotulo">Pendentes de resposta</Texto>
              <Texto variante="valor" cor={cor.amarelo}>
                {d.pendentesQtd}
              </Texto>
              <Texto variante="legenda" numberOfLines={1} adjustsFontSizeToFit>
                {formatarBRL(d.pendentesValor)}
              </Texto>
            </Card>
          </View>

          <Botao titulo="Novo orçamento" icone="mais" grande onPress={novo} />

          <Texto variante="h2" accessibilityRole="header" style={{ marginTop: 4 }}>
            Orçamentos recentes
          </Texto>
          {d.recentes.length === 0 ? (
            <EstadoVazio
              titulo="Nenhum orçamento ainda"
              texto="Comece cadastrando um cliente e um serviço, depois toque em “Novo orçamento”."
              acao={{ titulo: 'Novo orçamento', onPress: novo }}
            />
          ) : (
            d.recentes.map((o) => <CardOrcamento key={o.id} o={o} />)
          )}
        </>
      ) : null}
    </Tela>
  );
}

function SetaMes({ icone, rotulo, onPress }: { icone: 'esquerda' | 'direita'; rotulo: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={rotulo} onPress={onPress} hitSlop={6} style={estilos.seta}>
      <Icone nome={icone} cor={cor.branco} tamanho={18} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  destaque: {
    borderRadius: 32,
    padding: 20,
    gap: 14,
    backgroundImage: gradiente.destaque,
    boxShadow: '0px 18px 40px rgba(232,64,42,0.28)',
    overflow: 'hidden',
  },
  bolha: {
    position: 'absolute',
    right: -40,
    top: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  linhaMes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  seletorMes: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(12,11,10,0.28)',
    borderRadius: 999,
    padding: 2,
  },
  seta: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  lucro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(12,11,10,0.32)',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
});
