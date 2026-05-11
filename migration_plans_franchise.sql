-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Adiciona coluna franquia_percentual na tabela plans
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE plans
ADD COLUMN IF NOT EXISTS franquia_percentual NUMERIC(5,2) DEFAULT NULL;

-- Comentário
COMMENT ON COLUMN plans.franquia_percentual IS 'Percentual de franquia padrão do plano. Ao alterar, é propagado automaticamente para pricing_table.';
