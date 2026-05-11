-- =============================================
-- MIGRATION: Adicionar tipo_veiculo em plans
-- =============================================
ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS tipo_veiculo TEXT DEFAULT 'carro';

-- Atualizar politicas de update/delete para plans
CREATE POLICY "update_plans" ON public.plans FOR UPDATE USING (true);
CREATE POLICY "delete_plans" ON public.plans FOR DELETE USING (true);
