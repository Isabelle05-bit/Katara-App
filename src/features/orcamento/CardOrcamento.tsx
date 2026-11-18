import { View } from 'react-native';
import { router } from 'expo-router';
import { formatarData } from '../../lib/datas';
import { formatarBRL } from '../../lib/dinheiro';
import type { OrcamentoResumo } from '../../repositories/orcamentos';
import { Badge, Card } from '../../ui/Blocos';
import { Texto } from '../../ui/Texto';
import { STATUS_ORC } from '../../ui/tema';

export function CardOrcamento({ o }: { o: OrcamentoResumo }) {
  const st = STATUS_ORC[o.status];
  return (
    <Card
      onPress={() => router.push({ pathname: '/orcamento/[id]', params: { id: String(o.id) } })}
      rotuloAcessivel={`Orçamento ${o.id}, ${o.cliente_nome}, ${st.rotulo}, ${formatarBRL(o.total_cliente)}`}
      style={{ gap: 6, padding: 14, paddingHorizontal: 16, minHeight: 76 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Texto variante="corpoForte" style={{ fontSize: 17, flex: 1 }} numberOfLines={1}>
          {o.cliente_nome}
        </Texto>
        <Badge texto={st.rotulo} corTexto={st.cor} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <Texto variante="legenda">
          #{o.id} · {formatarData(o.criado_em)}
        </Texto>
        <Texto variante="valor" style={{ fontSize: 22 }}>
          {formatarBRL(o.total_cliente)}
        </Texto>
      </View>
    </Card>
  );
}
