import type { StatusAtendimento, StatusOrcamento } from '../domain/tipos';

/**
 * Tokens de design do protótipo aprovado (artboard "Resumo de design e tokens").
 * Fundo preto com respingos azul, vermelho, amarelo e verde-azulado (logo).
 */
export const cor = {
  fundo: '#0C0B0A',
  superficie: '#181614',
  superficie2: '#24211E',
  rodape: '#0F0F12',
  borda: 'rgba(255,255,255,0.09)',
  bordaForte: 'rgba(255,255,255,0.14)',
  campo: 'rgba(255,255,255,0.04)',
  campoBorda: 'rgba(255,255,255,0.12)',
  texto: '#F7F3EE',
  texto2: '#BDB5AB',
  texto3: '#8A8279',
  acao: '#FF5A36',
  acaoInicio: '#FF8A2A',
  acaoFim: '#E8402A',
  azul: '#6C8CFF',
  azulClaro: '#A9BEFF',
  amarelo: '#FFC857',
  verde: '#5EE0C8',
  erro: '#FF8A7A',
  cinza: '#C9C9D1',
  branco: '#FFFFFF',
} as const;

export const gradiente = {
  acao: `linear-gradient(135deg, ${cor.acaoInicio}, ${cor.acaoFim})`,
  destaque: 'linear-gradient(135deg, #FF9A3C 0%, #F2552C 58%, #C9301F 100%)',
  /** Respingos das cores da marca sobre o preto. */
  fundo:
    'radial-gradient(60% 35% at 100% 0%, rgba(232,64,42,0.30) 0%, rgba(232,64,42,0) 100%), ' +
    'radial-gradient(55% 30% at 0% 8%, rgba(108,140,255,0.22) 0%, rgba(108,140,255,0) 100%), ' +
    'radial-gradient(50% 25% at 100% 100%, rgba(94,224,200,0.14) 0%, rgba(94,224,200,0) 100%), ' +
    'radial-gradient(45% 22% at 0% 92%, rgba(255,200,87,0.12) 0%, rgba(255,200,87,0) 100%)',
} as const;

export const raio = { campo: 22, botao: 999, card: 28, destaque: 32, chip: 999, pequeno: 12 } as const;
export const espaco = { tela: 16, bloco: 12, card: 18 } as const;
export const toque = { minimo: 44, botao: 52, botaoGrande: 56 } as const;

export const fonte = {
  leve: 'Inter_300Light',
  normal: 'Inter_400Regular',
  media: 'Inter_500Medium',
  forte: 'Inter_600SemiBold',
} as const;

/** Status SEMPRE com texto, nunca só cor. [rótulo, cor do texto] */
export const STATUS_ORC: Record<StatusOrcamento, { rotulo: string; cor: string }> = {
  pendente: { rotulo: 'Pendente', cor: cor.amarelo },
  aprovado: { rotulo: 'Aprovado', cor: cor.verde },
  recusado: { rotulo: 'Recusado', cor: cor.erro },
};

export const STATUS_ATEND: Record<StatusAtendimento, { rotulo: string; cor: string }> = {
  aguardando_agendamento: { rotulo: 'Aguardando agendamento', cor: cor.cinza },
  em_andamento: { rotulo: 'Em andamento', cor: cor.azulClaro },
  aguardando_cliente: { rotulo: 'Aguardando cliente', cor: cor.amarelo },
  concluido: { rotulo: 'Concluído', cor: cor.verde },
};

/** Fundo translúcido a partir de uma cor hex (#RRGGBB) — o "chip" do protótipo. */
export const fundoDe = (hex: string, alfa = 0.14) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alfa})`;
};
