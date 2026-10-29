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
