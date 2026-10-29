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
