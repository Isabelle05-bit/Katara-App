import { Text, type TextProps, type TextStyle } from 'react-native';
import { cor, fonte } from './tema';

/**
 * Texto com as variantes do protótipo. Respeita o tamanho de fonte do sistema
 * (allowFontScaling é o padrão); só os valores gigantes têm teto, para não
 * estourar a tela com fonte muito grande.
 */
const variantes = {
  titulo: { fontFamily: fonte.leve, fontSize: 32, lineHeight: 36, letterSpacing: -0.9, color: cor.texto },
  tituloMenor: { fontFamily: fonte.leve, fontSize: 24, lineHeight: 28, letterSpacing: -0.6, color: cor.texto },
  h2: { fontFamily: fonte.forte, fontSize: 18, lineHeight: 22, letterSpacing: -0.2, color: cor.texto },
  corpo: { fontFamily: fonte.normal, fontSize: 16, lineHeight: 22, color: cor.texto },
  corpoForte: { fontFamily: fonte.forte, fontSize: 16, lineHeight: 22, color: cor.texto },
  apoio: { fontFamily: fonte.normal, fontSize: 15, lineHeight: 21, color: cor.texto2 },
  legenda: { fontFamily: fonte.normal, fontSize: 13, lineHeight: 18, color: cor.texto2 },
  rotulo: {
    fontFamily: fonte.forte,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: cor.texto2,
  },
  valor: { fontFamily: fonte.forte, fontSize: 20, lineHeight: 24, letterSpacing: -0.4, color: cor.texto },
  valorGrande: { fontFamily: fonte.leve, fontSize: 40, lineHeight: 44, letterSpacing: -1.2, color: cor.texto },
} satisfies Record<string, TextStyle>;

export type VarianteTexto = keyof typeof variantes;

export function Texto({
  variante = 'corpo',
  cor: corTexto,
  style,
  ...props
}: TextProps & { variante?: VarianteTexto; cor?: string }) {
  return (
    <Text
      maxFontSizeMultiplier={variante === 'valorGrande' || variante === 'titulo' ? 1.4 : undefined}
      {...props}
      style={[variantes[variante], corTexto ? { color: corTexto } : null, style]}
    />
  );
}
