-- ==============================================================================
-- MIGRATION: 20261028120200_indicadores_snapshots_views.sql
-- DESCRIÇÃO: Indicadores comerciais, snapshots mensais e 8 SQL Views oficiais
--            com fórmulas matemáticas documentadas.
-- ==============================================================================

-- 1. Tabela de Snapshots Mensais Consolidados
CREATE TABLE IF NOT EXISTS public.snapshots_mensais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associacao_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  mes_ano DATE NOT NULL,
  total_associados INTEGER NOT NULL DEFAULT 0,
  associados_ativos INTEGER NOT NULL DEFAULT 0,
  novos_associados INTEGER NOT NULL DEFAULT 0,
  cancelamentos INTEGER NOT NULL DEFAULT 0,
  total_veiculos INTEGER NOT NULL DEFAULT 0,
  veiculos_ativos INTEGER NOT NULL DEFAULT 0,
  receita_prevista NUMERIC(12,2) NOT NULL DEFAULT 0,
  receita_realizada NUMERIC(12,2) NOT NULL DEFAULT 0,
  inadimplencia_valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  inadimplencia_percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
  sinistros_quantidade INTEGER NOT NULL DEFAULT 0,
  sinistros_custo_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  ticket_medio NUMERIC(10,2) NOT NULL DEFAULT 0,
  churn_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  sinistralidade_percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
  rentabilidade_percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
  dados_completos JSONB DEFAULT '{}'::jsonb,
  gerado_em TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_snapshots_assoc_mes UNIQUE (associacao_id, mes_ano)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_assoc_mes ON public.snapshots_mensais(associacao_id, mes_ano DESC);

COMMENT ON TABLE public.snapshots_mensais IS 'Fotografia mensal consolidada de métricas da associação (fechamento comercial).';


-- 2. Tabela de Metas e Parâmetros de Indicadores da Associação
CREATE TABLE IF NOT EXISTS public.indicadores_parametros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associacao_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  meta_entradas INTEGER DEFAULT 50,
  meta_ticket_medio NUMERIC(10,2) DEFAULT 180.00,
  limite_churn_percentual NUMERIC(5,2) DEFAULT 3.00,
  limite_inadimplencia_percentual NUMERIC(5,2) DEFAULT 10.00,
  limite_sinistralidade_percentual NUMERIC(5,2) DEFAULT 65.00,
  meta_rentabilidade_percentual NUMERIC(5,2) DEFAULT 25.00,
  custo_operacional_estimado_percentual NUMERIC(5,2) DEFAULT 20.00,
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_indicadores_params_assoc UNIQUE (associacao_id)
);

CREATE INDEX IF NOT EXISTS idx_indicadores_params_assoc ON public.indicadores_parametros(associacao_id);

COMMENT ON TABLE public.indicadores_parametros IS 'Configurações de metas e limites de alerta para os indicadores da associação.';


-- ==============================================================================
-- 3. AS 8 SQL VIEWS OFICIAIS COM FÓRMULAS MATEMÁTICAS DOCUMENTADAS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- VIEW 1: vw_entradas_mes
-- FÓRMULA: COUNT(veiculos com data_adesao no mês de competência)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_entradas_mes AS
SELECT 
  a.associacao_id,
  date_trunc('month', a.data_adesao)::DATE AS mes_ano,
  COUNT(DISTINCT v.id) AS total_veiculos_entradas,
  COUNT(DISTINCT a.id) AS total_associados_novos,
  COALESCE(SUM(v.valor_fipe), 0) AS fipe_total_entradas
FROM public.sga_associados a
INNER JOIN public.sga_veiculos v ON v.associado_id = a.id
WHERE a.data_adesao IS NOT NULL
GROUP BY a.associacao_id, date_trunc('month', a.data_adesao);

COMMENT ON VIEW public.vw_entradas_mes IS 'Novas adesões no mês (total de novos veículos e associados).';


-- ------------------------------------------------------------------------------
-- VIEW 2: vw_receita_mes
-- FÓRMULA: SUM(mensalidades com situacao = 'paga' e competencia no mês)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_receita_mes AS
SELECT 
  m.associacao_id,
  m.competencia AS mes_ano,
  SUM(CASE WHEN m.situacao = 'paga' THEN m.valor ELSE 0 END) AS receita_realizada,
  SUM(m.valor) AS receita_prevista,
  COUNT(CASE WHEN m.situacao = 'paga' THEN 1 END) AS mensalidades_pagas,
  COUNT(m.id) AS mensalidades_total
FROM public.sga_mensalidades m
GROUP BY m.associacao_id, m.competencia;

COMMENT ON VIEW public.vw_receita_mes IS 'Receita mensal realizada vs prevista a partir do espelho de boletos do SGA.';


-- ------------------------------------------------------------------------------
-- VIEW 3: vw_ticket_medio
-- FÓRMULA: Receita Realizada do Mês / Quantidade de Veículos Ativos no Mês
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_ticket_medio AS
SELECT 
  r.associacao_id,
  r.mes_ano,
  r.receita_realizada,
  COALESCE(v_count.total_veiculos_ativos, 1) AS total_veiculos_ativos,
  ROUND(
    r.receita_realizada / NULLIF(COALESCE(v_count.total_veiculos_ativos, 1), 0),
    2
  ) AS ticket_medio
FROM public.vw_receita_mes r
LEFT JOIN LATERAL (
  SELECT COUNT(v.id) AS total_veiculos_ativos
  FROM public.sga_veiculos v
  WHERE v.associacao_id = r.associacao_id AND v.situacao = 'ativo'
) v_count ON TRUE;

COMMENT ON VIEW public.vw_ticket_medio IS 'Ticket médio calculado como Receita Realizada dividida pelo total de veículos ativos.';


-- ------------------------------------------------------------------------------
-- VIEW 4: vw_churn_mes
-- FÓRMULA: (Cancelamentos no Mês / Base Ativa no Início do Mês) * 100
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_churn_mes AS
SELECT 
  a.associacao_id,
  date_trunc('month', a.data_cancelamento)::DATE AS mes_ano,
  COUNT(DISTINCT a.id) AS cancelamentos_associados,
  COALESCE(base.total_ativos, 1) AS base_ativa,
  ROUND(
    (COUNT(DISTINCT a.id)::NUMERIC / NULLIF(COALESCE(base.total_ativos, 1), 0)) * 100,
    2
  ) AS churn_rate
FROM public.sga_associados a
LEFT JOIN LATERAL (
  SELECT COUNT(id) AS total_ativos
  FROM public.sga_associados
  WHERE associacao_id = a.associacao_id AND situacao = 'ativo'
) base ON TRUE
WHERE a.situacao = 'cancelado' AND a.data_cancelamento IS NOT NULL
GROUP BY a.associacao_id, date_trunc('month', a.data_cancelamento), base.total_ativos;

COMMENT ON VIEW public.vw_churn_mes IS 'Taxa de cancelamentos mensais (Churn Rate) em relação à base de associados.';


-- ------------------------------------------------------------------------------
-- VIEW 5: vw_inadimplencia
-- FÓRMULA: (Valor de Mensalidades Atrasadas > 30d / Valor Total Faturado) * 100
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_inadimplencia AS
SELECT 
  m.associacao_id,
  m.competencia AS mes_ano,
  SUM(CASE WHEN m.situacao IN ('aberta', 'atrasada') AND m.data_vencimento < CURRENT_DATE THEN m.valor ELSE 0 END) AS valor_inadimplente,
  SUM(m.valor) AS valor_total_faturado,
  COUNT(CASE WHEN m.situacao IN ('aberta', 'atrasada') AND m.data_vencimento < CURRENT_DATE THEN 1 END) AS boletos_inadimplentes,
  ROUND(
    (SUM(CASE WHEN m.situacao IN ('aberta', 'atrasada') AND m.data_vencimento < CURRENT_DATE THEN m.valor ELSE 0 END) / NULLIF(SUM(m.valor), 0)) * 100,
    2
  ) AS taxa_inadimplencia
FROM public.sga_mensalidades m
GROUP BY m.associacao_id, m.competencia;

COMMENT ON VIEW public.vw_inadimplencia IS 'Índice de inadimplência sobre boletos vencidos em aberto.';


-- ------------------------------------------------------------------------------
-- VIEW 6: vw_sinistralidade
-- FÓRMULA: (Custo Total de Sinistros no Mês / Receita Realizada no Mês) * 100
--          Alerta de risco quando ultrapassar 65% (padrão de proteção veicular)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_sinistralidade AS
SELECT 
  r.associacao_id,
  r.mes_ano,
  COALESCE(e_custo.total_custo_sinistros, 0) AS custo_sinistros,
  r.receita_realizada,
  COALESCE(e_custo.qtd_sinistros, 0) AS qtd_sinistros,
  ROUND(
    (COALESCE(e_custo.total_custo_sinistros, 0) / NULLIF(r.receita_realizada, 0)) * 100,
    2
  ) AS taxa_sinistralidade,
  CASE 
    WHEN (COALESCE(e_custo.total_custo_sinistros, 0) / NULLIF(r.receita_realizada, 0)) * 100 > 65 THEN TRUE 
    ELSE FALSE 
  END AS alerta_critico
FROM public.vw_receita_mes r
LEFT JOIN LATERAL (
  SELECT 
    SUM(valor_total_aprovado) AS total_custo_sinistros,
    COUNT(id) AS qtd_sinistros
  FROM public.eventos
  WHERE associacao_id = r.associacao_id
    AND date_trunc('month', data_abertura)::DATE = r.mes_ano
    AND status != 'cancelado'
) e_custo ON TRUE;

COMMENT ON VIEW public.vw_sinistralidade IS 'Sinistralidade mensal (custos aprovados de eventos / receita arrecadada). Alerta em 65%.';


-- ------------------------------------------------------------------------------
-- VIEW 7: vw_rentabilidade_base
-- FÓRMULA: ((Receita Realizada - Custo Sinistros - Custos Operacionais) / Receita Realizada) * 100
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_rentabilidade_base AS
SELECT 
  s.associacao_id,
  s.mes_ano,
  s.receita_realizada,
  s.custo_sinistros,
  -- Aplica percentual operacional parametrizado ou 20% padrão
  ROUND(s.receita_realizada * (COALESCE(p.custo_operacional_estimado_percentual, 20.00) / 100), 2) AS custo_operacional,
  ROUND(
    s.receita_realizada - s.custo_sinistros - (s.receita_realizada * (COALESCE(p.custo_operacional_estimado_percentual, 20.00) / 100)),
    2
  ) AS resultado_liquido,
  ROUND(
    (
      (s.receita_realizada - s.custo_sinistros - (s.receita_realizada * (COALESCE(p.custo_operacional_estimado_percentual, 20.00) / 100)))
      / NULLIF(s.receita_realizada, 0)
    ) * 100,
    2
  ) AS margem_liquida_percentual
FROM public.vw_sinistralidade s
LEFT JOIN public.indicadores_parametros p ON p.associacao_id = s.associacao_id;

COMMENT ON VIEW public.vw_rentabilidade_base IS 'Margem líquida e rentabilidade da carteira descontados sinistros e operacionais.';


-- ------------------------------------------------------------------------------
-- VIEW 8: vw_qualidade_base
-- FÓRMULA: ((Associados Ativos SEM Sinistro no Período e SEM Inadimplência) / Total Ativos) * 100
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_qualidade_base AS
SELECT 
  a.associacao_id,
  COUNT(a.id) AS total_ativos,
  COUNT(CASE 
    WHEN evt.associado_id IS NULL AND inad.associado_id IS NULL THEN 1 
  END) AS associados_perfeitos,
  ROUND(
    (
      COUNT(CASE WHEN evt.associado_id IS NULL AND inad.associado_id IS NULL THEN 1 END)::NUMERIC 
      / NULLIF(COUNT(a.id), 0)
    ) * 100,
    2
  ) AS score_qualidade_base
FROM public.sga_associados a
-- Associados com sinistro nos últimos 12 meses
LEFT JOIN (
  SELECT DISTINCT associado_id 
  FROM public.eventos 
  WHERE data_abertura >= (CURRENT_DATE - INTERVAL '12 months')
    AND status != 'cancelado'
    AND associado_id IS NOT NULL
) evt ON evt.associado_id = a.id
-- Associados com mensalidade atrasada
LEFT JOIN (
  SELECT DISTINCT associado_id 
  FROM public.sga_mensalidades 
  WHERE situacao IN ('aberta', 'atrasada') 
    AND data_vencimento < CURRENT_DATE
) inad ON inad.associado_id = a.id
WHERE a.situacao = 'ativo'
GROUP BY a.associacao_id;

COMMENT ON VIEW public.vw_qualidade_base IS 'Qualidade da carteira: % de associados sem sinistro e sem inadimplência.';


-- ==============================================================================
-- 4. FUNÇÃO RPC: fn_indicadores_resumo
-- Retorna todas as métricas unificadas em JSON para o frontend instantaneamente
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_indicadores_resumo(p_associacao_id UUID, p_mes_ano DATE)
RETURNS JSONB AS $$
DECLARE
  v_receita RECORD;
  v_entradas RECORD;
  v_ticket RECORD;
  v_churn RECORD;
  v_inadimplencia RECORD;
  v_sinistralidade RECORD;
  v_rentabilidade RECORD;
  v_qualidade RECORD;
  v_params RECORD;
  v_result JSONB;
BEGIN
  -- Busca dados de cada view
  SELECT * INTO v_receita FROM public.vw_receita_mes WHERE associacao_id = p_associacao_id AND mes_ano = p_mes_ano;
  SELECT * INTO v_entradas FROM public.vw_entradas_mes WHERE associacao_id = p_associacao_id AND mes_ano = p_mes_ano;
  SELECT * INTO v_ticket FROM public.vw_ticket_medio WHERE associacao_id = p_associacao_id AND mes_ano = p_mes_ano;
  SELECT * INTO v_churn FROM public.vw_churn_mes WHERE associacao_id = p_associacao_id AND mes_ano = p_mes_ano;
  SELECT * INTO v_inadimplencia FROM public.vw_inadimplencia WHERE associacao_id = p_associacao_id AND mes_ano = p_mes_ano;
  SELECT * INTO v_sinistralidade FROM public.vw_sinistralidade WHERE associacao_id = p_associacao_id AND mes_ano = p_mes_ano;
  SELECT * INTO v_rentabilidade FROM public.vw_rentabilidade_base WHERE associacao_id = p_associacao_id AND mes_ano = p_mes_ano;
  SELECT * INTO v_qualidade FROM public.vw_qualidade_base WHERE associacao_id = p_associacao_id;
  SELECT * INTO v_params FROM public.indicadores_parametros WHERE associacao_id = p_associacao_id;

  v_result := jsonb_build_object(
    'competencia', p_mes_ano,
    'receita_realizada', COALESCE(v_receita.receita_realizada, 0),
    'receita_prevista', COALESCE(v_receita.receita_prevista, 0),
    'novas_entradas', COALESCE(v_entradas.total_veiculos_entradas, 0),
    'meta_entradas', COALESCE(v_params.meta_entradas, 50),
    'ticket_medio', COALESCE(v_ticket.ticket_medio, 0),
    'meta_ticket_medio', COALESCE(v_params.meta_ticket_medio, 180.00),
    'churn_rate', COALESCE(v_churn.churn_rate, 0),
    'limite_churn', COALESCE(v_params.limite_churn_percentual, 3.00),
    'taxa_inadimplencia', COALESCE(v_inadimplencia.taxa_inadimplencia, 0),
    'limite_inadimplencia', COALESCE(v_params.limite_inadimplencia_percentual, 10.00),
    'taxa_sinistralidade', COALESCE(v_sinistralidade.taxa_sinistralidade, 0),
    'limite_sinistralidade', COALESCE(v_params.limite_sinistralidade_percentual, 65.00),
    'alerta_sinistralidade_critica', COALESCE(v_sinistralidade.alerta_critico, FALSE),
    'margem_liquida', COALESCE(v_rentabilidade.margem_liquida_percentual, 0),
    'meta_rentabilidade', COALESCE(v_params.meta_rentabilidade_percentual, 25.00),
    'score_qualidade', COALESCE(v_qualidade.score_qualidade_base, 0)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.fn_indicadores_resumo IS 'Retorna JSON agregado das 8 métricas e metas para o dashboard de indicadores.';
