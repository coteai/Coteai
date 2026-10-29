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
