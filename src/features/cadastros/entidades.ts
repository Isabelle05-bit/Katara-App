import type { NomeIcone } from '../../ui/Icone';

/** As 5 listas de cadastro. A chave é o segmento da rota /cadastros/[entidade]. */
export const ENTIDADES = {
  clientes: { rotulo: 'Clientes', um: 'cliente', icone: 'pessoa', vazio: 'Cadastre seu primeiro cliente' },
  funcionarios: { rotulo: 'Funcionários', um: 'funcionário', icone: 'equipe', vazio: 'Cadastre quem trabalha com você' },
  materiais: { rotulo: 'Materiais', um: 'material', icone: 'material', vazio: 'Cadastre tintas, massas e outros materiais' },
  servicos: { rotulo: 'Serviços', um: 'serviço', icone: 'tinta', vazio: 'Cadastre o primeiro serviço (ex.: Pintura interna)' },
  ferramentas: { rotulo: 'Ferramentas', um: 'ferramenta', icone: 'ferramenta', vazio: 'Cadastre as ferramentas que você usa' },
} as const satisfies Record<string, { rotulo: string; um: string; icone: NomeIcone; vazio: string }>;

export type Entidade = keyof typeof ENTIDADES;

export const ehEntidade = (s: unknown): s is Entidade => typeof s === 'string' && s in ENTIDADES;
