import { useState } from 'react';
import { RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { formatarBRL } from '../../lib/dinheiro';
import { listarClientes, listarFerramentas, listarFuncionarios, listarMateriais } from '../../repositories/cadastros';
import { listarServicos } from '../../repositories/servicos';
import { ehEntidade, ENTIDADES, type Entidade } from '../../features/cadastros/entidades';
import { Aviso, Card, Carregando, ErroCarregar, EstadoVazio } from '../../ui/Blocos';
import { CampoTexto } from '../../ui/Campos';
import { Tela } from '../../ui/Tela';
import { Texto } from '../../ui/Texto';
import { cor } from '../../ui/tema';
import { useConsulta } from '../../ui/useConsulta';
import type { SQLiteDatabase } from 'expo-sqlite';

const STATUS_FUNC = { ativo: 'Ativo', inativo: 'Inativo', ferias: 'Férias' } as const;

interface Item {
  id: number;
  titulo: string;
  detalhe: string;
}

async function carregarItens(db: SQLiteDatabase, e: Entidade): Promise<Item[]> {
  switch (e) {
    case 'clientes':
      return (await listarClientes(db)).map((c) => ({ id: c.id, titulo: c.nome, detalhe: [c.cidade, c.telefone].filter(Boolean).join(' · ') }));
    case 'funcionarios':
      return (await listarFuncionarios(db)).map((f) => ({ id: f.id, titulo: f.nome, detalhe: `${formatarBRL(f.diaria)} por dia · ${STATUS_FUNC[f.status]}` }));
    case 'materiais':
      return (await listarMateriais(db)).map((m) => ({
        id: m.id,
        titulo: m.nome,
        detalhe: [`${formatarBRL(m.preco)} / ${m.unidade}`, m.categoria, m.loja].filter(Boolean).join(' · '),
      }));
    case 'servicos':
      return (await listarServicos(db)).map((s) => ({ id: s.id, titulo: s.nome, detalhe: `${formatarBRL(s.preco_m2)} por m²` }));
    case 'ferramentas':
      return (await listarFerramentas(db)).map((f) => ({ id: f.id, titulo: f.nome, detalhe: `Valor de compra ${formatarBRL(f.valor_compra)}` }));
  }
}

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function ListaCadastro() {
  const { entidade } = useLocalSearchParams<{ entidade: string }>();
  const valida = ehEntidade(entidade);
  const e: Entidade = valida ? entidade : 'clientes';
  const info = ENTIDADES[e];
  const [busca, setBusca] = useState('');
  const { dados, erro, carregando, atualizando, recarregar } = useConsulta((db) => carregarItens(db, e), [e]);

  const novo = () => router.push({ pathname: '/cadastros/[entidade]/[id]', params: { entidade: e, id: 'novo' } });
  const termo = normalizar(busca.trim());
  const lista = (dados ?? []).filter((i) => !termo || normalizar(i.titulo).includes(termo));

  if (!valida) {
    return (
      <Tela titulo="Cadastros" voltar>
        <Aviso tipo="erro" texto="Cadastro não encontrado." />
      </Tela>
    );
  }

  return (
    <Tela
      titulo={info.rotulo}
      voltar
      acao={{ titulo: 'Novo', onPress: novo }}
      refresh={<RefreshControl refreshing={atualizando} onRefresh={recarregar} tintColor={cor.texto2} />}
    >
      {(dados?.length ?? 0) > 5 ? (
        <CampoTexto rotulo="Buscar" placeholder={`Nome do ${info.um}`} value={busca} onChangeText={setBusca} autoCorrect={false} />
      ) : null}

      {carregando ? <Carregando /> : null}
      {erro && !dados ? <ErroCarregar onTentar={recarregar} /> : null}
      {dados && dados.length === 0 ? (
        <EstadoVazio icone={info.icone} titulo={info.vazio} texto={`Toque em “Novo” para cadastrar o primeiro ${info.um}.`} acao={{ titulo: `Cadastrar ${info.um}`, onPress: novo }} />
      ) : null}
      {dados && dados.length > 0 && lista.length === 0 ? (
        <EstadoVazio icone="buscar" titulo="Nada encontrado" texto="Tente outro nome." />
      ) : null}

      {lista.map((i) => (
        <Card
          key={i.id}
          onPress={() => router.push({ pathname: '/cadastros/[entidade]/[id]', params: { entidade: e, id: String(i.id) } })}
          rotuloAcessivel={`${i.titulo}. ${i.detalhe}. Toque para editar.`}
          style={{ gap: 4, minHeight: 68, paddingVertical: 14 }}
        >
          <Texto variante="corpoForte" style={{ fontSize: 17 }}>
            {i.titulo}
          </Texto>
          {i.detalhe ? <Texto variante="legenda">{i.detalhe}</Texto> : null}
        </Card>
      ))}
    </Tela>
  );
}
