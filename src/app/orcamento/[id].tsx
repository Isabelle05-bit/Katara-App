import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { totalLinhaFuncionario, totalLinhaMaterial, totalLinhaServico } from '../../domain/calculo';
import type { ModoCobranca, StatusOrcamento } from '../../domain/tipos';
import { formatarData } from '../../lib/datas';
import { formatarBRL } from '../../lib/dinheiro';
import { decimalParaTexto } from '../../lib/entrada';
import { gerarECompartilharPdf } from '../../pdf/gerarPdf';
import { carregarLogoDataUri } from '../../pdf/logo';
import { arquivarOrcamento, mudarStatusOrcamento, obterOrcamentoCompleto } from '../../repositories/orcamentos';
import { Aviso, Badge, Card, Carregando, ErroCarregar, LinhaValor, Secao, Segmentado } from '../../ui/Blocos';
import { Botao } from '../../ui/Botao';
import { useFeedback } from '../../ui/Feedback';
import { Tela } from '../../ui/Tela';
import { Texto } from '../../ui/Texto';
import { cor, STATUS_ATEND, STATUS_ORC } from '../../ui/tema';
import { useConsulta } from '../../ui/useConsulta';

const MODO: Record<ModoCobranca, { rotulo: string; cor: string }> = {
  cobrado: { rotulo: 'Cobrado', cor: cor.verde },
  informado: { rotulo: 'Só informado', cor: cor.azulClaro },
  oculto: { rotulo: 'Oculto ao cliente', cor: cor.cinza },
};

const OPCOES_STATUS = [
  { valor: 'pendente', rotulo: 'Pendente' },
  { valor: 'aprovado', rotulo: 'Aprovado' },
  { valor: 'recusado', rotulo: 'Recusado' },
] as const;

export default function DetalheOrcamento() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const db = useSQLiteContext();
  const { avisar, confirmar } = useFeedback();
  const { dados: o, erro, carregando, recarregar } = useConsulta((db) => obterOrcamentoCompleto(db, id), [id]);

  if (carregando) {
    return (
      <Tela titulo={`Orçamento #${id}`} voltar>
        <Carregando />
      </Tela>
    );
  }
  if (erro || !o) {
    return (
      <Tela titulo={`Orçamento #${id}`} voltar>
        {erro ? <ErroCarregar onTentar={recarregar} /> : <Aviso tipo="erro" texto="Este orçamento não existe mais." />}
      </Tela>
    );
  }

  const st = STATUS_ORC[o.status];
  const c = o.calculo;
  const atendimentoIniciado = o.status === 'aprovado' && !!o.atendimento && o.atendimento.status !== 'aguardando_agendamento';

  const mudarStatus = async (novo: StatusOrcamento) => {
    if (novo === o.status) return;
    if (atendimentoIniciado) {
      avisar(
        `Este orçamento já tem atendimento "${STATUS_ATEND[o.atendimento!.status].rotulo}". ` +
          'Não dá para mudar o status. Volte o atendimento para "Aguardando agendamento" primeiro.',
        'erro'
      );
      return;
    }
    const efeito =
      novo === 'aprovado'
        ? { titulo: 'Aprovar orçamento?', texto: 'Um atendimento será criado em “Aguardando agendamento” para você marcar a data.', botao: 'Aprovar' }
        : o.status === 'aprovado'
          ? {
              titulo: novo === 'recusado' ? 'Recusar orçamento?' : 'Voltar para pendente?',
              texto: 'O atendimento que foi criado na aprovação será apagado.',
              botao: novo === 'recusado' ? 'Recusar' : 'Voltar para pendente',
              perigo: true,
            }
          : null;
    if (efeito && !(await confirmar(efeito))) return;
    try {
      await mudarStatusOrcamento(db, id, novo);
      avisar(novo === 'aprovado' ? 'Aprovado. Atendimento criado.' : `Status: ${STATUS_ORC[novo].rotulo}`);
      recarregar();
    } catch (e) {
      avisar(e, 'erro');
    }
  };

  const pdf = async (versao: 'cliente' | 'interno') => {
    try {
      const logoDataUri = await carregarLogoDataUri();
      await gerarECompartilharPdf(o, { versao, logoDataUri });
    } catch (e) {
      avisar(e, 'erro');
    }
  };

  const arquivar = async () => {
    if (o.arquivado) {
      await arquivarOrcamento(db, id, false);
      avisar('Orçamento voltou para as listas.');
      recarregar();
      return;
    }
    const ok = await confirmar({
      titulo: `Arquivar orçamento #${id}?`,
      texto: 'Ele some das listas, mas nada é excluído. Você pode desarquivar depois.',
      botao: 'Arquivar',
      perigo: true,
    });
    if (!ok) return;
    try {
      await arquivarOrcamento(db, id, true);
      avisar('Orçamento arquivado.');
      router.back();
    } catch (e) {
      avisar(e, 'erro');
    }
  };

  const contato = [o.cliente.telefone, o.cliente.cidade].filter(Boolean).join(' · ');

  return (
    <Tela titulo={`Orçamento #${id}`} voltar>
      <Card style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Texto variante="valor" style={{ fontSize: 26, lineHeight: 30, flex: 1 }}>
            {o.cliente.nome}
          </Texto>
          <Badge texto={st.rotulo} corTexto={st.cor} />
        </View>
        {contato ? <Texto variante="apoio">{contato}</Texto> : null}
        <Texto variante="legenda" cor={cor.texto3}>
          Criado em {formatarData(o.criado_em)}
          {o.validade ? ` · válido até ${formatarData(o.validade)}` : ''}
        </Texto>
        {o.arquivado ? <Badge texto="Arquivado" corTexto={cor.cinza} /> : null}
      </Card>

      <Secao titulo="Status">
        <Segmentado rotulo="Status do orçamento" opcoes={OPCOES_STATUS} valor={o.status} onChange={mudarStatus} />
        {atendimentoIniciado ? (
          <Aviso texto="Este orçamento não pode voltar para pendente nem ser recusado: o atendimento já saiu de “Aguardando agendamento”." />
        ) : null}
        {o.atendimento ? (
          <Botao
            titulo={`Atendimento: ${STATUS_ATEND[o.atendimento.status].rotulo}`}
            variante="secundario"
            icone="atendimentos"
            onPress={() => router.push({ pathname: '/atendimento/[id]', params: { id: String(o.atendimento!.id) } })}
          />
        ) : null}
      </Secao>

      <Secao titulo="Serviços">
        {o.servicos.map((s, i) => (
          <LinhaValor
            key={s.servico_id}
            rotulo={s.nome}
            detalhe={`${decimalParaTexto(s.metros_quadrados)} m² × ${formatarBRL(s.preco_m2_no_momento)}`}
            valor={formatarBRL(totalLinhaServico({ metrosQuadrados: s.metros_quadrados, precoM2: s.preco_m2_no_momento }))}
            divisoria={i > 0}
          />
        ))}
      </Secao>

      {o.materiais.length > 0 ? (
        <Secao titulo="Materiais" acao={<Badge texto={MODO[o.materiais_modo].rotulo} corTexto={MODO[o.materiais_modo].cor} />}>
          {o.materiais.map((m, i) => (
            <LinhaValor
              key={m.material_id}
              rotulo={m.nome}
              detalhe={`${m.quantidade} ${m.unidade} × ${formatarBRL(m.preco_no_momento)}`}
              valor={formatarBRL(totalLinhaMaterial({ quantidade: m.quantidade, preco: m.preco_no_momento }))}
              divisoria={i > 0}
            />
          ))}
        </Secao>
      ) : null}

      {o.ferramentas.length > 0 ? (
        <Secao titulo="Ferramentas" acao={<Badge texto={MODO[o.ferramentas_modo].rotulo} corTexto={MODO[o.ferramentas_modo].cor} />}>
          {o.ferramentas.map((f, i) => (
            <LinhaValor key={f.ferramenta_id} rotulo={f.nome} valor={formatarBRL(f.preco_no_momento)} divisoria={i > 0} />
          ))}
        </Secao>
      ) : null}

      {o.funcionarios.length > 0 ? (
        <Secao titulo="Equipe">
          {o.funcionarios.map((f, i) => (
            <LinhaValor
              key={f.funcionario_id}
              rotulo={f.nome}
              detalhe={`${f.dias} ${f.dias === 1 ? 'dia' : 'dias'} × ${formatarBRL(f.diaria_no_momento)}`}
              valor={formatarBRL(totalLinhaFuncionario({ diaria: f.diaria_no_momento, dias: f.dias }))}
              divisoria={i > 0}
            />
          ))}
        </Secao>
      ) : null}

      <Secao titulo="Resumo do cliente">
        <LinhaValor rotulo="Subtotal dos serviços" valor={formatarBRL(c.subtotalServicos)} />
        {c.materiaisCobrados > 0 ? <LinhaValor rotulo="Materiais" valor={formatarBRL(c.materiaisCobrados)} /> : null}
        {c.ferramentasCobradas > 0 ? <LinhaValor rotulo="Ferramentas" valor={formatarBRL(c.ferramentasCobradas)} /> : null}
        {c.desconto > 0 ? (
          <LinhaValor
            rotulo={`Desconto (${decimalParaTexto(o.desconto_pct)}%)`}
            detalhe={o.desconto_base === 'servicos' ? 'Só sobre os serviços' : 'Sobre o total'}
            valor={`− ${formatarBRL(c.desconto)}`}
            corValor={cor.erro}
          />
        ) : null}
        <LinhaValor rotulo="Total" valor={formatarBRL(c.totalCliente)} destaque divisoria />
      </Secao>

      <Secao titulo="Custos e lucro (só você vê)">
        <LinhaValor rotulo="Materiais" valor={formatarBRL(c.custoMaterial)} />
        <LinhaValor rotulo="Ferramentas" valor={formatarBRL(c.custoFerramenta)} />
        <LinhaValor rotulo="Equipe" valor={formatarBRL(c.custoEquipe)} />
        <LinhaValor
          rotulo="Lucro líquido"
          valor={formatarBRL(c.lucro)}
          corValor={c.lucro >= 0 ? cor.verde : cor.erro}
          destaque
          divisoria
        />
        {c.lucro < 0 ? <Aviso tipo="erro" texto="Atenção: com estes valores você tem prejuízo." /> : null}
      </Secao>

      {o.observacoes ? (
        <Secao titulo="Observações">
          <Texto variante="apoio">{o.observacoes}</Texto>
        </Secao>
      ) : null}

      <Botao titulo="Enviar PDF do cliente" icone="compartilhar" onPress={() => pdf('cliente')} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Botao titulo="PDF interno" icone="pdf" variante="secundario" onPress={() => pdf('interno')} style={{ flex: 1 }} />
        <Botao
          titulo="Editar"
          icone="editar"
          variante="secundario"
          onPress={() => router.push({ pathname: '/orcamento/novo', params: { editar: String(id) } })}
          style={{ flex: 1 }}
        />
      </View>
      <Botao
        titulo="Duplicar como novo"
        icone="duplicar"
        variante="secundario"
        onPress={() => router.push({ pathname: '/orcamento/novo', params: { duplicar: String(id) } })}
      />
      <Botao
        titulo={o.arquivado ? 'Desarquivar orçamento' : 'Arquivar orçamento'}
        icone="arquivar"
        variante="perigo"
        onPress={arquivar}
      />
    </Tela>
  );
}
