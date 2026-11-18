import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { formatarData, paraIsoData, deIsoData } from '../lib/datas';
import { formatarBRL } from '../lib/dinheiro';
import { decimalParaTexto, digitosParaCentavos, lerDecimal } from '../lib/entrada';
import { Icone } from './Icone';
import { Texto } from './Texto';
import { cor, fonte, raio } from './tema';

/** Rótulo + campo + mensagem de erro/ajuda. */
export function Rotulado({
  rotulo,
  erro,
  ajuda,
  children,
  flex,
}: {
  rotulo: string;
  erro?: string;
  ajuda?: string;
  children: ReactNode;
  flex?: boolean;
}) {
  return (
    <View style={[{ gap: 6 }, flex && { flex: 1, minWidth: 0 }]}>
      <Texto variante="rotulo" style={{ textTransform: 'none', letterSpacing: 0.3 }}>
        {rotulo}
      </Texto>
      {children}
      {erro ? (
        <Texto variante="legenda" cor={cor.erro} accessibilityLiveRegion="polite">
          {erro}
        </Texto>
      ) : ajuda ? (
        <Texto variante="legenda" cor={cor.texto3}>
          {ajuda}
        </Texto>
      ) : null}
    </View>
  );
}

type BaseProps = { rotulo: string; erro?: string; ajuda?: string; flex?: boolean };

function Entrada({ erro, multiline, style, ...props }: TextInputProps & { erro?: string }) {
  const [foco, setFoco] = useState(false);
  return (
    <TextInput
      placeholderTextColor={cor.texto3}
      selectionColor={cor.acaoInicio}
      cursorColor={cor.acaoInicio}
      {...props}
      multiline={multiline}
      onFocus={(e) => {
        setFoco(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFoco(false);
        props.onBlur?.(e);
      }}
      style={[
        estilos.entrada,
        multiline && estilos.multilinha,
        foco && { borderColor: cor.acaoInicio },
        erro ? { borderColor: cor.erro } : null,
        style,
      ]}
    />
  );
}

export function CampoTexto({
  rotulo,
  erro,
  ajuda,
  flex,
  ...props
}: BaseProps & Omit<TextInputProps, 'style'>) {
  return (
    <Rotulado rotulo={rotulo} erro={erro} ajuda={ajuda} flex={flex}>
      <Entrada accessibilityLabel={rotulo} erro={erro} {...props} />
    </Rotulado>
  );
}

/** Dinheiro digitado em centavos: 1-2-3-4 → R$ 12,34. Valor sempre inteiro. */
export function CampoDinheiro({
  rotulo,
  erro,
  ajuda,
  flex,
  valor,
  onChange,
  onBlur,
}: BaseProps & { valor: number; onChange: (centavos: number) => void; onBlur?: () => void }) {
  return (
    <Rotulado rotulo={rotulo} erro={erro} ajuda={ajuda} flex={flex}>
      <Entrada
        accessibilityLabel={rotulo}
        erro={erro}
        keyboardType="number-pad"
        inputMode="numeric"
        value={formatarBRL(valor || 0)}
        onChangeText={(t) => onChange(digitosParaCentavos(t))}
        onBlur={onBlur}
        selection={{ start: formatarBRL(valor || 0).length, end: formatarBRL(valor || 0).length }}
      />
    </Rotulado>
  );
}

/** Número decimal com vírgula (m², %, consumo). */
export function CampoDecimal({
  rotulo,
  erro,
  ajuda,
  flex,
  valor,
  onChange,
  onBlur,
  sufixo,
  casas = 2,
  placeholder,
}: BaseProps & {
  valor: number | null | undefined;
  onChange: (valor: number | null) => void;
  onBlur?: () => void;
  sufixo?: string;
  casas?: number;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState(decimalParaTexto(valor));
  const [valorVisto, setValorVisto] = useState(valor);
  // Valor mudou de fora (ex.: chip "10%"): atualiza o texto durante a renderização.
  if (valor !== valorVisto) {
    setValorVisto(valor);
    if (lerDecimal(texto, casas).valor !== (valor ?? null)) setTexto(decimalParaTexto(valor));
  }

  return (
    <Rotulado rotulo={rotulo} erro={erro} ajuda={ajuda} flex={flex}>
      <View>
        <Entrada
          accessibilityLabel={rotulo}
          erro={erro}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder={placeholder}
          value={texto}
          onBlur={onBlur}
          onChangeText={(t) => {
            const r = lerDecimal(t, casas);
            setTexto(r.texto);
            onChange(r.valor);
          }}
          style={sufixo ? { paddingRight: 52 } : undefined}
        />
        {sufixo ? (
          <Texto variante="apoio" style={estilos.sufixo} accessibilityElementsHidden>
            {sufixo}
          </Texto>
        ) : null}
      </View>
    </Rotulado>
  );
}

/** Data (AAAA-MM-DD) com o seletor nativo do sistema. */
export function CampoData({
  rotulo,
  erro,
  valor,
  onChange,
  minimo,
}: BaseProps & { valor: string | null; onChange: (iso: string) => void; minimo?: Date }) {
  const [aberto, setAberto] = useState(false);
  return (
    <Rotulado rotulo={rotulo} erro={erro}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${rotulo}: ${valor ? formatarData(valor) : 'sem data'}. Toque para escolher.`}
        onPress={() => setAberto(true)}
        style={({ pressed }) => [estilos.entrada, estilos.data, pressed && { opacity: 0.8 }]}
      >
        <Texto variante="corpo" cor={valor ? cor.texto : cor.texto3}>
          {valor ? formatarData(valor) : 'Escolher data'}
        </Texto>
        <Icone nome="calendario" cor={cor.texto2} />
      </Pressable>
      {aberto ? (
        <DateTimePicker
          value={valor ? deIsoData(valor) : new Date()}
          mode="date"
          presentation="dialog"
          locale="pt-BR"
          themeVariant="dark"
          accentColor={cor.acaoInicio}
          minimumDate={minimo}
          positiveButton={{ label: 'Confirmar' }}
          negativeButton={{ label: 'Cancelar' }}
          onChange={(evento, data) => {
            setAberto(false);
            if (evento.type === 'set' && data) onChange(paraIsoData(data));
          }}
          onDismiss={() => setAberto(false)}
        />
      ) : null}
    </Rotulado>
  );
}

/** − valor + (quantidade, dias). */
export function Contador({
  valor,
  onChange,
  minimo = 1,
  sufixo,
  rotulo,
}: {
  valor: number;
  onChange: (v: number) => void;
  minimo?: number;
  sufixo?: (v: number) => string;
  rotulo: string;
}) {
  const botao = (icone: 'menos' | 'mais', delta: number, texto: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${texto} ${rotulo}`}
      disabled={icone === 'menos' && valor <= minimo}
      onPress={() => onChange(Math.max(minimo, valor + delta))}
      style={({ pressed }) => [
        estilos.contadorBotao,
        pressed && { opacity: 0.7 },
        icone === 'menos' && valor <= minimo && { opacity: 0.35 },
      ]}
    >
      <Icone nome={icone} tamanho={20} />
    </Pressable>
  );
  return (
    <View style={estilos.contador} accessibilityLabel={`${rotulo}: ${valor}`}>
      {botao('menos', -1, 'Diminuir')}
      <Texto variante="corpoForte" style={{ minWidth: 48, textAlign: 'center', fontSize: 18 }}>
        {sufixo ? sufixo(valor) : valor}
      </Texto>
      {botao('mais', 1, 'Aumentar')}
    </View>
  );
}

const estilos = StyleSheet.create({
  entrada: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: cor.campoBorda,
    borderRadius: raio.campo,
    backgroundColor: cor.campo,
    color: cor.texto,
    fontFamily: fonte.media,
    fontSize: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  multilinha: { minHeight: 96, textAlignVertical: 'top', borderRadius: 20 },
  sufixo: { position: 'absolute', right: 18, top: 0, bottom: 0, textAlignVertical: 'center', lineHeight: 52 },
  data: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  contador: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contadorBotao: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
