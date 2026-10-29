export type SgaSituacaoAssociado = 'ativo' | 'inadimplente' | 'cancelado' | 'suspenso';

export interface SgaAssociado {
  id: string;
  associacao_id: string;
  id_externo: string;
  nome: string;
  cpf_cnpj: string;
  telefone?: string;
  email?: string;
  situacao: SgaSituacaoAssociado;
  data_adesao?: string;
  data_cancelamento?: string | null;
  consultor_id?: string | null;
  dados_brutos?: Record<string, any>;
  atualizado_em?: string;
}

export interface SgaVeiculo {
  id: string;
  associacao_id: string;
  id_externo: string;
  associado_id: string;
  placa: string;
  marca?: string;
  modelo?: string;
  ano?: number;
  valor_fipe?: number;
  situacao?: string;
  plano?: string;
  dados_brutos?: Record<string, any>;
  atualizado_em?: string;
}

export type SgaSituacaoMensalidade = 'aberta' | 'paga' | 'atrasada' | 'cancelada';

export interface SgaMensalidade {
  id: string;
  associacao_id: string;
  id_externo: string;
  associado_id: string;
  veiculo_id?: string | null;
  competencia: string;
  valor: number;
  data_vencimento: string;
  data_pagamento?: string | null;
  situacao: SgaSituacaoMensalidade;
  atualizado_em?: string;
}

export type EventoTipo =
  | 'colisao'
  | 'roubo_furto'
  | 'perda_total'
  | 'vidros'
  | 'outros'
  | 'alagamento'
  | 'incendio';

export type EventoStatus = 'aberto' | 'em_andamento' | 'concluido' | 'cancelado';

export interface EventoEtapaConfig {
  id: string;
  associacao_id: string;
  nome: string;
  ordem: number;
  ativa: boolean;
  notificar_whatsapp: boolean;
  criado_em?: string;
}

export interface Evento {
  id: string;
  associacao_id: string;
  protocolo: string;
  associado_id?: string | null;
  veiculo_id?: string | null;
  consultor_id?: string | null;
  tipo: EventoTipo;
  descricao?: string;
  data_ocorrencia: string;
  data_abertura: string;
  etapa_atual_id?: string | null;
  status: EventoStatus;
  valor_total_aprovado: number;
  token_acompanhamento: string;
  id_externo_sga?: string | null;
  criado_por?: string | null;
  criado_em: string;
  atualizado_em: string;
  // Joins opcionais
  associado?: SgaAssociado | null;
  veiculo?: SgaVeiculo | null;
  etapa_atual?: EventoEtapaConfig | null;
  consultor?: { id: string; nome: string } | null;
}

export interface EventoHistorico {
  id: string;
  evento_id: string;
  etapa_id?: string | null;
  usuario_id?: string | null;
  observacao?: string;
  criado_em: string;
  etapa?: EventoEtapaConfig | null;
}

export type PecaStatus = 'a_comprar' | 'comprada' | 'a_caminho' | 'recebida';

export interface EventoPeca {
  id: string;
  evento_id: string;
  descricao: string;
  quantidade: number;
  fornecedor?: string;
  valor_unitario: number;
  status: PecaStatus;
  previsao_chegada?: string | null;
  observacao?: string;
  criado_em?: string;
}

export type OrcamentoTipo = 'pecas' | 'mao_de_obra' | 'completo';

export interface EventoOrcamento {
  id: string;
  evento_id: string;
  fornecedor_ou_oficina: string;
  tipo: OrcamentoTipo;
  valor_total: number;
  prazo_dias?: number;
  observacao?: string;
  aprovado: boolean;
  aprovado_por?: string | null;
  aprovado_em?: string | null;
  criado_em?: string;
}

export type ArquivoTipo = 'foto' | 'documento' | 'nota_fiscal' | 'laudo';

export interface EventoArquivo {
  id: string;
  evento_id: string;
  tipo: ArquivoTipo;
  caminho_storage: string;
  nome: string;
  enviado_por?: string;
  criado_em: string;
}

export interface IndicadoresComerciais {
  competencia: string;
  entradas_mes: number;
  receita_mes: number;
  ticket_medio: number;
  taxa_churn: number;
  taxa_inadimplencia: number;
  taxa_sinistralidade: number;
  rentabilidade_base: number;
  indice_qualidade_base: number;
  // Comparativos vs mês anterior (em % ou valor absoluto)
  variacao_entradas?: number;
  variacao_receita?: number;
  variacao_ticket_medio?: number;
  variacao_churn?: number;
  variacao_inadimplencia?: number;
  variacao_sinistralidade?: number;
  variacao_rentabilidade?: number;
  variacao_qualidade?: number;
}

export interface SnapshotMensal {
  id: string;
  associacao_id: string;
  competencia: string;
  ativos: number;
  inadimplentes: number;
  cancelados: number;
  entradas: number;
  receita_faturada: number;
  receita_recebida: number;
  valor_em_atraso: number;
  custo_eventos: number;
  criado_em?: string;
}

export interface IndicadoresParametros {
  id: string;
  associacao_id: string;
  peso_adimplencia: number;
  peso_tempo_casa: number;
  peso_sinistralidade: number;
  meta_sinistralidade: number;
}

export interface EventoPublicoPayload {
  protocolo: string;
  tipo: EventoTipo;
  status: EventoStatus;
  data_ocorrencia: string;
  data_abertura: string;
  veiculo: {
    modelo?: string;
    marca?: string;
    ano?: number;
    placa_mascarada?: string;
  };
  associacao: {
    nome: string;
    logo_url?: string;
    cor_primaria?: string;
    whatsapp?: string;
  };
  etapa_atual?: {
    id: string;
    nome: string;
    ordem: number;
  };
  todas_etapas: Array<{
    id: string;
    nome: string;
    ordem: number;
    concluida: boolean;
  }>;
  historico: Array<{
    etapa_nome?: string;
    ordem?: number;
    data_hora: string;
  }>;
}
