import { View } from 'react-native';
import type { Material } from '../../repositories/cadastros';
import { Aviso, Chip, Chips, Secao, Segmentado } from '../../ui/Blocos';
import { BotaoIcone } from '../../ui/Botao';
import { CampoDecimal } from '../../ui/Campos';
import { Texto } from '../../ui/Texto';
import { cor } from '../../ui/tema';
import type { LinhaReceitaForm } from './receita';

/** Materiais que o serviço usa: o app usa isto para sugerir a lista no orçamento. */
export function EditorReceita({
  linhas,
  onChange,
  materiais,
}: {
  linhas: LinhaReceitaForm[];
  onChange: (l: LinhaReceitaForm[]) => void;
  materiais: Material[];
}) {
  const disponiveis = materiais.filter((m) => !linhas.some((l) => l.materialId === m.id));
  const atualizar = (i: number, m: Partial<LinhaReceitaForm>) => onChange(linhas.map((l, j) => (j === i ? { ...l, ...m } : l)));

  return (
    <Secao titulo="Receita do serviço">
      <Texto variante="apoio">
        Materiais usados neste serviço. “Por m²” multiplica pela metragem; “Quantidade fixa” é sempre a mesma. O app arredonda
        para cima.
      </Texto>

      {linhas.map((l, i) => (
        <View
          key={l.materialId}
          style={{ backgroundColor: cor.fundo, borderWidth: 1, borderColor: cor.borda, borderRadius: 20, padding: 12, gap: 10 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Texto variante="corpoForte" style={{ flex: 1 }}>
              {l.nome}
            </Texto>
            <BotaoIcone icone="fechar" rotulo={`Remover ${l.nome} da receita`} onPress={() => onChange(linhas.filter((_, j) => j !== i))} />
          </View>
          <Segmentado
            rotulo={`Tipo de cálculo de ${l.nome}`}
            opcoes={[
              { valor: 'por_m2', rotulo: 'Por m²' },
              { valor: 'fixo', rotulo: 'Quantidade fixa' },
            ]}
            valor={l.tipoCalculo}
            onChange={(v) => atualizar(i, { tipoCalculo: v })}
          />
          <CampoDecimal
            rotulo={l.tipoCalculo === 'por_m2' ? `Consumo (${l.unidade} por m²)` : `Quantidade (${l.unidade})`}
            casas={3}
            valor={l.consumo}
            onChange={(v) => atualizar(i, { consumo: v })}
            ajuda={
              l.tipoCalculo === 'por_m2' && l.consumo
                ? `Em 100 m² o app sugere ${Math.ceil(100 * l.consumo - 1e-9)} ${l.unidade}.`
                : undefined
            }
            erro={l.consumo !== null && l.consumo <= 0 ? 'O consumo precisa ser maior que zero.' : undefined}
          />
        </View>
      ))}

      {disponiveis.length > 0 ? (
        <>
          <Texto variante="rotulo">Adicionar material à receita</Texto>
          <Chips>
            {disponiveis.map((m) => (
              <Chip
                key={m.id}
                texto={`+ ${m.nome}`}
                onPress={() =>
                  onChange([...linhas, { materialId: m.id, nome: m.nome, unidade: m.unidade, tipoCalculo: 'por_m2', consumo: null }])
                }
              />
            ))}
          </Chips>
        </>
      ) : materiais.length === 0 ? (
        <Aviso tipo="info" texto="Cadastre materiais primeiro (Cadastros → Materiais) para montar a receita." />
      ) : null}
    </Secao>
  );
}
