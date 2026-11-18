import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Botao } from './Botao';
import { Icone, type NomeIcone } from './Icone';
import { Texto } from './Texto';
import { cor, fonte, fundoDe, gradiente, raio, toque } from './tema';

export function Card({
  children,
  style,
  onPress,
  rotuloAcessivel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  rotuloAcessivel?: string;
}) {
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={rotuloAcessivel}
        onPress={onPress}
        style={({ pressed }) => [estilos.card, pressed && { opacity: 0.85 }, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[estilos.card, style]}>{children}</View>;
}

/** Badge de status: sempre texto + cor (nunca só cor). */
export function Badge({ texto, corTexto }: { texto: string; corTexto: string }) {
  return (
    <View style={[estilos.badge, { backgroundColor: fundoDe(corTexto) }]}>
      <Texto style={{ fontFamily: fonte.forte, fontSize: 12, lineHeight: 16 }} cor={corTexto} numberOfLines={1}>
        {texto}
      </Texto>
    </View>
  );
}

export function Chip({
  texto,
  ativo,
  onPress,
}: {
  texto: string;
  ativo?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!ativo }}
      onPress={onPress}
      style={({ pressed }) => [estilos.chip, ativo ? estilos.chipAtivo : estilos.chipInativo, pressed && { opacity: 0.8 }]}
    >
      <Texto style={{ fontFamily: fonte.forte, fontSize: 14 }} cor={ativo ? cor.branco : cor.texto}>
        {texto}
      </Texto>
    </Pressable>
  );
}

export function Chips({ children }: { children: ReactNode }) {
  return <View style={estilos.chips}>{children}</View>;
}

/** Controle de 2–4 opções (ex.: Cobrar · Só informar · Ocultar). */
export function Segmentado<T extends string>({
  opcoes,
  valor,
  onChange,
  rotulo,
  vertical,
}: {
  opcoes: readonly { valor: T; rotulo: string }[];
  valor: T;
  onChange: (v: T) => void;
  rotulo: string;
  vertical?: boolean;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={rotulo} style={[estilos.seg, vertical && estilos.segVertical]}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            accessibilityRole="radio"
            accessibilityState={{ checked: ativo }}
            onPress={() => onChange(o.valor)}
            style={[estilos.segOpcao, vertical && estilos.segOpcaoVertical, ativo && { backgroundColor: cor.texto }]}
          >
            <Texto
              style={{ fontFamily: fonte.forte, fontSize: 14, textAlign: vertical ? 'left' : 'center' }}
              cor={ativo ? cor.fundo : cor.texto2}
            >
              {o.rotulo}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Linha "rótulo .......... valor". */
export function LinhaValor({
  rotulo,
  valor,
  detalhe,
  corValor,
  destaque,
  divisoria,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  corValor?: string;
  destaque?: boolean;
  divisoria?: boolean;
}) {
  return (
    <View style={[estilos.linha, divisoria && estilos.linhaDivisoria]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Texto variante={destaque ? 'corpoForte' : 'corpo'} style={{ fontSize: destaque ? 17 : 15 }}>
          {rotulo}
        </Texto>
        {detalhe ? <Texto variante="legenda">{detalhe}</Texto> : null}
      </View>
      <Texto
        variante="corpoForte"
        style={{ fontSize: destaque ? 22 : 15, flexShrink: 0 }}
        cor={corValor}
      >
        {valor}
      </Texto>
    </View>
  );
}

export function Secao({ titulo, children, acao }: { titulo?: string; children: ReactNode; acao?: ReactNode }) {
  return (
    <Card style={{ gap: 10 }}>
      {titulo ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Texto variante="h2" accessibilityRole="header" style={{ flex: 1 }}>
            {titulo}
          </Texto>
          {acao}
        </View>
      ) : null}
      {children}
    </Card>
  );
}

export function Aviso({ texto, tipo = 'aviso' }: { texto: string; tipo?: 'aviso' | 'info' | 'erro' }) {
  const c = tipo === 'erro' ? cor.erro : tipo === 'info' ? cor.azulClaro : cor.amarelo;
  return (
    <View
      accessibilityRole="alert"
      style={[estilos.aviso, { backgroundColor: fundoDe(c, 0.1), borderColor: fundoDe(c, 0.35) }]}
    >
      <Icone nome={tipo === 'info' ? 'info' : 'aviso'} cor={c} tamanho={20} />
      <Texto variante="apoio" cor={c} style={{ flex: 1 }}>
        {texto}
      </Texto>
    </View>
  );
}

// ---------------- Estados ----------------

export function EstadoVazio({
  icone = 'orcamentos',
  titulo,
  texto,
  acao,
}: {
  icone?: NomeIcone;
  titulo: string;
  texto: string;
  acao?: { titulo: string; onPress: () => void };
}) {
  return (
    <Card style={estilos.estado}>
      <Icone nome={icone} tamanho={40} cor={cor.texto3} />
      <Texto variante="h2" style={{ textAlign: 'center' }}>
        {titulo}
      </Texto>
      <Texto variante="apoio" style={{ textAlign: 'center' }}>
        {texto}
      </Texto>
      {acao ? <Botao titulo={acao.titulo} icone="mais" onPress={acao.onPress} style={{ alignSelf: 'stretch', marginTop: 6 }} /> : null}
    </Card>
  );
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={texto} style={{ gap: 12 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[estilos.card, { gap: 12, minHeight: 76 }]}>
          <View style={{ height: 16, width: '55%', borderRadius: 6, backgroundColor: '#2A2A31' }} />
          <View style={{ height: 14, width: '80%', borderRadius: 6, backgroundColor: '#22222A' }} />
        </View>
      ))}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
        <ActivityIndicator color={cor.texto3} />
        <Texto variante="legenda" cor={cor.texto3}>
          {texto}
        </Texto>
      </View>
    </View>
  );
}

export function ErroCarregar({ onTentar, detalhe }: { onTentar: () => void; detalhe?: string }) {
  return (
    <Card style={[estilos.estado, { borderColor: 'rgba(255,138,122,0.35)' }]}>
      <Icone nome="erro" tamanho={40} cor={cor.erro} />
      <Texto variante="h2" accessibilityRole="alert">
        Não deu para carregar
      </Texto>
      <Texto variante="apoio" style={{ textAlign: 'center' }}>
        Seus dados estão salvos no celular. Tente de novo.
      </Texto>
      {detalhe ? (
        <Texto variante="legenda" cor={cor.texto3} style={{ textAlign: 'center' }}>
          {detalhe}
        </Texto>
      ) : null}
      <Botao titulo="Tentar de novo" variante="secundario" onPress={onTentar} style={{ alignSelf: 'stretch' }} />
    </Card>
  );
}

const estilos = StyleSheet.create({
  card: {
    backgroundColor: cor.superficie,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: raio.card,
    padding: 18,
  },
  badge: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, flexShrink: 0 },
  chip: {
    minHeight: toque.minimo,
    borderRadius: raio.chip,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipAtivo: { backgroundImage: gradiente.acao, borderColor: 'transparent' },
  chipInativo: { backgroundColor: 'rgba(255,255,255,0.07)', borderColor: cor.bordaForte },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seg: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 999,
  },
  segVertical: { flexDirection: 'column', borderRadius: 24 },
  segOpcao: {
    flex: 1,
    minHeight: toque.minimo,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  segOpcaoVertical: { alignItems: 'flex-start', paddingHorizontal: 16, flex: 0 },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, paddingVertical: 8 },
  linhaDivisoria: { borderTopWidth: 1, borderTopColor: cor.bordaForte, paddingTop: 12, marginTop: 4 },
  aviso: { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: 20, padding: 12, alignItems: 'flex-start' },
  estado: { alignItems: 'center', gap: 10, paddingVertical: 28, paddingHorizontal: 20 },
});
