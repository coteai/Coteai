-- =============================================
-- SUPER ADMIN SYSTEM — Cote AI Developer Panel
-- =============================================

-- 1. Super Admins table
CREATE TABLE IF NOT EXISTS public.super_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_super_admins" ON public.super_admins FOR SELECT USING (true);

-- Insert Arthur as the first Super Admin
INSERT INTO public.super_admins (nome, email, senha)
VALUES ('Arthur', 'dev@coteai.com', 'Aj28060207y@')
ON CONFLICT (email) DO NOTHING;

-- =============================================
-- 2. Add branding columns to associations
-- =============================================
ALTER TABLE public.associations ADD COLUMN IF NOT EXISTS nome_fantasia TEXT;
ALTER TABLE public.associations ADD COLUMN IF NOT EXISTS nome_proposta TEXT;
ALTER TABLE public.associations ADD COLUMN IF NOT EXISTS whatsapp_suporte TEXT;
ALTER TABLE public.associations ADD COLUMN IF NOT EXISTS cor_primaria TEXT DEFAULT '#3B82F6';
ALTER TABLE public.associations ADD COLUMN IF NOT EXISTS admin_email TEXT;
ALTER TABLE public.associations ADD COLUMN IF NOT EXISTS admin_senha TEXT;
ALTER TABLE public.associations ADD COLUMN IF NOT EXISTS tema_cor TEXT DEFAULT 'blue';
ALTER TABLE public.associations ADD COLUMN IF NOT EXISTS plano_saas TEXT DEFAULT 'starter';
ALTER TABLE public.associations ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT NOW();

-- Policies for inserts/updates on associations
DROP POLICY IF EXISTS "insert_associations" ON public.associations;
CREATE POLICY "insert_associations" ON public.associations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "update_associations" ON public.associations;
CREATE POLICY "update_associations" ON public.associations FOR UPDATE USING (true);

DROP POLICY IF EXISTS "delete_associations" ON public.associations;
CREATE POLICY "delete_associations" ON public.associations FOR DELETE USING (true);
