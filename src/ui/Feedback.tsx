import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Botao } from './Botao';
import { Icone } from './Icone';
import { Texto } from './Texto';
import { cor, fonte } from './tema';

/**
 * Feedback visual em toda ação:
 * - avisar('Orçamento salvo')            → toast que some sozinho
 * - avisar(erro, 'erro')                 → toast vermelho (aceita Error)
 * - await confirmar({...})               → modal de confirmação (true/false)
 */

type TipoAviso = 'ok' | 'erro';

export interface OpcoesConfirmacao {
  titulo: string;
  texto: string;
  botao: string;
  perigo?: boolean;
}

interface FeedbackApi {
  avisar: (mensagem: string | unknown, tipo?: TipoAviso) => void;
  confirmar: (opcoes: OpcoesConfirmacao) => Promise<boolean>;
}

const Contexto = createContext<FeedbackApi | null>(null);

export function useFeedback() {
  const api = useContext(Contexto);
  if (!api) throw new Error('useFeedback precisa estar dentro de <FeedbackProvider>');
  return api;
}

/** Mensagem amigável a partir de qualquer erro. */
export function mensagemDeErro(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === 'string') return e;
  return 'Algo deu errado. Tente de novo.';
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [aviso, setAviso] = useState<{ texto: string; tipo: TipoAviso; id: number } | null>(null);
  const [confirmacao, setConfirmacao] = useState<OpcoesConfirmacao | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const avisar = useCallback((mensagem: string | unknown, tipo: TipoAviso = 'ok') => {
    const texto = typeof mensagem === 'string' ? mensagem : mensagemDeErro(mensagem);
    setAviso({ texto, tipo, id: Date.now() });
    AccessibilityInfo.announceForAccessibility(texto);
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), aviso.tipo === 'erro' ? 5000 : 2600);
    return () => clearTimeout(t);
  }, [aviso]);

  const confirmar = useCallback(
    (opcoes: OpcoesConfirmacao) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setConfirmacao(opcoes);
      }),
    []
  );

  const responder = (ok: boolean) => {
    setConfirmacao(null);
    resolver.current?.(ok);
    resolver.current = null;
  };

  const api = useMemo(() => ({ avisar, confirmar }), [avisar, confirmar]);

  return (
    <Contexto.Provider value={api}>
      {children}

      {aviso ? (
        <Pressable
          key={aviso.id}
          onPress={() => setAviso(null)}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[
            estilos.toast,
            { bottom: insets.bottom + 96 },
            aviso.tipo === 'erro' && { backgroundColor: '#3A1714', borderColor: 'rgba(255,138,122,0.5)', borderWidth: 1 },
          ]}
        >
          <Icone nome={aviso.tipo === 'erro' ? 'erro' : 'ok'} cor={aviso.tipo === 'erro' ? cor.erro : '#1a7f74'} />
          <Texto style={{ flex: 1, fontFamily: fonte.forte, fontSize: 15 }} cor={aviso.tipo === 'erro' ? cor.erro : cor.fundo}>
            {aviso.texto}
          </Texto>
        </Pressable>
      ) : null}

      <Modal
        visible={!!confirmacao}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => responder(false)}
      >
        <View style={estilos.fundoModal}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Fechar" onPress={() => responder(false)} />
          <View
            accessibilityViewIsModal
            style={[estilos.folha, { paddingBottom: 24 + insets.bottom }]}
          >
            <Texto variante="tituloMenor" accessibilityRole="header">
              {confirmacao?.titulo}
            </Texto>
            <Texto variante="apoio">{confirmacao?.texto}</Texto>
            <Botao
              titulo={confirmacao?.botao ?? 'Confirmar'}
              variante={confirmacao?.perigo ? 'perigo' : 'primario'}
              onPress={() => responder(true)}
              style={confirmacao?.perigo ? { backgroundColor: 'rgba(255,138,122,0.12)' } : undefined}
            />
            <Botao titulo="Cancelar" variante="secundario" onPress={() => responder(false)} />
          </View>
        </View>
      </Modal>
    </Contexto.Provider>
  );
}

const estilos = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: cor.texto,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 14,
    boxShadow: '0px 8px 24px rgba(0,0,0,0.5)',
  },
  fundoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  folha: {
    backgroundColor: cor.superficie2,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 16,
    paddingTop: 22,
    gap: 12,
  },
});
