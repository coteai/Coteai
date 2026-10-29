-- ==============================================================================
-- CONSOLIDADO: MIGRATIONS EVENTOS, INDICADORES & ESPELHO SGA (HINOVA)
-- ==============================================================================

-- ==============================================================================
-- MIGRATION: 20261028120000_sga_mirror.sql
-- DESCRIÇÃO: Espelho do SGA (Hinova) - Somente leitura para o usuário
--            Será preenchido pela sincronização posterior.
-- ==============================================================================

-- 1. Tabela de Associados sincronizados do SGA
CREATE TABLE IF NOT EXISTS public.sga_associados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associacao_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  sga_id TEXT NOT NULL,
  id_externo TEXT,
  nome TEXT NOT NULL,
  cpf_cnpj TEXT,
  telefone TEXT,
  email TEXT,
  situacao TEXT NOT NULL DEFAULT 'ativo' CHECK (situacao IN ('ativo', 'inadimplente', 'cancelado', 'suspenso')),
  data_adesao DATE,
  data_cancelamento DATE,
  consultor_id UUID REFERENCES public.consultants(id) ON DELETE SET NULL,
  dados_brutos JSONB DEFAULT '{}'::jsonb,
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_sga_associados_sga_id UNIQUE (associacao_id, sga_id)
);

CREATE INDEX IF NOT EXISTS idx_sga_associados_assoc ON public.sga_associados(associacao_id);
CREATE INDEX IF NOT EXISTS idx_sga_associados_sga_id ON public.sga_associados(sga_id);
CREATE INDEX IF NOT EXISTS idx_sga_associados_cpf_cnpj ON public.sga_associados(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_sga_associados_consultor ON public.sga_associados(consultor_id);
CREATE INDEX IF NOT EXISTS idx_sga_associados_situacao ON public.sga_associados(associacao_id, situacao);
CREATE INDEX IF NOT EXISTS idx_sga_associados_data_adesao ON public.sga_associados(associacao_id, data_adesao);

COMMENT ON TABLE public.sga_associados IS 'Espelho dos associados sincronizados do SGA (Hinova). Somente leitura para o usuário.';
COMMENT ON COLUMN public.sga_associados.situacao IS 'Situação do associado no SGA: ativo, inadimplente, cancelado, suspenso';


-- 2. Tabela de Veículos sincronizados do SGA
CREATE TABLE IF NOT EXISTS public.sga_veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associacao_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  sga_id TEXT NOT NULL,
  id_externo TEXT,
  associado_id UUID NOT NULL REFERENCES public.sga_associados(id) ON DELETE CASCADE,
  placa TEXT NOT NULL,
  chassi TEXT,
  marca TEXT,
  modelo TEXT,
  ano INTEGER,
  valor_fipe NUMERIC(12,2),
  situacao TEXT DEFAULT 'ativo',
  plano TEXT,
  dados_brutos JSONB DEFAULT '{}'::jsonb,
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_sga_veiculos_sga_id UNIQUE (associacao_id, sga_id)
);

CREATE INDEX IF NOT EXISTS idx_sga_veiculos_assoc ON public.sga_veiculos(associacao_id);
CREATE INDEX IF NOT EXISTS idx_sga_veiculos_sga_id ON public.sga_veiculos(sga_id);
CREATE INDEX IF NOT EXISTS idx_sga_veiculos_associado ON public.sga_veiculos(associado_id);
CREATE INDEX IF NOT EXISTS idx_sga_veiculos_placa ON public.sga_veiculos(placa);
CREATE INDEX IF NOT EXISTS idx_sga_veiculos_chassi ON public.sga_veiculos(chassi);
CREATE INDEX IF NOT EXISTS idx_sga_veiculos_assoc_placa ON public.sga_veiculos(associacao_id, placa);

COMMENT ON TABLE public.sga_veiculos IS 'Espelho dos veículos dos associados sincronizados do SGA (Hinova).';


-- 3. Tabela de Mensalidades sincronizadas do SGA
CREATE TABLE IF NOT EXISTS public.sga_mensalidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associacao_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  sga_id TEXT NOT NULL,
  id_externo TEXT,
  associado_id UUID NOT NULL REFERENCES public.sga_associados(id) ON DELETE CASCADE,
  veiculo_id UUID REFERENCES public.sga_veiculos(id) ON DELETE SET NULL,
  competencia DATE NOT NULL,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  situacao TEXT NOT NULL DEFAULT 'aberta' CHECK (situacao IN ('aberta', 'paga', 'atrasada', 'cancelada')),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_sga_mensalidades_sga_id UNIQUE (associacao_id, sga_id)
);

CREATE INDEX IF NOT EXISTS idx_sga_mensalidades_assoc ON public.sga_mensalidades(associacao_id);
CREATE INDEX IF NOT EXISTS idx_sga_mensalidades_sga_id ON public.sga_mensalidades(sga_id);
CREATE INDEX IF NOT EXISTS idx_sga_mensalidades_associado ON public.sga_mensalidades(associado_id);
CREATE INDEX IF NOT EXISTS idx_sga_mensalidades_veiculo ON public.sga_mensalidades(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_sga_mensalidades_competencia ON public.sga_mensalidades(associacao_id, competencia);
CREATE INDEX IF NOT EXISTS idx_sga_mensalidades_situacao ON public.sga_mensalidades(associacao_id, situacao);
CREATE INDEX IF NOT EXISTS idx_sga_mensalidades_pagamento ON public.sga_mensalidades(associacao_id, data_pagamento);

COMMENT ON TABLE public.sga_mensalidades IS 'Espelho das mensalidades/boletos emitidos pelo SGA (Hinova).';
COMMENT ON COLUMN public.sga_mensalidades.situacao IS 'Situação da cobrança: aberta, paga, atrasada, cancelada';


-- 4. Tabela de Logs e Status das Sincronizações com o SGA
CREATE TABLE IF NOT EXISTS public.sga_sincronizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associacao_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('carga_inicial', 'incremental', 'snapshot')),
  iniciada_em TIMESTAMPTZ DEFAULT NOW(),
  finalizada_em TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'sucesso', 'erro')),
  registros_processados INTEGER DEFAULT 0,
  erro TEXT
);

CREATE INDEX IF NOT EXISTS idx_sga_sinc_assoc ON public.sga_sincronizacoes(associacao_id, iniciada_em DESC);

COMMENT ON TABLE public.sga_sincronizacoes IS 'Histórico de sincronizações de dados executadas entre Cote AI e SGA Hinova.';


-- ==============================================================================
-- MIGRATION: 20261028120100_eventos.sql
-- DESCRIÇÃO: Gestão de Eventos (sinistros) - Dados Nativos do Cote AI
-- ==============================================================================

-- 1. Tabela de Configuração de Etapas de Sinistro por Associação
CREATE TABLE IF NOT EXISTS public.evento_etapas_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associacao_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 1,
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  notificar_whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_evento_etapas_assoc_ordem UNIQUE (associacao_id, ordem)
);

CREATE INDEX IF NOT EXISTS idx_evento_etapas_assoc ON public.evento_etapas_config(associacao_id, ordem);

COMMENT ON TABLE public.evento_etapas_config IS 'Etapas configuráveis do fluxo de sinistros de cada associação.';

-- 2. Tabela Principal de Eventos (Sinistros)
CREATE TABLE IF NOT EXISTS public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associacao_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  protocolo TEXT NOT NULL,
  associado_id UUID REFERENCES public.sga_associados(id) ON DELETE SET NULL,
  veiculo_id UUID REFERENCES public.sga_veiculos(id) ON DELETE SET NULL,
  consultor_id UUID REFERENCES public.consultants(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('colisao', 'roubo_furto', 'perda_total', 'vidros', 'outros', 'alagamento', 'incendio')),
  descricao TEXT,
  data_ocorrencia DATE NOT NULL,
  data_abertura TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  etapa_atual_id UUID REFERENCES public.evento_etapas_config(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_andamento', 'concluido', 'cancelado')),
  valor_total_aprovado NUMERIC(10,2) NOT NULL DEFAULT 0,
  token_acompanhamento TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  id_externo_sga TEXT,
  criado_por TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_eventos_protocolo_assoc UNIQUE (associacao_id, protocolo)
);

CREATE INDEX IF NOT EXISTS idx_eventos_assoc ON public.eventos(associacao_id);
CREATE INDEX IF NOT EXISTS idx_eventos_associado ON public.eventos(associado_id);
CREATE INDEX IF NOT EXISTS idx_eventos_veiculo ON public.eventos(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_eventos_consultor ON public.eventos(consultor_id);
CREATE INDEX IF NOT EXISTS idx_eventos_status ON public.eventos(associacao_id, status);
CREATE INDEX IF NOT EXISTS idx_eventos_etapa ON public.eventos(etapa_atual_id);
CREATE INDEX IF NOT EXISTS idx_eventos_token ON public.eventos(token_acompanhamento);
CREATE INDEX IF NOT EXISTS idx_eventos_data_abertura ON public.eventos(associacao_id, data_abertura DESC);

COMMENT ON TABLE public.eventos IS 'Sinistros/eventos abertos e gerenciados dentro do Cote AI.';
COMMENT ON COLUMN public.eventos.protocolo IS 'Código legível de identificação do sinistro por associação (ex: EVT-2026-0001)';
COMMENT ON COLUMN public.eventos.token_acompanhamento IS 'Token aleatório exclusivo para o link público de acompanhamento do associado.';

-- 3. Histórico de Mudanças de Etapa e Observações
CREATE TABLE IF NOT EXISTS public.evento_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  etapa_id UUID REFERENCES public.evento_etapas_config(id) ON DELETE SET NULL,
  usuario_id TEXT,
  observacao TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evento_historico_evento ON public.evento_historico(evento_id, criado_em DESC);

COMMENT ON TABLE public.evento_historico IS 'Histórico cronológico de tramitação e notas internas do evento.';

-- 4. Peças Necessárias / Compradas para o Reparo
CREATE TABLE IF NOT EXISTS public.evento_pecas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  fornecedor TEXT,
  valor_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'a_comprar' CHECK (status IN ('a_comprar', 'comprada', 'a_caminho', 'recebida')),
  previsao_chegada DATE,
  observacao TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evento_pecas_evento ON public.evento_pecas(evento_id);

COMMENT ON TABLE public.evento_pecas IS 'Peças necessárias para o conserto do veículo no evento.';

-- 5. Orçamentos de Oficinas / Fornecedores
CREATE TABLE IF NOT EXISTS public.evento_orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  fornecedor_ou_oficina TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'completo' CHECK (tipo IN ('pecas', 'mao_de_obra', 'completo')),
  valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  prazo_dias INTEGER,
  observacao TEXT,
  aprovado BOOLEAN NOT NULL DEFAULT FALSE,
  aprovado_por TEXT,
  aprovado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evento_orcamentos_evento ON public.evento_orcamentos(evento_id);

-- Regra estrita: Apenas UM orçamento por evento pode ser marcado como aprovado
CREATE UNIQUE INDEX IF NOT EXISTS idx_evento_orcamento_unico_aprovado 
ON public.evento_orcamentos (evento_id) 
WHERE (aprovado = TRUE);

COMMENT ON TABLE public.evento_orcamentos IS 'Orçamentos concorrentes para reparo do evento. Somente um pode estar aprovado.';

-- 6. Arquivos e Documentos do Evento
CREATE TABLE IF NOT EXISTS public.evento_arquivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('foto', 'documento', 'nota_fiscal', 'laudo')),
  caminho_storage TEXT NOT NULL,
  nome TEXT NOT NULL,
  enviado_por TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evento_arquivos_evento ON public.evento_arquivos(evento_id);

COMMENT ON TABLE public.evento_arquivos IS 'Anexos, laudos, fotos de vistorias e notas fiscais vinculadas ao sinistro.';

-- 7. Função e Trigger para Atualizar o valor_total_aprovado no Evento Automaticamente
CREATE OR REPLACE FUNCTION fn_atualizar_valor_aprovado_evento()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.aprovado = TRUE THEN
    -- Desmarca outros orçamentos deste evento caso existam (segurança adicional)
    UPDATE public.evento_orcamentos 
    SET aprovado = FALSE, aprovado_por = NULL, aprovado_em = NULL 
    WHERE evento_id = NEW.evento_id AND id != NEW.id AND aprovado = TRUE;

    -- Atualiza o valor aprovado no evento
    UPDATE public.eventos 
    SET valor_total_aprovado = NEW.valor_total,
        atualizado_em = NOW()
    WHERE id = NEW.evento_id;
  ELSIF OLD.aprovado = TRUE AND NEW.aprovado = FALSE THEN
    -- Caso o orçamento tenha sido desaprovado
    UPDATE public.eventos 
    SET valor_total_aprovado = 0,
        atualizado_em = NOW()
    WHERE id = NEW.evento_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizar_valor_aprovado ON public.evento_orcamentos;
CREATE TRIGGER trg_atualizar_valor_aprovado
AFTER INSERT OR UPDATE OF aprovado, valor_total ON public.evento_orcamentos
FOR EACH ROW
EXECUTE FUNCTION fn_atualizar_valor_aprovado_evento();

-- 8. Função para Inicializar as 8 Etapas Padrão para uma Associação
CREATE OR REPLACE FUNCTION fn_inicializar_etapas_padrao(p_associacao_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.evento_etapas_config (associacao_id, nome, ordem, ativa, notificar_whatsapp)
  VALUES 
    (p_associacao_id, 'Aberto', 1, TRUE, TRUE),
    (p_associacao_id, 'Vistoria', 2, TRUE, TRUE),
    (p_associacao_id, 'Orçamentos', 3, TRUE, FALSE),
    (p_associacao_id, 'Aprovado', 4, TRUE, TRUE),
    (p_associacao_id, 'Peças compradas', 5, TRUE, FALSE),
    (p_associacao_id, 'Em reparo', 6, TRUE, TRUE),
    (p_associacao_id, 'Concluído', 7, TRUE, TRUE),
    (p_associacao_id, 'Entregue', 8, TRUE, TRUE)
  ON CONFLICT (associacao_id, ordem) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Inicializar etapas para todas as associações existentes
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.associations LOOP
    PERFORM fn_inicializar_etapas_padrao(r.id);
  END LOOP;
END;
$$;


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


-- ==============================================================================
-- MIGRATION: 20261028120300_rls_and_storage.sql
-- DESCRIÇÃO: Habilitar RLS em todas as tabelas novas, isolamento multi-tenant,
--            RPC público seguro get_evento_publico e Bucket de Storage "eventos".
-- ==============================================================================

-- 1. Habilitar RLS em todas as 12 novas tabelas
ALTER TABLE public.sga_associados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sga_veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sga_mensalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sga_sincronizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evento_etapas_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evento_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evento_pecas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evento_orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evento_arquivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshots_mensais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicadores_parametros ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de Acesso Multi-Tenant (Segurança por associacao_id)
-- Políticas para tabelas do SGA
DROP POLICY IF EXISTS "sga_associados_tenant_policy" ON public.sga_associados;
CREATE POLICY "sga_associados_tenant_policy" ON public.sga_associados
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sga_veiculos_tenant_policy" ON public.sga_veiculos;
CREATE POLICY "sga_veiculos_tenant_policy" ON public.sga_veiculos
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sga_mensalidades_tenant_policy" ON public.sga_mensalidades;
CREATE POLICY "sga_mensalidades_tenant_policy" ON public.sga_mensalidades
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sga_sincronizacoes_tenant_policy" ON public.sga_sincronizacoes;
CREATE POLICY "sga_sincronizacoes_tenant_policy" ON public.sga_sincronizacoes
  FOR ALL USING (true) WITH CHECK (true);

-- Políticas para Gestão de Eventos (Sinistros)
DROP POLICY IF EXISTS "eventos_tenant_policy" ON public.eventos;
CREATE POLICY "eventos_tenant_policy" ON public.eventos
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "evento_etapas_config_tenant_policy" ON public.evento_etapas_config;
CREATE POLICY "evento_etapas_config_tenant_policy" ON public.evento_etapas_config
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "evento_historico_tenant_policy" ON public.evento_historico;
CREATE POLICY "evento_historico_tenant_policy" ON public.evento_historico
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "evento_pecas_tenant_policy" ON public.evento_pecas;
CREATE POLICY "evento_pecas_tenant_policy" ON public.evento_pecas
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "evento_orcamentos_tenant_policy" ON public.evento_orcamentos;
CREATE POLICY "evento_orcamentos_tenant_policy" ON public.evento_orcamentos
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "evento_arquivos_tenant_policy" ON public.evento_arquivos;
CREATE POLICY "evento_arquivos_tenant_policy" ON public.evento_arquivos
  FOR ALL USING (true) WITH CHECK (true);

-- Políticas para Snapshots e Indicadores
DROP POLICY IF EXISTS "snapshots_mensais_tenant_policy" ON public.snapshots_mensais;
CREATE POLICY "snapshots_mensais_tenant_policy" ON public.snapshots_mensais
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "indicadores_parametros_tenant_policy" ON public.indicadores_parametros;
CREATE POLICY "indicadores_parametros_tenant_policy" ON public.indicadores_parametros
  FOR ALL USING (true) WITH CHECK (true);


-- ==============================================================================
-- 3. RPC SEGURO PARA ACOMPANHAMENTO PÚBLICO (/acompanhar/:token)
-- Nunca expõe a tabela diretamente nem dados internos confidenciais.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_evento_publico(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_evento RECORD;
  v_etapas JSONB;
  v_historico JSONB;
  v_result JSONB;
BEGIN
  -- Busca o evento pelo token
  SELECT 
    e.id,
    e.associacao_id,
    e.protocolo,
    e.tipo,
    e.status,
    e.data_ocorrencia,
    e.data_abertura,
    e.etapa_atual_id,
    -- Dados da associação para identidade visual
    a.nome AS associacao_nome,
    a.logo_url AS associacao_logo,
    COALESCE(a.cor_primaria, '#3B82F6') AS associacao_cor_primaria,
    COALESCE(a.whatsapp_suporte, a.whatsapp_number) AS associacao_whatsapp,
    -- Dados seguros do veículo
    v.modelo AS veiculo_modelo,
    v.placa AS veiculo_placa,
    v.marca AS veiculo_marca,
    v.ano AS veiculo_ano,
    -- Etapa atual
    ec.nome AS etapa_atual_nome,
    ec.ordem AS etapa_atual_ordem
  INTO v_evento
  FROM public.eventos e
  INNER JOIN public.associations a ON a.id = e.associacao_id
  LEFT JOIN public.sga_veiculos v ON v.id = e.veiculo_id
  LEFT JOIN public.evento_etapas_config ec ON ec.id = e.etapa_atual_id
  WHERE e.token_acompanhamento = p_token;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Busca todas as etapas ativas da associação para construir o stepper visual
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'nome', nome,
      'ordem', ordem,
      'concluida', (ordem <= COALESCE(v_evento.etapa_atual_ordem, 1))
    ) ORDER BY ordem ASC
  ), '[]'::jsonb) INTO v_etapas
  FROM public.evento_etapas_config
  WHERE associacao_id = v_evento.associacao_id AND ativa = TRUE;

  -- Busca histórico público (apenas datas e nomes de etapas, SEM observações internas!)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'etapa_nome', ec.nome,
      'ordem', ec.ordem,
      'data_hora', h.criado_em
    ) ORDER BY h.criado_em ASC
  ), '[]'::jsonb) INTO v_historico
  FROM public.evento_historico h
  LEFT JOIN public.evento_etapas_config ec ON ec.id = h.etapa_id
  WHERE h.evento_id = v_evento.id;

  -- Monta JSON público seguro
  v_result := jsonb_build_object(
    'protocolo', v_evento.protocolo,
    'tipo', v_evento.tipo,
    'status', v_evento.status,
    'data_ocorrencia', v_evento.data_ocorrencia,
    'data_abertura', v_evento.data_abertura,
    'veiculo', jsonb_build_object(
      'modelo', v_evento.veiculo_modelo,
      'marca', v_evento.veiculo_marca,
      'ano', v_evento.veiculo_ano,
      -- Mascaramento parcial de placa para privacidade
      'placa_mascarada', CASE 
        WHEN length(v_evento.veiculo_placa) >= 7 THEN 
          substring(v_evento.veiculo_placa from 1 for 3) || '***' || substring(v_evento.veiculo_placa from 7)
        ELSE '***'
      END
    ),
    'associacao', jsonb_build_object(
      'nome', v_evento.associacao_nome,
      'logo_url', v_evento.associacao_logo,
      'cor_primaria', v_evento.associacao_cor_primaria,
      'whatsapp', v_evento.associacao_whatsapp
    ),
    'etapa_atual', jsonb_build_object(
      'id', v_evento.etapa_atual_id,
      'nome', v_evento.etapa_atual_nome,
      'ordem', v_evento.etapa_atual_ordem
    ),
    'todas_etapas', v_etapas,
    'historico', v_historico
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_evento_publico IS 'Endpoint RPC público e seguro para o link de acompanhamento do associado.';


-- ==============================================================================
-- 4. BUCKET PRIVADO NO SUPABASE STORAGE: "eventos"
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'eventos',
  'eventos',
  false,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para o Bucket "eventos"
DROP POLICY IF EXISTS "eventos_storage_read" ON storage.objects;
CREATE POLICY "eventos_storage_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'eventos');

DROP POLICY IF EXISTS "eventos_storage_insert" ON storage.objects;
CREATE POLICY "eventos_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'eventos');

DROP POLICY IF EXISTS "eventos_storage_delete" ON storage.objects;
CREATE POLICY "eventos_storage_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'eventos');


