-- ==============================================================================
-- MIGRATION: 20261028120200_indicadores_snapshots_views.sql
-- DESCRIÇÃO: Histórico dos Indicadores, Snapshots Mensais e Views de Cálculo
-- ==============================================================================

-- 1. Tabela de Snapshots Mensais Consolidados
CREATE TABLE IF NOT EXISTS public.snapshots_mensais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associacao_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  competencia DATE NOT NULL,
  ativos INTEGER NOT NULL DEFAULT 0,
  inadimplentes INTEGER NOT NULL DEFAULT 0,
  cancelados INTEGER NOT NULL DEFAULT 0,
  entradas INTEGER NOT NULL DEFAULT 0,
  receita_faturada NUMERIC(12,2) NOT NULL DEFAULT 0,
  receita_recebida NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_em_atraso NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_eventos NUMERIC(12,2) NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_snapshots_assoc_comp UNIQUE (associacao_id, competencia)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_assoc_comp ON public.snapshots_mensais(associacao_id, competencia DESC);

COMMENT ON TABLE public.snapshots_mensais IS 'Histórico consolidado mensal dos indicadores de cada associação.';

-- 2. Tabela de Parâmetros e Metas dos Indicadores por Associação
CREATE TABLE IF NOT EXISTS public.indicadores_parametros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associacao_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE UNIQUE,
  peso_adimplencia NUMERIC(5,2) NOT NULL DEFAULT 40.0,
  peso_tempo_casa NUMERIC(5,2) NOT NULL DEFAULT 30.0,
  peso_sinistralidade NUMERIC(5,2) NOT NULL DEFAULT 30.0,
  meta_sinistralidade NUMERIC(5,2) NOT NULL DEFAULT 55.0,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.indicadores_parametros IS 'Pesos configuráveis para o cálculo do Índice de Qualidade da Base e metas.';


-- ==============================================================================
-- 3. VIEWS DE INDICADORES (com fórmulas comentadas em cada uma)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 3.1. Entradas no Mês
-- FÓRMULA: Entradas = associados com data_adesao no mês de referência.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_entradas_mes AS
SELECT 
  associacao_id,
  DATE_TRUNC('month', data_adesao)::DATE AS competencia,
  COUNT(id) AS total_entradas
FROM public.sga_associados
WHERE data_adesao IS NOT NULL
GROUP BY associacao_id, DATE_TRUNC('month', data_adesao);

COMMENT ON VIEW public.vw_entradas_mes IS 'Entradas: associados com data_adesao no mês.';


-- ------------------------------------------------------------------------------
-- 3.2. Receita no Mês
-- FÓRMULA: Receita = soma das mensalidades pagas no mês (por data_pagamento).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_receita_mes AS
SELECT 
  associacao_id,
  DATE_TRUNC('month', COALESCE(data_pagamento, competencia))::DATE AS competencia,
  SUM(valor) AS receita_recebida,
  COUNT(id) AS total_boletos_pagos
FROM public.sga_mensalidades
WHERE situacao = 'paga'
GROUP BY associacao_id, DATE_TRUNC('month', COALESCE(data_pagamento, competencia));

COMMENT ON VIEW public.vw_receita_mes IS 'Receita: soma das mensalidades pagas no mês.';


-- ------------------------------------------------------------------------------
-- 3.3. Ticket Médio
-- FÓRMULA: Ticket médio = receita ÷ associados ativos pagantes no mês.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_ticket_medio AS
SELECT 
  m.associacao_id,
  DATE_TRUNC('month', m.competencia)::DATE AS competencia,
  SUM(m.valor) AS receita_total,
  COUNT(DISTINCT m.associado_id) AS total_pagantes,
  CASE 
    WHEN COUNT(DISTINCT m.associado_id) > 0 THEN 
      ROUND((SUM(m.valor) / COUNT(DISTINCT m.associado_id))::NUMERIC, 2)
    ELSE 0 
  END AS ticket_medio
FROM public.sga_mensalidades m
WHERE m.situacao = 'paga'
GROUP BY m.associacao_id, DATE_TRUNC('month', m.competencia);

COMMENT ON VIEW public.vw_ticket_medio IS 'Ticket médio: receita ÷ associados ativos pagantes.';


-- ------------------------------------------------------------------------------
-- 3.4. Churn Mensal
-- FÓRMULA: Churn = cancelados no mês ÷ ativos no início do mês.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_churn_mes AS
WITH cancelados AS (
  SELECT 
    associacao_id,
    DATE_TRUNC('month', data_cancelamento)::DATE AS competencia,
    COUNT(id) AS total_cancelados
  FROM public.sga_associados
  WHERE situacao = 'cancelado' AND data_cancelamento IS NOT NULL
  GROUP BY associacao_id, DATE_TRUNC('month', data_cancelamento)
),
base_ativa AS (
  SELECT 
    associacao_id,
    DATE_TRUNC('month', data_adesao)::DATE AS competencia,
    COUNT(id) AS total_base
  FROM public.sga_associados
  WHERE situacao IN ('ativo', 'inadimplente')
  GROUP BY associacao_id, DATE_TRUNC('month', data_adesao)
)
SELECT 
  c.associacao_id,
  c.competencia,
  c.total_cancelados,
  COALESCE(b.total_base, 1) AS ativos_inicio,
  ROUND(((c.total_cancelados::NUMERIC / GREATEST(COALESCE(b.total_base, 1), 1)) * 100)::NUMERIC, 2) AS taxa_churn_percentual
FROM cancelados c
LEFT JOIN base_ativa b ON b.associacao_id = c.associacao_id AND b.competencia = c.competencia;

COMMENT ON VIEW public.vw_churn_mes IS 'Churn: cancelados no mês ÷ ativos no início do mês.';


-- ------------------------------------------------------------------------------
-- 3.5. Inadimplência
-- FÓRMULA: Inadimplência = valor em atraso ÷ valor total faturado no período.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_inadimplencia AS
SELECT 
  associacao_id,
  competencia,
  SUM(valor) AS valor_faturado,
  SUM(CASE WHEN situacao = 'atrasada' THEN valor ELSE 0 END) AS valor_atraso,
  SUM(CASE WHEN situacao = 'paga' THEN valor ELSE 0 END) AS valor_pago,
  CASE 
    WHEN SUM(valor) > 0 THEN 
      ROUND(((SUM(CASE WHEN situacao = 'atrasada' THEN valor ELSE 0 END) / SUM(valor)) * 100)::NUMERIC, 2)
    ELSE 0 
  END AS taxa_inadimplencia_percentual
FROM public.sga_mensalidades
WHERE situacao != 'cancelada'
GROUP BY associacao_id, competencia;

COMMENT ON VIEW public.vw_inadimplencia IS 'Inadimplência: valor em atraso ÷ valor faturado.';


-- ------------------------------------------------------------------------------
-- 3.6. Sinistralidade
-- FÓRMULA: Sinistralidade = custo dos eventos no período ÷ receita do período.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_sinistralidade AS
WITH custos AS (
  SELECT 
    associacao_id,
    DATE_TRUNC('month', data_abertura)::DATE AS competencia,
    SUM(valor_total_aprovado) AS custo_eventos,
    COUNT(id) AS qtd_eventos
  FROM public.eventos
  WHERE status != 'cancelado'
  GROUP BY associacao_id, DATE_TRUNC('month', data_abertura)
),
receitas AS (
  SELECT 
    associacao_id,
    DATE_TRUNC('month', COALESCE(data_pagamento, competencia))::DATE AS competencia,
    SUM(valor) AS receita_periodo
  FROM public.sga_mensalidades
  WHERE situacao = 'paga'
  GROUP BY associacao_id, DATE_TRUNC('month', COALESCE(data_pagamento, competencia))
)
SELECT 
  COALESCE(c.associacao_id, r.associacao_id) AS associacao_id,
  COALESCE(c.competencia, r.competencia) AS competencia,
  COALESCE(c.custo_eventos, 0) AS custo_eventos,
  COALESCE(r.receita_periodo, 0) AS receita_periodo,
  CASE 
    WHEN COALESCE(r.receita_periodo, 0) > 0 THEN 
      ROUND(((COALESCE(c.custo_eventos, 0) / r.receita_periodo) * 100)::NUMERIC, 2)
    ELSE 0 
  END AS taxa_sinistralidade_percentual
FROM custos c
FULL OUTER JOIN receitas r 
  ON c.associacao_id = r.associacao_id AND c.competencia = r.competencia;

COMMENT ON VIEW public.vw_sinistralidade IS 'Sinistralidade: custo dos eventos no período ÷ receita do período.';


-- ------------------------------------------------------------------------------
-- 3.7. Rentabilidade da Base
-- FÓRMULA: Rentabilidade = receita − custo dos eventos.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_rentabilidade_base AS
SELECT 
  associacao_id,
  competencia,
  receita_periodo,
  custo_eventos,
  (receita_periodo - custo_eventos) AS rentabilidade_liquida,
  CASE 
    WHEN receita_periodo > 0 THEN 
      ROUND((((receita_periodo - custo_eventos) / receita_periodo) * 100)::NUMERIC, 2)
    ELSE 0 
  END AS margem_rentabilidade_percentual
FROM public.vw_sinistralidade;

COMMENT ON VIEW public.vw_rentabilidade_base IS 'Rentabilidade: receita − custo dos eventos.';


-- ------------------------------------------------------------------------------
-- 3.8. Qualidade da Base
-- FÓRMULA: Qualidade da base: índice de 0 a 100 combinando percentual de adimplentes,
--          tempo médio de casa e sinistralidade por associado (pesos configuráveis
--          na tabela indicadores_parametros).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_qualidade_base AS
WITH stats_associados AS (
  SELECT 
    associacao_id,
    COUNT(id) AS total_base,
    COUNT(CASE WHEN situacao = 'ativo' THEN 1 END) AS total_adimplentes,
    -- Percentual de adimplentes (0 a 100)
    CASE 
      WHEN COUNT(id) > 0 THEN 
        (COUNT(CASE WHEN situacao = 'ativo' THEN 1 END)::NUMERIC / COUNT(id)::NUMERIC) * 100
      ELSE 100 
    END AS score_adimplencia,
    -- Tempo médio de permanência em dias normalizado (meta 365 dias = 100 pontos)
    LEAST(100, GREATEST(0, 
      AVG(CURRENT_DATE - COALESCE(data_adesao, CURRENT_DATE)) / 3.65
    )) AS score_tempo_casa
  FROM public.sga_associados
  WHERE situacao != 'cancelado'
  GROUP BY associacao_id
),
stats_sinistro AS (
  SELECT 
    associacao_id,
    -- Inverso da sinistralidade: menor sinistralidade = maior nota (100 - sinistralidade, mín 0)
    GREATEST(0, 100 - AVG(taxa_sinistralidade_percentual)) AS score_sinistralidade
  FROM public.vw_sinistralidade
  GROUP BY associacao_id
)
SELECT 
  a.id AS associacao_id,
  sa.total_base,
  sa.total_adimplentes,
  ROUND(sa.score_adimplencia::NUMERIC, 1) AS score_adimplencia,
  ROUND(sa.score_tempo_casa::NUMERIC, 1) AS score_tempo_casa,
  ROUND(COALESCE(ss.score_sinistralidade, 100)::NUMERIC, 1) AS score_sinistralidade,
  ROUND((
    (sa.score_adimplencia * (COALESCE(p.peso_adimplencia, 40) / 100)) +
    (sa.score_tempo_casa * (COALESCE(p.peso_tempo_casa, 30) / 100)) +
    (COALESCE(ss.score_sinistralidade, 100) * (COALESCE(p.peso_sinistralidade, 30) / 100))
  )::NUMERIC, 1) AS indice_qualidade_geral
FROM public.associations a
LEFT JOIN stats_associados sa ON sa.associacao_id = a.id
LEFT JOIN stats_sinistro ss ON ss.associacao_id = a.id
LEFT JOIN public.indicadores_parametros p ON p.associacao_id = a.id;

COMMENT ON VIEW public.vw_qualidade_base IS 'Qualidade da base: índice de 0 a 100 combinando adimplência, tempo de casa e sinistralidade.';


-- ------------------------------------------------------------------------------
-- 4. Função Consolidada: fn_indicadores_resumo
-- Retorna os 8 indicadores em um único JSON estruturado para consumo no painel e na IA.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_indicadores_resumo(
  p_associacao_id UUID,
  p_competencia DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_entradas INTEGER := 0;
  v_receita NUMERIC(12,2) := 0;
  v_ticket_medio NUMERIC(10,2) := 0;
  v_churn NUMERIC(5,2) := 0;
  v_inadimplencia NUMERIC(5,2) := 0;
  v_sinistralidade NUMERIC(5,2) := 0;
  v_rentabilidade NUMERIC(12,2) := 0;
  v_qualidade NUMERIC(5,1) := 0;
  v_snapshot RECORD;
BEGIN
  -- 1. Verifica se já existe snapshot consolidado para o mês
  SELECT * INTO v_snapshot 
  FROM public.snapshots_mensais 
  WHERE associacao_id = p_associacao_id AND competencia = p_competencia;

  IF FOUND THEN
    v_entradas := v_snapshot.entradas;
    v_receita := v_snapshot.receita_recebida;
    IF v_snapshot.ativos > 0 THEN
      v_ticket_medio := ROUND((v_snapshot.receita_recebida / v_snapshot.ativos)::NUMERIC, 2);
    END IF;
    IF v_snapshot.ativos > 0 THEN
      v_churn := ROUND(((v_snapshot.cancelados::NUMERIC / v_snapshot.ativos::NUMERIC) * 100)::NUMERIC, 2);
    END IF;
    IF v_snapshot.receita_faturada > 0 THEN
      v_inadimplencia := ROUND(((v_snapshot.valor_em_atraso / v_snapshot.receita_faturada) * 100)::NUMERIC, 2);
    END IF;
    IF v_snapshot.receita_recebida > 0 THEN
      v_sinistralidade := ROUND(((v_snapshot.custo_eventos / v_snapshot.receita_recebida) * 100)::NUMERIC, 2);
    END IF;
    v_rentabilidade := v_snapshot.receita_recebida - v_snapshot.custo_eventos;
  ELSE
    -- 2. Busca valores dinâmicos das views
    SELECT COALESCE(total_entradas, 0) INTO v_entradas 
    FROM public.vw_entradas_mes 
    WHERE associacao_id = p_associacao_id AND competencia = p_competencia;

    SELECT COALESCE(receita_recebida, 0) INTO v_receita 
    FROM public.vw_receita_mes 
    WHERE associacao_id = p_associacao_id AND competencia = p_competencia;

    SELECT COALESCE(ticket_medio, 0) INTO v_ticket_medio 
    FROM public.vw_ticket_medio 
    WHERE associacao_id = p_associacao_id AND competencia = p_competencia;

    SELECT COALESCE(taxa_churn_percentual, 0) INTO v_churn 
    FROM public.vw_churn_mes 
    WHERE associacao_id = p_associacao_id AND competencia = p_competencia;

    SELECT COALESCE(taxa_inadimplencia_percentual, 0) INTO v_inadimplencia 
    FROM public.vw_inadimplencia 
    WHERE associacao_id = p_associacao_id AND competencia = p_competencia;

    SELECT COALESCE(taxa_sinistralidade_percentual, 0), COALESCE(rentabilidade_liquida, 0) 
    INTO v_sinistralidade, v_rentabilidade 
    FROM public.vw_rentabilidade_base 
    WHERE associacao_id = p_associacao_id AND competencia = p_competencia;
  END IF;

  -- Busca índice de qualidade
  SELECT COALESCE(indice_qualidade_geral, 85.0) INTO v_qualidade 
  FROM public.vw_qualidade_base 
  WHERE associacao_id = p_associacao_id;

  v_result := jsonb_build_object(
    'competencia', p_competencia,
    'entradas_mes', COALESCE(v_entradas, 0),
    'receita_mes', COALESCE(v_receita, 0),
    'ticket_medio', COALESCE(v_ticket_medio, 0),
    'taxa_churn', COALESCE(v_churn, 0),
    'taxa_inadimplencia', COALESCE(v_inadimplencia, 0),
    'taxa_sinistralidade', COALESCE(v_sinistralidade, 0),
    'rentabilidade_base', COALESCE(v_rentabilidade, 0),
    'indice_qualidade_base', COALESCE(v_qualidade, 85.0)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;
