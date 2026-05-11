-- =================================================================================
-- CORREÇÃO DE POLÍTICAS DE EXCLUSÃO (RLS) E INTEGRIDADE REFERENCIAL
-- Execute este script no SQL Editor do seu painel Supabase para corrigir 
-- as duplicações de Categorias e o bloqueio de exclusões.
-- =================================================================================

-- 1. Cria a política que faltava para permitir DELETAR categorias antigas
DROP POLICY IF EXISTS "delete_categories" ON public.vehicle_categories;
CREATE POLICY "delete_categories" ON public.vehicle_categories FOR DELETE USING (true);

-- 2. Cria a política que faltava para permitir DELETAR planos antigos (opcional, caso precise depois)
DROP POLICY IF EXISTS "delete_plans" ON public.plans;
CREATE POLICY "delete_plans" ON public.plans FOR DELETE USING (true);

-- 3. Atualiza a Restrição (Constraint) nas Cotações para "ON DELETE SET NULL"
-- Isso permite apagar a categoria de FIPE antiga sem quebrar (apagar) uma cotação fechada no passado.
ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_categoria_id_fkey;

ALTER TABLE public.quotes 
  ADD CONSTRAINT quotes_categoria_id_fkey 
  FOREIGN KEY (categoria_id) 
  REFERENCES public.vehicle_categories(id) 
  ON DELETE SET NULL;

-- 4. Opcional: Se quiser limpar todas as faixas que estão visivelmente duplicadas 
--    (para limpar a tela antes de importar novamente via Cote.ai), execute a linha abaixo APÓS AS DE CIMA:
-- DELETE FROM public.vehicle_categories;
