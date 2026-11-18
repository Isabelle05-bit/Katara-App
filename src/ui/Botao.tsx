import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icone, type NomeIcone } from './Icone';
import { Texto } from './Texto';
import { cor, fonte, gradiente, raio, toque } from './tema';

type Variante = 'primario' | 'secundario' | 'perigo' | 'contorno';

/**
 * Executa uma ação assíncrona uma vez só: enquanto ela roda, novos toques são
 * ignorados (proteção contra duplo toque em "Salvar" e "Gerar PDF").
 */
export function useAcaoUnica<A extends unknown[]>(acao: (...args: A) => unknown) {
  const [ocupado, setOcupado] = useState(false);
  const rodando = useRef(false);
  const executar = async (...args: A) => {
    if (rodando.current) return;
    rodando.current = true;
    setOcupado(true);
    try {
      await acao(...args);
    } finally {
      rodando.current = false;
      setOcupado(false);
    }
  };
  return [executar, ocupado] as const;
}

export interface BotaoProps {
  titulo: string;
  onPress: () => unknown;
  variante?: Variante;
  icone?: NomeIcone;
  grande?: boolean;
  desabilitado?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Texto lido pelo leitor de tela, se diferente do título. */
  rotuloAcessivel?: string;
}

export function Botao({
  titulo,
  onPress,
  variante = 'primario',
  icone,
  grande,
  desabilitado,
  style,
  rotuloAcessivel,
}: BotaoProps) {
  const [executar, ocupado] = useAcaoUnica(onPress);
  const inativo = desabilitado || ocupado;
  const corTexto = variante === 'primario' ? cor.branco : variante === 'perigo' ? cor.erro : cor.texto;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotuloAcessivel ?? titulo}
      accessibilityState={{ disabled: inativo, busy: ocupado }}
      disabled={inativo}
      onPress={() => executar()}
      style={({ pressed }) => [
        estilos.base,
        { minHeight: grande ? 60 : variante === 'primario' ? toque.botaoGrande : 48 },
        variante === 'primario' && estilos.primario,
        variante === 'secundario' && estilos.secundario,
        variante === 'perigo' && estilos.perigo,
        variante === 'contorno' && estilos.contorno,
        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        desabilitado && { opacity: 0.45 },
        style,
      ]}
    >
      {ocupado ? (
        <ActivityIndicator color={corTexto} />
      ) : (
        <View style={estilos.conteudo}>
          {icone ? <Icone nome={icone} cor={corTexto} tamanho={grande ? 24 : 20} /> : null}
          <Texto
            style={{ fontFamily: fonte.forte, fontSize: grande ? 19 : variante === 'primario' ? 16 : 15, textAlign: 'center' }}
            cor={corTexto}
          >
            {titulo}
          </Texto>
        </View>
      )}
    </Pressable>
  );
}

/** Botão redondo só com ícone (44×44). Sempre com rótulo acessível. */
export function BotaoIcone({
  icone,
  rotulo,
  onPress,
  corIcone = cor.texto,
  fundo = 'rgba(255,255,255,0.08)',
}: {
  icone: NomeIcone;
  rotulo: string;
  onPress: () => void;
  corIcone?: string;
  fundo?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [estilos.icone, { backgroundColor: fundo }, pressed && { opacity: 0.7 }]}
    >
      <Icone nome={icone} cor={corIcone} tamanho={20} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    borderRadius: raio.botao,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conteudo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 1 },
  primario: {
    backgroundImage: gradiente.acao,
    boxShadow: '0px 10px 24px rgba(232,64,42,0.28)',
  },
  secundario: { backgroundColor: cor.superficie2 },
  perigo: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,138,122,0.35)' },
  contorno: { backgroundColor: 'transparent', borderWidth: 1, borderColor: cor.bordaForte },
  icone: {
    width: toque.minimo,
    height: toque.minimo,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
