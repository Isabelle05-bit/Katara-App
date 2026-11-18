import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { listarMateriais } from '../../../repositories/cadastros';
import { listarReceita } from '../../../repositories/servicos';
import { CONFIG, type Campo } from '../../../features/cadastros/config';
import { EditorReceita } from '../../../features/cadastros/EditorReceita';
import { ehEntidade, ENTIDADES } from '../../../features/cadastros/entidades';
import { erroDaReceita, salvarReceita, type LinhaReceitaForm } from '../../../features/cadastros/receita';
import type { TipoCalculo } from '../../../domain/tipos';
import { Aviso, Card, Carregando, Segmentado } from '../../../ui/Blocos';
import { Botao } from '../../../ui/Botao';
import { CampoDinheiro, CampoTexto, Rotulado } from '../../../ui/Campos';
import { useFeedback } from '../../../ui/Feedback';
import { Tela } from '../../../ui/Tela';
import { useConsulta } from '../../../ui/useConsulta';

type Valores = Record<string, unknown>;
type Salva = { materialId: number; tipoCalculo: TipoCalculo; consumo: number };

const OPCOES_STATUS = [
  { valor: 'ativo', rotulo: 'Ativo' },
  { valor: 'inativo', rotulo: 'Inativo' },
  { valor: 'ferias', rotulo: 'Férias' },
] as const;

export default function FormularioCadastro() {
  const { entidade, id: idParam } = useLocalSearchParams<{ entidade: string; id: string }>();
  const e = ehEntidade(entidade) ? entidade : 'clientes';
  const cfg = CONFIG[e];
  const info = ENTIDADES[e];
  const id = idParam && idParam !== 'novo' ? Number(idParam) : undefined;
  const ehServico = e === 'servicos';

  const db = useSQLiteContext();
  const { avisar, confirmar } = useFeedback();
  const [carregado, setCarregado] = useState(id === undefined);
  const [receita, setReceita] = useState<LinhaReceitaForm[]>([]);
  const [receitaSalva, setReceitaSalva] = useState<Salva[]>([]);
  const [arquivado, setArquivado] = useState(false);
  const { dados: materiais } = useConsulta((db) => (ehServico ? listarMateriais(db) : Promise.resolve([])), [ehServico]);

  const { control, handleSubmit, reset, formState } = useForm<Valores>({
    resolver: zodResolver(cfg.schema),
    defaultValues: cfg.vazio,
  });

  // Carrega o registro uma vez (voltar de outra tela não apaga o que foi digitado).
  useEffect(() => {
    if (id === undefined) return;
    (async () => {
      try {
        const linha = await db.getFirstAsync<Record<string, unknown>>(`SELECT * FROM ${cfg.tabela} WHERE id = ?`, [id]);
        if (!linha) throw new Error(`Este ${info.um} não existe mais.`);
        reset(cfg.daLinha(linha));
        setArquivado(!!linha.arquivado);
        if (ehServico) {
          const r = await listarReceita(db, id);
          setReceitaSalva(r.map((l) => ({ materialId: l.material_id, tipoCalculo: l.tipo_calculo, consumo: l.consumo })));
          setReceita(r.map((l) => ({ materialId: l.material_id, nome: l.material_nome, unidade: l.unidade, tipoCalculo: l.tipo_calculo, consumo: l.consumo })));
        }
        setCarregado(true);
      } catch (err) {
        avisar(err, 'erro');
        router.back();
      }
    })();
  }, [id, db, cfg, info.um, ehServico, reset, avisar]);

  const salvar = handleSubmit(
    async (valores) => {
      const problemaReceita = ehServico ? erroDaReceita(receita) : null;
      if (problemaReceita) {
        avisar(problemaReceita, 'erro');
        return;
      }
      try {
        let servicoId = id;
        if (id === undefined) servicoId = await cfg.criar(db, valores);
        else await cfg.editar(db, id, valores);
        if (ehServico && servicoId !== undefined) await salvarReceita(db, servicoId, receitaSalva, receita);
        avisar(`${info.um[0].toUpperCase()}${info.um.slice(1)} salvo.`);
        router.back();
      } catch (err) {
        avisar(err, 'erro');
      }
    },
    () => avisar('Confira os campos destacados.', 'erro')
  );

  const arquivar = async () => {
    if (id === undefined) return;
    const ok = await confirmar({
      titulo: `Arquivar este ${info.um}?`,
      texto: 'Some das listas e dos orçamentos novos, mas nada é excluído. Os orçamentos antigos continuam intactos.',
      botao: 'Arquivar',
      perigo: true,
    });
    if (!ok) return;
    try {
      await cfg.arquivar(db, id);
      avisar(`${info.um[0].toUpperCase()}${info.um.slice(1)} arquivado.`);
      router.back();
    } catch (err) {
      avisar(err, 'erro');
    }
  };

  const titulo = `${id === undefined ? 'Novo' : 'Editar'} ${info.um}`;

  if (!carregado) {
    return (
      <Tela titulo={titulo} voltar>
        <Carregando />
      </Tela>
    );
  }

  const renderCampo = (c: Campo) => (
    <Controller
      key={c.nome}
      control={control}
      name={c.nome}
      render={({ field }) => {
        const erro = formState.errors[c.nome]?.message as string | undefined;
        if (c.tipo === 'dinheiro') {
          return (
            <CampoDinheiro
              rotulo={c.rotulo}
              ajuda={c.ajuda}
              erro={erro}
              valor={Number(field.value) || 0}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          );
        }
        if (c.tipo === 'status') {
          return (
            <Rotulado rotulo={c.rotulo} ajuda={c.ajuda} erro={erro}>
              <Segmentado rotulo={c.rotulo} opcoes={OPCOES_STATUS} valor={String(field.value) as 'ativo'} onChange={field.onChange} />
            </Rotulado>
          );
        }
        return (
          <CampoTexto
            rotulo={c.rotulo}
            ajuda={c.ajuda}
            erro={erro}
            placeholder={c.placeholder}
            value={String(field.value ?? '')}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            multiline={c.tipo === 'area'}
            keyboardType={c.tipo === 'telefone' ? 'phone-pad' : 'default'}
            autoCapitalize={c.nome === 'nome' || c.nome === 'cidade' ? 'words' : 'sentences'}
          />
        );
      }}
    />
  );

  return (
    <Tela
      titulo={titulo}
      voltar
      rodape={<Botao titulo="Salvar" onPress={salvar} />}
    >
      {arquivado ? <Aviso texto={`Este ${info.um} está arquivado: não aparece nas listas nem em orçamentos novos.`} /> : null}
      <Card style={{ gap: 14 }}>{cfg.campos.map(renderCampo)}</Card>

      {ehServico ? <EditorReceita linhas={receita} onChange={setReceita} materiais={materiais ?? []} /> : null}

      {id !== undefined && !arquivado ? <Botao titulo="Arquivar" icone="arquivar" variante="perigo" onPress={arquivar} /> : null}
    </Tela>
  );
}
