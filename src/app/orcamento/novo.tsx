import { useEffect, useRef, useState } from 'react';
import { View, type ScrollViewInstance } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import type { ItemReceita } from '../../domain/calculo';
import type { TipoCalculo } from '../../domain/tipos';
import { formatarBRL } from '../../lib/dinheiro';
import { listarClientes, listarFerramentas, listarFuncionarios, listarMateriais, type Cliente } from '../../repositories/cadastros';
import { obterOrcamentoCompleto, salvarOrcamento } from '../../repositories/orcamentos';
import { listarServicos } from '../../repositories/servicos';
import {
  aplicarSugestao,
  calcularDoForm,
  chaveDaSugestao,
  erroDoPasso,
  formDeOrcamento,
  formVazio,
  paraInput,
  PASSOS,
  type FormOrcamento,
} from '../../features/orcamento/formulario';
import {
  PassoCliente,
  PassoEquipe,
  PassoFechamento,
  PassoFerramentas,
  PassoMateriais,
  PassoServicos,
  type Catalogo,
} from '../../features/orcamento/Passos';
import { Aviso, Carregando, ErroCarregar } from '../../ui/Blocos';
import { Botao } from '../../ui/Botao';
import { useFeedback } from '../../ui/Feedback';
import { Tela } from '../../ui/Tela';
import { Texto } from '../../ui/Texto';
import { cor, gradiente } from '../../ui/tema';
import { useConsulta } from '../../ui/useConsulta';

async function carregarCatalogo(db: SQLiteDatabase): Promise<Catalogo> {
  const [clientes, servicos, materiais, ferramentas, funcionarios, receita] = await Promise.all([
    listarClientes(db),
    listarServicos(db),
    listarMateriais(db),
    listarFerramentas(db),
    listarFuncionarios(db),
    db.getAllAsync<{ servico_id: number; material_id: number; tipo_calculo: TipoCalculo; consumo: number }>(
      `SELECT sm.servico_id, sm.material_id, sm.tipo_calculo, sm.consumo
         FROM servico_materiais sm JOIN materiais m ON m.id = sm.material_id
        WHERE m.arquivado = 0`
    ),
  ]);
  const receitas = new Map<number, ItemReceita[]>();
  for (const r of receita) {
    const lista = receitas.get(r.servico_id) ?? [];
    lista.push({ materialId: r.material_id, tipoCalculo: r.tipo_calculo, consumo: r.consumo });
    receitas.set(r.servico_id, lista);
  }
  return { clientes, servicos, materiais, ferramentas, funcionarios, receitas };
}

export default function FormularioOrcamento() {
  const params = useLocalSearchParams<{ editar?: string; duplicar?: string }>();
  const editarId = params.editar ? Number(params.editar) : undefined;
  const baseId = editarId ?? (params.duplicar ? Number(params.duplicar) : undefined);

  const db = useSQLiteContext();
  const { avisar, confirmar } = useFeedback();
  const rolagem = useRef<ScrollViewInstance>(null);

  // Catálogo recarrega ao voltar de um cadastro feito no meio do fluxo.
  const { dados: catalogoBanco, erro, recarregar } = useConsulta(carregarCatalogo);
  const [clientesNovos, setClientesNovos] = useState<Cliente[]>([]);
  const catalogo: Catalogo | undefined = catalogoBanco && {
    ...catalogoBanco,
    clientes: [...catalogoBanco.clientes, ...clientesNovos.filter((c) => !catalogoBanco.clientes.some((x) => x.id === c.id))],
  };

  const [form, setForm] = useState<FormOrcamento | null>(null);
  const [passo, setPasso] = useState(0);
  const [erroPasso, setErroPasso] = useState<string | null>(null);

  // Formulário inicial: uma vez só (recarregar o catálogo não apaga o que foi digitado).
  useEffect(() => {
    if (form) return;
    (async () => {
      try {
        if (baseId === undefined) return setForm(formVazio());
        const o = await obterOrcamentoCompleto(db, baseId);
        if (!o) throw new Error('Orçamento não encontrado.');
        const f = formDeOrcamento(o);
        // Duplicar: novo orçamento pendente, com validade nova.
        setForm(editarId ? f : { ...f, validade: formVazio().validade });
      } catch (e) {
        avisar(e, 'erro');
        router.back();
      }
    })();
  }, [baseId, db, editarId, form, avisar]);

  const set = (mudanca: Partial<FormOrcamento>) => {
    setErroPasso(null);
    setForm((f) => (f ? { ...f, ...mudanca } : f));
  };

  const titulo = editarId ? `Editar orçamento #${editarId}` : params.duplicar ? 'Duplicar orçamento' : 'Novo orçamento';

  if (erro && !catalogo) {
    return (
      <Tela titulo={titulo} voltar>
        <ErroCarregar onTentar={recarregar} />
      </Tela>
    );
  }
  if (!form || !catalogo) {
    return (
      <Tela titulo={titulo} voltar>
        <Carregando />
      </Tela>
    );
  }

  const calculo = calcularDoForm(form);
  const ultimo = passo === PASSOS.length - 1;

  const irPara = (novo: number) => {
    setPasso(novo);
    setErroPasso(null);
    rolagem.current?.scrollTo({ y: 0, animated: false });
  };

  const avancar = async () => {
    const problema = erroDoPasso(passo, form);
    if (problema) {
      setErroPasso(problema);
      avisar(problema, 'erro');
      return;
    }
    if (passo === 1 && chaveDaSugestao(form.servicos) !== form.chaveSugestao) {
      const catalogoMateriais = new Map(catalogo.materiais.map((m) => [m.id, { nome: m.nome, unidade: m.unidade, preco: m.preco }]));
      setForm(aplicarSugestao(form, catalogo.receitas, catalogoMateriais));
    }
    if (!ultimo) return irPara(passo + 1);

    try {
      const id = await salvarOrcamento(db, paraInput(form), editarId);
      avisar(editarId ? 'Alterações salvas.' : 'Orçamento salvo como pendente.');
      if (editarId) router.back();
      else router.replace({ pathname: '/orcamento/[id]', params: { id: String(id) } });
    } catch (e) {
      avisar(e, 'erro');
    }
  };

  const voltar = async () => {
    if (passo > 0) return irPara(passo - 1);
    const sair = await confirmar({
      titulo: editarId ? 'Sair sem salvar?' : 'Descartar este orçamento?',
      texto: 'O que você preencheu até aqui será perdido.',
      botao: 'Sair sem salvar',
      perigo: true,
    });
    if (sair) router.back();
  };

  const props = { form, set, catalogo };

  return (
    <Tela
      titulo={titulo}
      voltar
      refRolagem={rolagem}
      rodape={
        <>
          <View style={{ flexDirection: 'row', gap: 8 }} accessibilityLabel="Resumo em tempo real">
            <Resumo rotulo="Total cliente" valor={formatarBRL(calculo.totalCliente)} />
            <Resumo rotulo="Custos" valor={formatarBRL(calculo.custoMaterial + calculo.custoFerramenta + calculo.custoEquipe)} />
            <Resumo rotulo="Lucro líquido" valor={formatarBRL(calculo.lucro)} cor={calculo.lucro >= 0 ? cor.verde : cor.erro} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Botao titulo={passo === 0 ? 'Cancelar' : 'Voltar'} variante="secundario" onPress={voltar} style={{ flex: 1 }} />
            <Botao titulo={ultimo ? 'Salvar orçamento' : 'Continuar'} onPress={avancar} style={{ flex: 2 }} />
          </View>
        </>
      }
    >
      <View style={{ gap: 8 }}>
        <Texto variante="rotulo">{PASSOS[passo].rotulo}</Texto>
        <Texto variante="tituloMenor" style={{ fontSize: 28 }} accessibilityRole="header">
          {PASSOS[passo].titulo}
        </Texto>
        <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`Passo ${passo + 1} de ${PASSOS.length}`}>
          {PASSOS.map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                backgroundColor: i < passo ? cor.texto2 : 'rgba(255,255,255,0.12)',
                backgroundImage: i === passo ? gradiente.acao : undefined,
              }}
            />
          ))}
        </View>
      </View>

      {erroPasso ? <Aviso tipo="erro" texto={erroPasso} /> : null}

      {passo === 0 ? <PassoCliente {...props} onNovoCliente={(c) => setClientesNovos((l) => [...l, c])} /> : null}
      {passo === 1 ? <PassoServicos {...props} /> : null}
      {passo === 2 ? <PassoMateriais {...props} /> : null}
      {passo === 3 ? <PassoFerramentas {...props} /> : null}
      {passo === 4 ? <PassoEquipe {...props} /> : null}
      {passo === 5 ? <PassoFechamento {...props} calculo={calculo} /> : null}
    </Tela>
  );
}

function Resumo({ rotulo, valor, cor: corValor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Texto variante="rotulo" style={{ fontSize: 11 }} numberOfLines={1}>
        {rotulo}
      </Texto>
      <Texto variante="valor" style={{ fontSize: 18 }} cor={corValor} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Texto>
    </View>
  );
}
