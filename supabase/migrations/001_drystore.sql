-- ================================================================
-- DRY STORE — SQL Completo
-- Execute no Supabase: SQL Editor → New query → Run
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. TABELA profiles_drystore
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles_drystore (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text        NOT NULL,
  role       text        NOT NULL DEFAULT 'comercial'
                         CHECK (role IN ('admin', 'comercial')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger updated_at em profiles_drystore
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_drystore_updated_at ON public.profiles_drystore;
CREATE TRIGGER profiles_drystore_updated_at
  BEFORE UPDATE ON public.profiles_drystore
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS em profiles_drystore
ALTER TABLE public.profiles_drystore ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_drystore_proprio" ON public.profiles_drystore;
CREATE POLICY "profiles_drystore_proprio"
  ON public.profiles_drystore FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_drystore_service" ON public.profiles_drystore;
CREATE POLICY "profiles_drystore_service"
  ON public.profiles_drystore FOR ALL
  USING (true);

-- ────────────────────────────────────────────────────────────────
-- 2. TRIGGER: cria perfil automaticamente ao registrar usuário
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles_drystore (id, email, role)
  VALUES (NEW.id, NEW.email, 'comercial')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────────
-- 3. Popular profiles_drystore com usuários já existentes
--    (execute uma vez; ajuste as roles manualmente depois)
-- ────────────────────────────────────────────────────────────────

INSERT INTO public.profiles_drystore (id, email, role)
SELECT id, email, 'comercial'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Ajustar roles manualmente (adapte os emails):
-- UPDATE public.profiles_drystore SET role = 'admin'     WHERE email = 'admin@teste.com';
-- UPDATE public.profiles_drystore SET role = 'comercial' WHERE email = 'comercial@teste.com';

-- ────────────────────────────────────────────────────────────────
-- 4. TABELA produtos_drystore
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.produtos_drystore (
  id         uuid           DEFAULT gen_random_uuid() PRIMARY KEY,
  nome       text           NOT NULL,
  descricao  text           NOT NULL DEFAULT '',
  preco      numeric(10,2)  NOT NULL DEFAULT 0 CHECK (preco >= 0),
  imagem_url text,          -- PATH no bucket products_drystore (não URL)
  categoria  text           CHECK (categoria IN ('cases','acessórios','personalizáveis','outros')),
  promocao   boolean        NOT NULL DEFAULT false,
  ativo      boolean        NOT NULL DEFAULT true,
  created_at timestamptz    NOT NULL DEFAULT now(),
  updated_at timestamptz    NOT NULL DEFAULT now()
);

-- Trigger updated_at em produtos_drystore
DROP TRIGGER IF EXISTS produtos_drystore_updated_at ON public.produtos_drystore;
CREATE TRIGGER produtos_drystore_updated_at
  BEFORE UPDATE ON public.produtos_drystore
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS em produtos_drystore
ALTER TABLE public.produtos_drystore ENABLE ROW LEVEL SECURITY;

-- Leitura pública: visitantes veem apenas produtos ativos
DROP POLICY IF EXISTS "produtos_leitura_publica" ON public.produtos_drystore;
CREATE POLICY "produtos_leitura_publica"
  ON public.produtos_drystore FOR SELECT
  USING (ativo = true);

-- Leitura total: admin e comercial veem todos (inclusive inativos)
DROP POLICY IF EXISTS "produtos_leitura_admin" ON public.produtos_drystore;
CREATE POLICY "produtos_leitura_admin"
  ON public.produtos_drystore FOR SELECT
  USING (
    (SELECT role FROM public.profiles_drystore WHERE id = auth.uid())
    IN ('admin', 'comercial')
  );

-- Insert: apenas admin e comercial
DROP POLICY IF EXISTS "produtos_insert_comercial" ON public.produtos_drystore;
CREATE POLICY "produtos_insert_comercial"
  ON public.produtos_drystore FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles_drystore WHERE id = auth.uid())
    IN ('admin', 'comercial')
  );

-- Update: apenas admin e comercial
DROP POLICY IF EXISTS "produtos_update_comercial" ON public.produtos_drystore;
CREATE POLICY "produtos_update_comercial"
  ON public.produtos_drystore FOR UPDATE
  USING (
    (SELECT role FROM public.profiles_drystore WHERE id = auth.uid())
    IN ('admin', 'comercial')
  );

-- ────────────────────────────────────────────────────────────────
-- 5. Políticas de Storage para o bucket "products_drystore"
--    Execute APÓS criar o bucket no painel do Supabase
-- ────────────────────────────────────────────────────────────────

-- Leitura pública (catálogo e home)
DROP POLICY IF EXISTS "imagens_leitura_publica" ON storage.objects;
CREATE POLICY "imagens_leitura_publica"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products_drystore');

-- Upload apenas para admin e comercial
DROP POLICY IF EXISTS "imagens_upload_comercial" ON storage.objects;
CREATE POLICY "imagens_upload_comercial"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'products_drystore'
    AND (
      SELECT role FROM public.profiles_drystore WHERE id = auth.uid()
    ) IN ('admin', 'comercial')
  );

-- ────────────────────────────────────────────────────────────────
-- 6. Índices de performance
-- ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_produtos_drystore_ativo    ON public.produtos_drystore (ativo);
CREATE INDEX IF NOT EXISTS idx_produtos_drystore_promocao ON public.produtos_drystore (promocao);
CREATE INDEX IF NOT EXISTS idx_produtos_drystore_created  ON public.produtos_drystore (created_at DESC);

-- ────────────────────────────────────────────────────────────────
-- 7. Dados de exemplo (remova se preferir começar vazio)
-- ────────────────────────────────────────────────────────────────
INSERT INTO public.produtos_drystore (nome, descricao, preco, categoria, promocao, ativo) VALUES
  ('Case iPhone 15 Pro Premium',  'Case de couro legítimo com proteção militar', 129.90, 'cases',            false, true),
  ('Case Samsung S24 Ultra',      'Proteção extrema com suporte para caneta S-Pen', 99.90, 'cases',          true,  true),
  ('Película 3D Privacidade',     'Vidro temperado com filtro de privacidade 360°', 49.90, 'acessórios',     false, true),
  ('Carregador MagSafe 15W',      'Carregador magnético wireless de alta velocidade', 89.90, 'acessórios',   true,  true),
  ('Case Personalizado',          'Crie seu case com foto ou arte exclusiva', 79.90,        'personalizáveis', false, true)
ON CONFLICT DO NOTHING;
