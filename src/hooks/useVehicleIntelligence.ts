import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface RouboFurto {
  nivel: 'baixo' | 'medio' | 'alto';
  recuperacao_pct: number;
  nunca_recuperados_pct: number;
  ranking_nacional: number | null;
  justificativa: string;
}

export interface ColisaoPeca {
  peca: string;
  valor_estimado: number;
}

export interface ProblemasMecanico {
  problema: string;
  km_inicio: number;
  km_fim: number;
  valor_estimado: number;
}

export interface Revenda {
  score: number;
  demanda: 'baixa' | 'media' | 'alta';
  dias_para_vender: number;
  depreciacao_anual_pct: number;
  justificativa: string;
}

export interface VehicleIntelligence {
  roubo_furto: RouboFurto;
  colisao_pecas: ColisaoPeca[];
  problemas_mecanicos: ProblemasMecanico[];
  revenda: Revenda;
}

export interface FetchIntelligenceParams {
  marca: string;
  modelo: string;
  versao?: string;
  ano: string | number;
  uf: string;
  fipe_code: string;
}

export type IntelligenceStatus = 'idle' | 'loading' | 'success' | 'error';

export function useVehicleIntelligence() {
  const [status, setStatus] = useState<IntelligenceStatus>('idle');
  const [data, setData] = useState<VehicleIntelligence | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setData(null);
  }, []);

  const fetchIntelligence = useCallback(async (params: FetchIntelligenceParams) => {
    setStatus('loading');
    setData(null);

    try {
      const { data: response, error } = await supabase.functions.invoke('vehicle-intelligence', {
        body: params,
      });

      if (error) throw error;

      if (response?.error === 'intelligence_unavailable' || !response) {
        setStatus('error');
        return;
      }

      if (
        response.roubo_furto &&
        Array.isArray(response.colisao_pecas) &&
        Array.isArray(response.problemas_mecanicos) &&
        response.revenda
      ) {
        setData(response as VehicleIntelligence);
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }, []);

  return { status, data, fetchIntelligence, reset };
}