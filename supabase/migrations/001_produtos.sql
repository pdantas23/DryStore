-- ============================================================
-- DRY STORE — Tabela de produtos + RLS
-- Execute no Supabase: SQL Editor → New query → Run
-- ============================================================

-- 1. Criar a tabela produtos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.produtos (
  id          uuid              DEFAULT gen_random_uuid() PRIMARY KEY,
  nome        text              NOT NULL,
  descricao   text              NOT NULL DEFAULT '',
  preco       numeric(10, 2)    NOT NULL DEFAULT 0 CHECK (preco >= 0),
  imagem_url  text,             -- armazena o PATH no bucket, não a URL completa
  categoria   text              CHECK (categoria IN ('cases','acessórios','personalizáveis','outros')),
  promocao    boolean           NOT NULL DEFAULT false,
  ativo       boolean           NOT NULL DEFAULT true,
  created_at  timestamptz       NOT NULL DEFAULT now(),
  updated_at  timestamptz       NOT NULL DEFAULT now()
);

-- 2. Trigger para atualizar updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS produtos_updated_at ON public.produtos;
CREATE TRIGGER produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3. Habilitar Row Level Security
-- ============================================================
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS
-- ============================================================

-- Leitura pública: qualquer visitante vê apenas produtos ativos
DROP POLICY IF EXISTS "produtos_leitura_publica" ON public.produtos;
CREATE POLICY "produtos_leitura_publica"
  ON public.produtos
  FOR SELECT
  USING (ativo = true);

-- Leitura total: admin e comercial veem todos (inclusive inativos)
DROP POLICY IF EXISTS "produtos_leitura_admin" ON public.produtos;
CREATE POLICY "produtos_leitura_admin"
  ON public.produtos
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'comercial')
  );

-- Insert: apenas admin e comercial
DROP POLICY IF EXISTS "produtos_insert_comercial" ON public.produtos;
CREATE POLICY "produtos_insert_comercial"
  ON public.produtos
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'comercial')
  );

-- Update: apenas admin e comercial
DROP POLICY IF EXISTS "produtos_update_comercial" ON public.produtos;
CREATE POLICY "produtos_update_comercial"
  ON public.produtos
  FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'comercial')
  );

-- 5. Políticas de Storage para o bucket "products"
-- (Execute APÓS criar o bucket no painel do Supabase)
-- ============================================================

-- Leitura pública das imagens (necessário para catálogo e home)
DROP POLICY IF EXISTS "imagens_leitura_publica" ON storage.objects;
CREATE POLICY "imagens_leitura_publica"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

-- Upload apenas para admin e comercial
DROP POLICY IF EXISTS "imagens_upload_comercial" ON storage.objects;
CREATE POLICY "imagens_upload_comercial"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'products'
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) IN ('admin', 'comercial')
  );

-- 6. Índices de performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_produtos_ativo    ON public.produtos (ativo);
CREATE INDEX IF NOT EXISTS idx_produtos_promocao ON public.produtos (promocao);
CREATE INDEX IF NOT EXISTS idx_produtos_created  ON public.produtos (created_at DESC);

-- 7. Dados de exemplo (remova se não quiser dados iniciais)
-- ============================================================
INSERT INTO public.produtos (nome, descricao, preco, categoria, promocao, ativo) VALUES
  ('Case iPhone 15 Pro Premium',  'Case de couro legítimo com proteção militar para iPhone 15 Pro', 129.90, 'cases',            false, true),
  ('Case Samsung S24 Ultra',      'Proteção extrema com suporte para caneta S-Pen',                  99.90, 'cases',            true,  true),
  ('Película 3D Privacidade',     'Película de vidro temperado com filtro de privacidade 360°',       49.90, 'acessórios',      false, true),
  ('Carregador MagSafe 15W',      'Carregador magnético wireless de alta velocidade',                 89.90, 'acessórios',      true,  true),
  ('Case Personalizado',          'Crie seu case com foto ou arte exclusiva',                         79.90, 'personalizáveis', false, true)
ON CONFLICT DO NOTHING;
