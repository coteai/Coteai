-- =========================================================
-- MIGRATION: PIPELINE E CRM COMERCIAL (PARTE 1)
-- =========================================================

-- 1. Adicionar colunas updated_at e observacoes na tabela quotes se nao existirem
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- 2. Atualizar o valor padrao do status para 'nova'
ALTER TABLE public.quotes 
ALTER COLUMN status SET DEFAULT 'nova';

-- 3. Mapear status legados para os novos status comerciais padronizados
UPDATE public.quotes 
SET status = 'nova' 
WHERE status = 'pending' OR status IS NULL OR status = '';

UPDATE public.quotes 
SET status = 'convertida' 
WHERE status = 'converted';

UPDATE public.quotes 
SET status = 'nao_convertida' 
WHERE status = 'rejected';

-- 4. Garantir que updated_at esteja preenchido onde estiver nulo
UPDATE public.quotes 
SET updated_at = COALESCE(converted_at, created_at, NOW()) 
WHERE updated_at IS NULL;

-- 5. Trigger para atualizar updated_at automaticamente em alteracoes
CREATE OR REPLACE FUNCTION update_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_quotes_updated_at ON public.quotes;
CREATE TRIGGER trigger_quotes_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION update_quotes_updated_at();

-- Comentarios explicativos
COMMENT ON COLUMN public.quotes.status IS 'Status comercial: nova, negociacao, proposta_enviada, convertida, nao_convertida';
COMMENT ON COLUMN public.quotes.updated_at IS 'Data e hora da ultima atualizacao comercial da cotacao';
COMMENT ON COLUMN public.quotes.observacoes IS 'Observacoes e anotacoes de contato comercial feitas pelo consultor';
