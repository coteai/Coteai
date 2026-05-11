-- Adicionar a coluna de senha na tabela de consultores
ALTER TABLE public.consultants ADD COLUMN IF NOT EXISTS senha text;

-- Opcional: Atualizar os dados de schema cache para o Supabase reconhecer a coluna imediatamente
NOTIFY pgrst, 'reload schema';
