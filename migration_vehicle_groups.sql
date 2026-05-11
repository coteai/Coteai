-- =================================================================================
-- MIGRAÇÃO PARA GRUPOS DE VEÍCULOS (MODELO UNIVERSAL COTE.AI)
-- Execute este script no SQL Editor do seu painel Supabase.
-- Isso permite a criação de infinitas categorias FIPE (Pequenos, SUVs, etc).
-- =================================================================================

-- 1. Cria a tabela central de grupos da associação
CREATE TABLE IF NOT EXISTS public.vehicle_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  base_type TEXT NOT NULL, -- 'carro', 'moto' ou 'caminhao' (Usado pro ícone e pra API FIPE)
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilita Políticas RLS para tabela vehicle_groups
ALTER TABLE public.vehicle_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_all_groups" ON public.vehicle_groups FOR SELECT USING (true);
CREATE POLICY "insert_groups" ON public.vehicle_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "delete_groups" ON public.vehicle_groups FOR DELETE USING (true);
CREATE POLICY "update_groups" ON public.vehicle_groups FOR UPDATE USING (true);

-- 3. Adiciona as colunas group_id nas tabelas FIPE (permitindo NULOS inicialmente)
ALTER TABLE public.vehicle_categories ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.vehicle_groups(id) ON DELETE CASCADE;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.vehicle_groups(id) ON DELETE CASCADE;

-- 4. Função anônima para migrar dados (Garantindo que coisas antigas n quebrem)
DO $$
DECLARE
    assoc_record RECORD;
    v_car_group_id UUID;
    v_moto_group_id UUID;
    v_truck_group_id UUID;
BEGIN
    FOR assoc_record IN SELECT id FROM public.associations LOOP
        -- Cria Grupo Padrão Carros
        INSERT INTO public.vehicle_groups (association_id, nome, base_type, ordem) 
        VALUES (assoc_record.id, 'Carros (Padrão)', 'carro', 1) 
        RETURNING id INTO v_car_group_id;

        -- Atrela os carros velhos ao nosso novo grupo base
        UPDATE public.vehicle_categories SET group_id = v_car_group_id WHERE association_id = assoc_record.id AND tipo_veiculo = 'carro';
        UPDATE public.plans SET group_id = v_car_group_id WHERE association_id = assoc_record.id AND tipo_veiculo = 'carro';

        -- Cria Grupo Padrão Motos
        INSERT INTO public.vehicle_groups (association_id, nome, base_type, ordem) 
        VALUES (assoc_record.id, 'Motos (Padrão)', 'moto', 2) 
        RETURNING id INTO v_moto_group_id;

        UPDATE public.vehicle_categories SET group_id = v_moto_group_id WHERE association_id = assoc_record.id AND tipo_veiculo = 'moto';
        UPDATE public.plans SET group_id = v_moto_group_id WHERE association_id = assoc_record.id AND tipo_veiculo = 'moto';

        -- Cria Grupo Padrão Caminhões
        INSERT INTO public.vehicle_groups (association_id, nome, base_type, ordem) 
        VALUES (assoc_record.id, 'Caminhões (Padrão)', 'caminhao', 3) 
        RETURNING id INTO v_truck_group_id;

        UPDATE public.vehicle_categories SET group_id = v_truck_group_id WHERE association_id = assoc_record.id AND tipo_veiculo = 'caminhao';
        UPDATE public.plans SET group_id = v_truck_group_id WHERE association_id = assoc_record.id AND tipo_veiculo = 'caminhao';

    END LOOP;
END $$;

-- IMPORTANTE: Após rodar este script, todas as tabelas e FIPEs que você já importou
-- estarão perfeitamente organizadas nos grupos "Padrão". O sistema Cote.ai agora se baseará nesses IDs!
