-- Permitir atualização da tabela associations para gerenciar temas
CREATE POLICY "update_associations_all" ON public.associations 
FOR UPDATE USING (true) WITH CHECK (true);
