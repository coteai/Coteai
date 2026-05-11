-- Habilita a extensão de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. ASSOCIATIONS (Associações de Proteção)
-- =============================================
CREATE TABLE public.associations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  whatsapp_number TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. CONSULTANTS (Consultores / Vendedores)
-- =============================================
CREATE TABLE public.consultants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. PLANS (Planos da Associação)
-- =============================================
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  tipo_veiculo TEXT DEFAULT 'carro', -- 'carro', 'moto', 'caminhao'
  nome TEXT NOT NULL, -- Ex: "Básico", "VIP"
  descricao TEXT,
  coberturas JSONB DEFAULT '[]'::jsonb, -- Ex: ["Colisão", "Roubo e Furto"]
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. VEHICLE CATEGORIES (Faixas FIPE)
-- =============================================
CREATE TABLE public.vehicle_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  tipo_veiculo TEXT DEFAULT 'carro', -- 'carro', 'moto', 'caminhao'
  nome TEXT NOT NULL, -- Ex: "Até R$ 30.000", "R$ 30.001 a R$ 60.000"
  fipe_min NUMERIC NOT NULL,
  fipe_max NUMERIC NOT NULL,
  ordem INTEGER DEFAULT 0
);

-- =============================================
-- 5. PRICING TABLE (Cruzamento Categoria x Plano)
-- =============================================
CREATE TABLE public.pricing_table (
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
-- 6. QUOTES (Cotações Geradas)
-- =============================================
CREATE TABLE public.quotes (
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
  plano_selecionado TEXT, -- "Básico" ou "VIP"
  mensalidade NUMERIC,
  planos_cotados JSONB, -- Snapshot completo dos planos no momento da cotação
  status TEXT DEFAULT 'pending', -- 'pending' | 'converted' | 'rejected'
  converted_at TIMESTAMPTZ,
  converted_by TEXT, -- Nome do operador do backoffice que marcou como convertida
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 7. LEADS (para futura captura via WhatsApp)
-- =============================================
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  nome TEXT,
  whatsapp TEXT,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE public.associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Políticas abertas temporárias (refinamos com Auth depois)
CREATE POLICY "select_all_associations" ON public.associations FOR SELECT USING (true);
CREATE POLICY "select_all_consultants" ON public.consultants FOR SELECT USING (true);
CREATE POLICY "select_all_plans" ON public.plans FOR SELECT USING (true);
CREATE POLICY "select_all_categories" ON public.vehicle_categories FOR SELECT USING (true);
CREATE POLICY "select_all_pricing" ON public.pricing_table FOR SELECT USING (true);
CREATE POLICY "select_all_quotes" ON public.quotes FOR SELECT USING (true);

CREATE POLICY "insert_quotes" ON public.quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "update_quotes" ON public.quotes FOR UPDATE USING (true);
CREATE POLICY "insert_leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "insert_consultants" ON public.consultants FOR INSERT WITH CHECK (true);
CREATE POLICY "insert_plans" ON public.plans FOR INSERT WITH CHECK (true);
CREATE POLICY "insert_categories" ON public.vehicle_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "insert_pricing" ON public.pricing_table FOR INSERT WITH CHECK (true);
CREATE POLICY "upsert_pricing" ON public.pricing_table FOR UPDATE USING (true);
