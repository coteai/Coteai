-- Habilita a extensão de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. ASSOCIATIONS (Associações de Proteção)
-- =============================================
CREATE TABLE IF NOT EXISTS public.associations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  whatsapp_number TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Colunas adicionadas via migrations
  nome_fantasia TEXT,
  nome_proposta TEXT,
  whatsapp_suporte TEXT,
  cor_primaria TEXT DEFAULT '#3B82F6',
  admin_email TEXT,
  admin_senha TEXT,
  tema_cor TEXT DEFAULT 'blue',
  plano_saas TEXT DEFAULT 'starter',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. SUPER ADMINS (Painel Developer)
-- =============================================
CREATE TABLE IF NOT EXISTS public.super_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert primeiro Super Admin
INSERT INTO public.super_admins (nome, email, senha)
VALUES ('Admin', 'admin@coteai.com', 'admin123')
ON CONFLICT (email) DO NOTHING;

-- =============================================
-- 3. CONSULTANTS (Consultores / Vendedores)
-- =============================================
CREATE TABLE IF NOT EXISTS public.consultants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  senha TEXT, -- adicionado via migration
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. VEHICLE GROUPS (Grupos de Veículos)
-- =============================================
CREATE TABLE IF NOT EXISTS public.vehicle_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  base_type TEXT NOT NULL, -- 'carro', 'moto' ou 'caminhao'
  pricing_mode TEXT NOT NULL DEFAULT 'plans', -- 'plans' ou 'fipe_tiers' (adicionado via migration)
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. VEHICLE CATEGORIES (Faixas FIPE)
-- =============================================
CREATE TABLE IF NOT EXISTS public.vehicle_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.vehicle_groups(id) ON DELETE CASCADE, -- adicionado via migration
  tipo_veiculo TEXT DEFAULT 'carro',
  nome TEXT NOT NULL,
  fipe_min NUMERIC NOT NULL,
  fipe_max NUMERIC NOT NULL,
  ordem INTEGER DEFAULT 0,
  -- Colunas para o modo fipe_tiers (adicionado via migration)
  mensalidade NUMERIC(10,2) DEFAULT NULL,
  franquia_percentual NUMERIC(5,2) DEFAULT NULL,
  coberturas JSONB DEFAULT '[]'::jsonb
);

-- =============================================
-- 6. PLANS (Planos da Associação)
-- =============================================
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.vehicle_groups(id) ON DELETE CASCADE, -- adicionado via migration
  tipo_veiculo TEXT DEFAULT 'carro',
  nome TEXT NOT NULL,
  descricao TEXT,
  coberturas JSONB DEFAULT '[]'::jsonb,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 7. PRICING TABLE (Cruzamento Categoria x Plano)
-- =============================================
CREATE TABLE IF NOT EXISTS public.pricing_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.vehicle_categories(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  mensalidade NUMERIC NOT NULL,
  franquia_percentual NUMERIC,
  cobertura_maxima NUMERIC,
  ativo BOOLEAN DEFAULT true,
  UNIQUE(category_id, plan_id)
);

-- =============================================
-- 8. QUOTES (Cotações Geradas)
-- =============================================
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  consultant_id UUID REFERENCES public.consultants(id) ON DELETE SET NULL,
  cliente_nome TEXT,
  cliente_whatsapp TEXT,
  placa TEXT,
  modelo TEXT,
  ano INTEGER,
  categoria_id UUID REFERENCES public.vehicle_categories(id),
  valor_fipe NUMERIC,
  plano_selecionado TEXT,
  mensalidade NUMERIC,
  planos_cotados JSONB,
  status TEXT DEFAULT 'pending',
  converted_at TIMESTAMPTZ,
  converted_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 9. LEADS (Contatos)
-- =============================================
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  nome TEXT,
  whatsapp TEXT,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS) E POLÍTICAS
-- =============================================

-- Habilita RLS em todas as tabelas
ALTER TABLE public.associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Políticas temporárias (abertas) para facilitar o desenvolvimento
DROP POLICY IF EXISTS "select_all" ON public.associations;
DROP POLICY IF EXISTS "insert_all" ON public.associations;
DROP POLICY IF EXISTS "update_all" ON public.associations;
DROP POLICY IF EXISTS "delete_all" ON public.associations;

CREATE POLICY "select_all" ON public.associations FOR SELECT USING (true);
CREATE POLICY "insert_all" ON public.associations FOR INSERT WITH CHECK (true);
CREATE POLICY "update_all" ON public.associations FOR UPDATE USING (true);
CREATE POLICY "delete_all" ON public.associations FOR DELETE USING (true);

DROP POLICY IF EXISTS "select_all" ON public.super_admins;
CREATE POLICY "select_all" ON public.super_admins FOR SELECT USING (true);

DROP POLICY IF EXISTS "select_all" ON public.consultants;
DROP POLICY IF EXISTS "insert_all" ON public.consultants;
DROP POLICY IF EXISTS "update_all" ON public.consultants;

CREATE POLICY "select_all" ON public.consultants FOR SELECT USING (true);
CREATE POLICY "insert_all" ON public.consultants FOR INSERT WITH CHECK (true);
CREATE POLICY "update_all" ON public.consultants FOR UPDATE USING (true);

DROP POLICY IF EXISTS "select_all" ON public.vehicle_groups;
DROP POLICY IF EXISTS "insert_all" ON public.vehicle_groups;
DROP POLICY IF EXISTS "update_all" ON public.vehicle_groups;
DROP POLICY IF EXISTS "delete_all" ON public.vehicle_groups;

CREATE POLICY "select_all" ON public.vehicle_groups FOR SELECT USING (true);
CREATE POLICY "insert_all" ON public.vehicle_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "update_all" ON public.vehicle_groups FOR UPDATE USING (true);
CREATE POLICY "delete_all" ON public.vehicle_groups FOR DELETE USING (true);

DROP POLICY IF EXISTS "select_all" ON public.vehicle_categories;
DROP POLICY IF EXISTS "insert_all" ON public.vehicle_categories;
DROP POLICY IF EXISTS "update_all" ON public.vehicle_categories;
DROP POLICY IF EXISTS "delete_all" ON public.vehicle_categories;

CREATE POLICY "select_all" ON public.vehicle_categories FOR SELECT USING (true);
CREATE POLICY "insert_all" ON public.vehicle_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "update_all" ON public.vehicle_categories FOR UPDATE USING (true);
CREATE POLICY "delete_all" ON public.vehicle_categories FOR DELETE USING (true);

DROP POLICY IF EXISTS "select_all" ON public.plans;
DROP POLICY IF EXISTS "insert_all" ON public.plans;
DROP POLICY IF EXISTS "update_all" ON public.plans;
DROP POLICY IF EXISTS "delete_all" ON public.plans;

CREATE POLICY "select_all" ON public.plans FOR SELECT USING (true);
CREATE POLICY "insert_all" ON public.plans FOR INSERT WITH CHECK (true);
CREATE POLICY "update_all" ON public.plans FOR UPDATE USING (true);
CREATE POLICY "delete_all" ON public.plans FOR DELETE USING (true);

DROP POLICY IF EXISTS "select_all" ON public.pricing_table;
DROP POLICY IF EXISTS "insert_all" ON public.pricing_table;
DROP POLICY IF EXISTS "update_all" ON public.pricing_table;
DROP POLICY IF EXISTS "delete_all" ON public.pricing_table;

CREATE POLICY "select_all" ON public.pricing_table FOR SELECT USING (true);
CREATE POLICY "insert_all" ON public.pricing_table FOR INSERT WITH CHECK (true);
CREATE POLICY "update_all" ON public.pricing_table FOR UPDATE USING (true);
CREATE POLICY "delete_all" ON public.pricing_table FOR DELETE USING (true);

DROP POLICY IF EXISTS "select_all" ON public.quotes;
DROP POLICY IF EXISTS "insert_all" ON public.quotes;
DROP POLICY IF EXISTS "update_all" ON public.quotes;

CREATE POLICY "select_all" ON public.quotes FOR SELECT USING (true);
CREATE POLICY "insert_all" ON public.quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "update_all" ON public.quotes FOR UPDATE USING (true);

DROP POLICY IF EXISTS "insert_all" ON public.leads;
CREATE POLICY "insert_all" ON public.leads FOR INSERT WITH CHECK (true);

-- Criar a associação padrão para testes se não existir
INSERT INTO public.associations (nome, slug, status)
VALUES ('VipCar Brasil', 'vipcar', 'active')
ON CONFLICT (slug) DO NOTHING;
