-- Adicionar coluna tema_cor na tabela associations
ALTER TABLE public.associations 
ADD COLUMN IF NOT EXISTS tema_cor text DEFAULT 'blue';

-- Comentário para documentar que o tema_cor aceita os presets (ex: 'blue', 'red', 'emerald', 'violet')
COMMENT ON COLUMN public.associations.tema_cor IS 'Identificador do tema visual pre-moldado (ex: blue, red, emerald, violet, amber, slate)';
