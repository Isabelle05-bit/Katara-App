import { Pressable, StyleSheet, View } from 'react-native';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icone, type NomeIcone } from '../../ui/Icone';
import { Texto } from '../../ui/Texto';
import { cor, fonte, gradiente } from '../../ui/tema';

const ABAS: Record<string, { rotulo: string; icone: NomeIcone }> = {
  index: { rotulo: 'Início', icone: 'inicio' },
  orcamentos: { rotulo: 'Orçamentos', icone: 'orcamentos' },
  atendimentos: { rotulo: 'Atendimentos', icone: 'atendimentos' },
  cadastros: { rotulo: 'Cadastros', icone: 'cadastros' },
  ajustes: { rotulo: 'Ajustes', icone: 'ajustes' },
};

/** Barra flutuante do protótipo, com rótulo sempre visível (público com pouca familiaridade). */
function BarraDeAbas({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[estilos.envolve, { paddingBottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <View style={estilos.barra} accessibilityRole="tablist">
        {state.routes.map((rota, i) => {
          const aba = ABAS[rota.name];
          if (!aba) return null;
          const ativa = state.index === i;
          return (
            <Pressable
              key={rota.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: ativa }}
              accessibilityLabel={aba.rotulo}
              onPress={() => navigateToTab(rota.key)}
              style={estilos.aba}
            >
              <View style={[estilos.icone, ativa && { backgroundImage: gradiente.acao }]}>
                <Icone nome={aba.icone} cor={ativa ? cor.branco : cor.texto2} tamanho={22} />
              </View>
              <Texto
                numberOfLines={1}
                adjustsFontSizeToFit
                maxFontSizeMultiplier={1.3}
                style={{ fontFamily: ativa ? fonte.forte : fonte.media, fontSize: 11 }}
                cor={ativa ? cor.texto : cor.texto2}
              >
                {aba.rotulo}
              </Texto>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function LayoutAbas() {
  return (
    <Tabs
      tabBar={(props) => <BarraDeAbas {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: cor.fundo } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="orcamentos" />
      <Tabs.Screen name="atendimentos" />
      <Tabs.Screen name="cadastros" />
      <Tabs.Screen name="ajustes" />
    </Tabs>
  );
}

const estilos = StyleSheet.create({
  envolve: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12 },
  barra: {
    flexDirection: 'row',
    backgroundColor: 'rgba(28,25,22,0.96)',
    borderWidth: 1,
    borderColor: cor.borda,
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 4,
    boxShadow: '0px 14px 30px rgba(0,0,0,0.5)',
  },
  aba: { flex: 1, alignItems: 'center', gap: 3, minHeight: 56, justifyContent: 'center', paddingHorizontal: 2 },
  icone: { width: 52, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
