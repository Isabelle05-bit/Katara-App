import { View } from 'react-native';
import { router } from 'expo-router';
import { ENTIDADES, type Entidade } from '../../features/cadastros/entidades';
import { Card, ErroCarregar } from '../../ui/Blocos';
import { Icone } from '../../ui/Icone';
import { Tela } from '../../ui/Tela';
import { Texto } from '../../ui/Texto';
import { cor } from '../../ui/tema';
import { useConsulta } from '../../ui/useConsulta';

export default function Cadastros() {
  const { dados, erro, recarregar } = useConsulta(async (db) => {
    const r = await db.getFirstAsync<Record<Entidade, number>>(
      `SELECT (SELECT COUNT(*) FROM clientes WHERE arquivado = 0) clientes,
              (SELECT COUNT(*) FROM funcionarios WHERE arquivado = 0) funcionarios,
              (SELECT COUNT(*) FROM materiais WHERE arquivado = 0) materiais,
              (SELECT COUNT(*) FROM servicos WHERE arquivado = 0) servicos,
              (SELECT COUNT(*) FROM ferramentas WHERE arquivado = 0) ferramentas`
    );
    return r;
  });

  return (
    <Tela titulo="Cadastros" comAbas>
      {erro && !dados ? <ErroCarregar onTentar={recarregar} /> : null}
      {(Object.keys(ENTIDADES) as Entidade[]).map((e) => {
        const info = ENTIDADES[e];
        const qtd = dados?.[e];
        return (
          <Card
            key={e}
            onPress={() => router.push({ pathname: '/cadastros/[entidade]', params: { entidade: e } })}
            rotuloAcessivel={`${info.rotulo}${qtd !== undefined ? `, ${qtd} cadastrados` : ''}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, paddingVertical: 14 }}
          >
            <Icone nome={info.icone} cor={cor.acaoInicio} tamanho={26} />
            <Texto variante="tituloMenor" style={{ flex: 1, fontSize: 22 }}>
              {info.rotulo}
            </Texto>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {qtd !== undefined ? <Texto variante="apoio">{qtd}</Texto> : null}
              <Icone nome="direita" cor={cor.texto2} tamanho={20} />
            </View>
          </Card>
        );
      })}
      <Texto variante="legenda" cor={cor.texto3} style={{ textAlign: 'center', marginTop: 4 }}>
        Itens arquivados somem das listas, mas os orçamentos antigos continuam iguais.
      </Texto>
    </Tela>
  );
}
