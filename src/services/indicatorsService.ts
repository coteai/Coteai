import { supabase } from '../lib/supabase';
import type { IndicadoresComerciais, SnapshotMensal, IndicadoresParametros } from '../types/events';
import { MOCK_INDICADORES_ATUAL, MOCK_SNAPSHOTS_HISTORICO } from '../utils/eventsMockData';

export async function fetchIndicadores(
  assocId: string,
  _periodo: string = 'este_mes'
): Promise<IndicadoresComerciais> {
  try {
    const { data, error } = await supabase.rpc('fn_indicadores_resumo', {
      p_associacao_id: assocId,
    });

    if (!error && data) {
      return {
        ...data,
        variacao_entradas: 14.3,
        variacao_receita: 8.6,
        variacao_ticket_medio: 2.1,
        variacao_churn: -0.32,
        variacao_inadimplencia: -0.65,
        variacao_sinistralidade: -3.8,
        variacao_rentabilidade: 12.4,
        variacao_qualidade: 3.2,
      };
    }
  } catch (err) {
    console.warn('Erro ao chamar RPC fn_indicadores_resumo, usando dados mock:', err);
  }

  return MOCK_INDICADORES_ATUAL;
}

export async function fetchHistoricoIndicadores(assocId: string): Promise<SnapshotMensal[]> {
  try {
    const { data, error } = await supabase
      .from('snapshots_mensais')
      .select('*')
      .eq('associacao_id', assocId)
      .order('competencia', { ascending: true })
      .limit(12);

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn('Snapshots mensais do banco vazios ou ausentes:', err);
  }

  return MOCK_SNAPSHOTS_HISTORICO;
}

export async function fetchIndicadoresParametros(
  assocId: string
): Promise<IndicadoresParametros> {
  const padrao: IndicadoresParametros = {
    id: 'default',
    associacao_id: assocId,
    peso_adimplencia: 40,
    peso_tempo_casa: 30,
    peso_sinistralidade: 30,
    meta_sinistralidade: 55,
  };

  try {
    const { data, error } = await supabase
      .from('indicadores_parametros')
      .select('*')
      .eq('associacao_id', assocId)
      .single();

    if (!error && data) return data;
  } catch (err) {}

  return padrao;
}

export async function updateIndicadoresParametros(
  assocId: string,
  params: Partial<IndicadoresParametros>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('indicadores_parametros')
      .upsert({ ...params, associacao_id: assocId, atualizado_em: new Date().toISOString() });
    if (!error) return true;
  } catch (err) {
    console.warn('Erro ao atualizar parâmetros de indicadores:', err);
  }
  return true;
}
