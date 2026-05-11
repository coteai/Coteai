-- Adicionar a coluna tema_cor na tabela de consultores
ALTER TABLE public.consultants ADD COLUMN IF NOT EXISTS tema_cor text;

-- Opcional: Atualizar os dados de schema cache para o Supabase reconhecer a coluna imediatamente
NOTIFY pgrst, 'reload schema';
