import type { ReactNode, Ref } from 'react';
import { Image, KeyboardAvoidingView, ScrollView, StyleSheet, View, type RefreshControlProps, type ScrollViewInstance } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Botao, BotaoIcone } from './Botao';
import { Texto } from './Texto';
import { cor, espaco, gradiente } from './tema';

const LOGO = require('../../assets/images/logo.png');

/**
 * Moldura de toda tela: fundo da marca, cabeçalho, conteúdo rolável que não
 * fica embaixo do teclado, e um rodapé fixo opcional (resumo do orçamento,
 * botão "Enviar").
 *
 * Teclado: KeyboardAvoidingView com behavior="padding" nas duas plataformas
 * (no Android o app é edge-to-edge e a janela não encolhe sozinha — ver
 * docs.expo.dev/guides/keyboard-handling). O rodapé fica DENTRO dele, então
 * sobe junto com o teclado.
 */
export function Tela({
  titulo,
  voltar,
  logo,
  acao,
  rodape,
  children,
  rolar = true,
  refresh,
  comAbas,
  refRolagem,
}: {
  titulo: string;
  /** Mostra o botão voltar (telas empilhadas). */
  voltar?: boolean;
  /** Mostra a logo no canto (Início). */
  logo?: boolean;
  /** Botão à direita do título (ex.: "Novo"). */
  acao?: { titulo: string; onPress: () => void };
  rodape?: ReactNode;
  children: ReactNode;
  rolar?: boolean;
  refresh?: React.ReactElement<RefreshControlProps>;
  /** Telas de aba: deixa espaço para a barra de abas. */
  comAbas?: boolean;
  refRolagem?: Ref<ScrollViewInstance>;
}) {
  const insets = useSafeAreaInsets();
  const grande = !voltar;

  return (
    <View style={estilos.raiz}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={[estilos.cabecalho, { paddingTop: insets.top + 12 }]}>
          {voltar ? (
            <View style={{ marginLeft: -6 }}>
              <BotaoIcone
                icone="voltar"
                rotulo="Voltar"
                fundo="transparent"
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              />
            </View>
          ) : null}
          <Texto
            variante={grande ? 'titulo' : 'tituloMenor'}
            accessibilityRole="header"
            numberOfLines={2}
            style={{ flex: 1, minWidth: 0 }}
          >
            {titulo}
          </Texto>
          {logo ? (
            <Image
              source={LOGO}
              accessibilityLabel="Logo Katara Pinturas e Efeitos"
              style={estilos.logo}
            />
          ) : null}
          {acao ? <Botao titulo={acao.titulo} icone="mais" onPress={acao.onPress} style={estilos.acao} /> : null}
        </View>

        {rolar ? (
          <ScrollView
            ref={refRolagem}
            style={{ flex: 1 }}
            contentContainerStyle={[
              estilos.conteudo,
              { paddingBottom: (rodape ? 24 : comAbas ? 110 : 32) + (rodape ? 0 : insets.bottom) },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshControl={refresh}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[estilos.conteudo, { flex: 1 }]}>{children}</View>
        )}

        {rodape ? <View style={[estilos.rodape, { paddingBottom: 12 + insets.bottom }]}>{rodape}</View> : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cor.fundo, backgroundImage: gradiente.fundo },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
    minHeight: 64,
  },
  logo: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(255,138,42,0.7)' },
  acao: { minHeight: 44, paddingHorizontal: 16 },
  conteudo: { paddingHorizontal: espaco.tela, paddingTop: 4, gap: espaco.bloco },
  rodape: {
    borderTopWidth: 1,
    borderTopColor: cor.borda,
    backgroundColor: cor.rodape,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
});
