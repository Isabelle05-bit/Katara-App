import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ItemReceita, ResultadoCalculo } from '../../domain/calculo';
import { totalLinhaFuncionario, totalLinhaMaterial, totalLinhaServico } from '../../domain/calculo';
import { clienteSchema, type ClienteInput } from '../../domain/schemas';
import { formatarData } from '../../lib/datas';
import { formatarBRL } from '../../lib/dinheiro';
import { criarCliente, type Cliente, type Ferramenta, type Funcionario, type Material } from '../../repositories/cadastros';
import type { Servico } from '../../repositories/servicos';
import { Aviso, Card, Chip, Chips, EstadoVazio, LinhaValor, Secao, Segmentado } from '../../ui/Blocos';
import { Botao, BotaoIcone } from '../../ui/Botao';
import { CampoData, CampoDecimal, CampoDinheiro, CampoTexto, Contador } from '../../ui/Campos';
import { useFeedback } from '../../ui/Feedback';
import { Icone } from '../../ui/Icone';
import { Texto } from '../../ui/Texto';
import { cor, fundoDe, gradiente } from '../../ui/tema';
import { OPCOES_MODO, TEXTO_MODO, validadeEmDias, type FormOrcamento } from './formulario';

export interface Catalogo {
  clientes: Cliente[];
  servicos: Servico[];
  materiais: Material[];
  ferramentas: Ferramenta[];
  funcionarios: Funcionario[];
  receitas: Map<number, ItemReceita[]>;
}

export interface PassoProps {
  form: FormOrcamento;
  set: (mudanca: Partial<FormOrcamento>) => void;
  catalogo: Catalogo;
}

const Intro = ({ children }: { children: string }) => <Texto variante="apoio">{children}</Texto>;

/** Card selecionável (cliente, funcionário). */
function Opcao({
  titulo,
  detalhe,
  ativo,
  onPress,
  tipo = 'radio',
}: {
  titulo: string;
  detalhe?: string;
  ativo: boolean;
  onPress: () => void;
  tipo?: 'radio' | 'checkbox';
}) {
  return (
    <Pressable
      accessibilityRole={tipo}
      accessibilityState={{ checked: ativo }}
      accessibilityLabel={detalhe ? `${titulo}, ${detalhe}` : titulo}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.opcao,
        ativo && { borderColor: cor.acaoInicio, backgroundColor: fundoDe(cor.acaoInicio, 0.1) },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Texto variante="corpoForte" style={{ fontSize: 17 }}>
          {titulo}
        </Texto>
        {detalhe ? <Texto variante="legenda">{detalhe}</Texto> : null}
      </View>
      <View style={[estilos.marca, ativo ? { backgroundImage: gradiente.acao, borderWidth: 0 } : null, tipo === 'radio' && { borderRadius: 999 }]}>
        {ativo ? <Icone nome="check" cor={cor.branco} tamanho={18} /> : null}
      </View>
    </Pressable>
  );
}

// ---------------- 1. Cliente ----------------

export function PassoCliente({ form, set, catalogo, onNovoCliente }: PassoProps & { onNovoCliente: (c: Cliente) => void }) {
  const db = useSQLiteContext();
  const { avisar } = useFeedback();
  const [busca, setBusca] = useState('');
  const [novoAberto, setNovoAberto] = useState(catalogo.clientes.length === 0);

  const { control, handleSubmit, reset, formState } = useForm<ClienteInput>({
    resolver: zodResolver(clienteSchema),
    defaultValues: { nome: '', telefone: '', cidade: '' },
  });

  const salvarNovo = handleSubmit(async (dados) => {
    try {
      const id = await criarCliente(db, dados);
      onNovoCliente({ id, nome: dados.nome.trim(), telefone: dados.telefone || null, cidade: dados.cidade || null, endereco: null, observacoes: null, arquivado: 0 });
      set({ clienteId: id });
      reset();
      setNovoAberto(false);
      avisar('Cliente cadastrado e escolhido.');
    } catch (e) {
      avisar(e, 'erro');
    }
  });

  const termo = busca.trim().toLowerCase();
  const lista = catalogo.clientes
    .filter((c) => !termo || c.nome.toLowerCase().includes(termo) || c.id === form.clienteId)
    .slice(0, 40);

  return (
    <>
      <Intro>Para quem é este orçamento?</Intro>
      {catalogo.clientes.length > 6 ? (
        <CampoTexto rotulo="Buscar cliente" placeholder="Nome do cliente" value={busca} onChangeText={setBusca} autoCorrect={false} />
      ) : null}
      {lista.map((c) => (
        <Opcao
          key={c.id}
          titulo={c.nome}
          detalhe={[c.cidade, c.telefone].filter(Boolean).join(' · ') || undefined}
          ativo={form.clienteId === c.id}
          onPress={() => set({ clienteId: c.id })}
        />
      ))}

      {novoAberto ? (
        <Card style={{ gap: 12 }}>
          <Texto variante="h2">Cliente novo</Texto>
          <Controller
            control={control}
            name="nome"
            render={({ field }) => (
              <CampoTexto
                rotulo="Nome"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                erro={formState.errors.nome?.message}
                autoCapitalize="words"
              />
            )}
          />
          <Controller
            control={control}
            name="telefone"
            render={({ field }) => (
              <CampoTexto rotulo="Telefone / WhatsApp" value={field.value ?? ''} onChangeText={field.onChange} keyboardType="phone-pad" />
            )}
          />
          <Controller
            control={control}
            name="cidade"
            render={({ field }) => (
              <CampoTexto rotulo="Cidade" value={field.value ?? ''} onChangeText={field.onChange} autoCapitalize="words" />
            )}
          />
          <Botao titulo="Salvar cliente" onPress={salvarNovo} />
        </Card>
      ) : (
        <Botao titulo="Cadastrar cliente novo" icone="mais" variante="secundario" onPress={() => setNovoAberto(true)} />
      )}
    </>
  );
}

// ---------------- 2. Serviços ----------------

export function PassoServicos({ form, set, catalogo }: PassoProps) {
  const disponiveis = catalogo.servicos.filter((s) => !form.servicos.some((x) => x.servicoId === s.id));
  const atualizar = (i: number, mudanca: Partial<FormOrcamento['servicos'][number]>) =>
    set({ servicos: form.servicos.map((s, j) => (j === i ? { ...s, ...mudanca } : s)) });

  if (catalogo.servicos.length === 0 && form.servicos.length === 0) {
    return (
      <EstadoVazio
        icone="tinta"
        titulo="Nenhum serviço cadastrado"
        texto="Cadastre seus serviços (ex.: Pintura interna, com preço por m²) e volte aqui."
        acao={{ titulo: 'Cadastrar serviço', onPress: () => router.push({ pathname: '/cadastros/[entidade]/[id]', params: { entidade: 'servicos', id: 'novo' } }) }}
      />
    );
  }

  return (
    <>
      <Intro>Escolha os serviços e informe a metragem de cada um.</Intro>
      {form.servicos.map((s, i) => (
        <Card key={s.servicoId} style={{ gap: 12 }}>
          <View style={estilos.topoLinha}>
            <Texto variante="corpoForte" style={{ fontSize: 18, flex: 1 }}>
              {s.nome}
            </Texto>
            <BotaoIcone
              icone="fechar"
              rotulo={`Remover ${s.nome}`}
              onPress={() => set({ servicos: form.servicos.filter((_, j) => j !== i) })}
            />
          </View>
          <View style={estilos.duasColunas}>
            <CampoDecimal
              rotulo="Metragem"
              sufixo="m²"
              flex
              placeholder="0"
              valor={s.metrosQuadrados}
              onChange={(v) => atualizar(i, { metrosQuadrados: v })}
            />
            <CampoDinheiro rotulo="Preço por m²" flex valor={s.precoM2} onChange={(v) => atualizar(i, { precoM2: v })} />
          </View>
          <LinhaValor
            rotulo="Subtotal"
            valor={formatarBRL(totalLinhaServico({ metrosQuadrados: s.metrosQuadrados ?? 0, precoM2: s.precoM2 }))}
          />
        </Card>
      ))}
      {disponiveis.length > 0 ? (
        <>
          <Texto variante="rotulo">Adicionar serviço</Texto>
          <Chips>
            {disponiveis.map((s) => (
              <Chip
                key={s.id}
                texto={`+ ${s.nome} · ${formatarBRL(s.preco_m2)}/m²`}
                onPress={() =>
                  set({ servicos: [...form.servicos, { servicoId: s.id, nome: s.nome, metrosQuadrados: null, precoM2: s.preco_m2 }] })
                }
              />
            ))}
          </Chips>
        </>
      ) : null}
    </>
  );
}

// ---------------- 3. Materiais ----------------

export function PassoMateriais({ form, set, catalogo }: PassoProps) {
  const disponiveis = catalogo.materiais.filter((m) => !form.materiais.some((x) => x.materialId === m.id));
  const atualizar = (i: number, mudanca: Partial<FormOrcamento['materiais'][number]>) =>
    set({ materiais: form.materiais.map((m, j) => (j === i ? { ...m, ...mudanca } : m)) });

  return (
    <>
      <Card style={{ gap: 10 }}>
        <Texto variante="rotulo">Como o cliente vê os materiais?</Texto>
        <Segmentado rotulo="Como o cliente vê os materiais" opcoes={OPCOES_MODO} valor={form.materiaisModo} onChange={(v) => set({ materiaisModo: v })} />
        <Texto variante="legenda">{TEXTO_MODO[form.materiaisModo]}</Texto>
      </Card>
      <Intro>
        {form.materiais.some((m) => m.origem === 'sugerido')
          ? 'Lista sugerida a partir dos serviços e metragens. Ajuste a quantidade e o preço se precisar.'
          : 'Adicione os materiais deste serviço. Dica: monte a receita do serviço em Cadastros para o app sugerir sozinho.'}
      </Intro>
      {form.materiais.map((m, i) => (
        <Card key={m.materialId} style={{ gap: 12 }}>
          <View style={estilos.topoLinha}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Texto variante="corpoForte">{m.nome}</Texto>
              <Texto variante="legenda" cor={cor.texto3}>
                {m.origem === 'sugerido' && !m.editado ? 'Sugerido' : 'Adicionado'} · {m.unidade}
              </Texto>
            </View>
            <BotaoIcone
              icone="fechar"
              rotulo={`Remover ${m.nome}`}
              onPress={() =>
                set({
                  materiais: form.materiais.filter((_, j) => j !== i),
                  materiaisIgnorados: m.origem === 'sugerido' ? [...form.materiaisIgnorados, m.materialId] : form.materiaisIgnorados,
                })
              }
            />
          </View>
          <View style={[estilos.duasColunas, { alignItems: 'flex-end' }]}>
            <View style={{ gap: 6 }}>
              <Texto variante="rotulo" style={{ textTransform: 'none' }}>
                Quantidade
              </Texto>
              <Contador rotulo={`quantidade de ${m.nome}`} valor={m.quantidade} onChange={(q) => atualizar(i, { quantidade: q, editado: true })} />
            </View>
            <CampoDinheiro rotulo="Preço unitário" flex valor={m.preco} onChange={(v) => atualizar(i, { preco: v })} />
          </View>
          <LinhaValor rotulo="Total do item" valor={formatarBRL(totalLinhaMaterial({ quantidade: m.quantidade, preco: m.preco }))} />
        </Card>
      ))}
      {disponiveis.length > 0 ? (
        <>
          <Texto variante="rotulo">Adicionar material do catálogo</Texto>
          <Chips>
            {disponiveis.map((m) => (
              <Chip
                key={m.id}
                texto={`+ ${m.nome}`}
                onPress={() =>
                  set({
                    materiais: [
                      ...form.materiais,
                      { materialId: m.id, nome: m.nome, unidade: m.unidade, quantidade: 1, preco: m.preco, origem: 'manual', editado: true },
                    ],
                    materiaisIgnorados: form.materiaisIgnorados.filter((x) => x !== m.id),
                  })
                }
              />
            ))}
          </Chips>
        </>
      ) : catalogo.materiais.length === 0 ? (
        <Aviso tipo="info" texto="Nenhum material cadastrado. Você pode seguir sem materiais e cadastrar depois em Cadastros." />
      ) : null}
    </>
  );
}

// ---------------- 4. Ferramentas ----------------

export function PassoFerramentas({ form, set, catalogo }: PassoProps) {
  const disponiveis = catalogo.ferramentas.filter((f) => !form.ferramentas.some((x) => x.ferramentaId === f.id));
  const total = form.ferramentas.reduce((a, f) => a + f.preco, 0);
  return (
    <>
      <Intro>Opcional. Se não usar nenhuma ferramenta especial neste serviço, é só continuar.</Intro>
      {form.ferramentas.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
          <Texto variante="apoio">Nenhuma ferramenta neste orçamento.</Texto>
        </Card>
      ) : (
        <>
          <Card style={{ gap: 10 }}>
            <Texto variante="rotulo">Como o cliente vê as ferramentas?</Texto>
            <Segmentado rotulo="Como o cliente vê as ferramentas" opcoes={OPCOES_MODO} valor={form.ferramentasModo} onChange={(v) => set({ ferramentasModo: v })} />
            <Texto variante="legenda">{TEXTO_MODO[form.ferramentasModo]}</Texto>
          </Card>
          {form.ferramentas.map((f, i) => (
            <Card key={f.ferramentaId} style={{ gap: 12 }}>
              <View style={estilos.topoLinha}>
                <Texto variante="corpoForte" style={{ fontSize: 17, flex: 1 }}>
                  {f.nome}
                </Texto>
                <BotaoIcone icone="fechar" rotulo={`Remover ${f.nome}`} onPress={() => set({ ferramentas: form.ferramentas.filter((_, j) => j !== i) })} />
              </View>
              <CampoDinheiro
                rotulo="Preço neste orçamento"
                ajuda="Começa com o valor de compra. Pode ajustar."
                valor={f.preco}
                onChange={(v) => set({ ferramentas: form.ferramentas.map((x, j) => (j === i ? { ...x, preco: v } : x)) })}
              />
            </Card>
          ))}
          <LinhaValor rotulo="Total das ferramentas" valor={formatarBRL(total)} />
        </>
      )}
      {disponiveis.length > 0 ? (
        <>
          <Texto variante="rotulo">Adicionar ferramenta</Texto>
          <Chips>
            {disponiveis.map((f) => (
              <Chip
                key={f.id}
                texto={`+ ${f.nome} · ${formatarBRL(f.valor_compra)}`}
                onPress={() => set({ ferramentas: [...form.ferramentas, { ferramentaId: f.id, nome: f.nome, preco: f.valor_compra }] })}
              />
            ))}
          </Chips>
        </>
      ) : null}
    </>
  );
}

// ---------------- 5. Equipe ----------------

export function PassoEquipe({ form, set, catalogo }: PassoProps) {
  // Ativos + quem já está no orçamento (mesmo que hoje esteja de férias).
  const pessoas = [
    ...catalogo.funcionarios.filter((f) => f.status === 'ativo'),
    ...form.funcionarios
      .filter((x) => !catalogo.funcionarios.some((f) => f.id === x.funcionarioId && f.status === 'ativo'))
      .map((x) => ({ id: x.funcionarioId, nome: x.nome, diaria: x.diaria })),
  ];
  const total = form.funcionarios.reduce((a, f) => a + totalLinhaFuncionario({ diaria: f.diaria, dias: f.dias }), 0);

  if (pessoas.length === 0) {
    return (
      <EstadoVazio
        icone="equipe"
        titulo="Nenhum funcionário ativo"
        texto="Você pode seguir sem equipe. Para calcular o lucro certinho, cadastre os funcionários com a diária."
        acao={{ titulo: 'Cadastrar funcionário', onPress: () => router.push({ pathname: '/cadastros/[entidade]/[id]', params: { entidade: 'funcionarios', id: 'novo' } }) }}
      />
    );
  }

  return (
    <>
      <Intro>Quem vai trabalhar e por quantos dias? Funcionários inativos ou de férias não aparecem aqui.</Intro>
      {pessoas.map((p) => {
        const linha = form.funcionarios.find((x) => x.funcionarioId === p.id);
        return (
          <View key={p.id} style={estilos.equipe}>
            <Opcao
              tipo="checkbox"
              titulo={p.nome}
              detalhe={`${formatarBRL(linha?.diaria ?? p.diaria)} por dia`}
              ativo={!!linha}
              onPress={() =>
                set({
                  funcionarios: linha
                    ? form.funcionarios.filter((x) => x.funcionarioId !== p.id)
                    : [...form.funcionarios, { funcionarioId: p.id, nome: p.nome, diaria: p.diaria, dias: 1 }],
                })
              }
            />
            {linha ? (
              <View style={estilos.diasLinha}>
                <Contador
                  rotulo={`dias de ${p.nome}`}
                  valor={linha.dias}
                  sufixo={(d) => `${d} ${d === 1 ? 'dia' : 'dias'}`}
                  onChange={(d) => set({ funcionarios: form.funcionarios.map((x) => (x.funcionarioId === p.id ? { ...x, dias: d } : x)) })}
                />
                <Texto variante="corpoForte">{formatarBRL(totalLinhaFuncionario(linha))}</Texto>
              </View>
            ) : null}
          </View>
        );
      })}
      <LinhaValor rotulo="Custo da equipe" valor={formatarBRL(total)} />
    </>
  );
}

// ---------------- 6. Fechamento ----------------

export function PassoFechamento({ form, set, calculo }: PassoProps & { calculo: ResultadoCalculo }) {
  const c = calculo;
  return (
    <>
      <Secao titulo="Desconto">
        <CampoDecimal
          rotulo="Desconto"
          sufixo="%"
          valor={form.descontoPct}
          onChange={(v) => set({ descontoPct: Math.min(100, v ?? 0) })}
          erro={form.descontoPct > 100 ? 'O desconto máximo é 100%.' : undefined}
        />
        <Chips>
          {[0, 5, 10].map((p) => (
            <Chip key={p} texto={`${p}%`} ativo={form.descontoPct === p} onPress={() => set({ descontoPct: p })} />
          ))}
        </Chips>
        <Texto variante="rotulo">O desconto vale</Texto>
        <Segmentado
          rotulo="Sobre o que vale o desconto"
          opcoes={[
            { valor: 'servicos', rotulo: 'Só nos serviços' },
            { valor: 'total', rotulo: 'No total' },
          ]}
          valor={form.descontoBase}
          onChange={(v) => set({ descontoBase: v })}
        />
      </Secao>

      <Secao titulo="Validade">
        <Chips>
          {[7, 15, 30].map((d) => (
            <Chip key={d} texto={`${d} dias`} ativo={form.validade === validadeEmDias(d)} onPress={() => set({ validade: validadeEmDias(d) })} />
          ))}
        </Chips>
        <CampoData rotulo="Válido até" valor={form.validade} onChange={(v) => set({ validade: v })} minimo={new Date()} />
        {form.validade ? <Texto variante="legenda">O cliente verá: “Orçamento válido até {formatarData(form.validade)}”.</Texto> : null}
      </Secao>

      <Card>
        <CampoTexto
          rotulo="Observações (aparecem no PDF)"
          multiline
          value={form.observacoes}
          onChangeText={(t) => set({ observacoes: t })}
          placeholder="Ex.: Acesso combinado com a síndica."
        />
      </Card>

      <Secao titulo="Revisão do cálculo">
        <LinhaValor rotulo="Subtotal dos serviços" valor={formatarBRL(c.subtotalServicos)} />
        {c.materiaisCobrados > 0 ? <LinhaValor rotulo="Materiais cobrados" valor={formatarBRL(c.materiaisCobrados)} /> : null}
        {c.ferramentasCobradas > 0 ? <LinhaValor rotulo="Ferramentas cobradas" valor={formatarBRL(c.ferramentasCobradas)} /> : null}
        {c.desconto > 0 ? <LinhaValor rotulo="Desconto" valor={`− ${formatarBRL(c.desconto)}`} corValor={cor.erro} /> : null}
        <LinhaValor rotulo="Total do cliente" valor={formatarBRL(c.totalCliente)} destaque divisoria />
        <LinhaValor rotulo="Custo de materiais" valor={formatarBRL(c.custoMaterial)} />
        <LinhaValor rotulo="Custo de ferramentas" valor={formatarBRL(c.custoFerramenta)} />
        <LinhaValor rotulo="Custo da equipe" valor={formatarBRL(c.custoEquipe)} />
        <LinhaValor rotulo="Lucro líquido" valor={formatarBRL(c.lucro)} corValor={c.lucro >= 0 ? cor.verde : cor.erro} destaque divisoria />
        {c.lucro < 0 ? <Aviso tipo="erro" texto="Com estes valores você tem prejuízo. Confira os preços ou o desconto." /> : null}
      </Secao>
    </>
  );
}

const estilos = StyleSheet.create({
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: cor.borda,
    backgroundColor: cor.superficie,
  },
  marca: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#5A5A66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topoLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  duasColunas: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  equipe: { gap: 0 },
  diasLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: -8,
    paddingTop: 18,
    backgroundColor: cor.superficie,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    zIndex: -1,
  },
});

