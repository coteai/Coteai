import { supabase } from '../lib/supabase';
import type {
  Evento,
  EventoEtapaConfig,
  EventoOrcamento,
  EventoPeca,
  EventoHistorico,
  EventoArquivo,
  EventoStatus,
  PecaStatus,
  EventoPublicoPayload,
  SgaAssociado,
  SgaVeiculo,
} from '../types/events';
import {
  DEFAULT_STAGES,
  MOCK_EVENTOS,
  MOCK_ORCAMENTOS,
  MOCK_PECAS,
  MOCK_HISTORICO,
  MOCK_ARQUIVOS,
  MOCK_ASSOCIADOS,
  MOCK_VEICULOS,
} from '../utils/eventsMockData';

// Estado em memória para persistência local de testes quando offline ou sem migração aplicada
let localEventos = [...MOCK_EVENTOS];
let localOrcamentos: Record<string, EventoOrcamento[]> = { ...MOCK_ORCAMENTOS };
let localPecas: Record<string, EventoPeca[]> = { ...MOCK_PECAS };
let localHistorico: Record<string, EventoHistorico[]> = { ...MOCK_HISTORICO };
let localArquivos: Record<string, EventoArquivo[]> = { ...MOCK_ARQUIVOS };
let localEtapas = [...DEFAULT_STAGES];

export async function fetchEtapasConfig(assocId: string): Promise<EventoEtapaConfig[]> {
  try {
    const { data, error } = await supabase
      .from('evento_etapas_config')
      .select('*')
      .eq('associacao_id', assocId)
      .eq('ativa', true)
      .order('ordem', { ascending: true });

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn('Erro ao carregar etapas do Supabase, usando padrão local:', err);
  }
  return localEtapas;
}

export async function updateEtapaConfig(
  etapaId: string,
  updates: Partial<EventoEtapaConfig>
): Promise<EventoEtapaConfig | null> {
  try {
    const { data, error } = await supabase
      .from('evento_etapas_config')
      .update(updates)
      .eq('id', etapaId)
      .select()
      .single();

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn('Atualizando etapa localmente:', err);
  }

  localEtapas = localEtapas.map((e) => (e.id === etapaId ? { ...e, ...updates } : e));
  return localEtapas.find((e) => e.id === etapaId) || null;
}

export async function fetchEventos(
  assocId: string,
  filters?: {
    status?: string;
    etapaId?: string;
    consultorId?: string;
    search?: string;
  }
): Promise<Evento[]> {
  try {
    let query = supabase
      .from('eventos')
      .select(`
        *,
        associado:sga_associados(*),
        veiculo:sga_veiculos(*),
        etapa_atual:evento_etapas_config(*),
        consultor:consultants(id, nome)
      `)
      .eq('associacao_id', assocId)
      .order('data_abertura', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.etapaId && filters.etapaId !== 'all') {
      query = query.eq('etapa_atual_id', filters.etapaId);
    }
    if (filters?.consultorId && filters.consultorId !== 'all') {
      query = query.eq('consultor_id', filters.consultorId);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      if (filters?.search) {
        const term = filters.search.toLowerCase().trim();
        return data.filter(
          (e: any) =>
            (e.protocolo || '').toLowerCase().includes(term) ||
            (e.veiculo?.placa || '').toLowerCase().includes(term) ||
            (e.associado?.nome || '').toLowerCase().includes(term) ||
            (e.descricao || '').toLowerCase().includes(term)
        );
      }
      return data;
    }
  } catch (err) {
    console.warn('Tabela eventos indisponível ou vazia, usando dados simulados:', err);
  }

  // Fallback nos dados simulados
  let list = [...localEventos];
  if (filters?.status && filters.status !== 'all') {
    list = list.filter((e) => e.status === filters.status);
  }
  if (filters?.etapaId && filters.etapaId !== 'all') {
    list = list.filter((e) => e.etapa_atual_id === filters.etapaId);
  }
  if (filters?.consultorId && filters.consultorId !== 'all') {
    list = list.filter((e) => e.consultor_id === filters.consultorId);
  }
  if (filters?.search) {
    const term = filters.search.toLowerCase().trim();
    list = list.filter(
      (e) =>
        (e.protocolo || '').toLowerCase().includes(term) ||
        (e.veiculo?.placa || '').toLowerCase().includes(term) ||
        (e.associado?.nome || '').toLowerCase().includes(term) ||
        (e.descricao || '').toLowerCase().includes(term)
    );
  }
  return list;
}

export async function createEvento(
  assocId: string,
  novoEvento: {
    tipo: Evento['tipo'];
    associado_id: string;
    veiculo_id: string;
    consultor_id?: string;
    data_ocorrencia: string;
    descricao?: string;
    criado_por?: string;
  }
): Promise<Evento> {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const ano = new Date().getFullYear();
  const protocolo = `EVT-${ano}-${randomSuffix}`;
  const token = `track-${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;

  const payload: Partial<Evento> = {
    associacao_id: assocId,
    protocolo,
    tipo: novoEvento.tipo,
    associado_id: novoEvento.associado_id,
    veiculo_id: novoEvento.veiculo_id,
    consultor_id: novoEvento.consultor_id || null,
    data_ocorrencia: novoEvento.data_ocorrencia,
    data_abertura: new Date().toISOString(),
    etapa_atual_id: 'stage-1',
    status: 'aberto',
    valor_total_aprovado: 0,
    token_acompanhamento: token,
    descricao: novoEvento.descricao || '',
    criado_por: novoEvento.criado_por || 'Sistema',
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('eventos')
      .insert([payload])
      .select(`
        *,
        associado:sga_associados(*),
        veiculo:sga_veiculos(*),
        etapa_atual:evento_etapas_config(*),
        consultor:consultants(id, nome)
      `)
      .single();

    if (!error && data) {
      // Cria histórico inicial
      await supabase.from('evento_historico').insert([
        {
          evento_id: data.id,
          etapa_id: data.etapa_atual_id,
          usuario_id: novoEvento.criado_por || 'Sistema',
          observacao: 'Abertura de sinistro registrada.',
        },
      ]);
      return data;
    }
  } catch (err) {
    console.warn('Erro ao inserir evento no Supabase, registrando localmente:', err);
  }

  // Fallback local
  const assoc = MOCK_ASSOCIADOS.find((a) => a.id === novoEvento.associado_id) || {
    id: novoEvento.associado_id,
    associacao_id: assocId,
    id_externo: 'SGA-NOVO',
    nome: 'Associado Selecionado',
    cpf_cnpj: '000.000.000-00',
    situacao: 'ativo',
  };

  const veic = MOCK_VEICULOS.find((v) => v.id === novoEvento.veiculo_id) || {
    id: novoEvento.veiculo_id,
    associacao_id: assocId,
    id_externo: 'V-NOVO',
    associado_id: assoc.id,
    placa: 'NOVO-000',
    modelo: 'Veículo Selecionado',
  };

  const createdEvento: Evento = {
    ...payload,
    id: `evt-${Date.now()}`,
    associado: assoc,
    veiculo: veic,
    etapa_atual: DEFAULT_STAGES[0],
    consultor: novoEvento.consultor_id ? { id: novoEvento.consultor_id, nome: 'Consultor' } : null,
  } as Evento;

  localEventos.unshift(createdEvento);
  localHistorico[createdEvento.id] = [
    {
      id: `hist-${Date.now()}`,
      evento_id: createdEvento.id,
      etapa_id: 'stage-1',
      usuario_id: novoEvento.criado_por || 'Sistema',
      observacao: 'Abertura de sinistro registrada no sistema.',
      criado_em: new Date().toISOString(),
      etapa: DEFAULT_STAGES[0],
    },
  ];

  return createdEvento;
}

export async function updateEventoStatus(
  eventoId: string,
  novoStatus: EventoStatus
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('eventos')
      .update({ status: novoStatus, atualizado_em: new Date().toISOString() })
      .eq('id', eventoId);
    if (!error) return true;
  } catch (err) {
    console.warn('Atualizando status localmente:', err);
  }

  localEventos = localEventos.map((e) =>
    e.id === eventoId ? { ...e, status: novoStatus, atualizado_em: new Date().toISOString() } : e
  );
  return true;
}

export async function advanceEventoEtapa(
  eventoId: string,
  novaEtapaId: string,
  observacao?: string,
  usuario?: string
): Promise<boolean> {
  try {
    const { error: evtErr } = await supabase
      .from('eventos')
      .update({ etapa_atual_id: novaEtapaId, atualizado_em: new Date().toISOString() })
      .eq('id', eventoId);

    const { error: histErr } = await supabase.from('evento_historico').insert([
      {
        evento_id: eventoId,
        etapa_id: novaEtapaId,
        usuario_id: usuario || 'Gestor',
        observacao: observacao || 'Avanço de etapa no fluxo de sinistro.',
      },
    ]);

    if (!evtErr && !histErr) return true;
  } catch (err) {
    console.warn('Avançando etapa localmente:', err);
  }

  const etapaObj = localEtapas.find((e) => e.id === novaEtapaId);
  localEventos = localEventos.map((e) =>
    e.id === eventoId
      ? { ...e, etapa_atual_id: novaEtapaId, etapa_atual: etapaObj || e.etapa_atual }
      : e
  );

  const histItem: EventoHistorico = {
    id: `hist-${Date.now()}`,
    evento_id: eventoId,
    etapa_id: novaEtapaId,
    usuario_id: usuario || 'Gestor',
    observacao: observacao || 'Avanço de etapa registrado.',
    criado_em: new Date().toISOString(),
    etapa: etapaObj || null,
  };

  if (!localHistorico[eventoId]) localHistorico[eventoId] = [];
  localHistorico[eventoId].unshift(histItem);

  return true;
}

export async function fetchEventoHistorico(eventoId: string): Promise<EventoHistorico[]> {
  try {
    const { data, error } = await supabase
      .from('evento_historico')
      .select('*, etapa:evento_etapas_config(*)')
      .eq('evento_id', eventoId)
      .order('criado_em', { ascending: false });

    if (!error && data && data.length > 0) return data;
  } catch (err) {
    console.warn('Carregando histórico simulado:', err);
  }
  return localHistorico[eventoId] || [];
}

export async function fetchOrcamentos(eventoId: string): Promise<EventoOrcamento[]> {
  try {
    const { data, error } = await supabase
      .from('evento_orcamentos')
      .select('*')
      .eq('evento_id', eventoId)
      .order('valor_total', { ascending: true });

    if (!error && data && data.length > 0) return data;
  } catch (err) {
    console.warn('Carregando orçamentos simulados:', err);
  }
  return localOrcamentos[eventoId] || [];
}

export async function saveOrcamento(
  orcamento: Omit<EventoOrcamento, 'id' | 'criado_em'>
): Promise<EventoOrcamento> {
  try {
    const { data, error } = await supabase
      .from('evento_orcamentos')
      .insert([orcamento])
      .select()
      .single();
    if (!error && data) return data;
  } catch (err) {
    console.warn('Salvando orçamento localmente:', err);
  }

  const created: EventoOrcamento = {
    ...orcamento,
    id: `orc-${Date.now()}`,
    criado_em: new Date().toISOString(),
  };

  if (!localOrcamentos[orcamento.evento_id]) localOrcamentos[orcamento.evento_id] = [];
  localOrcamentos[orcamento.evento_id].push(created);
  return created;
}

export async function approveOrcamento(
  eventoId: string,
  orcamentoId: string,
  aprovadoPor: string
): Promise<boolean> {
  try {
    // Busca o orçamento a ser aprovado para saber o valor
    const { data: targetOrc } = await supabase
      .from('evento_orcamentos')
      .select('valor_total')
      .eq('id', orcamentoId)
      .single();

    if (targetOrc) {
      // Desmarca outros
      await supabase
        .from('evento_orcamentos')
        .update({ aprovado: false, aprovado_por: null, aprovado_em: null })
        .eq('evento_id', eventoId);

      // Marca o selecionado como aprovado
      await supabase
        .from('evento_orcamentos')
        .update({
          aprovado: true,
          aprovado_por: aprovadoPor,
          aprovado_em: new Date().toISOString(),
        })
        .eq('id', orcamentoId);

      // Atualiza o evento
      await supabase
        .from('eventos')
        .update({
          valor_total_aprovado: targetOrc.valor_total,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', eventoId);

      return true;
    }
  } catch (err) {
    console.warn('Aprovando orçamento localmente:', err);
  }

  const list = localOrcamentos[eventoId] || [];
  let approvedValue = 0;
  const updated = list.map((o) => {
    if (o.id === orcamentoId) {
      approvedValue = o.valor_total;
      return {
        ...o,
        aprovado: true,
        aprovado_por: aprovadoPor,
        aprovado_em: new Date().toISOString(),
      };
    }
    return { ...o, aprovado: false, aprovado_por: null, aprovado_em: null };
  });

  localOrcamentos[eventoId] = updated;
  localEventos = localEventos.map((e) =>
    e.id === eventoId ? { ...e, valor_total_aprovado: approvedValue } : e
  );

  return true;
}

export async function fetchPecas(eventoId: string): Promise<EventoPeca[]> {
  try {
    const { data, error } = await supabase
      .from('evento_pecas')
      .select('*')
      .eq('evento_id', eventoId)
      .order('criado_em', { ascending: true });

    if (!error && data && data.length > 0) return data;
  } catch (err) {
    console.warn('Carregando peças simuladas:', err);
  }
  return localPecas[eventoId] || [];
}

export async function savePeca(peca: Omit<EventoPeca, 'id' | 'criado_em'>): Promise<EventoPeca> {
  try {
    const { data, error } = await supabase
      .from('evento_pecas')
      .insert([peca])
      .select()
      .single();
    if (!error && data) return data;
  } catch (err) {
    console.warn('Salvando peça localmente:', err);
  }

  const created: EventoPeca = {
    ...peca,
    id: `peca-${Date.now()}`,
    criado_em: new Date().toISOString(),
  };

  if (!localPecas[peca.evento_id]) localPecas[peca.evento_id] = [];
  localPecas[peca.evento_id].push(created);
  return created;
}

export async function updatePecaStatus(pecaId: string, status: PecaStatus): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('evento_pecas')
      .update({ status })
      .eq('id', pecaId);
    if (!error) return true;
  } catch (err) {
    console.warn('Atualizando status da peça localmente:', err);
  }

  for (const eventoId in localPecas) {
    localPecas[eventoId] = localPecas[eventoId].map((p) =>
      p.id === pecaId ? { ...p, status } : p
    );
  }
  return true;
}

export async function fetchArquivos(eventoId: string): Promise<EventoArquivo[]> {
  try {
    const { data, error } = await supabase
      .from('evento_arquivos')
      .select('*')
      .eq('evento_id', eventoId)
      .order('criado_em', { ascending: false });

    if (!error && data && data.length > 0) return data;
  } catch (err) {
    console.warn('Carregando arquivos simulados:', err);
  }
  return localArquivos[eventoId] || [];
}

export async function uploadArquivo(
  eventoId: string,
  arquivo: { nome: string; tipo: EventoArquivo['tipo']; caminho_storage?: string; enviado_por?: string }
): Promise<EventoArquivo> {
  const caminho = arquivo.caminho_storage || `eventos/${eventoId}/${Date.now()}_${arquivo.nome}`;
  const payload: Omit<EventoArquivo, 'id' | 'criado_em'> = {
    evento_id: eventoId,
    nome: arquivo.nome,
    tipo: arquivo.tipo,
    caminho_storage: caminho,
    enviado_por: arquivo.enviado_por || 'Usuário',
  };

  try {
    const { data, error } = await supabase
      .from('evento_arquivos')
      .insert([payload])
      .select()
      .single();
    if (!error && data) return data;
  } catch (err) {
    console.warn('Salvando arquivo localmente:', err);
  }

  const created: EventoArquivo = {
    ...payload,
    id: `arq-${Date.now()}`,
    criado_em: new Date().toISOString(),
  };

  if (!localArquivos[eventoId]) localArquivos[eventoId] = [];
  localArquivos[eventoId].unshift(created);
  return created;
}

export async function fetchSgaAssociados(assocId: string): Promise<SgaAssociado[]> {
  try {
    const { data, error } = await supabase
      .from('sga_associados')
      .select('*')
      .eq('associacao_id', assocId)
      .order('nome');
    if (!error && data && data.length > 0) return data;
  } catch (err) {}
  return MOCK_ASSOCIADOS;
}

export async function fetchSgaVeiculos(associadoId?: string): Promise<SgaVeiculo[]> {
  try {
    let query = supabase.from('sga_veiculos').select('*');
    if (associadoId) query = query.eq('associado_id', associadoId);
    const { data, error } = await query;
    if (!error && data && data.length > 0) return data;
  } catch (err) {}

  if (associadoId) {
    return MOCK_VEICULOS.filter((v) => v.associado_id === associadoId);
  }
  return MOCK_VEICULOS;
}

export async function getEventoPublico(token: string): Promise<EventoPublicoPayload | null> {
  try {
    const { data, error } = await supabase.rpc('get_evento_publico', { p_token: token });
    if (!error && data) {
      return data as EventoPublicoPayload;
    }
  } catch (err) {
    console.warn('RPC get_evento_publico falhou, buscando dados locais:', err);
  }

  // Fallback seguro em dados simulados
  const evt = localEventos.find((e) => e.token_acompanhamento === token) || localEventos[0];
  if (!evt) return null;

  const todasEtapas = localEtapas.map((et) => {
    const atualOrdem = evt.etapa_atual?.ordem || 1;
    return {
      id: et.id,
      nome: et.nome,
      ordem: et.ordem,
      concluida: et.ordem <= atualOrdem,
    };
  });

  const historicoSeguro = (localHistorico[evt.id] || []).map((h) => ({
    etapa_nome: h.etapa?.nome || 'Etapa',
    ordem: h.etapa?.ordem || 1,
    data_hora: h.criado_em,
  }));

  return {
    protocolo: evt.protocolo,
    tipo: evt.tipo,
    status: evt.status,
    data_ocorrencia: evt.data_ocorrencia,
    data_abertura: evt.data_abertura,
    veiculo: {
      modelo: evt.veiculo?.modelo,
      marca: evt.veiculo?.marca,
      ano: evt.veiculo?.ano,
      placa_mascarada: evt.veiculo?.placa ? `${evt.veiculo.placa.substring(0, 3)}***` : '***',
    },
    associacao: {
      nome: 'Cote AI Proteção Veicular',
      cor_primaria: '#3B82F6',
      whatsapp: '(31) 99999-8888',
    },
    etapa_atual: evt.etapa_atual
      ? { id: evt.etapa_atual.id, nome: evt.etapa_atual.nome, ordem: evt.etapa_atual.ordem }
      : undefined,
    todas_etapas: todasEtapas,
    historico: historicoSeguro,
  };
}
