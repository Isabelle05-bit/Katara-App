import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { cor } from './tema';

/**
 * Ícones do sistema: Material Symbols no Android e SF Symbols no iPhone.
 * Um nome nosso → o nome de cada plataforma.
 */
const ICONES = {
  inicio: { ios: 'house', android: 'home' },
  orcamentos: { ios: 'doc.text', android: 'description' },
  atendimentos: { ios: 'calendar.badge.checkmark', android: 'event_available' },
  cadastros: { ios: 'square.grid.2x2', android: 'grid_view' },
  ajustes: { ios: 'gearshape', android: 'settings' },
  mais: { ios: 'plus', android: 'add' },
  fechar: { ios: 'xmark', android: 'close' },
  voltar: { ios: 'chevron.left', android: 'arrow_back' },
  esquerda: { ios: 'chevron.left', android: 'chevron_left' },
  direita: { ios: 'chevron.right', android: 'chevron_right' },
  buscar: { ios: 'magnifyingglass', android: 'search' },
  check: { ios: 'checkmark', android: 'check' },
  menos: { ios: 'minus', android: 'remove' },
  compartilhar: { ios: 'square.and.arrow.up', android: 'share' },
  arquivar: { ios: 'archivebox', android: 'archive' },
  editar: { ios: 'pencil', android: 'edit' },
  duplicar: { ios: 'doc.on.doc', android: 'content_copy' },
  pdf: { ios: 'doc.richtext', android: 'picture_as_pdf' },
  backup: { ios: 'arrow.up.doc', android: 'upload' },
  restaurar: { ios: 'arrow.down.doc', android: 'download' },
  calendario: { ios: 'calendar', android: 'calendar_month' },
  erro: { ios: 'exclamationmark.circle', android: 'error' },
  aviso: { ios: 'exclamationmark.triangle', android: 'warning' },
  ok: { ios: 'checkmark.circle', android: 'check_circle' },
  pessoa: { ios: 'person', android: 'person' },
  equipe: { ios: 'person.2', android: 'groups' },
  ferramenta: { ios: 'hammer', android: 'handyman' },
  tinta: { ios: 'paintbrush', android: 'format_paint' },
  material: { ios: 'shippingbox', android: 'inventory_2' },
  info: { ios: 'info.circle', android: 'info' },
} as const satisfies Record<string, { ios: string; android: string }>;

export type NomeIcone = keyof typeof ICONES;

export function Icone({ nome, tamanho = 22, cor: tint = cor.texto }: { nome: NomeIcone; tamanho?: number; cor?: string }) {
  return (
    <SymbolView
      name={ICONES[nome] as SymbolViewProps['name']}
      size={tamanho}
      tintColor={tint}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
