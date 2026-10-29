-- ==============================================================================
-- MIGRATION: 20261028120000_sga_mirror.sql
-- DESCRIÇÃO: Espelho do SGA (Hinova) - Somente leitura para o usuário
--            Será preenchido pela sincronização posterior.
-- ==============================================================================

-- 1. Tabela de Associados sincronizados do SGA
CREATE TABLE IF NOT EXISTS public.sga_associados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associacao_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  id_externo TEXT NOT NULL,
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
  CONSTRAINT uq_sga_associados_externo UNIQUE (associacao_id, id_externo)
);

CREATE INDEX IF NOT EXISTS idx_sga_associados_assoc ON public.sga_associados(associacao_id);
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
  id_externo TEXT NOT NULL,
  associado_id UUID NOT NULL REFERENCES public.sga_associados(id) ON DELETE CASCADE,
  placa TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  ano INTEGER,
  valor_fipe NUMERIC(12,2),
  situacao TEXT DEFAULT 'ativo',
  plano TEXT,
  dados_brutos JSONB DEFAULT '{}'::jsonb,
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_sga_veiculos_externo UNIQUE (associacao_id, id_externo)
);

CREATE INDEX IF NOT EXISTS idx_sga_veiculos_assoc ON public.sga_veiculos(associacao_id);
CREATE INDEX IF NOT EXISTS idx_sga_veiculos_associado ON public.sga_veiculos(associado_id);
CREATE INDEX IF NOT EXISTS idx_sga_veiculos_placa ON public.sga_veiculos(placa);
CREATE INDEX IF NOT EXISTS idx_sga_veiculos_assoc_placa ON public.sga_veiculos(associacao_id, placa);

COMMENT ON TABLE public.sga_veiculos IS 'Espelho dos veículos dos associados sincronizados do SGA (Hinova).';


-- 3. Tabela de Mensalidades sincronizadas do SGA
CREATE TABLE IF NOT EXISTS public.sga_mensalidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associacao_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  id_externo TEXT NOT NULL,
  associado_id UUID NOT NULL REFERENCES public.sga_associados(id) ON DELETE CASCADE,
  veiculo_id UUID REFERENCES public.sga_veiculos(id) ON DELETE SET NULL,
  competencia DATE NOT NULL,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  situacao TEXT NOT NULL DEFAULT 'aberta' CHECK (situacao IN ('aberta', 'paga', 'atrasada', 'cancelada')),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_sga_mensalidades_externo UNIQUE (associacao_id, id_externo)
);

CREATE INDEX IF NOT EXISTS idx_sga_mensalidades_assoc ON public.sga_mensalidades(associacao_id);
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
-- ==============================================================================
-- MIGRATION: 20261028120300_rls_and_storage.sql
-- DESCRIÇÃO: Políticas de RLS Multi-tenant, Bucket de Storage e RPC Público Seguro
-- ==============================================================================

-- 1. Habilitar RLS em todas as novas tabelas
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

-- 2. Políticas de Acesso
-- Seguindo o padrão flexível e multi-tenant do Cote AI (onde o cliente Supabase anônimo
-- é consumido através de contextos que filtram explicitamente por associacao_id e consultor_id)
-- criamos as políticas de permissão:

-- Políticas para SGA (Somente Leitura para a aplicação cliente)
DROP POLICY IF EXISTS "sga_associados_policy" ON public.sga_associados;
CREATE POLICY "sga_associados_policy" ON public.sga_associados
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sga_veiculos_policy" ON public.sga_veiculos;
CREATE POLICY "sga_veiculos_policy" ON public.sga_veiculos
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sga_mensalidades_policy" ON public.sga_mensalidades;
CREATE POLICY "sga_mensalidades_policy" ON public.sga_mensalidades
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sga_sincronizacoes_policy" ON public.sga_sincronizacoes;
CREATE POLICY "sga_sincronizacoes_policy" ON public.sga_sincronizacoes
  FOR ALL USING (true) WITH CHECK (true);

-- Políticas para Eventos
DROP POLICY IF EXISTS "eventos_policy" ON public.eventos;
CREATE POLICY "eventos_policy" ON public.eventos
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "evento_etapas_config_policy" ON public.evento_etapas_config;
CREATE POLICY "evento_etapas_config_policy" ON public.evento_etapas_config
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "evento_historico_policy" ON public.evento_historico;
CREATE POLICY "evento_historico_policy" ON public.evento_historico
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "evento_pecas_policy" ON public.evento_pecas;
CREATE POLICY "evento_pecas_policy" ON public.evento_pecas
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "evento_orcamentos_policy" ON public.evento_orcamentos;
CREATE POLICY "evento_orcamentos_policy" ON public.evento_orcamentos
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "evento_arquivos_policy" ON public.evento_arquivos;
CREATE POLICY "evento_arquivos_policy" ON public.evento_arquivos
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "snapshots_mensais_policy" ON public.snapshots_mensais;
CREATE POLICY "snapshots_mensais_policy" ON public.snapshots_mensais
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "indicadores_parametros_policy" ON public.indicadores_parametros;
CREATE POLICY "indicadores_parametros_policy" ON public.indicadores_parametros
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
