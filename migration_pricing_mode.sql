-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Suporte a dois modos de precificação por grupo de veículos
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Adiciona o modo de precificação ao grupo
--    'plans'      = modelo atual (Plano × Faixa FIPE)
--    'fipe_tiers' = cada faixa FIPE define diretamente o preço e coberturas
ALTER TABLE vehicle_groups
ADD COLUMN IF NOT EXISTS pricing_mode TEXT NOT NULL DEFAULT 'plans';

-- 2. Adiciona campos diretos nas faixas FIPE para o modo fipe_tiers
ALTER TABLE vehicle_categories
ADD COLUMN IF NOT EXISTS mensalidade NUMERIC(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS franquia_percentual NUMERIC(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS coberturas JSONB DEFAULT '[]'::jsonb;
